import { createClient } from '@/prismicio'

const UMAMI_HOST = 'https://api.umami.is/v1'
const UMAMI_WEBSITE_ID = 'f092e573-6aba-45f6-af52-71e7d3c51bd0'
const APIFY_ACTOR = process.env.APIFY_ACTOR_ID || 'apidojo~tweet-scraper'
const IS_CUSTOM_ACTOR = !!process.env.APIFY_ACTOR_ID

function readableSlug(slug) {
  if (!slug) return ''
  let s = slug.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/-/g, ' ')
  return s.length > 40 ? s.slice(0, 38) + '…' : s
}

function pct(a, b) {
  if (!b) return null
  const diff = Math.round((a - b) / b * 100)
  return `${diff >= 0 ? '+' : ''}${diff}%`
}

function avg(nums) {
  const valid = nums.filter(n => n != null)
  return valid.length ? valid.reduce((s, n) => s + n, 0) / valid.length : 0
}

function contentLabel(meta) {
  if (!meta) return null
  const parts = []
  if (meta.contentType) parts.push(meta.contentType)
  if (meta.hasGallery)  parts.push('original photos')
  return parts.length ? parts.join(' + ') : null
}

// Fetch type, title, and gallery_link for a list of article UIDs in parallel
async function fetchArticleMetadata(rawSlugs) {
  if (!rawSlugs?.length) return {}
  try {
    const client = createClient()
    const docs = await Promise.all(
      rawSlugs.map(slug =>
        client.getByUID('articles', slug, {
          fetch: ['articles.type', 'articles.title', 'articles.gallery_link'],
        }).catch(() => null)
      )
    )
    const meta = {}
    for (const doc of docs) {
      if (!doc) continue
      meta[doc.uid] = {
        title:       doc.data.title       || null,
        contentType: doc.data.type        || null,
        hasGallery:  !!doc.data.gallery_link?.id,
      }
    }
    return meta
  } catch {
    return {}
  }
}

async function fetchUmamiData(boundaries) {
  const apiKey = process.env.UMAMI_API_SECRET
  if (!apiKey) return null

  const h = { Authorization: `Bearer ${apiKey}` }
  const base = `${UMAMI_HOST}/websites/${UMAMI_WEBSITE_ID}`

  const [s0, s1, s2, s3, pagesRes] = await Promise.all([
    fetch(`${base}/stats?startAt=${boundaries[1]}&endAt=${boundaries[0]}`, { headers: h }),
    fetch(`${base}/stats?startAt=${boundaries[2]}&endAt=${boundaries[1]}`, { headers: h }),
    fetch(`${base}/stats?startAt=${boundaries[3]}&endAt=${boundaries[2]}`, { headers: h }),
    fetch(`${base}/stats?startAt=${boundaries[4]}&endAt=${boundaries[3]}`, { headers: h }),
    fetch(`${base}/metrics?startAt=${boundaries[4]}&endAt=${boundaries[0]}&type=url&limit=10`, { headers: h }),
  ])

  const [w0, w1, w2, w3, pages] = await Promise.all([
    s0.ok ? s0.json() : null,
    s1.ok ? s1.json() : null,
    s2.ok ? s2.json() : null,
    s3.ok ? s3.json() : null,
    pagesRes.ok ? pagesRes.json() : null,
  ])

  return {
    weeklyPageviews: [w0?.pageviews?.value ?? 0, w1?.pageviews?.value ?? 0, w2?.pageviews?.value ?? 0, w3?.pageviews?.value ?? 0],
    weeklyVisitors:  [w0?.visitors?.value  ?? 0, w1?.visitors?.value  ?? 0, w2?.visitors?.value  ?? 0, w3?.visitors?.value  ?? 0],
    topPages: (pages || []).slice(0, 8).map(p => ({ url: p.x, views: p.y })),
  }
}

