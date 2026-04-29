import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { deleteAllImages } from '@/lib/curation/imageStorage'

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
  if (!supabaseUrl || (!serviceKey && !anonKey)) return null
  return createSupabaseClient(supabaseUrl, serviceKey || anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

// POST /api/admin/curation/reset
// Wipes all crawl history for a clean slate.
// Deletes: content_queue, crawl_log, ai_feedback.
// Prismic drafts must be manually removed in Prismic → Migration Releases.
export async function POST() {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  const errors = []

  // Delete in dependency order: queue items first (ai_feedback references them via queue_item_id)
  const { error: feedbackErr } = await supabase
    .from('ai_feedback')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000') // match-all workaround

  if (feedbackErr) errors.push(`ai_feedback: ${feedbackErr.message}`)

  const { error: queueErr } = await supabase
    .from('content_queue')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')

  if (queueErr) errors.push(`content_queue: ${queueErr.message}`)

  const { error: logErr } = await supabase
    .from('crawl_log')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')

  if (logErr) errors.push(`crawl_log: ${logErr.message}`)

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join('; ') }, { status: 500 })
  }

  await deleteAllImages(supabase)

  return NextResponse.json({ success: true })
}
