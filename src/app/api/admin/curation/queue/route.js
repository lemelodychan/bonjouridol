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

export async function GET(request) {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const type = searchParams.get('type')
  const sourceId = searchParams.get('source_id')
  const countOnly = searchParams.get('countOnly') === 'true'
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = parseInt(searchParams.get('limit') || '20', 10)

  // Return just the counts for the dashboard stat cards
  if (countOnly) {
    const statuses = ['raw', 'pending', 'approved', 'rejected', 'published']
    const counts = {}
    await Promise.all(
      statuses.map(async s => {
        const { count } = await supabase
          .from('content_queue')
          .select('*', { count: 'exact', head: true })
          .eq('status', s)
        counts[s] = count || 0
      })
    )
    return NextResponse.json({ counts })
  }

  let query = supabase
    .from('content_queue')
    .select(`
      *,
      source:content_sources(id, label, type)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (status) query = query.eq('status', status)
  if (type) query = query.eq('type', type)
  if (sourceId) query = query.eq('source_id', sourceId)

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    items: data || [],
    total: count || 0,
    page,
    limit,
  })
}
