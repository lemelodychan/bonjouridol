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

/**
 * Daily article view traffic from Supabase (no Umami API key required).
 *
 * Query params: startAt (YYYY-MM-DD), endAt (YYYY-MM-DD) — defaults to last 30 days.
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
    const { data, error } = await db
      .from('article_views')
      .select('created_at, user_identifier')
      .gte('created_at', startISO)
      .lte('created_at', endISO)
      .limit(50000)

    if (error) {
      console.error('article_views query error:', error)
      return NextResponse.json(
        {
          configured: true,
          error: error.message,
          pageviews: [],
          stats: null,
        },
        { status: 500 }
      )
    }

    const viewsByDate = new Map()
    const visitorsByDate = new Map()

    for (const row of data || []) {
      const date = row.created_at?.slice(0, 10)
      if (!date) continue
      viewsByDate.set(date, (viewsByDate.get(date) || 0) + 1)
      if (!visitorsByDate.has(date)) visitorsByDate.set(date, new Set())
      if (row.user_identifier) visitorsByDate.get(date).add(row.user_identifier)
    }

    const daily = eachDay(startDateStr, endDateStr).map((date) => ({
      date,
      pageviews: viewsByDate.get(date) || 0,
      visitors: visitorsByDate.get(date)?.size || 0,
    }))

    const periodVisitors = new Set()
    for (const row of data || []) {
      if (row.user_identifier) periodVisitors.add(row.user_identifier)
    }

    const totalViews = daily.reduce((sum, d) => sum + d.pageviews, 0)

    return NextResponse.json({
      configured: true,
      source: 'supabase',
      pageviews: daily,
      stats: {
        pageviews: { value: totalViews },
        visitors: { value: periodVisitors.size },
      },
    })
  } catch (e) {
    console.error('Analytics route error:', e)
    return NextResponse.json(
      { configured: true, error: e.message, pageviews: [], stats: null },
      { status: 500 }
    )
  }
}
