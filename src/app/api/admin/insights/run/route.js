import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { collectWeeklyData } from '@/lib/insights/collect'
import { generateInsights } from '@/lib/insights/generate'
import { requireAdmin } from '@/lib/admin-auth'

const RATE_LIMIT_MS = 23 * 60 * 60 * 1000 // 23 hours

function makeSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

export async function POST(request) {
  const auth = await requireAdmin(request, { allowCron: true })
  if (!auth.ok) return auth.response

  const supabase = makeSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  // Cron calls bypass rate limit; manual calls from the admin UI are rate-limited
  const isCron = auth.cron === true

  // Read settings (rate limit toggle + custom instructions)
  const { data: settings } = await supabase
    .from('insights_settings')
    .select('rate_limit_enabled, custom_instructions')
    .single()

  const rateLimitEnabled = settings?.rate_limit_enabled ?? true

  if (!isCron && rateLimitEnabled) {
    const { data: latest } = await supabase
      .from('weekly_insights')
      .select('generated_at')
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (latest) {
      const elapsed = Date.now() - new Date(latest.generated_at).getTime()
      if (elapsed < RATE_LIMIT_MS) {
        const nextAvailable = new Date(new Date(latest.generated_at).getTime() + RATE_LIMIT_MS)
        return NextResponse.json({ error: 'Rate limited', nextAvailable }, { status: 429 })
      }
    }
  }

  try {
    const rawData = await collectWeeklyData(supabase)
    const insights = await generateInsights(rawData, settings?.custom_instructions)

    const { data: saved, error: saveError } = await supabase
      .from('weekly_insights')
      .insert({
        week_start:    rawData.weekStart,
        week_end:      rawData.weekEnd,
        insights,
        raw_data:      rawData,
        model_version: 'o4-mini',
        trigger:       isCron ? 'cron' : 'manual',
      })
      .select('id, generated_at, week_start, week_end, insights, trigger')
      .single()

    if (saveError) throw new Error(`Failed to save insights: ${saveError.message}`)

    return NextResponse.json({ insight: saved })
  } catch (e) {
    console.error('Insights generation error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
