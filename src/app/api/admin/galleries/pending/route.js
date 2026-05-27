import { NextResponse } from 'next/server'
import { createClient } from '@/prismicio'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin-auth'

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
 * Fetch the set of active (non-master) release labels from the Prismic
 * Content Delivery API.  Every migration release created via the Migration API
 * appears here as a ref whose `label` equals the `release_title` we passed
 * when creating the document.
 *
 * Returns null if the call fails — callers treat null as "could not verify,
 * keep all entries" so the check is always fail-safe.
 */
async function fetchActivePrismicReleaseLabels() {
  try {
    const REPOSITORY_NAME = process.env.REPO_NAME
    const ACCESS_TOKEN = process.env.PRISMIC_ACCESS_TOKEN
    const url = `https://${REPOSITORY_NAME}.cdn.prismic.io/api/v2`
    const response = await fetch(url, {
      headers: ACCESS_TOKEN ? { Authorization: `Token ${ACCESS_TOKEN}` } : {},
      next: { revalidate: 0 },
    })
    if (!response.ok) return null
    const data = await response.json()
    const nonMasterRefs = (data.refs || []).filter(ref => !ref.isMasterRef)
    return new Set(nonMasterRefs.map(ref => ref.label))
  } catch (e) {
    console.warn('Could not fetch Prismic release refs for orphan detection:', e.message)
    return null
  }
}

/**
 * Fetch UIDs of all published galleries from Prismic Content API.
 * Used by the GET handler to auto-detect when a pending migration's release
 * has been published in Prismic.
 *
 * Note: the Content API only returns *published* documents — draft documents
 * created via the Migration API are invisible here. That is intentional: we
 * cross-reference pending Supabase entries against this list so that anything
 * whose uid now appears in Prismic must have been published.
 */
async function fetchPublishedGalleryUids() {
  try {
    const client = createClient()
    const docs = await client.getAllByType('gallery', { pageSize: 100 })
    return new Set(docs.map(doc => doc.uid))
  } catch (e) {
    console.warn('Could not fetch published galleries from Prismic:', e.message)
    return new Set()
  }
}

/**
 * Best-effort: remove the 'pending-migration' tag from a Prismic document
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
    const galleryData = entry.galleryData || {}
    const userTags = (galleryData.tags || []).filter(t => t && t !== 'pending-migration')

    // Build Prismic document data format from stored form data
    const data = {
      title: entry.title || galleryData.title || '',
      type: galleryData.type || 'Gallery',
      artist_name: galleryData.artist_name || '',
      event_date: galleryData.event_date || null,
      venue: galleryData.venue || '',
      is_official_photos: galleryData.is_official_photos || false,
      gallery: (galleryData.images || []).map(image => ({
        image: {
          id: image.id,
          url: image.url || '',
          width: image.dimensions?.width || null,
          height: image.dimensions?.height || null,
          alt: image.alt || null,
          copyright: image.copyright || null,
        },
      })),
      meta_title: galleryData.meta_title || '',
      meta_description: galleryData.meta_description || '',
    }

    if (galleryData.photographer) {
      data.photographer = { id: galleryData.photographer, type: 'author', link_type: 'Document', isBroken: false }
    }
    if (galleryData.photographer_2) {
      data.photographer_2 = { id: galleryData.photographer_2, type: 'author', link_type: 'Document', isBroken: false }
    }
    if (galleryData.featured_image_id) {
      const featuredImg = (galleryData.images || []).find(img => img.id === galleryData.featured_image_id)
      if (featuredImg) {
        data.featured_image = {
          id: featuredImg.id,
          url: featuredImg.url,
          width: featuredImg.dimensions?.width || null,
          height: featuredImg.dimensions?.height || null,
          alt: featuredImg.alt || null,
        }
      }
    } else if (galleryData.featured_image && typeof galleryData.featured_image === 'object') {
      data.featured_image = galleryData.featured_image
    }
    if (galleryData.meta_image && typeof galleryData.meta_image === 'object') {
      data.meta_image = galleryData.meta_image
    }

    const response = await fetch(`https://migration.prismic.io/documents/${documentId}`, {
      method: 'PUT',
      headers: {
        'repository': REPOSITORY_NAME,
        'Authorization': `Bearer ${MIGRATION_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'gallery',
        uid: entry.uid || '',
        lang: 'en-us',
        title: entry.title || '',
        tags: userTags,
        data,
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      console.warn(`Could not remove pending-migration tag from Prismic document ${documentId}: ${response.status} ${text}`)
    }
  } catch (e) {
    console.warn(`Could not remove pending-migration tag from Prismic document ${documentId}:`, e.message)
  }
}

/** Map a Supabase row to the API response shape. */
function mapRow(row) {
  return {
    id: row.id,
    title: row.title,
    uid: row.uid,
    releaseTitle: row.release_title,
    createdAt: row.created_at,
    documentId: row.document_id,
    repositoryName: row.repository_name,
    galleryData: row.gallery_data,
    status: row.status,
    updatedAt: row.updated_at,
  }
}

