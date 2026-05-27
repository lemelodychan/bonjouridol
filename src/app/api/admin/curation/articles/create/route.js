import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { fetchSingleArticle } from '@/lib/curation/scraper'
import { requireAdmin } from '@/lib/admin-auth'

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
  if (!supabaseUrl || (!serviceKey && !anonKey)) return null
  return createSupabaseClient(supabaseUrl, serviceKey || anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function slugify(text) {
  return (text || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')   // strip leading / trailing dashes
    .slice(0, 80)
    .replace(/-+$/g, '')       // re-strip if slice cut in the middle of a dash run
}

function toRichText(text) {
  if (!text?.trim()) return []
  return text.split(/\n{2,}/).map(para => ({
    type: 'paragraph',
    text: para.replace(/\n/g, ' ').trim(),
    spans: [],
  })).filter(p => p.text)
}

async function uploadImageToPrismic(imageUrl, repoName, token) {
  const imgRes = await fetch(imageUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; BonjourIdolBot/1.0; +https://bonjouridol.com)',
      'Referer': new URL(imageUrl).origin + '/',
      'Accept': 'image/*,*/*',
    },
    signal: AbortSignal.timeout(15000),
  })
  if (!imgRes.ok) throw new Error(`Image fetch ${imgRes.status} for ${imageUrl}`)
  const contentType = imgRes.headers.get('content-type') || 'image/jpeg'
  const buffer = await imgRes.arrayBuffer()
  const filename = new URL(imageUrl).pathname.split('/').pop()?.split('?')[0] || 'image.jpg'
  const formData = new FormData()
  formData.append('file', new Blob([buffer], { type: contentType }), filename)
  const uploadRes = await fetch('https://asset.prismic.io/assets', {
    method: 'POST',
    headers: {
      'repository': repoName,
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
    signal: AbortSignal.timeout(30000),
  })
  if (!uploadRes.ok) {
    const txt = await uploadRes.text()
    throw new Error(`Asset upload ${uploadRes.status}: ${txt.slice(0, 200)}`)
  }
  const asset = await uploadRes.json()
  if (!asset.id || !asset.url) throw new Error('Asset API returned no id/url')
  return { id: asset.id, url: asset.url }
}

const SYSTEM_PROMPT = `You are a senior content editor for bonjouridol.com, an English-language news site about Japanese female idols.

You receive raw Japanese article data and produce a fully structured Prismic CMS draft in JSON.

━━━ YOUR EDITORIAL ROLE ━━━
- Decide the article type, structure, and which Prismic slices best represent the content
- Write natural, journalistic English — not literal word-for-word translation
- Keep text_ja faithful to the original Japanese
- Preserve the full content of the original article — do NOT skip, summarise, or shorten sections; every paragraph, list, and detail from the source should appear in the output
- Group related ideas into the same slice; split into new slices at major section changes
- Each rich_text slice should contain 1–5 blocks; prefer more focused slices over one large one
- Use headings (title_en / title_ja) only when the content genuinely has a named section
- Convert prose bullet lists into list_item blocks; leave connected prose as paragraphs
- Place images at editorially appropriate positions in the content flow

━━━ WRITING STYLE ━━━
- Titles must be punchy and fan-oriented, not literal translations.
  Good: "FRUPPA-RADE is Here! FRUITS ZIPPER Kicks Off Massive 16-Show Arena Tour"
  Bad:  "FRUITS ZIPPER Announces Arena Tour"
- Adapt Japanese song/release titles phonetically or creatively where they have no official EN name
- Use music press register — write for idol fans, not a news wire
- Tour/event schedules: format each date as a bilingual list_item:
  "April 24 (Fri) – Yokohama Arena, Kanagawa (神奈川県 横浜アリーナ)"
  Include every date — do not truncate schedules

━━━ ARTICLE TYPES (pick the most appropriate) ━━━
"Press release" — official announcements, new releases, event announcements
"Live report"   — concert/live event coverage
"Interview"     — Q&A content
"Discovery"     — artist introduction, profile piece
"Behind the scenes" — making-of, backstage, rehearsal content
"Editorial"     — opinion, analysis, commentary
"Other"         — anything else

━━━ AVAILABLE SLICES ━━━

1. rich_text — General text content
   Use for: body paragraphs, descriptions, background info, explanations
   { "type": "rich_text",
     "title_en": "Section heading (EN)" | null,
     "title_ja": "セクション見出し" | null,
     "blocks": [{ "block_type": "paragraph" | "list_item", "text_en": "...", "text_ja": "..." }] }

2. image — Standalone image
   Use for: article photos, promotional images
   { "type": "image", "index": <number from image list> }

3. purchase — Physical or digital release
   Use for: new single, album, CD, Blu-ray, DVD, or digital/streaming release announcements
   Include for BOTH physical AND digital-only releases (e.g. a song released only on streaming)
   Use one purchase slice per distinct release mentioned in the article
   { "type": "purchase",
     "cd_title": "Release title (EN or romanised)",
     "artist": "Artist name",
     "release_date": "YYYY-MM-DD" | null,
     "cd_cover_image_index": <image index> | null,
     "links": [{ "url": "https://...", "label": "Stream" | "Amazon" | "Apple Music" | etc. }] }

4. quote — Notable direct quote
   Use for: memorable statements, official comments, member quotes worth highlighting
   { "type": "quote", "text_en": "...", "text_ja": "...", "author": "Name" | null }

5. video — YouTube embed
   Use for: music videos, live clips, trailers — only when a YouTube ID is present in content
   { "type": "video", "youtube_id": "xxxxxxxxxxx", "caption": "..." | null }

6. social_links — External links
   Use for: the source article, official site, streaming links, event pages, ticket links found in the article
   ALWAYS include one social_links slice before the final authors slice
   Include the source URL provided in the user message
   { "type": "social_links", "links": [{ "url": "https://...", "label": "Label" }] }

7. authors — Article credits (ALWAYS the final slice, no exceptions)
   Leave all author fields empty — editors assign author documents manually
   { "type": "authors" }

8. separator — Visual divider
   Use sparingly between truly distinct major sections (e.g. between article body and setlist)
   { "type": "separator" }

9. setlist — Concert song list
   Use ONLY for actual live concert/event setlists (songs performed on stage)
   NEVER use for album track listings, CD contents, or release tracklists — represent those as list_item blocks inside a rich_text slice instead
   { "type": "setlist",
     "songs": [{ "number": "1", "title_en": "Song", "title_ja": "曲名" }],
     "encores": [{ "title_en": "Encore", "title_ja": "アンコール" }] }

10. interview — Q&A format
    Use for: interview articles with clear question/answer structure
    { "type": "interview",
      "questions": [{ "question_en": "...", "question_ja": "...", "answer_en": "...", "answer_ja": "..." }] }

━━━ OUTPUT FORMAT ━━━
Return a single JSON object (no markdown):
{
  "article_type": "<one of the type options above>",
  "featured_image_index": <number> | null,
  "slices": [ ...slices in order... ]
}

featured_image_index: index of the best hero image (null if none).
The slices array MUST end with social_links then authors.`

/**
 * Send the full article to GPT-4o acting as a content editor.
 * Returns { aiSlices, imagePool, articleType, featuredImageIndex }
 */
async function buildPrismicDraftWithAI(rawBlocks, rawTitle, rawBody, sourceUrl, extraImageUrls, enTitle, apiKey) {
  if (!apiKey) return null

  const imagePool = []
  const seenImageUrls = new Set()
  const contentLines = []

  for (const block of (rawBlocks || [])) {
    if (block.type === 'heading') {
      contentLines.push('#'.repeat(Math.min(Math.max(block.level, 1), 3)) + ' ' + block.text)
    } else if (block.type === 'paragraph') {
      contentLines.push(block.text)
    } else if (block.type === 'list_item') {
      contentLines.push(`• ${block.text}`)
    } else if (block.type === 'image' && block.url && !seenImageUrls.has(block.url)) {
      const idx = imagePool.length
      imagePool.push(block.url)
      seenImageUrls.add(block.url)
      contentLines.push(`[IMAGE ${idx}]${block.alt ? ` — ${block.alt}` : ''}`)
    }
  }

  for (const url of (extraImageUrls || [])) {
    if (url && !seenImageUrls.has(url)) {
      imagePool.push(url)
      seenImageUrls.add(url)
    }
  }

  const content = contentLines.join('\n\n') || rawBody || ''
  if (!content.trim()) return null

  const imageListText = imagePool.length > 0
    ? imagePool.map((url, i) => `[${i}] ${url}`).join('\n')
    : '(none)'

  const userContent = [
    `Title (JA): ${rawTitle || '(none)'}`,
    `Suggested EN title (for context): ${enTitle}`,
    sourceUrl ? `Source URL: ${sourceUrl}` : '',
    '',
    'Article content:',
    content,
    '',
    'Available images:',
    imageListText,
  ].filter(l => l !== null).join('\n')

  let completion
  try {
    const openai = new OpenAI({ apiKey })
    completion = await openai.chat.completions.create({
      model:           'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: userContent },
      ],
      response_format: { type: 'json_object' },
      temperature:     0.3,
      max_tokens:      4096,
    })
  } catch { return null }

  let parsed
  try { parsed = JSON.parse(completion.choices[0].message.content) } catch { return null }
  if (!Array.isArray(parsed?.slices)) return null

  return {
    aiSlices:           parsed.slices,
    imagePool,
    articleType:        parsed.article_type || null,
    featuredImageIndex: parsed.featured_image_index ?? null,
  }
}