async function fetchSupabaseData(supabase, boundaries) {
  const monthAgoISO = new Date(boundaries[4]).toISOString()
  const nowISO      = new Date(boundaries[0]).toISOString()

  const [viewsRes, likesRes] = await Promise.all([
    supabase.from('article_views').select('slug, created_at').gte('created_at', monthAgoISO).lte('created_at', nowISO),
    supabase.from('article_likes').select('slug, like_count, created_at').gte('created_at', monthAgoISO).lte('created_at', nowISO),
  ])

  const viewRows = viewsRes.data || []
  const likeRows = likesRes.data || []

  function getBucket(isoTs) {
    const t = new Date(isoTs).getTime()
    if (t >= boundaries[1]) return 0
    if (t >= boundaries[2]) return 1
    if (t >= boundaries[3]) return 2
    return 3
  }

  const viewsByWeek  = [0, 0, 0, 0]
  const likesByWeek  = [0, 0, 0, 0]
  const viewsBySlugByWeek = {}
  const likesBySlug28d    = {}

  for (const r of viewRows) {
    if (!r.slug) continue
    const b = getBucket(r.created_at)
    viewsByWeek[b]++
    if (!viewsBySlugByWeek[r.slug]) viewsBySlugByWeek[r.slug] = [0, 0, 0, 0]
    viewsBySlugByWeek[r.slug][b]++
  }

  for (const r of likeRows) {
    if (!r.slug) continue
    const b = getBucket(r.created_at)
    likesByWeek[b] += r.like_count || 0
    likesBySlug28d[r.slug] = (likesBySlug28d[r.slug] || 0) + (r.like_count || 0)
  }

  // Keep rawSlug for Prismic lookup; readable slug for display
  const top28d = Object.entries(viewsBySlugByWeek)
    .map(([rawSlug, weeks]) => ({
      rawSlug,
      slug:        readableSlug(rawSlug),
      totalViews:  weeks.reduce((s, n) => s + n, 0),
      weeklyViews: weeks,
      totalLikes:  likesBySlug28d[rawSlug] || 0,
    }))
    .sort((a, b) => b.totalViews - a.totalViews)
    .slice(0, 8)

  const rising = Object.entries(viewsBySlugByWeek)
    .map(([rawSlug, weeks]) => {
      const thisWeek = weeks[0]
      const prevAvg  = avg(weeks.slice(1))
      return { rawSlug, slug: readableSlug(rawSlug), thisWeek, prevAvg, multiplier: prevAvg > 0 ? thisWeek / prevAvg : null }
    })
    .filter(a => a.thisWeek >= 5 && a.multiplier !== null && a.multiplier >= 1.5)
    .sort((a, b) => b.multiplier - a.multiplier)
    .slice(0, 3)

  return { viewsByWeek, likesByWeek, top28d, rising }
}

