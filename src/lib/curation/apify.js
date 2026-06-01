const ACTOR = 'apidojo~tweet-scraper'
const TWEETS_PER_HANDLE = 5

// Monthly Apify result cap. apidojo~tweet-scraper is ~$0.40 per 1000 results;
// 11,000 results ≈ $4.40, leaving ~$0.60 cushion under the $5/month free tier.
export const MONTHLY_TWEET_BUDGET = 11_000

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

  const input = {
    twitterHandles: cleanHandles,
    maxItems:       cleanHandles.length * TWEETS_PER_HANDLE,
    sort:           'Latest',
  }

  const res = await fetch(
    `https://api.apify.com/v2/acts/${ACTOR}/run-sync-get-dataset-items?token=${apiToken}&memory=128&timeout=30`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(38000),
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
    const handle = (tweet.author?.userName || '').toLowerCase()
    if (!handle) continue
    if (!byHandle.has(handle)) byHandle.set(handle, [])
    byHandle.get(handle).push(normalizeThirdParty(tweet))
  }
  return { byHandle, totalTweets: tweets.filter(t => !t.isRetweet && !t.error).length }
}

/**
 * Budget-aware wrapper around fetchApifyBatch. Reads the month-to-date counter
 * from curation_settings, resets it on month rollover, refuses to call Apify
 * once the cap is reached, and increments the counter after a successful call.
 *
 * Returns:
 *   { byHandle: Map, skipped: false }  on success
 *   { byHandle: null, skipped: true, reason: '...' }  when budget is exhausted
 */
export async function fetchApifyBatchWithBudget(supabase, handles) {
  if (!handles.length) return { byHandle: new Map(), skipped: false }

  const { data: settings } = await supabase
    .from('curation_settings')
    .select('apify_tweets_this_month, apify_month_start')
    .eq('id', 1)
    .single()

  const monthStart = new Date()
  monthStart.setUTCDate(1)
  monthStart.setUTCHours(0, 0, 0, 0)
  const monthStartIso = monthStart.toISOString().slice(0, 10) // YYYY-MM-DD

  let used = settings?.apify_tweets_this_month ?? 0
  const recordedStart = settings?.apify_month_start ?? null

  if (recordedStart !== monthStartIso) {
    used = 0
    await supabase
      .from('curation_settings')
      .update({ apify_tweets_this_month: 0, apify_month_start: monthStartIso })
      .eq('id', 1)
  }

  if (used >= MONTHLY_TWEET_BUDGET) {
    return {
      byHandle: null,
      skipped:  true,
      reason:   `Apify budget exhausted (${used}/${MONTHLY_TWEET_BUDGET} tweets this month) — using Nitter`,
    }
  }

  const { byHandle, totalTweets } = await fetchApifyBatch(handles)

  if (totalTweets > 0) {
    await supabase
      .from('curation_settings')
      .update({ apify_tweets_this_month: used + totalTweets })
      .eq('id', 1)
  }

  return { byHandle, skipped: false }
}

/**
 * Single-handle wrapper for the "Crawl now" button on a single source.
 * Bypasses the budget guard — admin-initiated, low-volume.
 */
export async function fetchApifyTweets(handle) {
  const { byHandle } = await fetchApifyBatch([handle])
  return byHandle.get(handle.replace(/^@/, '').toLowerCase()) || []
}

// ─── normalizer ──────────────────────────────────────────────────────────────

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
