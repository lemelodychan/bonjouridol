import { NextResponse } from 'next/server'
import { createClient } from '@/prismicio'

/**
 * Create or update a gallery document using Prismic Migration API
 * Endpoint: https://migration.prismic.io/documents
 * 
 * IMPORTANT: Documents created via Migration API are ALWAYS created as DRAFTS.
 * They must be manually reviewed and published in Prismic Dashboard > Migration Releases.
 * This ensures no content goes live without manual approval.
 * 
 * If galleryData.documentId is provided, this will attempt to UPDATE the existing document.
 * Otherwise, it will CREATE a new document.
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

    // Check if we're updating an existing document
    const isUpdate = !!galleryData.documentId
    const documentId = galleryData.documentId

    // Format gallery document for Migration API
    // Note: title, type, and lang must be at root level (not just in data) and must be non-empty strings
    // Also note: link and image fields cannot be null - they must be omitted if not provided
    
    // Sort images alphabetically by media title (filename) before adding to slice
    // Prismic media title is the filename (e.g., "251229-UUG2_-165" or "251229-UUG2_-165.jpg")
    const sortedImages = (galleryData.images || []).sort((a, b) => {
      // Use filename (media title) as primary sort key, fallback to id if filename is missing
      const filenameA = (a.filename || a.id || '').toLowerCase().trim()
      const filenameB = (b.filename || b.id || '').toLowerCase().trim()
      
      // Use localeCompare for proper alphabetical sorting (handles numbers, special chars)
      return filenameA.localeCompare(filenameB, undefined, { 
        numeric: true,  // Enable numeric sorting (e.g., "2" comes before "10")
        sensitivity: 'base' // Case-insensitive, ignore accents
      })
    })
    
    // Build data object, only including fields that have values
    const data = {
      title: galleryData.title || '',
      type: galleryData.type || 'Gallery',
      artist_name: galleryData.artist_name || '',
      event_date: galleryData.event_date || null,
      venue: galleryData.venue || '',
      is_official_photos: galleryData.is_official_photos || false,
      gallery: sortedImages.map(image => ({
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
    
    // Handle featured_image - can be from galleryData.featured_image or from selected gallery image
    if (galleryData.featured_image_id) {
      // Find the image in the gallery images array
      const featuredImage = galleryData.images?.find(img => img.id === galleryData.featured_image_id)
      if (featuredImage) {
        data.featured_image = {
          id: featuredImage.id,
          url: featuredImage.url,
          width: featuredImage.dimensions?.width || null,
          height: featuredImage.dimensions?.height || null,
          alt: featuredImage.alt || null,
        }
      }
    } else if (galleryData.featured_image && typeof galleryData.featured_image === 'object') {
      data.featured_image = galleryData.featured_image
    }
    
    // Only include meta_image if it has a value and is an object (cannot be null)
    if (galleryData.meta_image && typeof galleryData.meta_image === 'object') {
      data.meta_image = galleryData.meta_image
    }
    
    // Include the UID in the release title so each gallery gets a unique release label.
    // This prevents two galleries with the same title on the same day from sharing a
    // Prismic release label, which would break the orphan-detection check in the
    // pending route (which keys off the label to verify a release still exists).
    const releaseDate = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    const releaseTitle = `New Galleries - ${releaseDate} - ${(galleryData.title || '').trim()} [${(galleryData.uid || '').trim()}]`

    // Ensure all root-level fields are explicitly strings
    const documentToSend = {
      type: String('gallery'),
      uid: String((galleryData.uid || '').trim()),
      lang: String('en-us'),
      title: String((galleryData.title || '').trim()),
      data: data,
      release_title: String(releaseTitle), // Add release title to document
    }
    
    // Add tags if provided (Prismic documents support tags at root level)
    // Also add a special tag to identify pending migrations
    const tags = galleryData.tags && Array.isArray(galleryData.tags) 
      ? galleryData.tags.filter(tag => tag && typeof tag === 'string')
      : []
    
    // Add special tag to identify this as a pending migration (for querying later)
    if (!tags.includes('pending-migration')) {
      tags.push('pending-migration')
    }
    
    if (tags.length > 0) {
      documentToSend.tags = tags
    }

    // Try Migration API endpoint
    let requestBody = documentToSend
    let response
    let responseText
    let wasUpdated = false
    
    if (isUpdate && documentId) {
      // Guard: if the UID is already published in Prismic, the migration release was
      // published by someone else while this form was open.  Sending a PUT now could
      // silently patch live published content, so we block it here instead.
      try {
        const prismicClient = createClient()
        const alreadyPublished = await prismicClient.getByUID('gallery', galleryData.uid).catch(() => null)
        if (alreadyPublished) {
          return NextResponse.json(
            { error: 'This gallery has already been published in Prismic. Reload the pending migrations list — this entry will be cleared automatically.' },
            { status: 409 }
          )
        }
      } catch {
        // Content API unreachable — proceed; worst case the Migration API PUT will fail
      }

      const updateUrl = `https://migration.prismic.io/documents/${documentId}`
      
      response = await fetch(updateUrl, {
        method: 'PUT',
        headers: {
          'repository': REPOSITORY_NAME,
          'Authorization': `Bearer ${MIGRATION_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })
      
      responseText = await response.text()

      if (response.ok) {
        wasUpdated = true
      } else {
        // Never fall back to creating a new document when an update was requested.
        // Creating a new document would spawn a second orphaned migration release in Prismic.
        // If the document is gone (404), the admin should recreate the gallery from scratch.
        let errorMessage = `Failed to update gallery (Prismic returned ${response.status})`
        if (response.status === 404) {
          errorMessage = 'The Prismic draft document no longer exists — it may have been deleted or its migration release was discarded. Please create the gallery again from scratch.'
        }
        return NextResponse.json(
          { error: errorMessage, status: response.status, details: responseText },
          { status: response.status === 404 ? 404 : 422 }
        )
      }
    }

    // Create new document (only reached when documentId was NOT provided, i.e. not editing)
    if (!wasUpdated) {
      // First try: Direct document (not wrapped) with release_title as query param
      const createUrl = new URL('https://migration.prismic.io/documents')
      createUrl.searchParams.set('release_title', releaseTitle)
      
      response = await fetch(createUrl.toString(), {
        method: 'POST',
        headers: {
          'repository': REPOSITORY_NAME,
          'Authorization': `Bearer ${MIGRATION_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      responseText = await response.text()

      // If direct document fails, try wrapped format
      if (!response.ok) {
        try {
          const error = JSON.parse(responseText)
          // If it's a validation error, try wrapped format
          if (error.details && error.details.some(d => 
            d.property === 'title' || 
            d.property === 'type' || 
            d.property === 'lang' ||
            d.property === 'release_title' ||
            d.property?.includes('release')
          )) {
            // Try Format 2: Wrapped in documents array with release_title
            requestBody = {
              documents: [documentToSend],
              release_title: releaseTitle, // Add release title at root level of wrapped format
            }
            const wrappedUrl = new URL('https://migration.prismic.io/documents')
            wrappedUrl.searchParams.set('release_title', releaseTitle)
            
            response = await fetch(wrappedUrl.toString(), {
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
    const returnedDocumentId = result.id || result.uid || result.document?.id || result.document?.uid || documentId || 'unknown'
    const repositoryName = REPOSITORY_NAME

    return NextResponse.json({
      success: true,
      message: wasUpdated 
        ? 'Gallery document updated successfully' 
        : 'Gallery document created successfully as a draft',
      updated: wasUpdated,
      draft: true, // Explicitly indicate this is a draft
      note: 'The gallery is saved as a draft and must be manually published in Prismic Dashboard > Migration Releases',
      releaseTitle: releaseTitle,
      documentId: returnedDocumentId,
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

