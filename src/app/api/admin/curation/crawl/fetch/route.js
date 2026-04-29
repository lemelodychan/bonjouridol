import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { fetchRSSFeed, fetchNitterFeed } from '@/lib/curation/rss'
import { fetchHTMLSource } from '@/lib/curation/scraper'

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
  if (!supabaseUrl || (!serviceKey && !anonKey)) return null
  return createSupabaseClient(supabaseUrl, serviceKey || anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function checkCronSecret(request) {
  const authHeader = request.headers.get('Authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  return authHeader === `Bearer ${cronSecret}`
}

export async function POST(request) {
  if (!checkCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  // Optional: crawl specific sources only
  let body = {}
  try { body = await request.json() } catch { /* no body is fine */ }
  const { source_ids } = body

  // Load active sources
  let sourcesQuery = supabase.from('content_sources').select('*').eq('active', true)
  if (source_ids?.length) sourcesQuery = sourcesQuery.in('id', source_ids)
  const { data: sources, error: sourcesError } = await sourcesQuery

  if (sourcesError) {
    return NextResponse.json({ error: sourcesError.message }, { status: 500 })
  }

  if (!sources?.length) {
    return NextResponse.json({ fetched: 0, new: 0, skipped: 0, errors: [] })
  }

  // Load settings for nitter_instance
  const { data: settings } = await supabase
    .from('curation_settings')
    .select('nitter_instance')
    .eq('id', 1)
    .single()

  const nitterInstance = settings?.nitter_instance || 'https://nitter.net'

  // Process all sources in parallel (each with its own error handling)
  const totals = { fetched: 0, new: 0, skipped: 0, errors: [] }

  await Promise.allSettled(
    sources.map(source => processSingleSource(source, nitterInstance, supabase, totals))
  )

  return NextResponse.json(totals)
}

async function processSingleSource(source, nitterInstance, supabase, totals) {
  try {
    const items = await fetchSourceItems(source, nitterInstance)
    totals.fetched += items.length

    if (items.length === 0) {
      await supabase
        .from('content_sources')
        .update({ last_crawled_at: new Date().toISOString(), last_error: null })
        .eq('id', source.id)
      return
    }

    // Bulk-check which item IDs are already in crawl_log for this source
    const { data: existing } = await supabase
      .from('crawl_log')
      .select('item_id')
      .eq('source_id', source.id)
      .in('item_id', items.map(i => i.itemId).filter(Boolean))

    const seen = new Set((existing || []).map(r => r.item_id))

    const newItems = items.filter(i => i.itemId && !seen.has(i.itemId))
    totals.skipped += items.length - newItems.length

    if (newItems.length > 0) {
      // Insert into content_queue (status: raw — not yet AI-processed)
      const queueRows = newItems.map(item => ({
        source_id: source.id,
        type:      'article', // default; AI process step will reclassify
        status:    'raw',
        raw_content: {
          title:              item.title,
          body:               item.body,
          author:             item.author,
          source_url:         item.sourceUrl,
          image_urls:         item.imageUrls,
          published_at:       item.publishedAt,
          original_tweet_url: item.originalTweetUrl || null,
        },
      }))

      const { error: insertError } = await supabase
        .from('content_queue')
        .insert(queueRows)

      if (insertError) {
        totals.errors.push(`${source.label}: insert failed — ${insertError.message}`)
        return
      }

      // Record in crawl_log to prevent re-processing on next run
      await supabase
        .from('crawl_log')
        .insert(newItems.map(item => ({ source_id: source.id, item_id: item.itemId })))
        .select() // suppress null response warning

      totals.new += newItems.length
    }

    await supabase
      .from('content_sources')
      .update({ last_crawled_at: new Date().toISOString(), last_error: null })
      .eq('id', source.id)

  } catch (err) {
    const message = err.message || 'Unknown error'
    totals.errors.push(`${source.label}: ${message}`)
    // Write the error to the source row so it shows up in the Source Manager UI
    await supabase
      .from('content_sources')
      .update({ last_crawled_at: new Date().toISOString(), last_error: message })
      .eq('id', source.id)
      .catch(() => {}) // don't throw if this update itself fails
  }
}

async function fetchSourceItems(source, nitterInstance) {
  switch (source.type) {
    case 'twitter':
      return fetchNitterFeed(nitterInstance, source.url)
    case 'rss':
      return fetchRSSFeed(source.url)
    case 'html':
      return fetchHTMLSource(source.url, source.crawl_config || {})
    default:
      throw new Error(`Unknown source type: ${source.type}`)
  }
}
