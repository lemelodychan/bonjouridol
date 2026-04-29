import { load } from 'cheerio'
import { parseHtmlBlocks, blocksToPlainText } from './htmlBlocks.js'

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; BonjourIdolBot/1.0; +https://bonjouridol.com)',
  'Accept': 'text/html,application/xhtml+xml',
  'Accept-Language': 'ja,en;q=0.9',
}

const MAX_ARTICLES_PER_SOURCE = 8

// Ordered list of CSS selectors tried in sequence to find the article body container.
// More specific / site-specific selectors come first.
const BODY_CONTAINER_SELECTORS = [
  // PR Times (id is most stable; class uses version number but also works)
  '#press-release-body',
  '[class^="press-release-body"]',
  // Legacy / other PR Times selectors
  '.press-body',
  '.article-body-block',
  // Generic Japanese news sites
  '.article_body',
  '.article__body',
  '.article-body',
  '.article-content',
  '.news-body',
  '.news__body',
  '.release-body',
  '.post-body',
  '.post-content',
  '.post__content',
  '.entry-content',
  '.entry-body',
  '.main-text',
  // Fallback structural
  'article .body',
  'article .content',
  'main article',
  'article',
]

/**
 * Scrape an HTML listing page and return raw_content objects for each article.
 *
 * crawlConfig shape:
 * {
 *   linkSelector:  CSS selector for article links on the listing page
 *   titleSelector: CSS selector for the article title on the article page
 *   bodySelector:  CSS selector for the article body container on the article page
 * }
 */
/**
 * Fetch a single article page and return its structured content.
 * Used when an item was crawled via RSS (no body_blocks) and we need
 * the full article on draft creation.
 */
export async function fetchSingleArticle(url) {
  return fetchArticlePage(url, {})
}

export async function fetchHTMLSource(pageUrl, crawlConfig = {}) {
  const listingHtml = await fetchWithTimeout(pageUrl)
  const $ = load(listingHtml)

  const articleLinks = extractArticleLinks($, pageUrl, crawlConfig.linkSelector)
  const newLinks = articleLinks.slice(0, MAX_ARTICLES_PER_SOURCE)

  const settled = await Promise.allSettled(
    newLinks.map(link => fetchArticlePage(link, crawlConfig))
  )

  return settled
    .filter(r => r.status === 'fulfilled' && r.value)
    .map(r => r.value)
}

async function fetchArticlePage(url, crawlConfig) {
  const html = await fetchWithTimeout(url)
  const $ = load(html)

  const title  = extractTitle($, crawlConfig.titleSelector)
  const blocks = extractContentBlocks($, crawlConfig.bodySelector)
  const body   = blocks.length > 0
    ? blocksToPlainText(blocks)
    : extractBodyFallback($)

  if (!title && !body) return null

  // Collect images: og:image first, then deduplicate against block images
  const blockImageUrls = blocks.filter(b => b.type === 'image').map(b => b.url)
  const ogImage = $('meta[property="og:image"]').attr('content')
  const imageUrls = ogImage && !blockImageUrls.includes(ogImage)
    ? [ogImage, ...blockImageUrls]
    : blockImageUrls.length > 0 ? blockImageUrls : (ogImage ? [ogImage] : [])

  return {
    itemId:      url,
    title:       title || null,
    body:        body.slice(0, 8000),
    bodyBlocks:  blocks.length > 0 ? blocks : null,
    author:      null,
    sourceUrl:   url,
    imageUrls,
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
  const base  = new URL(baseUrl)
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
      if (new URL(resolved).hostname === base.hostname) links.add(resolved)
    } catch { /* skip malformed URLs */ }
  })

  return [...links]
}

function extractContentBlocks($, bodySelector) {
  // Try explicit selector first, then fall through common patterns
  const selectors = bodySelector
    ? [bodySelector, ...BODY_CONTAINER_SELECTORS]
    : BODY_CONTAINER_SELECTORS

  for (const sel of selectors) {
    const $container = $(sel).first()
    if ($container.length && $container.text().trim().length > 100) {
      return parseHtmlBlocks($, $container)
    }
  }

  return []
}

function extractBodyFallback($) {
  // Last resort: og:description
  return $('meta[property="og:description"]').attr('content')?.trim() || ''
}

function extractTitle($, selector) {
  if (selector) {
    const text = $(selector).first().text().trim()
    if (text) return text
  }
  const ogTitle = $('meta[property="og:title"]').attr('content')
  if (ogTitle) return ogTitle.trim()
  return $('title').text().trim() || null
}

function extractPublishedAt($) {
  const dateStr =
    $('meta[property="article:published_time"]').attr('content') ||
    $('time[datetime]').first().attr('datetime')
  if (!dateStr) return null
  try { return new Date(dateStr).toISOString() } catch { return null }
}
