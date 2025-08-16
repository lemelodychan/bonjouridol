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
    const artistName = searchParams.get('artist')

    if (!artistName) {
      return NextResponse.json(
        { error: 'Missing artist parameter' },
        { status: 400 }
      )
    }

    // Get client IP for anonymous tracking
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0] : 'unknown'
    const userIdentifier = `ip_${ip}`

    // Get direct artist likes
    const { data: artistLikes, error: artistLikesError } = await supabase
      .from('artist_likes')
      .select('like_count')
      .eq('artist_name', artistName)

    if (artistLikesError) {
      console.error('Error fetching artist likes:', artistLikesError)
    }

    const directArtistLikes = artistLikes ? artistLikes.reduce((sum, like) => sum + like.like_count, 0) : 0

    // Get article likes where artist column equals artist name (single artist articles only)
    // Since artist column is JSONB, we need to handle it differently
    const { data: matchingArticles, error: articlesError } = await supabase
      .from('articles')
      .select('slug, artist')
      .not('artist', 'is', null)

    if (articlesError) {
      console.error('Error fetching matching articles:', articlesError)
    }

    // Filter articles to find those with single artist matching our artist name
    const matchingSlugs = []
    if (matchingArticles) {
      for (const article of matchingArticles) {
        if (article.artist) {
          // Check if artist is a string (single artist) or array/object (multiple artists)
          let artistString = null
          
          if (typeof article.artist === 'string') {
            artistString = article.artist
          } else if (Array.isArray(article.artist)) {
            // If it's an array, check if it has only one artist
            if (article.artist.length === 1) {
              artistString = article.artist[0]
            }
          } else if (typeof article.artist === 'object') {
            // If it's an object, check if it has a single name property
            if (article.artist.name && !article.artist.name.includes(',') && !article.artist.name.includes('&') && !article.artist.name.includes(' and ')) {
              artistString = article.artist.name
            }
          }
          
          // Check if this single artist matches our artist name
          if (artistString && artistString === artistName) {
            matchingSlugs.push(article.slug)
          }
        }
      }
    }

    // Then get likes for those articles
    const { data: articleLikes, error: articleLikesError } = await supabase
      .from('article_likes')
      .select('like_count')
      .in('slug', matchingSlugs)

    if (articleLikesError) {
      console.error('Error fetching article likes:', articleLikesError)
    }

    const articleLikesTotal = articleLikes ? articleLikes.reduce((sum, like) => sum + like.like_count, 0) : 0

    // Calculate total likes
    const totalLikes = directArtistLikes + articleLikesTotal

    // Get user's direct artist likes
    const { data: userArtistLike, error: userArtistError } = await supabase
      .from('artist_likes')
      .select('like_count')
      .eq('artist_name', artistName)
      .eq('user_identifier', userIdentifier)
      .single()

    const userArtistLikes = userArtistError ? 0 : userArtistLike.like_count

    // Get user's article likes for this artist
    const { data: userArticleLikes, error: userArticleError } = await supabase
      .from('article_likes')
      .select('like_count')
      .eq('user_identifier', userIdentifier)
      .in('slug', matchingSlugs)

    if (userArticleError) {
      console.error('Error fetching user article likes:', userArticleError)
    }

    const userArticleLikesTotal = userArticleLikes ? userArticleLikes.reduce((sum, like) => sum + like.like_count, 0) : 0

    // Calculate total user likes
    const userLikes = userArtistLikes + userArticleLikesTotal

    return NextResponse.json({
      totalLikes,
      userLikes,
      directArtistLikes,
      articleLikes: articleLikesTotal,
      breakdown: {
        directArtistLikes,
        articleLikes: articleLikesTotal
      }
    })

  } catch (error) {
    console.error('Artist stats API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

