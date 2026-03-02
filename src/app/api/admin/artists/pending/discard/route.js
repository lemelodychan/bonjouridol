import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

  if (!supabaseUrl || (!serviceKey && !anonKey)) {
    return null
  }

  return createSupabaseClient(supabaseUrl, serviceKey || anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/**
 * Best-effort: update the Prismic document to remove the 'pending-migration'
 * tag and set it to 'archived'. Builds the correct Prismic document format
 * from the stored form data so the PUT does not wipe existing content.
 * Failures are intentionally swallowed — the Supabase status update is the
 * authoritative action.
 */
async function archiveInPrismic(documentId, entry) {
  if (!documentId) return { archived: false, error: 'No document ID' }

  const MIGRATION_TOKEN = process.env.PRISMIC_MASTER_TOKEN
  const REPOSITORY_NAME = process.env.REPO_NAME || 'bonjouridol'

  if (!MIGRATION_TOKEN) return { archived: false, error: 'Migration token not configured' }

  try {
    const artistData = entry.artistData || {}

    // Build the correct Prismic document data format from stored form data
    const data = {
      name_en: entry.name_en || artistData.name_en || '',
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

    if (artistData.profile_picture && typeof artistData.profile_picture === 'object') {
      data.profile_picture = artistData.profile_picture
    }
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

    const response = await fetch(`https://migration.prismic.io/documents/${documentId}`, {
      method: 'PUT',
      headers: {
        'repository': REPOSITORY_NAME,
        'Authorization': `Bearer ${MIGRATION_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'artist',
        uid: entry.uid || '',
        lang: 'en-us',
        title: entry.name_en || '',
        tags: ['archived'],
        data,
      }),
    })

    if (response.ok) {
      return { archived: true, error: null }
    }

    const errorText = await response.text()
    const msg = `Prismic API returned ${response.status}: ${errorText}`
    console.warn(`Failed to archive Prismic artist document ${documentId}:`, msg)
    return { archived: false, error: msg }
  } catch (e) {
    console.error('Error attempting to archive artist in Prismic:', e)
    return { archived: false, error: e.message }
  }
}

export async function POST(request) {
  try {
    const { id, uid, documentId } = await request.json()

    if (!id && !uid) {
      return NextResponse.json(
        { error: 'Migration ID or UID is required' },
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

    // Fetch the full migration data from Supabase so we can build the correct
    // Prismic document payload for the tag update.
    const fetchQuery = supabase
      .from('pending_artist_migrations')
      .select('artist_data, release_title, uid, name_en')
    if (id) {
      fetchQuery.eq('id', id)
    } else {
      fetchQuery.eq('uid', uid)
    }
    const { data: migrationData } = await fetchQuery.single()

    // Best-effort: archive the document in Prismic
    const prismicResult = documentId
      ? await archiveInPrismic(documentId, {
          uid: migrationData?.uid || uid || '',
          name_en: migrationData?.name_en || '',
          artistData: migrationData?.artist_data || {},
        })
      : { archived: false, error: 'No document ID provided' }

    // Update status to 'archived' in Supabase
    const updateQuery = supabase
      .from('pending_artist_migrations')
      .update({ status: 'archived' })
    if (id) {
      updateQuery.eq('id', id)
    } else {
      updateQuery.eq('uid', uid)
    }

    const { error: supabaseError } = await updateQuery

    if (supabaseError) {
      console.error('Error archiving artist migration in Supabase:', supabaseError)
      return NextResponse.json(
        { error: 'Failed to archive artist migration', message: supabaseError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: prismicResult.archived
        ? 'Artist archived successfully in both Supabase and Prismic'
        : prismicResult.error
          ? `Artist archived in Supabase. Note: Could not archive in Prismic (${prismicResult.error}). You may need to manually delete it from the Prismic dashboard.`
          : 'Artist archived successfully in Supabase',
      prismicArchived: prismicResult.archived,
      prismicError: prismicResult.error,
    })
  } catch (error) {
    console.error('Error discarding artist:', error)
    return NextResponse.json(
      { error: 'Failed to discard artist', message: error.message },
      { status: 500 }
    )
  }
}
