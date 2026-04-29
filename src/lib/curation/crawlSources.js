import { fetchRSSFeed, fetchNitterFeedWithFallback } from '@/lib/curation/rss'
import { fetchHTMLSource } from '@/lib/curation/scraper'
import { uploadItemImages } from '@/lib/curation/imageStorage'

function parseNitterInstances(raw) {
  const list = (raw || '').split('\n').map(s => s.trim()).filter(s => s.startsWith('http'))
  return list.length > 0 ? list : ['https://nitter.net']
}

async function fetchSourceItems(source, nitterInstances) {
  switch (source.type) {
    case 'twitter': return fetchNitterFeedWithFallback(nitterInstances, source.url)
    case 'rss':     return fetchRSSFeed(source.url)
    case 'html':    return fetchHTMLSource(source.url, source.crawl_config || {})
    default:        throw new Error(`Unknown source type: ${source.type}`)
  }
}

async function processSingleSource(source, nitterInstances, supabase, totals) {
  try {
    const items = await fetchSourceItems(source, nitterInstances)
    totals.fetched += items.length

    if (items.length === 0) {
      await supabase
        .from('content_sources')
        .update({ last_crawled_at: new Date().toISOString(), last_error: null })
        .eq('id', source.id)
      return
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
      // No fallback — if nothing new since last crawl, return empty
    }

    totals.skipped += items.length - recentItems.length

    if (recentItems.length === 0) {
      await supabase
        .from('content_sources')
        .update({ last_crawled_at: new Date().toISOString(), last_error: null })
        .eq('id', source.id)
      return
    }

    const { data: existing } = await supabase
      .from('crawl_log')
      .select('item_id')
      .eq('source_id', source.id)
      .in('item_id', recentItems.map(i => i.itemId).filter(Boolean))

    const seen = new Set((existing || []).map(r => r.item_id))
    const newItems = recentItems.filter(i => i.itemId && !seen.has(i.itemId))
    totals.skipped += recentItems.length - newItems.length

    if (newItems.length > 0) {
      const uploadedItems = await Promise.all(
        newItems.map(async item => {
          if (!item.imageUrls?.length) return item
          const folder = crypto.randomUUID()
          const imageUrls = await uploadItemImages(supabase, folder, item.imageUrls)
          return { ...item, imageUrls, imageFolder: folder }
        })
      )

      const queueRows = uploadedItems.map(item => ({
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
          image_folder:       item.imageFolder || null,
          published_at:       item.publishedAt,
          original_tweet_url: item.originalTweetUrl || null,
          source_label:       source.label,
          source_type:        source.type,
        },
      }))

      const { error: insertError } = await supabase.from('content_queue').insert(queueRows)

      if (insertError) {
        totals.errors.push(`${source.label}: insert failed — ${insertError.message}`)
        return
      }

      await supabase
        .from('crawl_log')
        .insert(uploadedItems.map(item => ({ source_id: source.id, item_id: item.itemId })))
        .select()

      totals.new += uploadedItems.length
    }

    await supabase
      .from('content_sources')
      .update({ last_crawled_at: new Date().toISOString(), last_error: null })
      .eq('id', source.id)

  } catch (err) {
    const message = err.message || 'Unknown error'
    totals.errors.push(`${source.label}: ${message}`)
    try {
      await supabase
        .from('content_sources')
        .update({ last_crawled_at: new Date().toISOString(), last_error: message })
        .eq('id', source.id)
    } catch { /* best-effort */ }
  }
}

export async function crawlActiveSources(supabase, sourceIds = null) {
  let query = supabase.from('content_sources').select('*').eq('active', true)
  if (sourceIds?.length) query = query.in('id', sourceIds)

  const { data: sources, error: sourcesError } = await query
  if (sourcesError) throw new Error(sourcesError.message)
  if (!sources?.length) return { fetched: 0, new: 0, skipped: 0, errors: [] }

  const { data: settings } = await supabase
    .from('curation_settings')
    .select('nitter_instance')
    .eq('id', 1)
    .single()

  const nitterInstances = parseNitterInstances(settings?.nitter_instance)
  const totals = { fetched: 0, new: 0, skipped: 0, errors: [] }

  await Promise.allSettled(
    sources.map(source => processSingleSource(source, nitterInstances, supabase, totals))
  )

  return totals
}