function makeWebLink(url, label) {
  return { link_type: 'Web', url, text: label || url }
}

/**
 * Convert AI slice objects to final Prismic Migration API format.
 * Images are resolved from assetMap; slices whose required assets are missing are dropped.
 */
function resolveAiSlices(aiSlices, imagePool, assetMap) {
  return aiSlices.flatMap(slice => {
    switch (slice.type) {

      case 'rich_text': {
        const primary = { text: [], text_ja: [] }
        if (slice.title_en) primary.title    = slice.title_en
        if (slice.title_ja) primary.title_ja = slice.title_ja
        for (const block of (slice.blocks || [])) {
          const pt = block.block_type === 'list_item' ? 'list-item' : 'paragraph'
          if (block.text_en?.trim()) primary.text.push({ type: pt, text: block.text_en.trim(), spans: [] })
          if (block.text_ja?.trim()) primary.text_ja.push({ type: pt, text: block.text_ja.trim(), spans: [] })
        }
        if (!primary.text.length && !primary.text_ja.length && !primary.title && !primary.title_ja) return []
        return [{ slice_type: 'rich_text', variation: 'default', primary, items: [] }]
      }

      case 'image': {
        const url   = typeof slice.index === 'number' ? imagePool[slice.index] : null
        const asset = url && assetMap.get(url)
        if (!asset) return []
        return [{
          slice_type: 'image',
          variation:  'default',
          primary:    { image: { id: asset.id, url: asset.url, alt: null }, is_fullwidth: true },
          items:      [],
        }]
      }

      case 'purchase': {
        const primary = {}
        if (slice.cd_title)     primary.title        = slice.cd_title
        if (slice.artist)       primary.artist       = slice.artist
        if (slice.release_date) primary.release_date = slice.release_date
        if (typeof slice.cd_cover_image_index === 'number') {
          const url = imagePool[slice.cd_cover_image_index]
          const asset = url && assetMap.get(url)
          if (asset) primary.cd_cover = { id: asset.id, url: asset.url, alt: null }
        }
        const links = (slice.links || []).filter(l => l.url)
        if (links.length) primary.links = links.map(l => ({ link: makeWebLink(l.url, l.label) }))
        return [{ slice_type: 'purchase', variation: 'default', primary, items: [] }]
      }

      case 'quote': {
        const primary = {}
        if (slice.text_en) primary.quote    = [{ type: 'paragraph', text: slice.text_en, spans: [] }]
        if (slice.text_ja) primary.quote_jp = [{ type: 'paragraph', text: slice.text_ja, spans: [] }]
        if (slice.author)  primary.author   = slice.author
        if (!primary.quote && !primary.quote_jp) return []
        return [{ slice_type: 'quote', variation: 'default', primary, items: [] }]
      }

      case 'video': {
        if (!slice.youtube_id?.trim()) return []
        const primary = { youtube_id: slice.youtube_id.trim() }
        if (slice.caption) primary.caption = slice.caption
        return [{ slice_type: 'video', variation: 'default', primary, items: [] }]
      }

      case 'social_links': {
        const links = (slice.links || []).filter(l => l.url)
        if (!links.length) return []
        return [{
          slice_type: 'social_links',
          variation:  'default',
          primary:    { links: links.map(l => ({ link: makeWebLink(l.url, l.label) })) },
          items:      [],
        }]
      }

      case 'authors':
        return [{ slice_type: 'authors', variation: 'default', primary: {}, items: [] }]

      case 'separator':
        return [{ slice_type: 'separator', variation: 'default', primary: { style: 'Grey' }, items: [] }]

      case 'setlist': {
        const primary = {}
        if (slice.songs?.length) {
          primary.song = slice.songs.map(s => ({
            number:      s.number      || '',
            title_en:    s.title_en    || '',
            title_jp:    s.title_ja    || s.title_jp || '',
            is_favorite: false,
          }))
        }
        if (slice.encores?.length) {
          primary.encore_song = slice.encores.map(s => ({
            title_en:    s.title_en || '',
            title_jp:    s.title_ja || s.title_jp || '',
            is_favorite: false,
          }))
        }
        if (!primary.song?.length && !primary.encore_song?.length) return []
        return [{ slice_type: 'setlist', variation: 'default', primary, items: [] }]
      }

      case 'interview': {
        const questions = (slice.questions || [])
          .filter(q => q.question_en || q.answer_en)
          .map(q => ({
            question_en: q.question_en || '',
            question_jp: q.question_ja || q.question_jp || '',
            answer_en:   q.answer_en ? [{ type: 'paragraph', text: q.answer_en, spans: [] }] : [],
            answer_jp:   (q.answer_ja || q.answer_jp)
              ? [{ type: 'paragraph', text: q.answer_ja || q.answer_jp, spans: [] }]
              : [],
          }))
        if (!questions.length) return []
        return [{ slice_type: 'interview', variation: 'default', primary: { question: questions }, items: [] }]
      }

      default:
        return []
    }
  })
}

