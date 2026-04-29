import Parser from 'rss-parser'

// rss-parser configured to capture image attachments from media:content namespace
// (used by Nitter for tweet images) and content:encoded (used by some news sites)
const parser = new Parser({
  timeout: 10000,
  customFields: {
    item: [
      ['media:content', 'mediaContent', { keepArray: true }],
      ['media:thumbnail', 'mediaThumbnail'],
      ['content:encoded', 'contentEncoded'],
    ],
  },
})

/**
 * Fetch and parse a standard RSS feed.
 * Returns an array of normalised raw_content objects ready for content_queue.
 */
export async function fetchRSSFeed(url) {
  const feed = await parser.parseURL(url)

  return feed.items.map(item => {
    const body = stripHtml(item.contentSnippet || item.content || item.summary || item.title || '')
    return {
      itemId:    item.guid || item.link,
      title:     item.title   ? stripHtml(item.title).trim()   : null,
      body:      body.trim(),
      author:    item.creator || item.author || null,
      sourceUrl: item.link    || item.guid,
      imageUrls: extractImageUrls(item),
      publishedAt:      item.isoDate || null,
      originalTweetUrl: null,
    }
  })
}

/**
 * Fetch and parse a Nitter RSS feed for a given Twitter handle.
 * Nitter exposes twitter accounts as RSS at {nitterInstance}/{handle}/rss.
 *
 * Nitter-specific quirks handled here:
 * - Titles are "@handle: tweet text" — we strip the prefix
 * - Tweet body is in contentSnippet
 * - Images are in media:content elements
 * - Source URL is a nitter URL — we convert it to twitter.com for reference
 */
export async function fetchNitterFeed(nitterInstance, handle) {
  const url = `${nitterInstance.replace(/\/$/, '')}/${handle}/rss`
  const feed = await parser.parseURL(url)

  return feed.items.map(item => {
    const rawText = item.contentSnippet || item.content || ''
    const body = stripNitterHandle(rawText, handle).trim()

    return {
      itemId:    item.guid || item.link,
      title:     null, // tweet titles are noisy — body is the content
      body,
      author:    `@${handle}`,
      sourceUrl: item.link || item.guid,
      imageUrls: extractImageUrls(item),
      publishedAt:      item.isoDate || null,
      originalTweetUrl: toTwitterUrl(item.link || item.guid, nitterInstance),
    }
  })
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function stripHtml(str) {
  return str.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
}

function stripNitterHandle(text, handle) {
  // Nitter sometimes prefixes content with "@handle: " — strip it
  return text.replace(new RegExp(`^@?${handle}:\\s*`, 'i'), '').replace(/^RT @\w+:\s*/, '')
}

function extractImageUrls(item) {
  const urls = []

  // media:content elements (Nitter, some RSS feeds)
  if (item.mediaContent) {
    const items = Array.isArray(item.mediaContent) ? item.mediaContent : [item.mediaContent]
    for (const m of items) {
      const url = m?.$?.url || m?.url
      if (url && !urls.includes(url)) urls.push(url)
    }
  }

  // media:thumbnail
  if (item.mediaThumbnail) {
    const url = item.mediaThumbnail?.$?.url || item.mediaThumbnail?.url
    if (url && !urls.includes(url)) urls.push(url)
  }

  // <img> tags inside content HTML (covers content:encoded and Nitter descriptions)
  const html = item.contentEncoded || item['content:encoded'] || item.content || item.description || ''
  if (html) {
    for (const match of html.matchAll(/<img[^>]+src="([^"]+)"/g)) {
      if (!urls.includes(match[1])) urls.push(match[1])
    }
  }

  // enclosure (standard RSS image attachments)
  if (item.enclosure?.url && !urls.includes(item.enclosure.url)) {
    urls.push(item.enclosure.url)
  }

  return urls
}

function toTwitterUrl(nitterUrl, nitterInstance) {
  if (!nitterUrl || !nitterInstance) return null
  try {
    const nitterOrigin = new URL(nitterInstance).origin
    return nitterUrl.replace(nitterOrigin, 'https://x.com')
  } catch {
    return null
  }
}
