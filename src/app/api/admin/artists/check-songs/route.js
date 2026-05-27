import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin-auth'

// Normalize function (same as in import route)
const normalizeString = (str) => {
  if (!str) return ''
  return str
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .normalize('NFKC')
    .replace(/[\u2605\u2606\u2729\u272A\u272B\u272C\u272D\u272E\u272F\u2730\u2731\u2732\u2733\u2734\u2735\u2736\u2737\u2738\u2739\u273A\u273B\u273C\u273D\u273E\u273F\u2740\u2741\u2742\u2743\u2744\u2745\u2746\u2747\u2748\u2749\u274A\u274B\u274C\u274D\u274E\u274F\u2750\u2751\u2752\u2753\u2754\u2755\u2756\u2757\u2758\u2759\u275A\u275B\u275C\u275D\u275E\u275F]/g, '')
    .replace(/[⭐︎⭐☆★✦✧✩✪✫✬✭✮✯✰]/g, '')
    .trim()
}

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

  if (!supabaseUrl || (!serviceKey && !anonKey)) {
    return null
  }

  return createSupabaseClient(
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
 * Check which songs from an artist's song_list already exist in the playlist
 */
export async function POST(request) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response
  try {
    const { songs, artistName } = await request.json()

    if (!songs || !Array.isArray(songs)) {
      return NextResponse.json(
        { error: 'Songs array is required' },
        { status: 400 }
      )
    }

    if (!artistName) {
      return NextResponse.json(
        { error: 'Artist name is required' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseClient()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      )
    }

    // Get all existing songs from playlist
    const { data: existingSongs, error: existingError } = await supabase
      .from('selection_playlist')
      .select('title_en, artist_en')

    if (existingError) {
      console.error('Error fetching existing songs:', existingError)
      return NextResponse.json(
        { error: 'Failed to fetch existing songs' },
        { status: 500 }
      )
    }

    // Create a Set of normalized title+artist combinations
    const existingSongsSet = new Set()
    for (const song of (existingSongs || [])) {
      if (song.title_en && song.artist_en) {
        const normalizedTitle = normalizeString(song.title_en)
        const normalizedArtist = normalizeString(song.artist_en)
        const songKey = `${normalizedTitle}|${normalizedArtist}`
        existingSongsSet.add(songKey)
      }
    }

    // Check each song from the artist
    const songStatus = songs.map((song, index) => {
      const songTitleEn = song.song_title_en || ''
      const songArtistEn = artistName || ''
      
      if (!songTitleEn) {
        return { index, exists: false }
      }

      const normalizedTitle = normalizeString(songTitleEn)
      const normalizedArtist = normalizeString(songArtistEn)
      const songKey = `${normalizedTitle}|${normalizedArtist}`
      
      const exists = existingSongsSet.has(songKey)
      
      return { index, exists }
    })

    return NextResponse.json({
      success: true,
      songStatus,
    })

  } catch (error) {
    console.error('Error checking songs:', error)
    return NextResponse.json(
      { error: 'Failed to check songs', message: error.message },
      { status: 500 }
    )
  }
}

