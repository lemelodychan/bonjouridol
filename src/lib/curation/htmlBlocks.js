/**
 * Walk a cheerio element's DOM tree to extract text with inline spans.
 * Preserves <strong>/<b> → 'strong', <em>/<i> → 'em'.
 * Returns { text: string, spans: Prismic span[] }
 */
function extractTextSpans($el) {
  let text = ''
  const spans = []

  function walk(node) {
    if (!node) return
    if (node.type === 'text') {
      text += node.data || ''
      return
    }
    if (node.type !== 'tag') return
    const tag = (node.name || '').toLowerCase()
    if (tag === 'br') { text += ' '; return }

    const start = text.length
    for (const child of (node.children || [])) walk(child)
    const end = text.length

    if (start < end) {
      if (tag === 'strong' || tag === 'b') spans.push({ type: 'strong', start, end })
      else if (tag === 'em' || tag === 'i') spans.push({ type: 'em', start, end })
    }
  }

  for (const child of ($el[0]?.children || [])) walk(child)

  // Trim leading whitespace and adjust span offsets accordingly
  const raw = text
  const leading = raw.length - raw.trimStart().length
  const trimmed = raw.trim()
  const adjusted = leading === 0 ? spans : spans
    .map(s => ({ ...s, start: s.start - leading, end: s.end - leading }))
    .filter(s => s.start >= 0 && s.end > s.start && s.end <= trimmed.length)

  return { text: trimmed, spans: adjusted }
}

/**
 * Parse an HTML string or Cheerio element into structured content blocks.
 * Returns an array of { type, text, spans?, url?, alt?, level? } objects
 * that can be stored in raw_content.body_blocks and later converted
 * to Prismic slices.
 */
export function parseHtmlBlocks($, container) {
  const blocks = []
  const seenImages = new Set()

  container.find('h1, h2, h3, h4, h5, h6, p, ul, ol, img, figure').each((_, el) => {
    const tag = el.name?.toLowerCase()
    const $el = $(el)

    if (['h1','h2','h3','h4','h5','h6'].includes(tag)) {
      const text = $el.text().replace(/\s+/g, ' ').trim()
      if (text) blocks.push({ type: 'heading', level: parseInt(tag[1]), text })

    } else if (tag === 'p') {
      if ($el.find('img').length && !$el.text().trim()) return
      const { text, spans } = extractTextSpans($el)
      const normalized = text.replace(/\s+/g, ' ').trim()
      if (normalized.length > 10) blocks.push({ type: 'paragraph', text: normalized, spans })

    } else if (tag === 'ul' || tag === 'ol') {
      $el.find('li').each((_, li) => {
        const { text, spans } = extractTextSpans($(li))
        const normalized = text.replace(/\s+/g, ' ').trim()
        if (normalized) blocks.push({ type: 'list_item', text: normalized, spans })
      })

    } else if (tag === 'img' || tag === 'figure') {
      const $img = tag === 'figure' ? $el.find('img').first() : $el
      const src =
        $img.attr('src') ||
        $img.attr('data-src') ||
        $img.attr('data-lazy-src') ||
        $img.attr('data-original')
      if (!src || src.startsWith('data:') || seenImages.has(src)) return
      const w = parseInt($img.attr('width') || '999')
      const h = parseInt($img.attr('height') || '999')
      if (w < 50 || h < 50) return
      seenImages.add(src)
      const caption = $el.find('figcaption').text().trim() || $img.attr('alt') || null
      blocks.push({ type: 'image', url: src, alt: caption })
    }
  })

  return blocks
}

/**
 * Convert body_blocks back to plain text (used as fallback body for the AI prompt).
 */
export function blocksToPlainText(blocks) {
  return blocks
    .filter(b => b.type !== 'image')
    .map(b => b.text)
    .join('\n\n')
}

/**
 * Convert body_blocks to an array of Prismic slices.
 * Consecutive text blocks are grouped into a single rich_text slice.
 * Each image block becomes its own image slice.
 * NOTE: this is the simple (untranslated) version — for full EN+JA slices
 * use the groupBlocks/translateGroups/buildSlices pipeline in the create route.
 */
export function blocksToSlices(blocks) {
  const slices = []
  let richText = null

  function flushRichText() {
    if (richText) { slices.push(richText); richText = null }
  }

  function ensureRichText() {
    if (!richText) {
      richText = {
        slice_type: 'rich_text',
        variation:  'default',
        primary: { text: [], text_ja: [] },
        items: [],
      }
    }
    return richText
  }

  for (const block of (blocks || [])) {
    if (block.type === 'image') {
      flushRichText()
      if (block.url) {
        const imageId = block.url.split('?')[0]
        const imagePrimary = {
          image: { id: imageId, url: block.url, alt: block.alt || null },
          is_fullwidth: true,
        }
        if (block.alt) imagePrimary.comment = block.alt
        slices.push({
          slice_type: 'image',
          variation:  'default',
          primary:    imagePrimary,
          items:      [],
        })
      }
    } else {
      const rt = ensureRichText()
      if (block.type === 'heading') {
        const level = Math.min(Math.max(block.level, 3), 6)
        rt.primary.text_ja.push({ type: `heading${level}`, text: block.text, spans: block.spans || [] })
      } else if (block.type === 'paragraph') {
        rt.primary.text_ja.push({ type: 'paragraph', text: block.text, spans: block.spans || [] })
      } else if (block.type === 'list_item') {
        rt.primary.text_ja.push({ type: 'list-item', text: block.text, spans: block.spans || [] })
      }
    }
  }

  flushRichText()
  return slices
}
