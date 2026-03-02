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
    const galleryData = entry.galleryData || {}

    // Build the correct Prismic document data format from stored form data
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
        tags: ['archived'],
        data,
      }),
    })

    if (response.ok) {
      return { archived: true, error: null }
    }

    const errorText = await response.text()
    const msg = `Prismic API returned ${response.status}: ${errorText}`
    console.warn(`Failed to archive Prismic document ${documentId}:`, msg)
    return { archived: false, error: msg }
  } catch (e) {
    console.error('Error attempting to archive in Prismic:', e)
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
      .from('pending_gallery_migrations')
      .select('gallery_data, release_title, uid, title')
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
          title: migrationData?.title || '',
          galleryData: migrationData?.gallery_data || {},
        })
      : { archived: false, error: 'No document ID provided' }

    // Update Supabase status to 'archived'
    const updateQuery = supabase
      .from('pending_gallery_migrations')
      .update({ status: 'archived' })
    if (id) {
      updateQuery.eq('id', id)
    } else {
      updateQuery.eq('uid', uid)
    }

    const { data, error } = await updateQuery.select().single()

    if (error) {
      console.error('Error archiving pending migration:', error)
      return NextResponse.json(
        { error: 'Failed to archive pending migration', message: error.message },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json({ error: 'Migration not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      migration: {
        id: data.id,
        uid: data.uid,
        title: data.title,
        status: data.status,
        prismicArchived: prismicResult.archived,
        prismicError: prismicResult.error,
      },
      message: prismicResult.archived
        ? 'Gallery archived successfully in both Supabase and Prismic'
        : prismicResult.error
          ? `Gallery archived in Supabase. Note: Could not archive in Prismic (${prismicResult.error}). You may need to manually delete it from the Prismic dashboard.`
          : 'Gallery archived successfully in Supabase',
    })
  } catch (error) {
    console.error('Error in discard endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}
