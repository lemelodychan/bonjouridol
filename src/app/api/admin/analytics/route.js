import { NextResponse } from 'next/server'

const UMAMI_HOST = 'https://cloud.umami.is'
const UMAMI_WEBSITE_ID = 'f092e573-6aba-45f6-af52-71e7d3c51bd0'

/**
 * Proxy to Umami Cloud API — returns 30 days of daily pageviews/visitors
 * plus a summary for the period.
 *
 * Requires UMAMI_API_SECRET environment variable.
 * To get a key: Umami Cloud dashboard → Settings → API Keys → Create key.
 */
export async function GET() {
  const apiKey = process.env.UMAMI_API_SECRET

  if (!apiKey) {
    return NextResponse.json({
      configured: false,
      message: 'Add UMAMI_API_SECRET to your environment variables to enable traffic analytics.',
      pageviews: [],
      stats: null,
    })
  }

  const now = Date.now()
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000

  const headers = { Authorization: `Bearer ${apiKey}` }

  try {
    // Fetch daily bucketed pageviews + sessions, and period summary in parallel
    const pageviewsUrl = new URL(`${UMAMI_HOST}/api/websites/${UMAMI_WEBSITE_ID}/pageviews`)
    pageviewsUrl.searchParams.set('startAt', String(thirtyDaysAgo))
    pageviewsUrl.searchParams.set('endAt', String(now))
    pageviewsUrl.searchParams.set('unit', 'day')
    pageviewsUrl.searchParams.set('timezone', 'Europe/Paris')

    const statsUrl = new URL(`${UMAMI_HOST}/api/websites/${UMAMI_WEBSITE_ID}/stats`)
    statsUrl.searchParams.set('startAt', String(thirtyDaysAgo))
    statsUrl.searchParams.set('endAt', String(now))

    const [pageviewsRes, statsRes] = await Promise.all([
      fetch(pageviewsUrl.toString(), { headers }),
      fetch(statsUrl.toString(), { headers }),
    ])

    if (!pageviewsRes.ok) {
      const text = await pageviewsRes.text()
      console.error('Umami pageviews error:', pageviewsRes.status, text)
      return NextResponse.json(
        { configured: true, error: `Umami API error: ${pageviewsRes.status}`, pageviews: [], stats: null },
        { status: 502 }
      )
    }

    // Umami returns { pageviews: [{x: "YYYY-MM-DD ...", y: N}], sessions: [{x, y}] }
    const pvData = await pageviewsRes.json()
    const statsData = statsRes.ok ? await statsRes.json() : null

    // Merge pageviews and sessions arrays into a single per-day list
    const sessionsByDate = new Map(
      (pvData.sessions || []).map(s => [s.x?.slice(0, 10), s.y])
    )

    const daily = (pvData.pageviews || []).map(pv => ({
      date: pv.x?.slice(0, 10), // "YYYY-MM-DD"
      pageviews: pv.y ?? 0,
      visitors: sessionsByDate.get(pv.x?.slice(0, 10)) ?? 0,
    }))

    return NextResponse.json({
      configured: true,
      pageviews: daily,
      stats: statsData,   // { pageviews:{value,change}, visitors:{value,change}, ... }
      period: '30d',
    })
  } catch (e) {
    console.error('Analytics route error:', e)
    return NextResponse.json(
      { configured: true, error: e.message, pageviews: [], stats: null },
      { status: 500 }
    )
  }
}
