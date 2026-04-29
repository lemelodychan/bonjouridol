import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
  if (!supabaseUrl || (!serviceKey && !anonKey)) return null
  return createSupabaseClient(supabaseUrl, serviceKey || anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

// POST /api/admin/curation/queue/dismiss-rejected
// Soft-hides all rejected items by setting dismissed_at = now().
// Items remain in Supabase for AI feedback history but are hidden from the UI.
export async function POST() {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  const { error, count } = await supabase
    .from('content_queue')
    .update({ dismissed_at: new Date().toISOString() })
    .eq('status', 'rejected')
    .is('dismissed_at', null)
    .select('*', { count: 'exact', head: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, dismissed: count ?? 0 })
}
