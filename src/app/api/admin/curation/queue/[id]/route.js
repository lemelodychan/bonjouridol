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

// PATCH /api/admin/curation/queue/[id]
// { action: 'approve' | 'reject' | 'publish' | 'back_to_pending' | 'reset_draft' }
export async function PATCH(request, { params }) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response
  const supabase = getSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  const { id } = await params

  let body
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { action, reason_category, reason_text, translated_content } = body
  const validActions = ['approve', 'reject', 'publish', 'back_to_pending', 'reset_draft']

  if (!validActions.includes(action)) {
    return NextResponse.json({ error: `action must be one of: ${validActions.join(', ')}` }, { status: 400 })
  }

  let updates = {}

  if (action === 'back_to_pending') {
    updates = { status: 'pending', prismic_document_id: null, reviewed_at: null }
  } else if (action === 'reset_draft') {
    // Clear the Prismic document ID so a fresh draft can be created
    updates = { prismic_document_id: null }
  } else {
    const statusMap = { approve: 'approved', reject: 'rejected', publish: 'published' }
    updates = { status: statusMap[action], reviewed_at: new Date().toISOString() }
    if (action === 'approve' && translated_content !== undefined) {
      updates.translated_content = translated_content
    }
  }

  const { data: item, error: updateError } = await supabase
    .from('content_queue')
    .update(updates)
    .eq('id', id)
    .select('id, type, source_id, prismic_document_id')
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }
  if (!item) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 })
  }

  if (action === 'reject' && (reason_category || reason_text)) {
    await supabase.from('ai_feedback').insert({
      queue_item_id:   id,
      relevant:        false,
      reason_category: reason_category || 'other',
      reason_text:     reason_text || null,
      source_type:     item.type,
    })
  }

  return NextResponse.json({ success: true, status: updates.status || null })
}

// DELETE /api/admin/curation/queue/[id]
// Permanently removes the queue item. If a Prismic draft exists,
// it must be deleted manually in Prismic → Migration Releases.
export async function DELETE(request, { params }) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response
  const supabase = getSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  const { id } = await params

  const { data: item } = await supabase
    .from('content_queue')
    .select('prismic_document_id, raw_content')
    .eq('id', id)
    .single()

  const { error } = await supabase
    .from('content_queue')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (item?.raw_content?.image_folder) {
    await deleteItemImages(supabase, item.raw_content.image_folder)
  }

  return NextResponse.json({
    success: true,
    prismic_draft_orphaned: !!item?.prismic_document_id,
  })
}
