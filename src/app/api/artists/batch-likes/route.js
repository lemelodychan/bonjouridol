import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    // Import and create Supabase client
    const { createSupabaseClient } = await import('@/lib/supabase')
    const supabase = createSupabaseClient()
    
    // Check if Supabase is configured
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase not configured', message: 'Please set up Supabase environment variables' },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(request.url)
    const artists = searchParams.get('artists')

    if (!artists) {
      return NextResponse.json(
        { error: 'Missing artists parameter' },
        { status: 400 }
      )
    }

    const artistArray = artists.split(',').map(artist => artist.trim()).filter(Boolean)

    if (artistArray.length === 0) {
      return NextResponse.json(
        { error: 'No valid artists provided' },
        { status: 400 }
      )
    }

    // Get like counts for all artists in a single query
    const { data: likesData, error: likesError } = await supabase
      .from('artist_likes')
      .select('artist_name, like_count')
      .in('artist_name', artistArray)

    if (likesError) {
      console.error('Error fetching batch artist likes:', likesError)
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      )
    }

    // Aggregate like counts by artist name
    const likeCounts = {}
    likesData.forEach(like => {
      if (!likeCounts[like.artist_name]) {
        likeCounts[like.artist_name] = 0
      }
      likeCounts[like.artist_name] += like.like_count
    })

    // Ensure all requested artists are included in response (with 0 if no likes)
    const result = {}
    artistArray.forEach(artist => {
      result[artist] = likeCounts[artist] || 0
    })

    return NextResponse.json(result)

  } catch (error) {
    console.error('Batch artist likes API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
