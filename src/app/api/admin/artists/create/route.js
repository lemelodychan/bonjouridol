import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/prismicio'

// Get Supabase client
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
 * Create or update an artist document using Prismic Migration API
 * Also syncs with Supabase artists table
 * 
 * IMPORTANT: Documents created via Migration API are ALWAYS created as DRAFTS.
 * They must be manually reviewed and published in Prismic Dashboard > Migration Releases.
 */
export async function POST(request) {
  try {
    const artistData = await request.json()
    
    // Validate required fields
    if (!artistData.name_en || !artistData.name_en.trim() || !artistData.uid || !artistData.uid.trim()) {
      return NextResponse.json(
        { error: 'Name (EN) and UID are required and cannot be empty' },
        { status: 400 }
      )
    }

    const REPOSITORY_NAME = process.env.REPO_NAME
    const MIGRATION_TOKEN = process.env.PRISMIC_MASTER_TOKEN

    if (!MIGRATION_TOKEN) {
      return NextResponse.json(
        { error: 'Migration API token not configured' },
        { status: 500 }
      )
    }

    // Check if document with this UID already exists in Prismic
    let existingDocumentId = artistData.documentId || null
    let isUpdate = false
    
    if (!existingDocumentId) {
      try {
        const prismicClient = createClient()
        const existingDoc = await prismicClient.getByUID('artist', artistData.uid)
        if (existingDoc && existingDoc.id) {
          existingDocumentId = existingDoc.id
          isUpdate = true
          console.log(`Found existing artist document with UID "${artistData.uid}", will patch document ID: ${existingDocumentId}`)
        }
      } catch (error) {
        // Document doesn't exist, will create new one
        console.log(`No existing artist document found with UID "${artistData.uid}", will create new document`)
      }
    } else {
      isUpdate = true
    }
    
    const documentId = existingDocumentId

    // Format artist document for Migration API
    const data = {
      name_en: artistData.name_en || '',
      name_jp: artistData.name_jp || '',
      debut: artistData.debut || '',
      disband: artistData.disband || '',
      description: artistData.description || [],
      youtube_video: artistData.youtube_video || '',
      song_list: (artistData.song_list || []).map(song => ({
        song_title_en: song.song_title_en || '',
        song_title_ja: song.song_title_ja || '',
        song_link: song.song_link || { link_type: 'Any' },
        song_cover: song.song_cover || {},
      })),
    }

    // Only include profile_picture if it has a value
    if (artistData.profile_picture && typeof artistData.profile_picture === 'object') {
      data.profile_picture = artistData.profile_picture
    }

    // Only include social links if they have values
    if (artistData.website && typeof artistData.website === 'object') {
      data.website = artistData.website
    }
    if (artistData.twitter && typeof artistData.twitter === 'object') {
      data.twitter = artistData.twitter
    }
    if (artistData.instagram && typeof artistData.instagram === 'object') {
      data.instagram = artistData.instagram
    }
    if (artistData.youtube && typeof artistData.youtube === 'object') {
      data.youtube = artistData.youtube
    }
    if (artistData.tiktok && typeof artistData.tiktok === 'object') {
      data.tiktok = artistData.tiktok
    }

    const document = {
      type: 'artist',
      uid: (artistData.uid || '').trim(),
      lang: 'en-us',
      title: (artistData.name_en || '').trim(), // Required at root level
      data: data,
    }

    // Generate release title
    const releaseDate = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    const releaseTitle = `New Artists - ${releaseDate} - ${(artistData.name_en || '').trim()}`

    const documentToSend = {
      type: String('artist'),
      uid: String((artistData.uid || '').trim()),
      lang: String('en-us'),
      title: String((artistData.name_en || '').trim()),
      data: data,
      release_title: String(releaseTitle),
    }

    // Add tags to identify pending migrations
    const tags = ['pending-migration']
    if (tags.length > 0) {
      documentToSend.tags = tags
    }

    // Try Migration API
    let requestBody = documentToSend
    let response
    let responseText
    let wasUpdated = false

    if (isUpdate && documentId) {
      // Try to UPDATE existing document
      const updateUrl = `https://migration.prismic.io/documents/${documentId}`
      
      response = await fetch(updateUrl, {
        method: 'PUT',
        headers: {
          'repository': REPOSITORY_NAME,
          'Authorization': `Bearer ${MIGRATION_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })
      
      responseText = await response.text()
      
      if (response.ok) {
        wasUpdated = true
      } else if (response.status === 404 || response.status === 405 || response.status === 400) {
        console.log(`Update failed (${response.status}), falling back to create new document`)
      }
    }

    // If not updating (or update failed), create new document
    if (!wasUpdated) {
      const createUrl = new URL('https://migration.prismic.io/documents')
      createUrl.searchParams.set('release_title', releaseTitle)
      
      response = await fetch(createUrl.toString(), {
        method: 'POST',
        headers: {
          'repository': REPOSITORY_NAME,
          'Authorization': `Bearer ${MIGRATION_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      responseText = await response.text()

      // If creation fails with "document with this UID already exists", try to patch instead
      if (!response.ok) {
        try {
          const error = JSON.parse(responseText)
          
          // Check if error is about existing UID
          if (error.message && error.message.includes('already exists') && !isUpdate) {
            // Try to find the document again and patch it
            try {
              const prismicClient = createClient()
              const existingDoc = await prismicClient.getByUID('artist', artistData.uid)
              if (existingDoc && existingDoc.id) {
                console.log(`Document exists, switching to patch mode with ID: ${existingDoc.id}`)
                const patchUrl = `https://migration.prismic.io/documents/${existingDoc.id}`
                
                response = await fetch(patchUrl, {
                  method: 'PUT',
                  headers: {
                    'repository': REPOSITORY_NAME,
                    'Authorization': `Bearer ${MIGRATION_TOKEN}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(requestBody),
                })
                
                responseText = await response.text()
                if (response.ok) {
                  wasUpdated = true
                }
              }
            } catch (patchError) {
              console.error('Error patching existing document:', patchError)
            }
          }
          
          // If still not OK and not a UID conflict, try wrapped format
          if (!response.ok && !error.message?.includes('already exists')) {
            if (error.details && error.details.some(d => 
              d.property === 'title' || 
              d.property === 'type' || 
              d.property === 'lang' ||
              d.property === 'release_title' ||
              d.property?.includes('release')
            )) {
              requestBody = {
                documents: [documentToSend],
                release_title: releaseTitle,
              }
              const wrappedUrl = new URL('https://migration.prismic.io/documents')
              wrappedUrl.searchParams.set('release_title', releaseTitle)
              
              response = await fetch(wrappedUrl.toString(), {
                method: 'POST',
                headers: {
                  'repository': REPOSITORY_NAME,
                  'Authorization': `Bearer ${MIGRATION_TOKEN}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
              })
              responseText = await response.text()
            }
          }
        } catch {
          // Not JSON, continue with original response
        }
      }
    }

    if (!response.ok) {
      console.error('Migration API error:', response.status, responseText)
      
      let errorMessage = 'Failed to create artist document'
      try {
        const error = JSON.parse(responseText)
        errorMessage = error.message || errorMessage
        if (error.details) {
          errorMessage += `: ${JSON.stringify(error.details)}`
        }
      } catch {
        errorMessage = responseText.substring(0, 200)
      }

      return NextResponse.json(
        { 
          error: errorMessage,
          status: response.status,
          details: responseText,
        },
        { status: response.status }
      )
    }

    // Parse success response
    let result
    try {
      result = JSON.parse(responseText)
    } catch {
      result = { message: 'Document created successfully', response: responseText }
    }

    const returnedDocumentId = result.id || result.uid || result.document?.id || result.document?.uid || documentId || 'unknown'

    // Now sync with Supabase
    const supabase = getSupabaseClient()
    if (supabase) {
      try {
        // Normalize function for matching
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

        // 1. Sync artist data (name_en, name_ja, prismic_uid)
        const { data: existingArtist } = await supabase
          .from('artists')
          .select('id, name, name_ja, prismic_uid')
          .eq('prismic_uid', artistData.uid)
          .single()

        const supabaseData = {
          name: artistData.name_en,
          name_ja: artistData.name_jp || '',
          prismic_uid: artistData.uid,
        }

        let artistId = null
        if (existingArtist) {
          // Update existing artist
          const { data: updatedArtist, error: updateError } = await supabase
            .from('artists')
            .update(supabaseData)
            .eq('id', existingArtist.id)
            .select()
            .single()

          if (updateError) {
            console.error('Error updating Supabase artist:', updateError)
          } else {
            artistId = updatedArtist.id
          }
        } else {
          // Create new artist
          const { data: newArtist, error: insertError } = await supabase
            .from('artists')
            .insert({
              ...supabaseData,
              likes: 0, // Initialize likes to 0
            })
            .select()
            .single()

          if (insertError) {
            console.error('Error creating Supabase artist:', insertError)
          } else {
            artistId = newArtist.id
          }
        }

        // 2. Sync songs to playlist (if we have songs)
        if (artistData.song_list && Array.isArray(artistData.song_list) && artistData.song_list.length > 0) {
          // Get all existing songs from playlist for this artist
          // Match by artist_id if available, otherwise by artist_en
          let existingPlaylistSongs = []
          if (artistId) {
            const { data: songsById } = await supabase
              .from('selection_playlist')
              .select('id, title_en, artist_en, title_ja, link, cover_url, artist_id')
              .eq('artist_id', artistId)
            if (songsById) existingPlaylistSongs = songsById
          }
          
          // Also get songs by artist name (in case artist_id isn't set yet)
          const { data: songsByName } = await supabase
            .from('selection_playlist')
            .select('id, title_en, artist_en, title_ja, link, cover_url, artist_id')
            .eq('artist_en', artistData.name_en)
          
          // Merge and deduplicate
          const allSongs = [...existingPlaylistSongs]
          if (songsByName) {
            songsByName.forEach(song => {
              if (!allSongs.find(s => s.id === song.id)) {
                allSongs.push(song)
              }
            })
          }

          // Create a map of normalized song keys to playlist entries
          const playlistSongMap = new Map()
          allSongs.forEach(song => {
            const normalizedTitle = normalizeString(song.title_en)
            const normalizedArtist = normalizeString(song.artist_en)
            const songKey = `${normalizedTitle}|${normalizedArtist}`
            playlistSongMap.set(songKey, song)
          })

          // Update matching songs in playlist
          for (const prismicSong of artistData.song_list) {
            const songTitleEn = prismicSong.song_title_en || ''
            const songLink = prismicSong.song_link?.url || ''
            const songCover = prismicSong.song_cover?.url || ''

            if (!songTitleEn) continue

            const normalizedTitle = normalizeString(songTitleEn)
            const normalizedArtist = normalizeString(artistData.name_en)
            const songKey = `${normalizedTitle}|${normalizedArtist}`

            const playlistSong = playlistSongMap.get(songKey)
            
            if (playlistSong) {
              // Update existing playlist song
              const updateData = {}
              if (songTitleEn !== playlistSong.title_en) updateData.title_en = songTitleEn
              if (prismicSong.song_title_ja !== playlistSong.title_ja) updateData.title_ja = prismicSong.song_title_ja || null
              if (songLink && songLink !== playlistSong.link) updateData.link = songLink
              if (songCover !== playlistSong.cover_url) updateData.cover_url = songCover || null
              
              // Also update artist_id if we have it and it's not set
              if (artistId && playlistSong.artist_id !== artistId) {
                updateData.artist_id = artistId
              }
              
              // Update artist_en/artist_ja if artist name changed
              if (artistData.name_en !== playlistSong.artist_en) {
                updateData.artist_en = artistData.name_en
              }
              if (artistData.name_jp && artistData.name_jp !== playlistSong.artist_ja) {
                updateData.artist_ja = artistData.name_jp
              }

              if (Object.keys(updateData).length > 0) {
                const { error: songUpdateError } = await supabase
                  .from('selection_playlist')
                  .update(updateData)
                  .eq('id', playlistSong.id)

                if (songUpdateError) {
                  console.error(`Error updating playlist song ${playlistSong.id}:`, songUpdateError)
                }
              }
            }
          }
        }
      } catch (supabaseError) {
        console.error('Error syncing with Supabase:', supabaseError)
        // Don't fail the request if Supabase sync fails
      }
    }

    return NextResponse.json({
      success: true,
      message: wasUpdated 
        ? 'Artist document updated successfully and synced with Supabase' 
        : 'Artist document created successfully as a draft and synced with Supabase',
      updated: wasUpdated,
      draft: true,
      note: 'The artist is saved as a draft and must be manually published in Prismic Dashboard > Migration Releases',
      releaseTitle: releaseTitle,
      documentId: returnedDocumentId,
      repositoryName: REPOSITORY_NAME,
      prismicUrl: `https://${REPOSITORY_NAME}.prismic.io/migrations`,
      data: result,
    })

  } catch (error) {
    console.error('Error creating artist:', error)
    return NextResponse.json(
      { error: 'Failed to create artist document', message: error.message },
      { status: 500 }
    )
  }
}