export async function GET(request) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response
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
      .from('pending_gallery_migrations')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    const supabaseMigrations = (data || []).map(mapRow)

    // 2. Fetch active Prismic release labels and published UIDs in parallel.
    const [activeReleaseLabels, publishedUids] = await Promise.all([
      fetchActivePrismicReleaseLabels(),
      fetchPublishedGalleryUids(),
    ])

    // 3. Reconcile each pending entry.
    //    a) If the entry's UID now exists as a *published* document → mark published.
    //    b) If the entry's migration release no longer exists in Prismic at all →
    //       the release was deleted without publishing → orphan, mark archived.
    //    c) Otherwise → still genuinely pending.
    const stillPending = []
    for (const entry of supabaseMigrations) {
      if (publishedUids.has(entry.uid)) {
        // Release was published — auto-mark and clean up tag
        await supabase
          .from('pending_gallery_migrations')
          .update({ status: 'published' })
          .eq('id', entry.id)
        await removePendingTagFromPrismic(entry.documentId, entry)
      } else if (
        activeReleaseLabels !== null &&
        entry.releaseTitle &&
        !activeReleaseLabels.has(entry.releaseTitle)
      ) {
        // Migration release no longer exists in Prismic → ghost entry, archive it
        console.log(`Archiving orphaned gallery migration: uid="${entry.uid}" release="${entry.releaseTitle}"`)
        await supabase
          .from('pending_gallery_migrations')
          .update({ status: 'archived' })
          .eq('id', entry.id)
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
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response
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
    // a gallery whose previous entry was published or archived would silently
    // fail on the INSERT with a unique-constraint violation.
    const { data: existingAny } = await supabase
      .from('pending_gallery_migrations')
      .select('*')
      .eq('uid', migrationData.uid)
      .maybeSingle()

    if (existingAny?.status === 'pending') {
      // Update existing pending entry (normal editing flow)
      const { data, error } = await supabase
        .from('pending_gallery_migrations')
        .update({
          title: migrationData.title,
          release_title: migrationData.releaseTitle,
          document_id: migrationData.documentId || existingAny.document_id,
          repository_name: migrationData.repositoryName || 'bonjouridol',
          gallery_data: migrationData.galleryData || null,
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
      // This handles the case where an admin discards a gallery then wants to
      // recreate it — rather than inserting a duplicate (which would fail on the
      // UNIQUE constraint), we bring the existing row back to pending.
      const { data, error } = await supabase
        .from('pending_gallery_migrations')
        .update({
          title: migrationData.title,
          release_title: migrationData.releaseTitle,
          document_id: migrationData.documentId || existingAny.document_id,
          repository_name: migrationData.repositoryName || 'bonjouridol',
          gallery_data: migrationData.galleryData || null,
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
        .from('pending_gallery_migrations')
        .insert({
          uid: migrationData.uid,
          title: migrationData.title,
          release_title: migrationData.releaseTitle,
          document_id: migrationData.documentId,
          repository_name: migrationData.repositoryName || 'bonjouridol',
          gallery_data: migrationData.galleryData || null,
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
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response
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
    if (migrationData.title) updateData.title = migrationData.title
    if (migrationData.releaseTitle) updateData.release_title = migrationData.releaseTitle
    if (migrationData.documentId) updateData.document_id = migrationData.documentId
    if (migrationData.galleryData) updateData.gallery_data = migrationData.galleryData
    if (migrationData.status) updateData.status = migrationData.status

    const query = supabase.from('pending_gallery_migrations').update(updateData)
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
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response
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

    // Fetch the entry first so we have the documentId and gallery data
    // needed for the Prismic tag cleanup below.
    const fetchQuery = supabase.from('pending_gallery_migrations').select('*')
    if (id) {
      fetchQuery.eq('id', id)
    } else {
      fetchQuery.eq('uid', uid)
    }
    const { data: entryData } = await fetchQuery.maybeSingle()

    // Update status to 'published'
    const updateQuery = supabase
      .from('pending_gallery_migrations')
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
        title: entryData.title,
        galleryData: entryData.gallery_data,
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
