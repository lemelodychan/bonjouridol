import { NextResponse } from 'next/server'
import { createClient } from '@/prismicio'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET(request) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response
  try {
    const client = createClient()

    // Get all galleries
    const galleries = await client.getAllByType('gallery', {
      orderings: [
        {
          field: 'document.first_publication_date',
          direction: 'desc',
        },
      ],
    })

    // Format galleries for frontend
    const formattedGalleries = galleries.map(gallery => ({
      id: gallery.id,
      uid: gallery.uid,
      title: gallery.data.title || 'Untitled',
      artist_name: gallery.data.artist_name || '',
      event_date: gallery.data.event_date || gallery.first_publication_date,
      venue: gallery.data.venue || '',
      image_count: gallery.data.gallery?.length || 0,
      featured_image: gallery.data.featured_image || null,
      first_publication_date: gallery.first_publication_date,
      last_publication_date: gallery.last_publication_date,
    }))

    return NextResponse.json({
      success: true,
      galleries: formattedGalleries,
      total: formattedGalleries.length,
    })
  } catch (error) {
    console.error('Error fetching galleries:', error)
    return NextResponse.json(
      { error: 'Failed to fetch galleries', message: error.message },
      { status: 500 }
    )
  }
}

