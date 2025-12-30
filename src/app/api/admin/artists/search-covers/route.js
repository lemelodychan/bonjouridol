import { NextResponse } from 'next/server'

/**
 * Search iTunes for album/single covers
 * Proxies the iTunes Search API to avoid CORS issues
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query')

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      )
    }

    // Search iTunes API
    const encodedQuery = encodeURIComponent(query)
    const itunesUrl = `https://itunes.apple.com/search?term=${encodedQuery}&country=jp&limit=12&entity=song`

    const response = await fetch(itunesUrl, {
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`iTunes API error: ${response.status}`)
    }

    const data = await response.json()

    return NextResponse.json({
      success: true,
      results: data.results || [],
      resultCount: data.resultCount || 0,
    })

  } catch (error) {
    console.error('Error searching iTunes:', error)
    return NextResponse.json(
      { error: 'Failed to search iTunes', message: error.message },
      { status: 500 }
    )
  }
}

