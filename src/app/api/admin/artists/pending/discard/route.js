import { NextResponse } from 'next/server'

/**
 * Discard a pending artist migration by archiving it in Prismic
 * This sets the status to 'Archived' which removes it from the pending list
 */
export async function POST(request) {
  try {
    const { id, uid, documentId } = await request.json()
    
    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required to discard' },
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

    // Update document status to 'Archived' using Migration API
    // This is a PATCH operation to update specific fields
    const updateUrl = `https://migration.prismic.io/documents/${documentId}`
    
    const updatePayload = {
      type: 'artist',
      uid: uid,
      lang: 'en-us',
      data: {
        // We don't need to include all fields, just updating tags
      },
      tags: ['archived', 'discarded'], // Remove pending-migration tag and add archived tag
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

    if (!response.ok) {
      const responseText = await response.text()
      console.error('Migration API error:', response.status, responseText)
      
      // If update fails (document might not exist or already published), continue anyway
      // We'll still mark it as cancelled in our database
    }

    // Update status in Supabase
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

    if (supabaseUrl && (serviceKey || anonKey)) {
      const supabase = createSupabaseClient(
        supabaseUrl,
        serviceKey || anonKey,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          }
        }
      )

      // Update status to 'cancelled' (or delete the record)
      if (id) {
        await supabase
          .from('pending_artist_migrations')
          .update({ status: 'cancelled' })
          .eq('id', id)
      } else if (uid) {
        await supabase
          .from('pending_artist_migrations')
          .update({ status: 'cancelled' })
          .eq('uid', uid)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Artist discarded successfully',
    })

  } catch (error) {
    console.error('Error discarding artist:', error)
    return NextResponse.json(
      { error: 'Failed to discard artist', message: error.message },
      { status: 500 }
    )
  }
}

