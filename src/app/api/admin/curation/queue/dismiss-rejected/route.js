import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { deleteItemImages } from '@/lib/curation/imageStorage'
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

// POST /api/admin/curation/queue/dismiss-rejected
// Soft-hides all rejected items by setting dismissed_at = now().
// Items remain in Supabase for AI feedback history but are hidden from the UI.
export async function POST(request) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response
  const supabase = getSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  // Fetch items first to clean up their images
  const { data: items, error: fetchError } = await supabase
    .from('content_queue')
    .select('raw_content')
    .eq('status', 'rejected')
    .is('dismissed_at', null)

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  // Delete Storage images for each item that has a folder (best-effort, in parallel)
  if (items?.length) {
    await Promise.allSettled(
      items
        .filter(i => i.raw_content?.image_folder)
        .map(i => deleteItemImages(supabase, i.raw_content.image_folder))
    )
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
