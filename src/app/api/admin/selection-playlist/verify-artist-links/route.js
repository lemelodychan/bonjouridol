import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin-auth'

/**
 * Get authenticated Supabase client with service role key for admin operations
 */
async function getAuthenticatedSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

  if (!supabaseUrl || (!serviceKey && !anonKey)) {
    return null
  }

  return createClient(
    supabaseUrl,
    serviceKey || anonKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    }
  )
}

/**
 * Verify which playlist items are missing artist_id
 */
export async function GET(request) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response
  try {
    const supabase = await getAuthenticatedSupabase()

    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      )
    }

    // Get all items without artist_id
    const { data: missingItems, error: fetchError } = await supabase
      .from('selection_playlist')
      .select('id, title_en, artist_en, artist_id')
      .is('artist_id', null)
      .not('artist_en', 'is', null)
      .order('title_en', { ascending: true })

    if (fetchError) {
      return NextResponse.json({
        error: 'Failed to fetch items',
        details: fetchError.message
      }, { status: 500 })
    }

    // Get total count
    const { count: totalCount } = await supabase
      .from('selection_playlist')
      .select('*', { count: 'exact', head: true })

    const { count: withArtistIdCount } = await supabase
      .from('selection_playlist')
      .select('*', { count: 'exact', head: true })
      .not('artist_id', 'is', null)

    return NextResponse.json({
      success: true,
      stats: {
        total: totalCount || 0,
        with_artist_id: withArtistIdCount || 0,
        missing_artist_id: missingItems?.length || 0
      },
      missing_items: missingItems || []
    })

  } catch (error) {
    console.error('Verify API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

