import { NextResponse } from 'next/server'
import { createClient } from '@/prismicio'
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
 * Fetch UIDs of all published artists from Prismic Content API.
 * Used by the GET handler to auto-detect when a pending migration's release
 * has been published in Prismic.
 *
 * Note: the Content API only returns *published* documents — draft documents
 * created via the Migration API are invisible here. That is intentional: we
 * cross-reference pending Supabase entries against this list so that anything
 * whose uid now appears in Prismic must have been published.
 */
async function fetchPublishedArtistUids() {
  try {
    const client = createClient()
    const docs = await client.getAllByType('artist', { pageSize: 100 })
    return new Set(docs.map(doc => doc.uid))
  } catch (e) {
    console.warn('Could not fetch published artists from Prismic:', e.message)
    return new Set()
  }
}

/**
 * Best-effort: remove the 'pending-migration' tag from a Prismic artist document
 * after its migration release has been published or discarded.
 *
 * Builds the correct Prismic document format from the stored form data so the
 * PUT does not wipe existing content. Failures are intentionally swallowed —
 * the Supabase status update is the authoritative action.
 */
async function removePendingTagFromPrismic(documentId, entry) {
  if (!documentId) return
  const MIGRATION_TOKEN = process.env.PRISMIC_MASTER_TOKEN
  const REPOSITORY_NAME = process.env.REPO_NAME
  if (!MIGRATION_TOKEN) return

  try {
    const artistData = entry.artistData || {}
    const userTags = [] // artists don't have user-facing tags like galleries

    // Build Prismic document data format from stored form data
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
        tags: userTags,
        data,
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      console.warn(`Could not remove pending-migration tag from Prismic artist document ${documentId}: ${response.status} ${text}`)
    }
  } catch (e) {
    console.warn(`Could not remove pending-migration tag from Prismic artist document ${documentId}:`, e.message)
  }
}

/** Map a Supabase row to the API response shape. */
function mapRow(row) {
  return {
    id: row.id,
    name_en: row.name_en,
    uid: row.uid,
    releaseTitle: row.release_title,
    createdAt: row.created_at,
    documentId: row.document_id,
    repositoryName: row.repository_name,
    artistData: row.artist_data,
    status: row.status,
    updatedAt: row.updated_at,
  }
}

export async function GET(request) {
  try {
    const supabase = getSupabaseClient()

    if (!supabase) {
      return NextResponse.json({
        success: true,
        pending: [],
        total: 0,
        source: 'Supabase not configured',
      })
    }

    // 1. Supabase is the single source of truth for pending migrations.
    //    Fetch all entries currently in 'pending' status.
    const { data, error } = await supabase
      .from('pending_artist_migrations')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    const supabaseMigrations = (data || []).map(mapRow)

    // 2. Fetch UIDs of all published artists from Prismic Content API.
    //    This is how we detect that an admin has published a migration release in Prismic
    //    without needing a separate "Mark as Published" manual step.
    const publishedUids = await fetchPublishedArtistUids()

    // 3. Auto-detect and resolve artists that have been published in Prismic.
    //    If a pending entry's uid now exists as a published Prismic document, its
    //    migration release was published — update Supabase status automatically.
    const stillPending = []
    for (const entry of supabaseMigrations) {
      if (publishedUids.has(entry.uid)) {
        await supabase
          .from('pending_artist_migrations')
          .update({ status: 'published' })
          .eq('id', entry.id)
        // Best-effort: clean up the pending-migration tag in Prismic
        await removePendingTagFromPrismic(entry.documentId, entry)
      } else {
        stillPending.push(entry)
      }
    }

    return NextResponse.json({
      success: true,
      pending: stillPending,
      total: stillPending.length,
      source: 'Supabase',
    })
  } catch (error) {
    console.error('Error fetching pending migrations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pending migrations', message: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const migrationData = await request.json()

    const supabase = getSupabaseClient()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      )
    }

    // Check if any entry exists for this UID regardless of status.
    // The uid column has a UNIQUE constraint, so we must handle all statuses
    // here rather than only checking for 'pending' — otherwise creating/editing
    // an artist whose previous entry was published or archived would silently
    // fail on the INSERT with a unique-constraint violation.
    const { data: existingAny } = await supabase
      .from('pending_artist_migrations')
      .select('*')
      .eq('uid', migrationData.uid)
      .maybeSingle()

    if (existingAny?.status === 'pending') {
      // Update existing pending entry (normal editing flow)
      const { data, error } = await supabase
        .from('pending_artist_migrations')
        .update({
          name_en: migrationData.name_en,
          release_title: migrationData.releaseTitle,
          document_id: migrationData.documentId || existingAny.document_id,
          repository_name: migrationData.repositoryName || 'bonjouridol',
          artist_data: migrationData.artistData || null,
        })
        .eq('id', existingAny.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating pending migration:', error)
        return NextResponse.json(
          { error: 'Failed to update pending migration', message: error.message },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true, migration: mapRow(data), updated: true })

    } else if (existingAny) {
      // Reactivate a previously published or archived entry with the same uid.
      // This handles the case where an admin discards an artist then wants to
      // recreate it — rather than inserting a duplicate (which would fail on the
      // UNIQUE constraint), we bring the existing row back to pending.
      const { data, error } = await supabase
        .from('pending_artist_migrations')
        .update({
          name_en: migrationData.name_en,
          release_title: migrationData.releaseTitle,
          document_id: migrationData.documentId || existingAny.document_id,
          repository_name: migrationData.repositoryName || 'bonjouridol',
          artist_data: migrationData.artistData || null,
          status: 'pending',
        })
        .eq('id', existingAny.id)
        .select()
        .single()

      if (error) {
        console.error('Error reactivating pending migration:', error)
        return NextResponse.json(
          { error: 'Failed to reactivate pending migration', message: error.message },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true, migration: mapRow(data), updated: true, reactivated: true })

    } else {
      // Create new pending entry
      const { data, error } = await supabase
        .from('pending_artist_migrations')
        .insert({
          uid: migrationData.uid,
          name_en: migrationData.name_en,
          release_title: migrationData.releaseTitle,
          document_id: migrationData.documentId,
          repository_name: migrationData.repositoryName || 'bonjouridol',
          artist_data: migrationData.artistData || null,
          status: 'pending',
          created_at: migrationData.createdAt || new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating pending migration:', error)
        return NextResponse.json(
          { error: 'Failed to create pending migration', message: error.message },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true, migration: mapRow(data), updated: false })
    }
  } catch (error) {
    console.error('Error creating pending migration:', error)
    return NextResponse.json(
      { error: 'Failed to create pending migration', message: error.message },
      { status: 500 }
    )
  }
}