/**
 * Ensure slices always end with social_links (containing sourceUrl) then authors.
 * If the AI already included them, they stay in place; we only append what's missing.
 * If social_links already exists but sourceUrl isn't in it, we create a second one — editors can merge.
 */
function ensureTrailingSlices(slices, sourceUrl) {
  const result = [...slices]

  const hasAuthors      = result.some(s => s.slice_type === 'authors')
  const hasSocialLinks  = result.some(s => s.slice_type === 'social_links')

  if (!hasSocialLinks && sourceUrl) {
    result.push({
      slice_type: 'social_links',
      variation:  'default',
      primary:    { links: [{ link: makeWebLink(sourceUrl, 'Source') }] },
      items:      [],
    })
  }

  if (!hasAuthors) {
    result.push({ slice_type: 'authors', variation: 'default', primary: {}, items: [] })
  } else if (result[result.length - 1].slice_type !== 'authors') {
    // authors exists but isn't last — move it to the end
    const idx = result.findLastIndex(s => s.slice_type === 'authors')
    result.push(...result.splice(idx, 1))
  }

  return result
}

export async function POST(request) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response
  const supabase = getSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  const REPOSITORY_NAME = process.env.REPO_NAME
  const MIGRATION_TOKEN = process.env.PRISMIC_MASTER_TOKEN
  const OPENAI_KEY      = process.env.OPENAI_API_KEY
  if (!MIGRATION_TOKEN || !REPOSITORY_NAME) {
    return NextResponse.json({ error: 'Prismic Migration API not configured' }, { status: 500 })
  }

  let body
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { queue_item_id } = body
  if (!queue_item_id) {
    return NextResponse.json({ error: 'queue_item_id is required' }, { status: 400 })
  }

  const { data: item, error: fetchError } = await supabase
    .from('content_queue')
    .select('*')
    .eq('id', queue_item_id)
    .single()

  if (fetchError || !item) {
    return NextResponse.json({ error: 'Queue item not found' }, { status: 404 })
  }
  if (item.status !== 'approved') {
    return NextResponse.json({ error: 'Item must be approved before creating a draft' }, { status: 400 })
  }
  if (item.prismic_document_id) {
    return NextResponse.json({ error: 'Prismic draft already exists for this item' }, { status: 409 })
  }

  const translated = item.translated_content || {}
  const raw        = item.raw_content || {}

  const enTitle   = translated.en_title || raw.title || 'Untitled'
  const enBody    = translated.en_body  || ''
  const sourceUrl = raw.source_url || raw.original_tweet_url || null

  // Fetch full article body for RSS-sourced items (lazy enrichment)
  let rawBlocks = raw.body_blocks || null
  if (!rawBlocks && raw.source_url) {
    try {
      const fetched = await fetchSingleArticle(raw.source_url)
      if (fetched?.bodyBlocks?.length > 0) {
        rawBlocks = fetched.bodyBlocks
        await supabase.from('content_queue').update({
          raw_content: {
            ...raw,
            body_blocks: rawBlocks,
            body:        fetched.body || raw.body || '',
            image_urls:  fetched.imageUrls?.length ? fetched.imageUrls : raw.image_urls,
          },
        }).eq('id', queue_item_id)
      }
    } catch { /* fall through */ }
  }

  // Slug: YYYYMMDD-artist-name-title (never ends with a dash or special char)
  const today       = new Date().toISOString().split('T')[0]
  const dateCompact = today.replace(/-/g, '')
  const idolName    = translated.idol_name || raw.author || ''
  const artistSlug  = slugify(idolName)
  const titleSlug   = slugify(enTitle).slice(0, 50).replace(/-+$/g, '')
  const uid         = [dateCompact, artistSlug, titleSlug].filter(Boolean).join('-')
  const releaseTitle = `New Article - ${today} - ${enTitle.slice(0, 60)}`

  let slices        = []
  let featuredAsset = null
  let articleType   = 'Press release'
  const uploadErrors = []

  const aiResult = await buildPrismicDraftWithAI(
    rawBlocks, raw.title, raw.body, sourceUrl, raw.image_urls || [], enTitle, OPENAI_KEY
  )

  if (aiResult) {
    const { aiSlices, imagePool, articleType: suggestedType, featuredImageIndex } = aiResult

    if (suggestedType) articleType = suggestedType

    // Collect all image URLs the AI referenced (body images + featured)
    const urlsToUpload = new Set(
      aiSlices
        .flatMap(s => {
          if (s.type === 'image' && typeof s.index === 'number') return [imagePool[s.index]]
          if (s.type === 'purchase' && typeof s.cd_cover_image_index === 'number') return [imagePool[s.cd_cover_image_index]]
          return []
        })
        .filter(Boolean)
    )
    if (featuredImageIndex !== null && imagePool[featuredImageIndex]) {
      urlsToUpload.add(imagePool[featuredImageIndex])
    }

    const uploadResults = await Promise.allSettled(
      [...urlsToUpload].map(async url => ({
        url,
        asset: await uploadImageToPrismic(url, REPOSITORY_NAME, MIGRATION_TOKEN),
      }))
    )

    const assetMap = new Map()
    for (const r of uploadResults) {
      if (r.status === 'fulfilled') assetMap.set(r.value.url, r.value.asset)
      else uploadErrors.push(r.reason?.message || String(r.reason))
    }

    slices = resolveAiSlices(aiSlices, imagePool, assetMap)
    slices = ensureTrailingSlices(slices, sourceUrl)

    const featuredUrl = featuredImageIndex !== null ? imagePool[featuredImageIndex] : null
    featuredAsset = (featuredUrl && assetMap.get(featuredUrl))
      || (assetMap.size > 0 ? [...assetMap.values()][0] : null)

  } else {
    // Fallback: single summary slice + mandatory trailing slices
    const primary = {
      text:    toRichText(enBody),
      text_ja: toRichText(raw.body || ''),
    }
    if (enTitle)   primary.title    = enTitle
    if (raw.title) primary.title_ja = raw.title
    slices = [{ slice_type: 'rich_text', variation: 'default', primary, items: [] }]
    slices = ensureTrailingSlices(slices, sourceUrl)
  }

  const data = {
    title:            enTitle,
    type:             articleType,
    publication_date: today,
    slices,
  }
  if (idolName)      data.idol_name      = idolName
  if (featuredAsset) data.featured_image = { id: featuredAsset.id, url: featuredAsset.url }

  const document = {
    type:          String('articles'),
    uid:           String(uid),
    lang:          String('en-us'),
    title:         String(enTitle),
    release_title: String(releaseTitle),
    data,
    tags:          ['curation-agent'],
  }

  const createUrl = new URL('https://migration.prismic.io/documents')
  createUrl.searchParams.set('release_title', releaseTitle)

  const response = await fetch(createUrl.toString(), {
    method: 'POST',
    headers: {
      'repository':    REPOSITORY_NAME,
      'Authorization': `Bearer ${MIGRATION_TOKEN}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify(document),
  })

  const responseText = await response.text()

  if (!response.ok) {
    let msg = 'Failed to create Prismic draft'
    try {
      const e = JSON.parse(responseText)
      msg = e.message || msg
      if (e.details) msg += ': ' + JSON.stringify(e.details)
    } catch { msg = responseText.slice(0, 400) }
    return NextResponse.json({ error: msg }, { status: response.status })
  }

  let result = {}
  try { result = JSON.parse(responseText) } catch { /* ignore */ }

  const documentId = result.id || result.uid || result.document?.id || null

  if (documentId) {
    await supabase
      .from('content_queue')
      .update({ prismic_document_id: documentId })
      .eq('id', queue_item_id)
  }

  return NextResponse.json({
    success:      true,
    documentId,
    uid,
    releaseTitle,
    articleType,
    prismicUrl:   `https://${REPOSITORY_NAME}.prismic.io/migrations`,
    uploadErrors: uploadErrors.length > 0 ? uploadErrors : undefined,
  })
}
