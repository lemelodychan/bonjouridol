import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin-auth'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function toDateStr(d) {
  return d.toISOString().slice(0, 10)
}

function eachDay(startDateStr, endDateStr) {
  const days = []
  const d = new Date(startDateStr + 'T00:00:00')
  const end = new Date(endDateStr + 'T00:00:00')
  while (d <= end) {
    days.push(toDateStr(d))
    d.setDate(d.getDate() + 1)
  }
  return days
}

function isValidIp(ip) {
  return ip && ip !== 'unknown'
}

async function fetchAllArticleViews(db, startISO, endISO) {
  const PAGE = 1000
  const rows = []
  let from = 0

  while (true) {
    const { data, error } = await db
      .from('article_views')
      .select('created_at, ip_address')
      .gte('created_at', startISO)
      .lte('created_at', endISO)
      .order('created_at', { ascending: true })
      .range(from, from + PAGE - 1)

    if (error) throw error
    if (!data?.length) break

    rows.push(...data)
    if (data.length < PAGE) break
    from += PAGE
  }

  return rows
}

function aggregateArticleViews(rows, startDateStr, endDateStr) {
  const viewsByDate = new Map()
  const readersByDate = new Map()

  for (const row of rows) {
    const date = row.created_at?.slice(0, 10)
    if (!date) continue
    viewsByDate.set(date, (viewsByDate.get(date) || 0) + 1)
    if (isValidIp(row.ip_address)) {
      if (!readersByDate.has(date)) readersByDate.set(date, new Set())
      readersByDate.get(date).add(row.ip_address)
    }
  }

  const daily = eachDay(startDateStr, endDateStr).map((date) => ({
    date,
    pageviews: viewsByDate.get(date) || 0,
    visitors: readersByDate.get(date)?.size || 0,
  }))

  const periodReaders = new Set()
  for (const row of rows) {
    if (isValidIp(row.ip_address)) periodReaders.add(row.ip_address)
  }

  return {
    daily,
    stats: {
      pageviews: { value: daily.reduce((sum, d) => sum + d.pageviews, 0) },
      visitors: { value: periodReaders.size },
    },
  }
}

/**
 * Daily article views + unique readers (by IP) from article_views.
 *
 * Query params: startAt (YYYY-MM-DD), endAt (YYYY-MM-DD).
 */
export async function GET(request) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response

  const db = getSupabaseAdmin()
  if (!db) {
    return NextResponse.json({
      configured: false,
      message: 'Supabase is not configured.',
      pageviews: [],
      stats: null,
    })
  }

  const { searchParams } = new URL(request.url)
  const endDateStr = searchParams.get('endAt') || toDateStr(new Date())
  const startDateStr =
    searchParams.get('startAt') ||
    toDateStr(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))

  const startISO = new Date(startDateStr + 'T00:00:00').toISOString()
  const endISO = new Date(endDateStr + 'T23:59:59').toISOString()

  try {
    const { data: rpcData, error: rpcError } = await db.rpc('get_daily_article_view_stats', {
      start_at: startISO,
      end_at: endISO,
    })

    if (!rpcError && rpcData) {
      const viewsByDate = new Map(rpcData.map((r) => [r.date, Number(r.views)]))
      const readersByDate = new Map(rpcData.map((r) => [r.date, Number(r.readers)]))

      const daily = eachDay(startDateStr, endDateStr).map((date) => ({
        date,
        pageviews: viewsByDate.get(date) || 0,
        visitors: readersByDate.get(date) || 0,
      }))

      const totalViews = daily.reduce((sum, d) => sum + d.pageviews, 0)

      const { data: readerCount, error: readerError } = await db.rpc(
        'count_article_view_readers',
        { start_at: startISO, end_at: endISO }
      )

      if (readerError) {
        console.error('count_article_view_readers RPC error:', readerError)
      }

      return NextResponse.json({
        configured: true,
        source: 'articles',
        pageviews: daily,
        stats: {
          pageviews: { value: totalViews },
          visitors: { value: Number(readerCount) || 0 },
        },
      })
    }

    if (rpcError?.code !== 'PGRST202') {
      console.error('get_daily_article_view_stats RPC error:', rpcError)
    }

    const rows = await fetchAllArticleViews(db, startISO, endISO)
    const { daily, stats } = aggregateArticleViews(rows, startDateStr, endDateStr)

    return NextResponse.json({
      configured: true,
      source: 'articles',
      pageviews: daily,
      stats,
    })
  } catch (e) {
    console.error('Analytics route error:', e)
    return NextResponse.json(
      { configured: true, error: e.message, pageviews: [], stats: null },
      { status: 500 }
    )
  }
}
