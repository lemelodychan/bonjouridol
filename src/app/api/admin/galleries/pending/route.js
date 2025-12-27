import { NextResponse } from 'next/server'

// In-memory store for pending migrations (in production, use a database)
// This is a simple implementation - you may want to persist this in a database
let pendingMigrations = []

export async function GET(request) {
  try {
    // Return all pending migrations, sorted by creation date (newest first)
    const sorted = [...pendingMigrations].sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    )
    
    return NextResponse.json({
      success: true,
      pending: sorted,
      total: sorted.length,
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
    
    // Add a new pending migration
    const pendingMigration = {
      id: migrationData.id || `pending-${Date.now()}`,
      title: migrationData.title,
      uid: migrationData.uid,
      releaseTitle: migrationData.releaseTitle,
      createdAt: migrationData.createdAt || new Date().toISOString(),
      documentId: migrationData.documentId,
      repositoryName: migrationData.repositoryName,
    }
    
    pendingMigrations.push(pendingMigration)
    
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

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { error: 'Migration ID is required' },
        { status: 400 }
      )
    }
    
    // Remove the pending migration
    pendingMigrations = pendingMigrations.filter(m => m.id !== id)
    
    return NextResponse.json({
      success: true,
      message: 'Pending migration removed',
    })
  } catch (error) {
    console.error('Error deleting pending migration:', error)
    return NextResponse.json(
      { error: 'Failed to delete pending migration', message: error.message },
      { status: 500 }
    )
  }
}

