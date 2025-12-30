import { NextResponse } from 'next/server'
import { createClient } from '@/prismicio'
import * as prismic from '@prismicio/client'
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

/**
 * Try to fetch pending migrations from Prismic by querying for documents
 * with the 'pending-migration' tag that haven't been published yet
 */
async function fetchPendingMigrationsFromPrismic() {
  try {
    const client = createClient()
    
    try {
      const drafts = await client.getAllByType('artist', {
        filters: [
          prismic.filter.at('document.tags', ['pending-migration'])
        ],
        pageSize: 100,
      })
      
      return drafts.map(doc => ({
        id: doc.id,
        name_en: doc.data.name_en || 'Untitled',
        uid: doc.uid || '',
        releaseTitle: `New Artists - ${new Date(doc.first_publication_date || Date.now()).toISOString().split('T')[0]} - ${doc.data.name_en || 'Untitled'}`,
        createdAt: doc.first_publication_date || new Date().toISOString(),
        documentId: doc.id,
        repositoryName: process.env.REPO_NAME || 'bonjouridol',
      }))
    } catch (error) {
      return []
    }
  } catch (error) {
    return []
  }
}

export async function GET(request) {
  try {
    const supabase = getSupabaseClient()
    
    // Fetch from Supabase (primary source)
    let supabaseMigrations = []
    if (supabase) {
      const { data, error } = await supabase
        .from('pending_artist_migrations')
        .select('*')
        .in('status', ['pending']) // Only get pending, exclude published and cancelled
        .order('created_at', { ascending: false })
      
      if (!error && data) {
        supabaseMigrations = data.map(row => ({
          id: row.id,
          name_en: row.name_en,
          uid: row.uid,
          releaseTitle: row.release_title,
          createdAt: row.created_at,
          documentId: row.document_id,
          repositoryName: row.repository_name,
          artistData: row.artist_data, // Full artist data for editing
          status: row.status,
          updatedAt: row.updated_at,
        }))
      }
    }
    
    // Try to fetch from Prismic (secondary source)
    const prismicMigrations = await fetchPendingMigrationsFromPrismic()
    
    // Merge: Supabase is the source of truth, but add Prismic docs that aren't in Supabase
    const allMigrations = [...supabaseMigrations]
    
    prismicMigrations.forEach(prismicMigration => {
      if (!allMigrations.find(m => m.documentId === prismicMigration.documentId)) {
        allMigrations.push(prismicMigration)
      }
    })
    
    // Sort by creation date (newest first)
    const sorted = allMigrations.sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    )
    
    return NextResponse.json({
      success: true,
      pending: sorted,
      total: sorted.length,
      source: supabase ? 'Supabase + Prismic' : 'Prismic only',
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
    
    // Build the data object
    const upsertData = {
      uid: migrationData.uid,
      name_en: migrationData.name_en,
      release_title: migrationData.releaseTitle,
      document_id: migrationData.documentId,
      repository_name: migrationData.repositoryName || 'bonjouridol',
      artist_data: migrationData.artistData || null,
      status: 'pending',
    }
    
    if (migrationData.createdAt) {
      upsertData.created_at = migrationData.createdAt
    }
    
    const { data, error } = await supabase
      .from('pending_artist_migrations')
      .upsert(upsertData, {
        onConflict: 'uid', // Update if uid already exists
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error saving pending migration:', error)
      return NextResponse.json(
        { error: 'Failed to save pending migration', message: error.message },
        { status: 500 }
      )
    }
    
    const pendingMigration = {
      id: data.id,
      name_en: data.name_en,
      uid: data.uid,
      releaseTitle: data.release_title,
      createdAt: data.created_at,
      documentId: data.document_id,
      repositoryName: data.repository_name,
      artistData: data.artist_data,
      status: data.status,
    }
    
    return NextResponse.json({
      success: true,
      migration: pendingMigration,
    })
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
    
    // Build update object
    const updateData = {}
    if (migrationData.name_en) updateData.name_en = migrationData.name_en
    if (migrationData.releaseTitle) updateData.release_title = migrationData.releaseTitle
    if (migrationData.documentId) updateData.document_id = migrationData.documentId
    if (migrationData.artistData) updateData.artist_data = migrationData.artistData
    if (migrationData.status) updateData.status = migrationData.status
    
    // Update by id or uid
    const query = supabase
      .from('pending_artist_migrations')
      .update(updateData)
    
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
      return NextResponse.json(
        { error: 'Migration not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      migration: {
        id: data.id,
        name_en: data.name_en,
        uid: data.uid,
        releaseTitle: data.release_title,
        createdAt: data.created_at,
        documentId: data.document_id,
        repositoryName: data.repository_name,
        artistData: data.artist_data,
        status: data.status,
      },
    })
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
    
    // Update status to 'published' instead of deleting
    const query = supabase
      .from('pending_artist_migrations')
      .update({ status: 'published' })
    
    if (id) {
      query.eq('id', id)
    } else {
      query.eq('uid', uid)
    }
    
    const { data, error } = await query.select().single()
    
    if (error) {
      console.error('Error updating migration status:', error)
      return NextResponse.json(
        { error: 'Failed to update migration status', message: error.message },
        { status: 500 }
      )
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

