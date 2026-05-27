import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { requireAdmin } from '@/lib/admin-auth'

// Get authenticated Supabase client
async function getAuthenticatedSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

  if (!supabaseUrl || (!serviceKey && !anonKey)) {
    return null
  }

  // Use service role key if available, otherwise use anon key
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

// GET - Fetch all playlist items
export async function GET(request) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response
  try {
    const supabase = await getAuthenticatedSupabase()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const { data: playlist, error } = await supabase
      .from('selection_playlist')
      .select(`
        *,
        artists (
          id,
          name,
          name_ja,
          prismic_uid
        )
      `)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching playlist:', error)
      return NextResponse.json(
        { error: 'Failed to fetch playlist' },
        { status: 500 }
      )
    }

    return NextResponse.json({ playlist: playlist || [] })
  } catch (error) {
    console.error('Playlist API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create new playlist item
export async function POST(request) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response
  try {
    const supabase = await getAuthenticatedSupabase()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Get current user from session
    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll()
    const authCookie = allCookies.find(cookie => 
      cookie.name.includes('sb-') && cookie.name.includes('-auth-token')
    )

    let userId = null
    if (authCookie) {
      const anonSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          }
        }
      )
      const { data: { session } } = await anonSupabase.auth.getSession()
      userId = session?.user?.id || null
    }

    const body = await request.json()
    const { title_en, title_ja, artist_id, artist_en, artist_ja, link, purchase_link, cover_url, release_date, display_order, source } = body

    if (!title_en || !artist_id || !link) {
      return NextResponse.json(
        { error: 'Missing required fields: title_en, artist_id, link' },
        { status: 400 }
      )
    }

    // Verify artist exists in database
    const { data: artist, error: artistFetchError } = await supabase
      .from('artists')
      .select('id, name, name_ja')
      .eq('id', artist_id)
      .single()

    if (artistFetchError || !artist) {
      return NextResponse.json(
        { error: 'Artist not found in database. Please select a valid artist.' },
        { status: 400 }
      )
    }

    // Use artist data from database
    const artistId = artist.id
    const finalArtistEn = artist.name
    const finalArtistJa = artist.name_ja || artist_ja || null

    const { data: newItem, error } = await supabase
      .from('selection_playlist')
      .insert({
        title_en,
        title_ja: title_ja || null,
        artist_en,
        artist_ja: artist_ja || null,
        artist_id: artistId, // Link to artists table
        link,
        purchase_link: purchase_link || null,
        cover_url: cover_url || null,
        release_date: release_date || null,
        author_id: userId,
        display_order: display_order || 0,
        source: source || 'manual'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating playlist item:', error)
      return NextResponse.json(
        { error: 'Failed to create playlist item' },
        { status: 500 }
      )
    }

    return NextResponse.json({ item: newItem }, { status: 201 })
  } catch (error) {
    console.error('Playlist API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update playlist item
export async function PUT(request) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response
  try {
    const supabase = await getAuthenticatedSupabase()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { id, title_en, title_ja, artist_id, artist_en, artist_ja, link, purchase_link, cover_url, release_date, display_order, source } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      )
    }

    // If artist_id is provided, verify it exists and get artist data
    let finalArtistEn = artist_en
    let finalArtistJa = artist_ja
    let finalArtistId = null

    if (artist_id) {
      const { data: artist, error: artistFetchError } = await supabase
        .from('artists')
        .select('id, name, name_ja')
        .eq('id', artist_id)
        .single()

      if (artistFetchError || !artist) {
        return NextResponse.json(
          { error: 'Artist not found in database. Please select a valid artist.' },
          { status: 400 }
        )
      }

      finalArtistId = artist.id
      finalArtistEn = artist.name
      finalArtistJa = artist.name_ja || artist_ja || null
    }

    const updateData = {}
    if (title_en !== undefined) updateData.title_en = title_en
    if (title_ja !== undefined) updateData.title_ja = title_ja
    if (finalArtistEn !== undefined) updateData.artist_en = finalArtistEn
    if (finalArtistJa !== undefined) updateData.artist_ja = finalArtistJa
    if (finalArtistId !== null) updateData.artist_id = finalArtistId
    if (link !== undefined) updateData.link = link
    if (purchase_link !== undefined) updateData.purchase_link = purchase_link
    if (cover_url !== undefined) updateData.cover_url = cover_url
    if (release_date !== undefined) updateData.release_date = release_date
    if (display_order !== undefined) updateData.display_order = display_order
    if (source !== undefined) updateData.source = source

    const { data: updatedItem, error } = await supabase
      .from('selection_playlist')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating playlist item:', error)
      return NextResponse.json(
        { error: 'Failed to update playlist item' },
        { status: 500 }
      )
    }

    return NextResponse.json({ item: updatedItem })
  } catch (error) {
    console.error('Playlist API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete playlist item
export async function DELETE(request) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response
  try {
    const supabase = await getAuthenticatedSupabase()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required parameter: id' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('selection_playlist')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting playlist item:', error)
      return NextResponse.json(
        { error: 'Failed to delete playlist item' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Playlist API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

