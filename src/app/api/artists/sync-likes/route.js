import { NextResponse } from 'next/server'

export async function POST(request) {
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

    const { artistName } = await request.json()

    if (!artistName) {
      return NextResponse.json(
        { error: 'Missing artist name parameter' },
        { status: 400 }
      )
    }

    console.log(`Syncing likes for artist: ${artistName}`)

    // Get all articles with their artist data
    const { data: articles, error: articlesError } = await supabase
      .from('articles')
      .select('slug, artist')
      .not('artist', 'is', null)

    if (articlesError) {
      return NextResponse.json({
        error: 'Failed to fetch articles',
        details: articlesError.message
      }, { status: 500 })
    }

    // Find articles that have this artist as the sole artist
    const matchingSlugs = []
    for (const article of articles) {
      if (article.artist) {
        let artistString = null
        
        if (typeof article.artist === 'string') {
          artistString = article.artist
        } else if (Array.isArray(article.artist)) {
          if (article.artist.length === 1) {
            artistString = article.artist[0]
          }
        } else if (typeof article.artist === 'object') {
          if (article.artist.name && !article.artist.name.includes(',') && !article.artist.name.includes('&') && !article.artist.name.includes(' and ')) {
            artistString = article.artist.name
          }
        }
        
        if (artistString && artistString === artistName) {
          matchingSlugs.push(article.slug)
        }
      }
    }

    console.log(`Found ${matchingSlugs.length} articles for artist ${artistName}`)

    if (matchingSlugs.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No articles found for this artist',
        summary: {
          artistName,
          articlesFound: 0,
          totalLikes: 0
        }
      })
    }

    // Get total likes from these articles
    const { data: articleLikes, error: likesError } = await supabase
      .from('article_likes')
      .select('like_count')
      .in('slug', matchingSlugs)

    if (likesError) {
      return NextResponse.json({
        error: 'Failed to fetch article likes',
        details: likesError.message
      }, { status: 500 })
    }

    const totalArticleLikes = articleLikes ? articleLikes.reduce((sum, like) => sum + like.like_count, 0) : 0

    // Get current artist likes
    const { data: artistLikes, error: artistLikesError } = await supabase
      .from('artist_likes')
      .select('like_count')
      .eq('artist_name', artistName)

    if (artistLikesError) {
      return NextResponse.json({
        error: 'Failed to fetch artist likes',
        details: artistLikesError.message
      }, { status: 500 })
    }

    const totalArtistLikes = artistLikes ? artistLikes.reduce((sum, like) => sum + like.like_count, 0) : 0

    // Update the artist's total likes in the artists table
    const { error: updateError } = await supabase
      .from('artists')
      .update({ likes: totalArtistLikes + totalArticleLikes })
      .eq('name', artistName)

    if (updateError) {
      return NextResponse.json({
        error: 'Failed to update artist likes',
        details: updateError.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Artist likes synced successfully',
      summary: {
        artistName,
        articlesFound: matchingSlugs.length,
        totalArticleLikes,
        totalArtistLikes,
        totalCombinedLikes: totalArtistLikes + totalArticleLikes,
        matchingSlugs
      }
    })

  } catch (error) {
    console.error('Artist likes sync API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
