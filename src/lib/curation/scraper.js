import { load } from 'cheerio'

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; BonjourIdolBot/1.0; +https://bonjouridol.com)',
  'Accept': 'text/html,application/xhtml+xml',
  'Accept-Language': 'ja,en;q=0.9',
}

// Max articles to fetch from a single HTML source per crawl run.
// Prevents timeouts when a site has many new articles.
const MAX_ARTICLES_PER_SOURCE = 8

/**
 * Scrape an HTML listing page and return raw_content objects for each article.
 *
 * crawlConfig shape:
 * {
 *   linkSelector:  CSS selector for article links on the listing page
 *                  default: tries common patterns
 *   titleSelector: CSS selector for the article title on the article page
 *                  default: falls back to <title> and og:title meta
 *   bodySelector:  CSS selector for the article body on the article page
 *                  default: falls back to og:description meta
 * }
 */
export async function fetchHTMLSource(pageUrl, crawlConfig = {}) {
  const listingHtml = await fetchWithTimeout(pageUrl)
  const $ = load(listingHtml)

  const articleLinks = extractArticleLinks($, pageUrl, crawlConfig.linkSelector)
  const newLinks = articleLinks.slice(0, MAX_ARTICLES_PER_SOURCE)

  const results = []

  // Fetch each article page in parallel (with individual error handling)
  const settled = await Promise.allSettled(
    newLinks.map(link => fetchArticlePage(link, crawlConfig))
  )

  for (const result of settled) {
    if (result.status === 'fulfilled' && result.value) {
      results.push(result.value)
    }
  }

  return results
}

async function fetchArticlePage(url, crawlConfig) {
  const html = await fetchWithTimeout(url)
  const $ = load(html)

  const title = extractTitle($, crawlConfig.titleSelector)
  const body = extractBody($, crawlConfig.bodySelector)

  if (!title && !body) return null

  return {
    itemId:    url,
    title:     title || null,
    body:      body || '',
    author:    null,
    sourceUrl: url,
    imageUrls: extractOgImage($),
    publishedAt:      extractPublishedAt($),
    originalTweetUrl: null,
  }
}

// ─── helpers ──────────────────────────────────────────────────────────────────

async function fetchWithTimeout(url, timeoutMs = 8000) {
  const res = await fetch(url, {
    headers: FETCH_HEADERS,
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return res.text()
}

function extractArticleLinks($, baseUrl, linkSelector) {
  const base = new URL(baseUrl)
  const links = new Set()

  const selector = linkSelector || [
    'article a[href]',
    'h2 a[href]',
    'h3 a[href]',
    '.article-list a[href]',
    '.news-list a[href]',
    '.press-release a[href]',
  ].join(', ')

  $(selector).each((_, el) => {
    let href = $(el).attr('href')
    if (!href || href.startsWith('#') || href.startsWith('mailto:')) return
    try {
      const resolved = new URL(href, base).href
      // Only keep links on the same domain
      if (new URL(resolved).hostname === base.hostname) links.add(resolved)
    } catch {
      // skip malformed URLs
    }
  })

  return [...links]
}

function extractTitle($, selector) {
  if (selector) {
    const text = $(selector).first().text().trim()
    if (text) return text
  }
  // Fallbacks
  const ogTitle = $('meta[property="og:title"]').attr('content')
  if (ogTitle) return ogTitle.trim()
  const title = $('title').text().trim()
  return title || null
}

function extractBody($, selector) {
  if (selector) {
    const text = $(selector).first().text().replace(/\s+/g, ' ').trim()
    if (text) return text
  }
  // Fallbacks — try common article body patterns
  for (const s of ['article', '.article-body', '.post-body', '.entry-content', 'main p']) {
    const text = $(s).text().replace(/\s+/g, ' ').trim()
    if (text && text.length > 100) return text.slice(0, 3000)
  }
  // Last resort: og:description
  return $('meta[property="og:description"]').attr('content')?.trim() || ''
}

function extractOgImage($) {
  const url = $('meta[property="og:image"]').attr('content')
  return url ? [url] : []
}

function extractPublishedAt($) {
  const dateStr =
    $('meta[property="article:published_time"]').attr('content') ||
    $('time[datetime]').first().attr('datetime')
  if (!dateStr) return null
  try {
    return new Date(dateStr).toISOString()
  } catch {
    return null
  }
}
