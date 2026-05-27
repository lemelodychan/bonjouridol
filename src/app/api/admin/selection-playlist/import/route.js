import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient as createPrismicClient } from '@/prismicio'
import { requireAdmin } from '@/lib/admin-auth'

// Normalize function to handle whitespace, special characters, and case
// This ensures consistent duplicate detection
// Also normalizes ALL star/symbol variations for consistent matching
const normalizeString = (str) => {
  if (!str) return ''
  return str
    .trim() // Remove leading/trailing whitespace
    .toLowerCase() // Case insensitive
    .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width characters
    .normalize('NFKC') // Normalize Unicode (handles full-width/half-width, etc.)
    // Normalize ALL star/symbol variations to empty string for matching
    // This includes: ⭐, ⭐︎, ☆, ★, ✦, ✧, ✩, ✪, ✫, ✬, ✭, ✮, ✯, ✰, and more
    .replace(/[\u2605\u2606\u2729\u272A\u272B\u272C\u272D\u272E\u272F\u2730\u2731\u2732\u2733\u2734\u2735\u2736\u2737\u2738\u2739\u273A\u273B\u273C\u273D\u273E\u273F\u2740\u2741\u2742\u2743\u2744\u2745\u2746\u2747\u2748\u2749\u274A\u274B\u274C\u274D\u274E\u274F\u2750\u2751\u2752\u2753\u2754\u2755\u2756\u2757\u2758\u2759\u275A\u275B\u275C\u275D\u275E\u275F]/g, '')
    // Also catch any remaining star-like characters
    .replace(/[⭐︎⭐☆★✦✧✩✪✫✬✭✮✯✰]/g, '')
    .trim()
}

// Calculate Levenshtein distance between two strings (for fuzzy matching)
const levenshteinDistance = (str1, str2) => {
  const len1 = str1.length
  const len2 = str2.length
  const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0))

  for (let i = 0; i <= len1; i++) matrix[i][0] = i
  for (let j = 0; j <= len2; j++) matrix[0][j] = j

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,     // deletion
        matrix[i][j - 1] + 1,     // insertion
        matrix[i - 1][j - 1] + cost // substitution
      )
    }
  }

  return matrix[len1][len2]
}

// Calculate similarity percentage (0-1) between two strings
const calculateSimilarity = (str1, str2) => {
  if (!str1 || !str2) return 0
  const maxLen = Math.max(str1.length, str2.length)
  if (maxLen === 0) return 1
  const distance = levenshteinDistance(str1, str2)
  return 1 - (distance / maxLen)
}

