import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { runReprocessBatch } from '@/lib/curation/processor'

const BATCH_SIZE = 5
const DEADLINE_MS = 25000 // stay safely under Vercel's 30s limit

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
  if (!supabaseUrl || (!serviceKey && !anonKey)) return null
  return createSupabaseClient(supabaseUrl, serviceKey || anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

// Re-classify all pending items in-place using the current prompt.
// IDs are snapshotted upfront so items that stay pending are not re-processed.
// Relevant items stay pending with refreshed translated_content.
// Items the AI now considers irrelevant are moved to rejected.
export async function POST() {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  const { data: pendingItems, error: fetchError } = await supabase
    .from('content_queue')
    .select('id')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }
  if (!pendingItems?.length) {
    return NextResponse.json({ processed: 0, pending: 0, rejected: 0, errors: [] })
  }

  const allIds = pendingItems.map(i => i.id)
  const deadline = Date.now() + DEADLINE_MS
  const totals = { processed: 0, pending: 0, rejected: 0, errors: [] }

  try {
    for (let i = 0; i < allIds.length && Date.now() < deadline; i += BATCH_SIZE) {
      const batch = allIds.slice(i, i + BATCH_SIZE)
      const results = await runReprocessBatch(supabase, batch)
      totals.processed += results.processed
      totals.pending   += results.pending
      totals.rejected  += results.rejected
      totals.errors.push(...(results.errors || []))
    }
    return NextResponse.json(totals)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 503 })
  }
}
