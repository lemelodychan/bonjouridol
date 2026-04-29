import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { runProcessQueue } from '@/lib/curation/processor'

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
export async function POST() {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  try {
    const results = await runProcessQueue(supabase)
    return NextResponse.json(results)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 503 })
  }
}