// Get authenticated Supabase client
async function getAuthenticatedSupabase() {
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

// GET - Fetch importable songs from Prismic
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

    // Get all existing songs from Supabase for duplicate checking (case-insensitive)
    // Check both title_en and artist_en to avoid duplicates - includes ALL sources (manual + prismic)
    const { data: existingSongs, error: existingError } = await supabase
      .from('selection_playlist')
      .select('title_en, artist_en, source')

    if (existingError) {
      console.error('Error fetching existing songs:', existingError)
      return NextResponse.json(
        { error: 'Failed to fetch existing songs' },
        { status: 500 }
      )
    }

    // Create a Set of normalized title+artist combinations for fast duplicate checking
    // Format: "title|artist" (case-insensitive, normalized)
    const existingSongsSet = new Set()
    const existingSongsList = []
    
    for (const song of (existingSongs || [])) {
      // Ensure we have valid data
      if (!song.title_en || !song.artist_en) {
        continue
      }
      
      const normalizedTitle = normalizeString(song.title_en)
      const normalizedArtist = normalizeString(song.artist_en)
      const songKey = `${normalizedTitle}|${normalizedArtist}`
      
      existingSongsSet.add(songKey)
      existingSongsList.push({
        original: { title: song.title_en, artist: song.artist_en, source: song.source },
        normalized: { title: normalizedTitle, artist: normalizedArtist, key: songKey }
      })
    }

    // Fetch all Artist documents from Prismic
    // Only fetch the fields we need for better performance
    const prismicClient = createPrismicClient()
    const artistDocuments = await prismicClient.getAllByType('artist', {
      fetchLinks: false,
      graphQuery: `{
        artist {
          name_en
          name_jp
          song_list {
            song_title_en
            song_title_ja
            song_link
            song_cover
          }
        }
      }`
    })

    // Extract songs from all artists - include duplicates but mark them
    const allSongs = []
    
    for (const artist of artistDocuments) {
      const artistNameEn = artist.data.name_en || ''
      const artistNameJa = artist.data.name_jp || ''
      const songList = artist.data.song_list || []

      for (const song of songList) {
        const songTitleEn = song.song_title_en || ''
        const songTitleJa = song.song_title_ja || ''
        const songLink = song.song_link?.url || ''
        const songCover = song.song_cover?.url || ''

        // Skip if missing required fields
        if (!songTitleEn || !artistNameEn || !songLink) {
          continue
        }

        // Check for duplicate using both title and artist (normalized)
        const normalizedTitle = normalizeString(songTitleEn)
        const normalizedArtist = normalizeString(artistNameEn)
        const songKey = `${normalizedTitle}|${normalizedArtist}`
        
        // Check for exact duplicate
        const isDuplicate = existingSongsSet.has(songKey)
        
        // Check for close matches (fuzzy matching)
        let hasCloseMatch = false
        let closestMatch = null
        let maxSimilarity = 0
        
        if (!isDuplicate) {
          // Check similarity with existing songs
          for (const existingSong of existingSongsList) {
            const titleSimilarity = calculateSimilarity(
              normalizedTitle,
              existingSong.normalized.title
            )
            const artistSimilarity = calculateSimilarity(
              normalizedArtist,
              existingSong.normalized.artist
            )
            
            // Consider it a close match if either title or artist is >85% similar
            // and the other is at least >70% similar
            const combinedSimilarity = (titleSimilarity + artistSimilarity) / 2
            
            if (
              (titleSimilarity > 0.85 && artistSimilarity > 0.70) ||
              (artistSimilarity > 0.85 && titleSimilarity > 0.70) ||
              combinedSimilarity > 0.80
            ) {
              if (combinedSimilarity > maxSimilarity) {
                maxSimilarity = combinedSimilarity
                closestMatch = existingSong.original
                hasCloseMatch = true
              }
            }
          }
        }
        
        allSongs.push({
          title_en: songTitleEn,
          title_ja: songTitleJa,
          artist_en: artistNameEn,
          artist_ja: artistNameJa,
          link: songLink,
          cover_url: songCover,
          artist_uid: artist.uid,
          isDuplicate,
          hasCloseMatch,
          closestMatch, // Store the closest match for display
        })
      }
    }
    
    // Separate importable songs (not duplicates) for counting
    const importableSongs = allSongs.filter(song => !song.isDuplicate)

    return NextResponse.json({
      songs: allSongs, // Return all songs including duplicates
      count: importableSongs.length, // Count only non-duplicates
      totalExisting: existingSongs?.length || 0,
      duplicatesCount: allSongs.filter(s => s.isDuplicate).length,
      closeMatchesCount: allSongs.filter(s => s.hasCloseMatch && !s.isDuplicate).length,
    })
  } catch (error) {
    console.error('Import fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch importable songs', details: error.message },
      { status: 500 }
    )
  }
}

