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
        name_jp: doc.data.name_jp || '',
        uid: doc.uid || '',
        releaseTitle: `New Artists - ${new Date(doc.first_publication_date || Date.now()).toISOString().split('T')[0]} - ${doc.data.name_en || 'Untitled'}`,
        createdAt: doc.first_publication_date || new Date().toISOString(),
        documentId: doc.id,
        repositoryName: process.env.REPO_NAME || 'bonjouridol',
        artistData: doc.data, // Full document data
      }))
    } catch (error) {
      return []
    }
  } catch (error) {
    return []
  }
}

/**
 * Create a Supabase entry from a Prismic document
 * Uses upsert to handle cases where the entry already exists
 */
async function createSupabaseEntryFromPrismic(prismicDoc, supabase) {
  try {
    // Check if entry with this document_id already exists (to avoid duplicates during sync)
    if (prismicDoc.documentId) {
      const { data: existingByDocId } = await supabase
        .from('pending_artist_migrations')
        .select('*')
        .eq('document_id', prismicDoc.documentId)
        .eq('status', 'pending')
        .limit(1)
        .single()
      
      if (existingByDocId) {
        // Entry with this document_id already exists, return it
        return {
          id: existingByDocId.id,
          name_en: existingByDocId.name_en,
          uid: existingByDocId.uid,
          releaseTitle: existingByDocId.release_title,
          createdAt: existingByDocId.created_at,
          documentId: existingByDocId.document_id,
          repositoryName: existingByDocId.repository_name,
          artistData: existingByDocId.artist_data,
          status: existingByDocId.status,
          updatedAt: existingByDocId.updated_at,
        }
      }
    }
    
    // Entry doesn't exist - create new one with unique release_title
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const releaseTitle = `New Artists - ${new Date(prismicDoc.createdAt || Date.now()).toISOString().split('T')[0]} - ${prismicDoc.name_en || 'Untitled'} - ${timestamp}`
    
    const { data, error } = await supabase
      .from('pending_artist_migrations')
      .insert({
        uid: prismicDoc.uid,
        name_en: prismicDoc.name_en,
        release_title: releaseTitle,
        document_id: prismicDoc.documentId,
        repository_name: prismicDoc.repositoryName || 'bonjouridol',
        artist_data: prismicDoc.artistData || null,
        status: 'pending',
        created_at: prismicDoc.createdAt,
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error creating Supabase entry from Prismic:', error)
      return null
    }
    
    return {
      id: data.id,
      name_en: data.name_en,
      uid: data.uid,
      releaseTitle: data.release_title,
      createdAt: data.created_at,
      documentId: data.document_id,
      repositoryName: data.repository_name,
      artistData: data.artist_data,
      status: data.status,
      updatedAt: data.updated_at,
    }
  } catch (error) {
    console.error('Error creating Supabase entry from Prismic:', error)
    return null
  }
}

/**
 * Create a Prismic document from a Supabase entry
 */
async function createPrismicDocumentFromSupabase(supabaseEntry) {
  try {
    const REPOSITORY_NAME = process.env.REPO_NAME
    const MIGRATION_TOKEN = process.env.PRISMIC_MASTER_TOKEN

    if (!MIGRATION_TOKEN) {
      console.error('Migration API token not configured')
      return null
    }

    const artistData = supabaseEntry.artistData || {}
    const releaseDate = new Date(supabaseEntry.createdAt || Date.now()).toISOString().split('T')[0]
    // Make release_title unique by adding timestamp to avoid conflicts
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
    const releaseTitle = supabaseEntry.releaseTitle || `New Artists - ${releaseDate} - ${supabaseEntry.name_en || 'Untitled'} - ${timestamp}`

    // Format artist document for Migration API
    const data = {
      name_en: supabaseEntry.name_en || '',
      name_jp: artistData.name_jp || '',
      profile_picture: artistData.profile_picture || null,
      debut: artistData.debut || '',
      disband: artistData.disband || '',
      description: artistData.description || [],
      youtube_video: artistData.youtube_video || '',
      song_list: artistData.song_list || [],
      website: artistData.website || { link_type: 'Web', url: '' },
      twitter: artistData.twitter || { link_type: 'Web', url: '' },
      instagram: artistData.instagram || { link_type: 'Web', url: '' },
      youtube: artistData.youtube || { link_type: 'Web', url: '' },
      tiktok: artistData.tiktok || { link_type: 'Web', url: '' },
    }

    const documentToSend = {
      type: 'artist',
      uid: supabaseEntry.uid,
      lang: 'en-us',
      title: supabaseEntry.name_en || 'Untitled',
      data: data,
      release_title: releaseTitle,
      tags: ['pending-migration'],
    }

    const createUrl = new URL('https://migration.prismic.io/documents')
    createUrl.searchParams.set('release_title', releaseTitle)
    
    const response = await fetch(createUrl.toString(), {
      method: 'POST',
      headers: {
        'repository': REPOSITORY_NAME,
        'Authorization': `Bearer ${MIGRATION_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(documentToSend),
    })

    const responseText = await response.text()

    if (!response.ok) {
      console.error('Error creating Prismic document from Supabase:', response.status, responseText)
      return null
    }

    let createdDoc
    try {
      createdDoc = JSON.parse(responseText)
    } catch {
      // Response might not be JSON
      return null
    }

    // Update Supabase with the new document ID
    const supabase = getSupabaseClient()
    if (supabase && createdDoc.id) {
      await supabase
        .from('pending_artist_migrations')
        .update({ document_id: createdDoc.id })
        .eq('id', supabaseEntry.id)
    }

    return createdDoc
  } catch (error) {
    console.error('Error creating Prismic document from Supabase:', error)
    return null
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
    
    // Fetch from both Supabase and Prismic
    let supabaseMigrations = []
    const { data, error } = await supabase
      .from('pending_artist_migrations')
      .select('*')
      .in('status', ['pending']) // Only get pending, exclude published, cancelled, and archived
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
    
    // Fetch from Prismic
    const prismicMigrations = await fetchPendingMigrationsFromPrismic()
    
    // Sync: Create missing entries
    // 1. If document exists in Prismic but not in Supabase → create in Supabase
    // Only create if there's no pending entry for this UID
    for (const prismicDoc of prismicMigrations) {
      const hasPendingInSupabase = supabaseMigrations.find(
        m => m.uid === prismicDoc.uid && m.status === 'pending'
      )
      
      // Only create if there's no pending entry (allow multiple published/archived)
      if (!hasPendingInSupabase) {
        const existsByDocId = prismicDoc.documentId && supabaseMigrations.find(
          m => m.documentId === prismicDoc.documentId
        )
        
        if (!existsByDocId) {
          const created = await createSupabaseEntryFromPrismic(prismicDoc, supabase)
          if (created) {
            supabaseMigrations.push(created)
          }
        }
      }
    }
    
    // 2. If document exists in Supabase but not in Prismic → create in Prismic
    // Only create Prismic document if there's no existing one for this pending entry
    for (const supabaseEntry of supabaseMigrations) {
      if (supabaseEntry.status === 'pending') {
        const existsInPrismic = prismicMigrations.find(
          p => p.documentId === supabaseEntry.documentId || 
               (p.uid === supabaseEntry.uid && p.documentId) // Only match if Prismic doc has documentId
        )
        
        if (!existsInPrismic) {
          await createPrismicDocumentFromSupabase(supabaseEntry)
          // Note: We don't add to prismicMigrations array since we'll refetch if needed
          // The document will be synced on next load
        }
      }
    }
    
    // Re-fetch from Supabase to get any newly created entries
    // Use DISTINCT ON to get only the latest pending entry per uid
    const { data: refreshedData } = await supabase
      .from('pending_artist_migrations')
      .select('*')
      .in('status', ['pending'])
      .order('uid', { ascending: true })
      .order('created_at', { ascending: false })
    
    // Get only the latest entry per uid (since we ordered by uid then created_at desc)
    const latestByUid = new Map()
    for (const row of refreshedData || []) {
      if (!latestByUid.has(row.uid)) {
        latestByUid.set(row.uid, row)
      }
    }
    
    const finalMigrations = Array.from(latestByUid.values()).map(row => ({
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
    }))
    
    return NextResponse.json({
      success: true,
      pending: finalMigrations,
      total: finalMigrations.length,
      source: 'Supabase (synced with Prismic)',
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
    
    // Check if there's already a pending entry for this UID
    const { data: existingPending } = await supabase
      .from('pending_artist_migrations')
      .select('*')
      .eq('uid', migrationData.uid)
      .eq('status', 'pending')
      .maybeSingle()
    
    if (existingPending) {
      // Update existing pending entry (editing)
      const updateData = {
        name_en: migrationData.name_en,
        release_title: migrationData.releaseTitle,
        document_id: migrationData.documentId || existingPending.document_id,
        repository_name: migrationData.repositoryName || 'bonjouridol',
        artist_data: migrationData.artistData || null,
      }
      
      const { data, error } = await supabase
        .from('pending_artist_migrations')
        .update(updateData)
        .eq('id', existingPending.id)
        .select()
        .single()
      
      if (error) {
        console.error('Error updating pending migration:', error)
        return NextResponse.json(
          { error: 'Failed to update pending migration', message: error.message },
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
        updated: true,
      })
    } else {
      // Create new pending entry (new document)
      const insertData = {
        uid: migrationData.uid,
        name_en: migrationData.name_en,
        release_title: migrationData.releaseTitle,
        document_id: migrationData.documentId,
        repository_name: migrationData.repositoryName || 'bonjouridol',
        artist_data: migrationData.artistData || null,
        status: 'pending',
        created_at: migrationData.createdAt || new Date().toISOString(),
      }
      
      const { data, error } = await supabase
        .from('pending_artist_migrations')
        .insert(insertData)
        .select()
        .single()
      
      if (error) {
        console.error('Error creating pending migration:', error)
        return NextResponse.json(
          { error: 'Failed to create pending migration', message: error.message },
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
        updated: false,
      })
    }
    
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