export async function PUT(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const uid = searchParams.get('uid')

    if (!id && !uid) {
      return NextResponse.json(
        { error: 'Migration ID or UID is required' },
        { status: 400 }
      )
    }

    const migrationData = await request.json()

    const supabase = getSupabaseClient()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      )
    }

    const updateData = {}
    if (migrationData.name_en) updateData.name_en = migrationData.name_en
    if (migrationData.releaseTitle) updateData.release_title = migrationData.releaseTitle
    if (migrationData.documentId) updateData.document_id = migrationData.documentId
    if (migrationData.artistData) updateData.artist_data = migrationData.artistData
    if (migrationData.status) updateData.status = migrationData.status

    const query = supabase.from('pending_artist_migrations').update(updateData)
    if (id) {
      query.eq('id', id)
    } else {
      query.eq('uid', uid)
    }

    const { data, error } = await query.select().single()

    if (error) {
      console.error('Error updating pending migration:', error)
      return NextResponse.json(
        { error: 'Failed to update pending migration', message: error.message },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json({ error: 'Migration not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, migration: mapRow(data) })
  } catch (error) {
    console.error('Error updating pending migration:', error)
    return NextResponse.json(
      { error: 'Failed to update pending migration', message: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const uid = searchParams.get('uid')

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

    // Fetch the entry first so we have the documentId and artist data
    // needed for the Prismic tag cleanup below.
    const fetchQuery = supabase.from('pending_artist_migrations').select('*')
    if (id) {
      fetchQuery.eq('id', id)
    } else {
      fetchQuery.eq('uid', uid)
    }
    const { data: entryData } = await fetchQuery.maybeSingle()

    // Update status to 'published'
    const updateQuery = supabase
      .from('pending_artist_migrations')
      .update({ status: 'published' })
    if (id) {
      updateQuery.eq('id', id)
    } else {
      updateQuery.eq('uid', uid)
    }

    const { data, error } = await updateQuery.select().single()

    if (error) {
      console.error('Error updating migration status:', error)
      return NextResponse.json(
        { error: 'Failed to update migration status', message: error.message },
        { status: 500 }
      )
    }

    // Best-effort: remove the pending-migration tag from the Prismic document
    if (entryData?.document_id) {
      await removePendingTagFromPrismic(entryData.document_id, {
        uid: entryData.uid,
        name_en: entryData.name_en,
        artistData: entryData.artist_data,
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Migration marked as published',
      migration: data,
    })
  } catch (error) {
    console.error('Error updating migration status:', error)
    return NextResponse.json(
      { error: 'Failed to update migration status', message: error.message },
      { status: 500 }
    )
  }
}
