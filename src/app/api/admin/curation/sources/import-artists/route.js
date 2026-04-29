import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient as createPrismicClient } from '@/prismicio'

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
  if (!supabaseUrl || (!serviceKey && !anonKey)) return null
  return createSupabaseClient(supabaseUrl, serviceKey || anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function extractHandle(twitterUrl) {
  try {
    const pathname = new URL(twitterUrl).pathname
    return pathname.replace(/^\//, '').split('/')[0].replace(/@/g, '').trim() || null
  } catch {
    return null
  }
}

// POST /api/admin/curation/sources/import-artists
// Reads all published artist documents from Prismic, extracts their Twitter handles,
// and creates content_sources rows for any not already present.
export async function POST() {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  let artists
  try {
    const prismic = createPrismicClient()
    artists = await prismic.getAllByType('artist', {
      fetch: ['artist.twitter', 'artist.name_en', 'artist.name'],
    })
  } catch (e) {
    return NextResponse.json({ error: `Prismic fetch failed: ${e.message}` }, { status: 502 })
  }

  const artistHandles = artists
    .map(doc => {
      const handle = extractHandle(doc.data.twitter?.url)
      if (!handle) return null
      const label = doc.data.name_en || doc.data.name || `@${handle}`
      return { handle, label }
    })
    .filter(Boolean)

  if (!artistHandles.length) {
    return NextResponse.json({ added: 0, skipped: 0, total: 0 })
  }

  const { data: existing } = await supabase
    .from('content_sources')
    .select('url')
    .eq('type', 'twitter')

  const existingHandles = new Set((existing || []).map(s => s.url.toLowerCase()))

  let added = 0
  let skipped = 0
  for (const { handle, label } of artistHandles) {
    if (existingHandles.has(handle.toLowerCase())) {
      skipped++
      continue
    }
    const { error } = await supabase
      .from('content_sources')
      .insert({ type: 'twitter', label, url: handle })
    if (!error) { added++; existingHandles.add(handle.toLowerCase()) }
  }

  return NextResponse.json({ added, skipped, total: artistHandles.length })
}
