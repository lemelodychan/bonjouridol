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
    const slugs = searchParams.get('slugs')

    if (!slugs) {
      return NextResponse.json(
        { error: 'Missing slugs parameter' },
        { status: 400 }
      )
    }

    const slugArray = slugs.split(',').map(slug => slug.trim()).filter(Boolean)

    if (slugArray.length === 0) {
      return NextResponse.json(
        { error: 'No valid slugs provided' },
        { status: 400 }
      )
    }

    // Get like counts for all articles in a single query
    const { data: likesData, error: likesError } = await supabase
      .from('article_likes')
      .select('slug, like_count')
      .in('slug', slugArray)

    if (likesError) {
      console.error('Error fetching batch likes:', likesError)
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      )
    }

    // Aggregate like counts by slug
    const likeCounts = {}
    likesData.forEach(like => {
      if (!likeCounts[like.slug]) {
        likeCounts[like.slug] = 0
      }
      likeCounts[like.slug] += like.like_count
    })

    // Ensure all requested slugs are included in response (with 0 if no likes)
    const result = {}
    slugArray.forEach(slug => {
      result[slug] = likeCounts[slug] || 0
    })

    return NextResponse.json(result)

  } catch (error) {
    console.error('Batch likes API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
