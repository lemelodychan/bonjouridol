import { NextResponse } from 'next/server'
import { createClient } from '@/prismicio'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Get Supabase client for persistent storage
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
    
    // Archive the document in Prismic migration release
    // This matches the manual "archive" action in Prismic's migration release section
    let prismicArchived = false
    let prismicError = null
    
    if (documentId) {
      try {
        const MIGRATION_TOKEN = process.env.PRISMIC_MASTER_TOKEN
        const REPOSITORY_NAME = process.env.REPO_NAME || 'bonjouridol'
        
        if (MIGRATION_TOKEN) {
          // Get the migration data from Supabase to get the full document structure
          let migrationData = null
          if (supabase) {
            const query = supabase
              .from('pending_gallery_migrations')
              .select('gallery_data, release_title, uid')
            
            if (id) {
              query.eq('id', id)
            } else if (uid) {
              query.eq('uid', uid)
            }
            
            const { data } = await query.single()
            migrationData = data
          }
          
          // Update the document via Migration API to mark it as archived
          // This should archive it in the migration release, similar to manual archiving
          const updateUrl = `https://migration.prismic.io/documents/${documentId}`
          
          // Build the update payload - include required fields and archived tag
          // When archiving, we remove 'pending-migration' tag and add 'archived' tag
          const updatePayload = {
            type: String('gallery'),
            uid: String(migrationData?.uid || uid || ''),
            lang: String('en-us'),
            title: String(migrationData?.gallery_data?.title || 'Archived Gallery'),
            tags: ['archived'], // Remove pending-migration tag, only keep archived
          }
          
          // Include full data to ensure the update succeeds
          if (migrationData?.gallery_data) {
            updatePayload.data = migrationData.gallery_data
          } else {
            // If no data, include minimal required fields
            updatePayload.data = {
              title: migrationData?.title || 'Archived Gallery',
              type: 'Gallery',
              artist_name: '',
              event_date: '',
              venue: '',
              is_official_photos: false,
              photographer: '',
              photographer_2: '',
              featured_image: null,
              featured_image_id: null,
              tags: [],
              meta_title: '',
              meta_description: '',
              meta_image: null,
              images: [],
            }
          }
          
          const response = await fetch(updateUrl, {
            method: 'PUT',
            headers: {
              'repository': REPOSITORY_NAME,
              'Authorization': `Bearer ${MIGRATION_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatePayload),
          })
          
          if (response.ok) {
            prismicArchived = true
            console.log(`Successfully archived Prismic document ${documentId} in migration release`)
          } else {
            const errorText = await response.text()
            prismicError = `Prismic API returned ${response.status}: ${errorText}`
            console.warn(`Failed to archive Prismic document ${documentId}:`, prismicError)
          }
        } else {
          prismicError = 'Migration token not configured'
          console.warn('Cannot archive Prismic document: Migration token not found')
        }
      } catch (error) {
        prismicError = error.message
        console.error('Error attempting to archive in Prismic:', error)
        // Continue anyway - we'll still update Supabase
      }
    }
    
    // Update Supabase status to "archived"
    const query = supabase
      .from('pending_gallery_migrations')
      .update({ status: 'archived' })
    
    if (id) {
      query.eq('id', id)
    } else {
      query.eq('uid', uid)
    }
    
    const { data, error } = await query.select().single()
    
    if (error) {
      console.error('Error archiving pending migration:', error)
      return NextResponse.json(
        { error: 'Failed to archive pending migration', message: error.message },
        { status: 500 }
      )
    }
    
    if (!data) {
      return NextResponse.json(
        { error: 'Migration not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      migration: {
        id: data.id,
        uid: data.uid,
        title: data.title,
        status: data.status,
        prismicArchived,
        prismicError,
      },
      message: prismicArchived 
        ? 'Gallery archived successfully in both Supabase and Prismic'
        : prismicError
          ? `Gallery archived in Supabase. Note: Could not archive in Prismic (${prismicError}). You may need to manually delete it from the Prismic dashboard.`
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

