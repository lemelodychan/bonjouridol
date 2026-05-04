import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function makeServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

export async function GET() {
  const supabase = makeServiceClient()
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

  const { data, error } = await supabase
    .from('insights_settings')
    .select('rate_limit_enabled, custom_instructions')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ settings: data })
}

export async function PUT(request) {
  const supabase = makeServiceClient()
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

  // Verify the caller is an admin via their access token
  const authHeader = request.headers.get('Authorization') || ''
  const token = authHeader.replace('Bearer ', '').trim()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user }, error: userError } = await supabase.auth.getUser(token)
  if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { rate_limit_enabled, custom_instructions } = await request.json()

  const { error } = await supabase
    .from('insights_settings')
    .update({
      rate_limit_enabled: Boolean(rate_limit_enabled),
      custom_instructions: custom_instructions?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
