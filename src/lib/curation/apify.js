const ACTOR = 'apidojo~tweet-scraper'
const MAX_ITEMS = 10 // free tier cap per query

/**
 * Fetch recent tweets for a Twitter handle via Apify Tweet Scraper V2.
 * Returns items in the same normalised shape as fetchNitterFeed.
 * Requires APIFY_API_TOKEN env var.
 */
export async function fetchApifyTweets(handle) {
  const apiToken = process.env.APIFY_API_TOKEN
  if (!apiToken) throw new Error('APIFY_API_TOKEN not set')

  const cleanHandle = handle.replace(/^@/, '')

  const res = await fetch(
    `https://api.apify.com/v2/acts/${ACTOR}/run-sync-get-dataset-items?token=${apiToken}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        twitterHandles: [cleanHandle],
        maxItems:       MAX_ITEMS,
        sort:           'Latest',
      }),
      signal: AbortSignal.timeout(25000),
    }
  )

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Apify ${res.status}: ${text.slice(0, 200)}`)
  }

  const tweets = await res.json()
  if (!Array.isArray(tweets)) throw new Error('Unexpected Apify response format')

  return tweets
    .filter(t => !t.isRetweet)
    .map(tweet => {
      const tweetUrl = tweet.url || tweet.twitterUrl
        || (tweet.id ? `https://x.com/${cleanHandle}/status/${tweet.id}` : null)
      return {
        itemId:          tweet.id || tweetUrl,
        title:           null,
        body:            tweet.text || '',
        author:          `@${tweet.author?.userName || cleanHandle}`,
        sourceUrl:       tweetUrl,
        imageUrls:       extractImages(tweet),
        publishedAt:     tweet.createdAt ? new Date(tweet.createdAt).toISOString() : null,
        originalTweetUrl: tweetUrl,
      }
    })
}

function extractImages(tweet) {
  const urls = []
  // Apify may expose media in different locations depending on actor version
  const candidates = [
    tweet.media,
    tweet.photos,
    tweet.entities?.media,
    tweet.extendedEntities?.media,
  ]
  for (const list of candidates) {
    if (!Array.isArray(list)) continue
    for (const m of list) {
      const url = m.mediaUrl || m.media_url_https || m.url || m.thumbnailUrl
      if (url && !urls.includes(url)) urls.push(url)
    }
  }
  return urls
}
