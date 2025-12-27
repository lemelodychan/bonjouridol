import { NextResponse } from 'next/server'

/**
 * Create a gallery document using Prismic Migration API
 * Endpoint: https://migration.prismic.io/documents
 * 
 * IMPORTANT: Documents created via Migration API are ALWAYS created as DRAFTS.
 * They must be manually reviewed and published in Prismic Dashboard > Migration Releases.
 * This ensures no content goes live without manual approval.
 */
export async function POST(request) {
  try {
    const galleryData = await request.json()
    
    // Validate required fields
    if (!galleryData.title || !galleryData.title.trim() || !galleryData.uid || !galleryData.uid.trim()) {
      return NextResponse.json(
        { error: 'Title and UID are required and cannot be empty' },
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

    // Format gallery document for Migration API
    // Note: title, type, and lang must be at root level (not just in data) and must be non-empty strings
    // Also note: link and image fields cannot be null - they must be omitted if not provided
    
    // Build data object, only including fields that have values
    const data = {
      title: galleryData.title || '',
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
      meta_title: galleryData.meta_title || galleryData.title || '',
      meta_description: galleryData.meta_description || '',
    }
    
    // Only include photographer if it has a value (cannot be null)
    // Content relationship fields require link_type: "Document" for document links
    if (galleryData.photographer) {
      data.photographer = {
        id: galleryData.photographer,
        type: 'author',
        link_type: 'Document', // Required: must be "Web", "Document", "Media", or "Any"
        isBroken: false,
      }
    }
    
    // Only include photographer_2 if it has a value (cannot be null)
    if (galleryData.photographer_2) {
      data.photographer_2 = {
        id: galleryData.photographer_2,
        type: 'author',
        link_type: 'Document', // Required: must be "Web", "Document", "Media", or "Any"
        isBroken: false,
      }
    }
    
    // Only include featured_image if it has a value and is an object (cannot be null)
    if (galleryData.featured_image && typeof galleryData.featured_image === 'object') {
      data.featured_image = galleryData.featured_image
    }
    
    // Only include meta_image if it has a value and is an object (cannot be null)
    if (galleryData.meta_image && typeof galleryData.meta_image === 'object') {
      data.meta_image = galleryData.meta_image
    }
    
    const document = {
      type: 'gallery',
      uid: (galleryData.uid || '').trim(),
      lang: 'en-us',
      title: (galleryData.title || '').trim(), // Required at root level, must be non-empty
      data: data,
    }

    // Generate release title in format: "New Galleries - [date] - [gallery title]"
    const releaseDate = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    const releaseTitle = `New Galleries - ${releaseDate} - ${(galleryData.title || '').trim()}`

    // Try Migration API endpoint with release title
    // Format: Include release title in the request body
    let requestBody = {
      release_title: releaseTitle,
      documents: [document],
    }
    
    let response = await fetch('https://migration.prismic.io/documents', {
      method: 'POST',
      headers: {
        'repository': REPOSITORY_NAME,
        'Authorization': `Bearer ${MIGRATION_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    let responseText = await response.text()

    // If the release_title parameter doesn't work, try without it (fallback)
    if (!response.ok) {
      try {
        const error = JSON.parse(responseText)
        // If it's a validation error about release_title, try without it
        if (error.details && error.details.some(d => d.property === 'release_title' || d.property?.includes('release'))) {
          // Fallback: try without release_title parameter
          requestBody = {
            documents: [document],
          }
          response = await fetch('https://migration.prismic.io/documents', {
            method: 'POST',
            headers: {
              'repository': REPOSITORY_NAME,
              'Authorization': `Bearer ${MIGRATION_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          })
          responseText = await response.text()
        }
      } catch {
        // Not JSON, continue with original response
      }
    }

    if (!response.ok) {
      console.error('Migration API error:', response.status, responseText)
      
      // Try to parse error
      let errorMessage = 'Failed to create gallery document'
      try {
        const error = JSON.parse(responseText)
        errorMessage = error.message || errorMessage
        if (error.details) {
          errorMessage += `: ${JSON.stringify(error.details)}`
        }
      } catch {
        errorMessage = responseText.substring(0, 200)
      }

      return NextResponse.json(
        { 
          error: errorMessage,
          status: response.status,
          details: responseText,
        },
        { status: response.status }
      )
    }

    // Parse success response
    let result
    try {
      result = JSON.parse(responseText)
    } catch {
      result = { message: 'Document created successfully', response: responseText }
    }

    // Extract document ID or UID from response if available
    const documentId = result.id || result.uid || result.document?.id || result.document?.uid || 'unknown'
    const repositoryName = REPOSITORY_NAME

    return NextResponse.json({
      success: true,
      message: 'Gallery document created successfully as a draft',
      draft: true, // Explicitly indicate this is a draft
      note: 'The gallery is saved as a draft and must be manually published in Prismic Dashboard > Migration Releases',
      releaseTitle: releaseTitle,
      documentId: documentId,
      repositoryName: repositoryName,
      prismicUrl: `https://${repositoryName}.prismic.io/migrations`,
      data: result,
    })

  } catch (error) {
    console.error('Error creating gallery:', error)
    return NextResponse.json(
      { error: 'Failed to create gallery document', message: error.message },
      { status: 500 }
    )
  }
}