// POST - Import selected songs to Supabase
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

    const body = await request.json()
    const { songs } = body

    if (!songs || !Array.isArray(songs) || songs.length === 0) {
      return NextResponse.json(
        { error: 'No songs provided for import' },
        { status: 400 }
      )
    }

    // Get existing songs to check for duplicates before inserting
    const { data: existingSongs, error: existingError } = await supabase
      .from('selection_playlist')
      .select('title_en, artist_en')

    if (existingError) {
      console.error('Error fetching existing songs for duplicate check:', existingError)
      return NextResponse.json(
        { error: 'Failed to check for duplicates' },
        { status: 500 }
      )
    }

    // Create a Set of normalized existing song combinations (title|artist)
    const existingSongsSet = new Set(
      (existingSongs || []).map(song => 
        `${normalizeString(song.title_en)}|${normalizeString(song.artist_en)}`
      )
    )

    // Get or create artists for the songs
    const artistMap = new Map() // Map artist_en to artist_id
    
    // Get unique artist names from songs to import (with their Prismic UIDs)
    const uniqueArtistsMap = new Map()
    for (const song of songs) {
      if (song.artist_en && !uniqueArtistsMap.has(song.artist_en)) {
        uniqueArtistsMap.set(song.artist_en, {
          name: song.artist_en,
          name_ja: song.artist_ja,
          prismic_uid: song.artist_uid // Prismic Artist document UID
        })
      }
    }
    const uniqueArtists = Array.from(uniqueArtistsMap.keys())
    
    // Fetch existing artists
    const { data: existingArtists, error: artistsError } = await supabase
      .from('artists')
      .select('id, name, name_ja, prismic_uid')
      .in('name', uniqueArtists)
    
    if (artistsError) {
      console.error('Error fetching artists:', artistsError)
      return NextResponse.json(
        { error: 'Failed to fetch artists' },
        { status: 500 }
      )
    }
    
    // Map existing artists
    for (const artist of existingArtists || []) {
      artistMap.set(artist.name, {
        id: artist.id,
        name_ja: artist.name_ja,
        prismic_uid: artist.prismic_uid
      })
    }
    
    // Create missing artists and update Japanese names/Prismic UIDs
    const artistsToCreate = []
    const artistsToUpdate = []
    
    for (const artistName of uniqueArtists) {
      const artistInfo = uniqueArtistsMap.get(artistName)
      
      if (!artistMap.has(artistName)) {
        // Create new artist
        artistsToCreate.push({
          name: artistName,
          name_ja: artistInfo.name_ja || null,
          prismic_uid: artistInfo.prismic_uid || null,
          likes: 0
        })
      } else {
        // Update existing artist if needed
        const existingArtist = artistMap.get(artistName)
        const updates = {}
        
        // Update Japanese name if we have a better one from Prismic
        if (artistInfo.name_ja && (!existingArtist.name_ja || existingArtist.name_ja === '')) {
          updates.name_ja = artistInfo.name_ja
        }
        
        // Update Prismic UID if not set or if we have a new one
        if (artistInfo.prismic_uid && (!existingArtist.prismic_uid || existingArtist.prismic_uid === '')) {
          updates.prismic_uid = artistInfo.prismic_uid
        }
        
        if (Object.keys(updates).length > 0) {
          artistsToUpdate.push({
            id: existingArtist.id,
            ...updates
          })
        }
      }
    }
    
    // Create new artists
    if (artistsToCreate.length > 0) {
      const { data: newArtists, error: createError } = await supabase
        .from('artists')
        .insert(artistsToCreate)
        .select('id, name, name_ja, prismic_uid')
      
      if (createError) {
        console.error('Error creating artists:', createError)
        return NextResponse.json(
          { error: 'Failed to create artists' },
          { status: 500 }
        )
      }
      
      // Add new artists to map
      for (const artist of newArtists || []) {
        artistMap.set(artist.name, {
          id: artist.id,
          name_ja: artist.name_ja,
          prismic_uid: artist.prismic_uid
        })
      }
    }
    
    // Update existing artists with Japanese names and Prismic UIDs
    for (const update of artistsToUpdate) {
      const { id, ...updateData } = update
      await supabase
        .from('artists')
        .update(updateData)
        .eq('id', id)
    }

    // Filter out duplicates before insertion
    const songsToInsert = songs
      .filter(song => {
        const songKey = `${normalizeString(song.title_en)}|${normalizeString(song.artist_en)}`
        return !existingSongsSet.has(songKey)
      })
      .map(song => {
        const artistInfo = artistMap.get(song.artist_en)
        return {
          title_en: song.title_en,
          title_ja: song.title_ja || null,
          artist_en: song.artist_en,
          artist_ja: song.artist_ja || null,
          artist_id: artistInfo?.id || null, // Link to artists table
          link: song.link,
          cover_url: song.cover_url || null,
          purchase_link: null, // Not available from Prismic
          release_date: null, // Not available from Prismic
          source: 'prismic',
          display_order: 0,
          author_id: null,
        }
      })

    if (songsToInsert.length === 0) {
      return NextResponse.json({
        success: true,
        imported: 0,
        songs: [],
        message: 'All selected songs already exist in the playlist'
      })
    }

    // Insert songs in batch
    const { data: insertedSongs, error: insertError } = await supabase
      .from('selection_playlist')
      .insert(songsToInsert)
      .select()

    if (insertError) {
      console.error('Error inserting songs:', insertError)
      return NextResponse.json(
        { error: 'Failed to import songs', details: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      imported: insertedSongs.length,
      songs: insertedSongs,
    }, { status: 201 })
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json(
      { error: 'Failed to import songs', details: error.message },
      { status: 500 }
    )
  }
}

