import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { crawlActiveSources } from '@/lib/curation/crawlSources'
import { logCrawlRun } from '@/lib/curation/logRun'
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

// UI-facing crawl — no CRON_SECRET required.
// Called from the dashboard "Crawl all" button.
export async function POST(request) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response
  const supabase = getSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  try {
    const totals = await crawlActiveSources(supabase)
    await logCrawlRun(supabase, 'fetch', 'manual', totals)
    return NextResponse.json(totals)
  } catch (err) {
    await logCrawlRun(supabase, 'fetch', 'manual', { errors: [err.message] })
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
