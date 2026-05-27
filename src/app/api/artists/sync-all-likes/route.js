import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'

export async function POST(request) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response
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

    console.log('Starting bulk sync of all artist likes...')

    // Get all artists
    const { data: artists, error: artistsError } = await supabase
      .from('artists')
      .select('name')

    if (artistsError) {
      return NextResponse.json({
        error: 'Failed to fetch artists',
        details: artistsError.message
      }, { status: 500 })
    }

    console.log(`Found ${artists.length} artists to sync`)

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

    console.log(`Found ${articles.length} articles to process`)

    // Process each artist
    const results = []
    let totalSynced = 0

    for (const artist of artists) {
      const artistName = artist.name
      
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

      // Get total likes from these articles
      let totalArticleLikes = 0
      if (matchingSlugs.length > 0) {
        const { data: articleLikes, error: likesError } = await supabase
          .from('article_likes')
          .select('like_count')
          .in('slug', matchingSlugs)

        if (!likesError) {
          totalArticleLikes = articleLikes ? articleLikes.reduce((sum, like) => sum + like.like_count, 0) : 0
        }
      }

      // Get current artist likes
      const { data: artistLikes, error: artistLikesError } = await supabase
        .from('artist_likes')
        .select('like_count')
        .eq('artist_name', artistName)

      const totalArtistLikes = artistLikesError ? 0 : (artistLikes ? artistLikes.reduce((sum, like) => sum + like.like_count, 0) : 0)

      // Update the artist's total likes
      const { error: updateError } = await supabase
        .from('artists')
        .update({ likes: totalArtistLikes + totalArticleLikes })
        .eq('name', artistName)

      const result = {
        artistName,
        articlesFound: matchingSlugs.length,
        totalArticleLikes,
        totalArtistLikes,
        totalCombinedLikes: totalArtistLikes + totalArticleLikes,
        success: !updateError,
        error: updateError ? updateError.message : null
      }

      results.push(result)

      if (!updateError) {
        totalSynced++
      }

      console.log(`Synced ${artistName}: ${totalArticleLikes} article likes + ${totalArtistLikes} artist likes = ${totalArtistLikes + totalArticleLikes} total`)
    }

    return NextResponse.json({
      success: true,
      message: 'Bulk artist likes sync completed',
      summary: {
        totalArtists: artists.length,
        totalSynced,
        totalFailed: artists.length - totalSynced
      },
      results
    })

  } catch (error) {
    console.error('Bulk artist likes sync API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
