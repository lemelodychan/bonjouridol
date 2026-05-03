// APIFY_ACTOR_ID should be set to your deployed actor, e.g. "yourname/bonjouridol-twitter-scraper"
// Falls back to the third-party browser-based actor if not set (much more expensive).
const ACTOR = process.env.APIFY_ACTOR_ID || 'apidojo~tweet-scraper'
const IS_CUSTOM = !!process.env.APIFY_ACTOR_ID

/**
 * Fetch recent tweets for multiple handles in a single Apify actor run.
 * Returns a Map<handleLowercase, normalizedItem[]>.
 * One run = one startup cost regardless of how many handles are passed.
 */
export async function fetchApifyBatch(handles) {
  const apiToken = process.env.APIFY_API_TOKEN
  if (!apiToken) throw new Error('APIFY_API_TOKEN not set')
  if (!handles.length) return new Map()

  const cleanHandles = handles.map(h => h.replace(/^@/, ''))

  const input = IS_CUSTOM
    ? { handles: cleanHandles, maxTweetsPerHandle: 10 }
    : { twitterHandles: cleanHandles, maxItems: cleanHandles.length * 10, sort: 'Latest' }

  const res = await fetch(
    `https://api.apify.com/v2/acts/${ACTOR}/run-sync-get-dataset-items?token=${apiToken}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(25000),
    }
  )

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Apify ${res.status}: ${text.slice(0, 200)}`)
  }

  const tweets = await res.json()
  if (!Array.isArray(tweets)) throw new Error('Unexpected Apify response format')

  const byHandle = new Map()
  for (const tweet of tweets) {
    if (tweet.isRetweet || tweet.error) continue
    const handle = (tweet.handle || tweet.author?.userName || '').toLowerCase()
    if (!handle) continue
    if (!byHandle.has(handle)) byHandle.set(handle, [])
    byHandle.get(handle).push(IS_CUSTOM ? normalizeCustom(tweet) : normalizeThirdParty(tweet))
  }
  return byHandle
}

/**
 * Single-handle wrapper for the "Crawl now" button on a single source.
 */
export async function fetchApifyTweets(handle) {
  const batch = await fetchApifyBatch([handle])
  return batch.get(handle.replace(/^@/, '').toLowerCase()) || []
}

// ─── normalizers ─────────────────────────────────────────────────────────────

function normalizeCustom(t) {
  return {
    itemId:           t.id || t.url,
    title:            null,
    body:             t.text || '',
    author:           `@${t.handle}`,
    sourceUrl:        t.url,
    imageUrls:        Array.isArray(t.mediaUrls) ? t.mediaUrls : [],
    publishedAt:      t.createdAt ? new Date(t.createdAt).toISOString() : null,
    originalTweetUrl: t.url,
  }
}

function normalizeThirdParty(t) {
  const tweetUrl = t.url || t.twitterUrl
    || (t.id ? `https://x.com/${t.author?.userName}/status/${t.id}` : null)
  const urls = []
  for (const list of [t.media, t.photos, t.entities?.media, t.extendedEntities?.media]) {
    if (!Array.isArray(list)) continue
    for (const m of list) {
      const url = m.mediaUrl || m.media_url_https || m.url || m.thumbnailUrl
      if (url && !urls.includes(url)) urls.push(url)
    }
  }
  return {
    itemId:           t.id || tweetUrl,
    title:            null,
    body:             t.text || '',
    author:           `@${t.author?.userName || ''}`,
    sourceUrl:        tweetUrl,
    imageUrls:        urls,
    publishedAt:      t.createdAt ? new Date(t.createdAt).toISOString() : null,
    originalTweetUrl: tweetUrl,
  }
}
