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

    // Get direct artist likes for all artists
    const { data: artistLikesData, error: artistLikesError } = await supabase
      .from('artist_likes')
      .select('artist_name, like_count')
      .in('artist_name', artistArray)

    if (artistLikesError) {
      console.error('Error fetching batch artist likes:', artistLikesError)
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      )
    }

    // Aggregate direct artist like counts by artist name
    const directLikeCounts = {}
    artistLikesData.forEach(like => {
      if (!directLikeCounts[like.artist_name]) {
        directLikeCounts[like.artist_name] = 0
      }
      directLikeCounts[like.artist_name] += like.like_count
    })

    // Get all articles with artist data
    const { data: allArticles, error: articlesError } = await supabase
      .from('articles')
      .select('slug, artist')
      .not('artist', 'is', null)

    if (articlesError) {
      console.error('Error fetching articles for artist likes:', articlesError)
    }

    // Process articles to find single-artist articles and get their like counts
    const artistArticleSlugs = {}
    
    if (allArticles) {
      for (const article of allArticles) {
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
          
          // Check if this single artist is in our requested list
          if (artistString && artistArray.includes(artistString)) {
            if (!artistArticleSlugs[artistString]) {
              artistArticleSlugs[artistString] = []
            }
            artistArticleSlugs[artistString].push(article.slug)
          }
        }
      }
    }

    // Get article likes for all relevant articles
    const allArticleSlugs = Object.values(artistArticleSlugs).flat()
    let articleLikesData = []
    
    if (allArticleSlugs.length > 0) {
      const { data: articleLikes, error: articleLikesError } = await supabase
        .from('article_likes')
        .select('slug, like_count')
        .in('slug', allArticleSlugs)

      if (articleLikesError) {
        console.error('Error fetching article likes:', articleLikesError)
      } else {
        articleLikesData = articleLikes || []
      }
    }

    // Aggregate article like counts by artist
    const articleLikeCounts = {}
    articleLikesData.forEach(like => {
      // Find which artist this article belongs to
      for (const [artistName, slugs] of Object.entries(artistArticleSlugs)) {
        if (slugs.includes(like.slug)) {
          if (!articleLikeCounts[artistName]) {
            articleLikeCounts[artistName] = 0
          }
          articleLikeCounts[artistName] += like.like_count
          break
        }
      }
    })

    // Combine direct artist likes and article likes
    const result = {}
    artistArray.forEach(artist => {
      const directLikes = directLikeCounts[artist] || 0
      const articleLikes = articleLikeCounts[artist] || 0
      result[artist] = directLikes + articleLikes
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
