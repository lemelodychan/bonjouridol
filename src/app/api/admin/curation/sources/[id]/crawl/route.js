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

// Called from the Source Manager "Crawl now" button.
// Crawls a single source and stores new raw items.
export async function POST(request, { params }) {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  const { id } = await params

  const { data: source, error } = await supabase
    .from('content_sources')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !source) {
    return NextResponse.json({ error: 'Source not found' }, { status: 404 })
  }

  const { data: settings } = await supabase
    .from('curation_settings')
    .select('nitter_instance')
    .eq('id', 1)
    .single()

  const nitterInstance = settings?.nitter_instance || 'https://nitter.net'

  try {
    let items = []
    switch (source.type) {
      case 'twitter': items = await fetchNitterFeed(nitterInstance, source.url); break
      case 'rss':     items = await fetchRSSFeed(source.url); break
      case 'html':    items = await fetchHTMLSource(source.url, source.crawl_config || {}); break
    }

    let recentItems
    if (!source.last_crawled_at) {
      // First-ever crawl: seed with the single most recent item only
      const sorted = [...items].sort((a, b) => {
        if (!a.publishedAt) return 1
        if (!b.publishedAt) return -1
        return new Date(b.publishedAt) - new Date(a.publishedAt)
      })
      recentItems = sorted.length > 0 ? [sorted[0]] : []
    } else {
      // Subsequent crawls: only items published after the last crawl
      const cutoff = new Date(source.last_crawled_at)
      recentItems = items.filter(i => !i.publishedAt || new Date(i.publishedAt) > cutoff)
      // No fallback — nothing new since last crawl means the queue stays empty
    }

    const { data: existing } = await supabase
      .from('crawl_log')
      .select('item_id')
      .eq('source_id', source.id)
      .in('item_id', recentItems.map(i => i.itemId).filter(Boolean))

    const seen = new Set((existing || []).map(r => r.item_id))
    const newItems = recentItems.filter(i => i.itemId && !seen.has(i.itemId))

    if (newItems.length > 0) {
      await supabase.from('content_queue').insert(
        newItems.map(item => ({
          source_id: source.id,
          type:      source.type === 'twitter' ? 'tweet' : 'article',
          status:    'raw',
          raw_content: {
            title:              item.title,
            body:               item.body,
            body_blocks:        item.bodyBlocks || null,
            author:             item.author,
            source_url:         item.sourceUrl,
            image_urls:         item.imageUrls,
            published_at:       item.publishedAt,
            original_tweet_url: item.originalTweetUrl || null,
          },
        }))
      )

      await supabase
        .from('crawl_log')
        .insert(newItems.map(item => ({ source_id: source.id, item_id: item.itemId })))
    }

    await supabase
      .from('content_sources')
      .update({ last_crawled_at: new Date().toISOString(), last_error: null })
      .eq('id', source.id)

    return NextResponse.json({
      fetched: items.length,
      new: newItems.length,
      skipped: items.length - newItems.length, // includes age-filtered + deduped
    })

  } catch (err) {
    const message = err.message || 'Crawl failed'
    await supabase
      .from('content_sources')
      .update({ last_error: message })
      .eq('id', source.id)
      .catch(() => {})
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
