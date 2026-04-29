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

// Reset pending items back to raw then immediately process them.
// Useful after updating prompt instructions in Settings.
export async function POST() {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  const { error: resetError } = await supabase
    .from('content_queue')
    .update({
      status:             'raw',
      translated_content: null,
      ai_reasoning:       null,
      ai_confidence:      null,
      ai_model_version:   null,
    })
    .eq('status', 'pending')

  if (resetError) {
    return NextResponse.json({ error: resetError.message }, { status: 500 })
  }

  try {
    const results = await runProcessQueue(supabase)
    return NextResponse.json(results)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 503 })
  }
}
