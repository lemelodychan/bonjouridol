import { NextResponse } from 'next/server'

/**
 * Export gallery data as Prismic import JSON
 * Format based on Prismic's import/export specification
 */
export async function POST(request) {
  try {
    const galleryData = await request.json()
    
    // Validate required fields
    if (!galleryData.title || !galleryData.uid) {
      return NextResponse.json(
        { error: 'Title and UID are required' },
        { status: 400 }
      )
    }
    
    // Format gallery for Prismic import
    // Based on Prismic's import format and your custom type structure
    const prismicDocument = {
      type: 'gallery',
      uid: galleryData.uid,
      lang: 'en-us', // Default language
      data: {
        title: galleryData.title || '',
        type: galleryData.type || 'Gallery',
        artist_name: galleryData.artist_name || '',
        event_date: galleryData.event_date || null,
        venue: galleryData.venue || '',
        is_official_photos: galleryData.is_official_photos || false,
        featured_image: galleryData.featured_image || null,
        photographer: galleryData.photographer ? {
          id: galleryData.photographer,
          type: 'author',
          isBroken: false,
        } : null,
        photographer_2: galleryData.photographer_2 ? {
          id: galleryData.photographer_2,
          type: 'author',
          isBroken: false,
        } : null,
        gallery: (galleryData.images || []).map(image => ({
          image: {
            id: image.id,
            url: image.url || '',
            width: image.dimensions?.width || null,
            height: image.dimensions?.height || null,
            alt: image.alt || null,
            copyright: image.copyright || null,
            edit: {
              x: 0,
              y: 0,
              zoom: 1,
              background: 'transparent',
            },
          },
        })),
        meta_title: galleryData.meta_title || galleryData.title || '',
        meta_description: galleryData.meta_description || '',
        meta_image: galleryData.meta_image || null,
      },
    }
    
    // Prismic import format wraps documents in an array
    const prismicImport = {
      documents: [prismicDocument],
    }
    
    // Return as downloadable JSON
    return new NextResponse(JSON.stringify(prismicImport, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="gallery-${galleryData.uid}-${Date.now()}.json"`,
      },
    })
  } catch (error) {
    console.error('Error exporting gallery:', error)
    return NextResponse.json(
      { error: 'Failed to export gallery', message: error.message },
      { status: 500 }
    )
  }
}

