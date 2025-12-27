import { NextResponse } from 'next/server'
import { createClient } from '@/prismicio'

/**
 * Get all authors (photographers) for dropdown selection
 */
export async function GET(request) {
  try {
    const client = createClient()
    
    // Get all authors
    const authors = await client.getAllByType('author', {
      orderings: [
        {
          field: 'document.first_publication_date',
          direction: 'desc',
        },
      ],
    })

    // Format authors for dropdown
    const formattedAuthors = authors.map(author => ({
      id: author.id,
      uid: author.uid,
      name: author.data.name || 'Unnamed',
    }))

    return NextResponse.json({
      success: true,
      authors: formattedAuthors,
    })
  } catch (error) {
    console.error('Error fetching authors:', error)
    return NextResponse.json(
      { error: 'Failed to fetch authors', message: error.message },
      { status: 500 }
    )
  }
}

