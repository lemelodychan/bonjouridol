import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { runProcessQueue } from '@/lib/curation/processor'
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

// UI-facing endpoint called by the "Process queue" button in the admin dashboard.
// No CRON_SECRET required — relies on the admin panel being access-controlled.
export async function POST(request) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response
  const supabase = getSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  try {
    const results = await runProcessQueue(supabase)
    if (results.processed > 0) await logCrawlRun(supabase, 'process', 'manual', results)
    return NextResponse.json(results)
  } catch (err) {
    await logCrawlRun(supabase, 'process', 'manual', { errors: [err.message] })
    return NextResponse.json({ error: err.message }, { status: 503 })
  }
}