async function fetchQueueData(supabase, monthAgoISO) {
  const [pending, approved, recent] = await Promise.all([
    supabase.from('content_queue').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('content_queue').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('content_queue')
      .select('translated_content, type, status')
      .gte('created_at', monthAgoISO)
      .in('status', ['pending', 'approved', 'published'])
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const topics = (recent.data || [])
    .map(item => {
      const tc = item.translated_content
      if (!tc) return null
      return tc.idol_name || tc.group_handle || tc.title || null
    })
    .filter(Boolean)
    .slice(0, 10)

  return {
    pendingReview:       pending.count  || 0,
    approvedUnpublished: approved.count || 0,
    recentTopics:        topics,
  }
}

async function fetchTwitterData() {
  const apiToken = process.env.APIFY_API_TOKEN
  if (!apiToken) return null

  try {
    const input = IS_CUSTOM_ACTOR
      ? { handles: ['bonjour_idol'], maxTweetsPerHandle: 20 }
      : { twitterHandles: ['bonjour_idol'], maxItems: 20, sort: 'Latest' }

    const res = await fetch(
      `https://api.apify.com/v2/acts/${APIFY_ACTOR}/run-sync-get-dataset-items?token=${apiToken}&memory=128&timeout=30`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
        signal: AbortSignal.timeout(35000),
      }
    )

    if (!res.ok) return null
    const tweets = await res.json()
    if (!Array.isArray(tweets)) return null

    const results = tweets
      .filter(t => !t.isRetweet && !t.error)
      .slice(0, 20)
      .map(t => ({
        text:        (t.text || '').slice(0, 150),
        likes:       t.likeCount    ?? t.like_count    ?? 0,
        retweets:    t.retweetCount ?? t.retweet_count ?? 0,
        publishedAt: t.createdAt,
      }))

    return results.length > 0 ? results : null
  } catch {
    return null
  }
}

export async function collectWeeklyData(supabase) {
  const now = Date.now()

  const boundaries = [
    now,
    now - 7  * 24 * 60 * 60 * 1000,
    now - 14 * 24 * 60 * 60 * 1000,
    now - 21 * 24 * 60 * 60 * 1000,
    now - 28 * 24 * 60 * 60 * 1000,
  ]

  const monthAgoISO = new Date(boundaries[4]).toISOString()

  const [umami, supabaseStats, queue, twitter] = await Promise.allSettled([
    fetchUmamiData(boundaries),
    fetchSupabaseData(supabase, boundaries),
    fetchQueueData(supabase, monthAgoISO),
    fetchTwitterData(),
  ])

  // Enrich top articles and rising articles with Prismic content type + gallery info
  if (supabaseStats.status === 'fulfilled' && supabaseStats.value) {
    const { top28d, rising } = supabaseStats.value
    const allRawSlugs = [
      ...top28d.map(a => a.rawSlug),
      ...rising.map(a => a.rawSlug).filter(s => !top28d.find(a => a.rawSlug === s)),
    ]
    const meta = await fetchArticleMetadata(allRawSlugs)

    supabaseStats.value.top28d  = top28d.map(a => ({ ...a, meta: meta[a.rawSlug] || null }))
    supabaseStats.value.rising  = rising.map(a => ({ ...a, meta: meta[a.rawSlug] || null }))
  }

  const dataSources = []
  if (umami.status === 'fulfilled'   && umami.value)   dataSources.push('umami')
  if (supabaseStats.status === 'fulfilled')            dataSources.push('supabase')
  if (queue.status === 'fulfilled')                    dataSources.push('queue')
  if (twitter.status === 'fulfilled' && twitter.value) dataSources.push('twitter')

  return {
    weekStart: new Date(boundaries[4]).toISOString().slice(0, 10),
    weekEnd:   new Date(boundaries[0]).toISOString().slice(0, 10),
    umami:     umami.status === 'fulfilled'         ? umami.value         : null,
    supabase:  supabaseStats.status === 'fulfilled' ? supabaseStats.value : null,
    queue:     queue.status === 'fulfilled'         ? queue.value         : null,
    twitter:   twitter.status === 'fulfilled'       ? twitter.value       : null,
    dataSources,
  }
}

export function formatDataForPrompt(data) {
  const lines = [`4-week data report (${data.weekStart} → ${data.weekEnd}). Week 1 = this week (most recent), Week 4 = oldest.`]

  if (data.umami) {
    const { weeklyPageviews: pv, weeklyVisitors: vis, topPages } = data.umami
    const pvAvg = Math.round(avg(pv.slice(1)))
    lines.push(`\nTRAFFIC (Umami):`)
    lines.push(`- Pageviews per week (oldest→newest): ${pv.slice().reverse().join(' → ')}`)
    if (pvAvg > 0) lines.push(`- This week vs 3-week avg: ${pct(pv[0], pvAvg)} (avg was ${pvAvg})`)
    lines.push(`- Unique visitors this week: ${vis[0]}`)
    if (topPages?.length > 0) {
      lines.push(`- Top pages (28 days):`)
      topPages.slice(0, 6).forEach(p => lines.push(`  • ${p.url} — ${p.views} views`))
    }
  }

  if (data.supabase) {
    const { viewsByWeek: vw, likesByWeek: lw, top28d, rising } = data.supabase
    const vAvg = Math.round(avg(vw.slice(1)))
    const lAvg = Math.round(avg(lw.slice(1)))

    lines.push(`\nENGAGEMENT (internal):`)
    lines.push(`- Article views per week (oldest→newest): ${vw.slice().reverse().join(' → ')}`)
    if (vAvg > 0) lines.push(`- This week vs 3-week avg: ${pct(vw[0], vAvg)} (avg was ${vAvg})`)
    lines.push(`- Croissant (🥐) likes per week (oldest→newest): ${lw.slice().reverse().join(' → ')}`)
    if (lAvg > 0) lines.push(`- Likes this week vs avg: ${pct(lw[0], lAvg)}`)

    if (top28d?.length > 0) {
      lines.push(`- Top articles over 28 days:`)
      top28d.slice(0, 6).forEach(a => {
        const label = contentLabel(a.meta)
        const trend = a.weeklyViews.slice().reverse().join('→')
        const titlePart = a.meta?.title ? `"${a.meta.title}"` : `"${a.slug}"`
        const typePart  = label ? ` [${label}]` : ''
        lines.push(`  • ${titlePart}${typePart} — ${a.totalViews} views (${trend}), ${a.totalLikes} likes`)
      })
    }

    if (rising?.length > 0) {
      lines.push(`- Surging this week:`)
      rising.forEach(a => {
        const label     = contentLabel(a.meta)
        const titlePart = a.meta?.title ? `"${a.meta.title}"` : `"${a.slug}"`
        const typePart  = label ? ` [${label}]` : ''
        const mult      = a.multiplier ? `${a.multiplier.toFixed(1)}×` : ''
        lines.push(`  • ${titlePart}${typePart} — ${a.thisWeek} views this week (${mult} above 3-week avg of ${Math.round(a.prevAvg)})`)
      })
    }
  }

  if (data.queue) {
    lines.push(`\nCONTENT QUEUE:`)
    lines.push(`- ${data.queue.pendingReview} items waiting for review`)
    lines.push(`- ${data.queue.approvedUnpublished} approved items not yet published to the site`)
    if (data.queue.recentTopics?.length > 0) {
      lines.push(`- Topics in queue (last 28 days): ${data.queue.recentTopics.join(', ')}`)
    }
  }

  if (data.twitter?.length > 0) {
    const avgLikes = Math.round(data.twitter.reduce((s, t) => s + t.likes, 0) / data.twitter.length)
    const top = [...data.twitter].sort((a, b) => b.likes - a.likes)[0]
    lines.push(`\nTWITTER (@bonjour_idol):`)
    lines.push(`- ${data.twitter.length} recent tweets, avg ${avgLikes} likes each`)
    if (top?.text) lines.push(`- Best tweet: "${top.text}" — ${top.likes} likes, ${top.retweets} retweets`)
  }

  return lines.join('\n')
}
