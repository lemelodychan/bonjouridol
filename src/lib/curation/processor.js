import OpenAI from 'openai'

const MODEL = 'gpt-4o'
const MAX_ITEMS = 5  // processed sequentially; keep well within Vercel's 30s timeout

function buildSystemPrompt(artistNames, feedbackExamples, promptInstructions) {
  const artistList = artistNames.length > 0
    ? artistNames.join(', ')
    : 'Morning Musume, AKB48, SKE48, NMB48, HKT48, STU48, Nogizaka46, Sakurazaka46, Hinatazaka46, BEYOOOOONDS, Juice=Juice, ANGERME'

  const feedbackSection = feedbackExamples.length > 0
    ? `\n\nRecent curation decisions — calibrate your judgement against these:\n${feedbackExamples.map(f =>
        `- [${f.relevant ? 'RELEVANT' : 'NOT RELEVANT'}]${f.reason_category ? ` (${f.reason_category})` : ''} ${f.reason_text}`
      ).join('\n')}`
    : ''

  const customSection = promptInstructions?.trim()
    ? `\n\nAdditional instructions from the editorial team:\n${promptInstructions.trim()}`
    : ''

  return `You are a content curator for bonjouridol.com, an English-language news site covering the Japanese female idol industry.

INCLUDE:
- Japanese female idol groups and solo female artists
- Concert/live event announcements and tour dates
- New song, single, or album releases
- Member changes: graduations, new additions, hiatuses
- Official press releases from idol agencies
- Brand deals, tie-ups, collaborations involving idol groups
- Known artists in our directory: ${artistList}

EXCLUDE:
- Male idol groups (Johnny's/SMILE-UP, BE:FIRST, SixTONES, Snow Man, King & Prince, etc.)
- Anime, manga, voice actors, 2D/virtual characters, VTubers
- K-pop (unless a Japanese female idol group is directly involved)
- General entertainment or celebrity news unrelated to Japanese female idols
- Content that is clearly a duplicate of something already covered${feedbackSection}

For relevant content, translate from Japanese to natural, concise English.

For tweets, generate a suggested tweet in this exact format (fill in the bracketed parts):
【PRESS RELEASE】

[emoji] [1–2 sentence English summary of the news]

➡️ [source_url]

[author if available, e.g. @groupname]

#BonjourIdol #[GroupName] #[RelevantTag]${customSection}${feedbackSection}

Respond ONLY with valid JSON in exactly this shape — no markdown, no code fences:
{
  "relevant": boolean,
  "confidence": number (0.0–1.0),
  "reasoning": string (1–2 sentences),
  "type": "article" | "tweet",
  "en_title": string | null,
  "en_body": string | null,
  "idol_name": string | null,
  "suggested_tweet": string | null
}

idol_name: the primary artist or group name in natural English (e.g. "Morning Musume.'24", "AKB48", "Nogizaka46"). For tweets, use the "Source account" field as the definitive idol_name — it tells you whose account this is. Only deviate from it if the tweet is a retweet or quote-tweet that is clearly about a completely different artist. Use null if genuinely unknown.`
}

function buildUserPrompt(item) {
  const raw = item.raw_content || {}
  const url = item.type === 'tweet'
    ? (raw.original_tweet_url || raw.source_url || '')
    : (raw.source_url || '')
  const sourceAccountLine = item.type === 'tweet' && raw.source_label
    ? `\nSource account (owner of this Twitter account): ${raw.source_label}`
    : ''
  return `Source type hint: ${item.type}${sourceAccountLine}
Title: ${raw.title || '(none)'}
Author: ${raw.author || '(unknown)'}
Source URL: ${url}
Published: ${raw.published_at || 'unknown'}

Content:
${(raw.body || '').slice(0, 2000)}`
}

/**
 * Process up to MAX_ITEMS raw queue items through the OpenAI classification pipeline.
 * Returns { processed, pending, rejected, errors }.
 */
export async function runProcessQueue(supabase) {
  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey) throw new Error('OPENAI_API_KEY not configured')

  // maxRetries=3: enough to handle transient 429s without risking Vercel's 30s timeout.
  // Exponential backoff is ~0.5s + 1s + 2s = up to ~4s of retries per item.
  const openai = new OpenAI({ apiKey: openaiKey, maxRetries: 3 })

  const { data: items, error: itemsError } = await supabase
    .from('content_queue')
    .select('*')
    .eq('status', 'raw')
    .order('created_at', { ascending: true })
    .limit(MAX_ITEMS)

  if (itemsError) throw new Error(itemsError.message)

  if (!items?.length) {
    return { processed: 0, pending: 0, rejected: 0, errors: [] }
  }

  const { data: artists } = await supabase
    .from('artists')
    .select('name, name_ja')
    .order('name')
  const artistNames = (artists || []).flatMap(a => [a.name, a.name_ja].filter(Boolean))

  const { data: feedback } = await supabase
    .from('ai_feedback')
    .select('relevant, reason_category, reason_text')
    .order('created_at', { ascending: false })
    .limit(30)

  const { data: settings } = await supabase
    .from('curation_settings')
    .select('confidence_threshold, low_confidence_action, prompt_instructions')
    .eq('id', 1)
    .single()

  const confidenceThreshold = settings?.confidence_threshold ?? 0.5
  const lowConfidenceAction = settings?.low_confidence_action ?? 'flag'

  const systemPrompt = buildSystemPrompt(artistNames, feedback || [], settings?.prompt_instructions)
  const results = { processed: 0, pending: 0, rejected: 0, errors: [] }

  async function processOne(item) {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: buildUserPrompt(item) },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 800,
    })

    let parsed
    try {
      parsed = JSON.parse(completion.choices[0].message.content)
    } catch {
      results.errors.push(`Item ${item.id}: failed to parse AI response`)
      return
    }

    const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0
    const isLowConfidence = confidence < confidenceThreshold
    const shouldReject = !parsed.relevant || (isLowConfidence && lowConfidenceAction === 'auto_reject')
    const status = shouldReject ? 'rejected' : 'pending'

    await supabase
      .from('content_queue')
      .update({
        status,
        type:               parsed.type || item.type,
        translated_content: parsed.relevant ? {
          en_title:        parsed.en_title        || null,
          en_body:         parsed.en_body         || null,
          idol_name:       parsed.idol_name       || null,
          suggested_tweet: parsed.suggested_tweet || null,
        } : null,
        ai_reasoning:     parsed.reasoning   || null,
        ai_confidence:    confidence,
        ai_model_version: MODEL,
      })
      .eq('id', item.id)

    results.processed++
    if (status === 'pending') results.pending++
    else results.rejected++
  }

  // Sequential: each item waits for the previous to finish.
  // This naturally paces token usage to stay under the 30K TPM limit,
  // and the SDK's built-in retry handles any 429s that still occur.
  for (const item of items) {
    try {
      await processOne(item)
    } catch (err) {
      const detail = err.status ? `${err.status} — ${err.message}` : err.message
      results.errors.push(detail)
    }
  }

  return results
}
