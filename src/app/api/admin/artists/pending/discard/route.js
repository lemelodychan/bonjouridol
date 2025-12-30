import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

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
 * Discard a pending artist migration by archiving it in Prismic and Supabase
 * This sets the status to 'archived' in Supabase and adds 'archived' tag in Prismic
 * Archived items are filtered out from the pending list
 */
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
    
    console.log('Discarding artist migration:', { id, uid, documentId })
    
    if (documentId) {
      try {
        const MIGRATION_TOKEN = process.env.PRISMIC_MASTER_TOKEN
        const REPOSITORY_NAME = process.env.REPO_NAME || 'bonjouridol'
        
        if (MIGRATION_TOKEN) {
          // Get the migration data from Supabase to get the full document structure
          let migrationData = null
          const query = supabase
            .from('pending_artist_migrations')
            .select('artist_data, release_title, uid, name_en')
          
          if (id) {
            query.eq('id', id)
          } else if (uid) {
            query.eq('uid', uid)
          }
          
          const { data, error: queryError } = await query.single()
          
          if (queryError || !data) {
            prismicError = `Failed to fetch migration data: ${queryError?.message || 'No data found'}`
            console.error('Error fetching migration data:', queryError)
          } else {
            migrationData = data
            console.log('Fetched migration data for archiving:', { uid: migrationData.uid, name_en: migrationData.name_en })
          }
          
          // Update the document via Migration API to mark it as archived
          // This should archive it in the migration release, similar to manual archiving
          const updateUrl = `https://migration.prismic.io/documents/${documentId}`
          
          // Build the update payload - include required fields and archived tag
          // When archiving, we remove 'pending-migration' tag and add 'archived' tag
          const updatePayload = {
            type: String('artist'),
            uid: String(migrationData?.uid || uid || ''),
            lang: String('en-us'),
            title: String(migrationData?.name_en || 'Archived Artist'),
            tags: ['archived'], // Remove pending-migration tag, only keep archived
          }
          
          // Include full data to ensure the update succeeds
          if (migrationData?.artist_data) {
            updatePayload.data = migrationData.artist_data
          } else {
            // If no data, include minimal required fields
            updatePayload.data = {
              name_en: migrationData?.name_en || 'Archived Artist',
              name_jp: '',
              profile_picture: null,
              debut: '',
              disband: '',
              description: [],
              youtube_video: '',
              song_list: [],
              website: { link_type: 'Web', url: '' },
              twitter: { link_type: 'Web', url: '' },
              instagram: { link_type: 'Web', url: '' },
              youtube: { link_type: 'Web', url: '' },
              tiktok: { link_type: 'Web', url: '' },
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
          
          const responseText = await response.text()
          
          if (response.ok) {
            prismicArchived = true
            console.log(`Successfully archived Prismic document ${documentId} in migration release`)
          } else {
            prismicError = `Prismic API error: ${response.status} - ${responseText}`
            console.error('Migration API error:', response.status, responseText)
            
            // Try to parse error for more details
            try {
              const errorJson = JSON.parse(responseText)
              console.error('Prismic error details:', errorJson)
            } catch {
              // Not JSON, already logged as text
            }
          }
        }
      } catch (error) {
        prismicError = error.message
        console.error('Error archiving in Prismic:', error)
      }
    }
    
    // Update status to 'archived' in Supabase
    const updateQuery = supabase
      .from('pending_artist_migrations')
      .update({ status: 'archived' })
    
    if (id) {
      updateQuery.eq('id', id)
    } else if (uid) {
      updateQuery.eq('uid', uid)
    }
    
    const { error: supabaseError } = await updateQuery
    
    if (supabaseError) {
      console.error('Error updating Supabase:', supabaseError)
      return NextResponse.json(
        { error: 'Failed to update Supabase', message: supabaseError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Artist discarded successfully',
      prismicArchived,
      prismicError: prismicError || null,
    })

  } catch (error) {
    console.error('Error discarding artist:', error)
    return NextResponse.json(
      { error: 'Failed to discard artist', message: error.message },
      { status: 500 }
    )
  }
}

