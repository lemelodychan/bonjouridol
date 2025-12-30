import { NextResponse } from 'next/server'
import { createClient } from '@/prismicio'
import { extractArtistsFromPrismicArticle, autoCreateArtistRecord } from '@/utils/artistUtils'

// Check if Supabase is configured
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables not configured. Like system will not work.')
}

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

    const { slug, type, batchCount = 1 } = await request.json()

    if (!slug || !type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get client IP for anonymous tracking
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0] : 'unknown'
    
    // Create a simple user identifier (in production, you might want to use cookies or user sessions)
    const userIdentifier = `ip_${ip}`

    // Check if article exists, if not create it
    const { data: existingArticle, error: fetchError } = await supabase
      .from('articles')
      .select('*')
      .eq('slug', slug)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      )
    }

    if (!existingArticle) {
      // Try to get article data from Prismic to populate artist field
      let artists = null
      let articleType = type
      
      try {
        const prismicClient = createClient()
        const prismicArticle = await prismicClient.getByUID('articles', slug)
        
        if (prismicArticle) {
          artists = extractArtistsFromPrismicArticle(prismicArticle)
          articleType = prismicArticle.data.type || type
        }
      } catch (error) {
        console.log(`Article ${slug} not found in Prismic, creating with default values`)
      }

      // Get or create artist and link to articles table
      // ONLY for single artists (for likes tracking)
      // Multiple artists will use JSONB field only
      let artistId = null
      if (artists) {
        // Check if this is a single artist
        let isSingleArtist = false
        let artistName = null
        
        if (typeof artists === 'string') {
          // Single artist as string
          isSingleArtist = true
          artistName = artists
        } else if (Array.isArray(artists)) {
          // Single artist if array has exactly 1 element
          if (artists.length === 1) {
            isSingleArtist = true
            artistName = artists[0]
          }
        } else if (typeof artists === 'object' && artists.name) {
          // Single artist if object has name and no comma/ampersand
          if (!artists.name.includes(',') && !artists.name.includes('&') && !artists.name.includes(' and ')) {
            isSingleArtist = true
            artistName = artists.name
          }
        }

        // Only link to artists table if it's a single artist
        if (isSingleArtist && artistName) {
          // Find or create artist
          const { data: existingArtist } = await supabase
            .from('artists')
            .select('id')
            .eq('name', artistName)
            .maybeSingle()

          if (existingArtist) {
            artistId = existingArtist.id
          } else {
            // Auto-create will handle creation, but we need to get the ID
            const prismicClient = createClient()
            let prismicArticleForArtist = null
            try {
              prismicArticleForArtist = await prismicClient.getByUID('articles', slug)
            } catch (error) {
              // Article not found, that's okay
            }
            await autoCreateArtistRecord(supabase, artists, prismicArticleForArtist)
            // Fetch the created artist
            const { data: createdArtist } = await supabase
              .from('artists')
              .select('id')
              .eq('name', artistName)
              .maybeSingle()
            if (createdArtist) {
              artistId = createdArtist.id
            }
          }
        }
      }

      // Create new article record
      const { error: insertError } = await supabase
        .from('articles')
        .insert({
          slug,
          type: articleType,
          likes: 0,
          views: 0,
          artist: artists,
          artist_id: artistId // Link to artists table (only for single artists)
        })

      if (insertError) {
        return NextResponse.json(
          { error: 'Failed to create article record' },
          { status: 500 }
        )
      }
    }

    // Check if user has already liked this article
    const { data: existingLike, error: likeCheckError } = await supabase
      .from('article_likes')
      .select('*')
      .eq('slug', slug)
      .eq('user_identifier', userIdentifier)
      .single()

    if (likeCheckError && likeCheckError.code !== 'PGRST116') {
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      )
    }

    let userLikes = 0
    let totalLikes = 0

    if (existingLike) {
      // User has already liked, increment their like count by batch amount
      const { data: updatedLike, error: updateError } = await supabase
        .from('article_likes')
        .update({ 
          like_count: existingLike.like_count + batchCount,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingLike.id)
        .select()
        .single()

      if (updateError) {
        return NextResponse.json(
          { error: 'Failed to update like' },
          { status: 500 }
        )
      }

      userLikes = updatedLike.like_count
    } else {
      // First time liking this article
      const { data: newLike, error: insertLikeError } = await supabase
        .from('article_likes')
        .insert({
          slug,
          user_identifier: userIdentifier,
          like_count: batchCount
        })
        .select()
        .single()

      if (insertLikeError) {
        return NextResponse.json(
          { error: 'Failed to create like record' },
          { status: 500 }
        )
      }

      userLikes = newLike.like_count
    }

    // Calculate total likes from article_likes table
    const { data: allLikes, error: countError } = await supabase
      .from('article_likes')
      .select('like_count')
      .eq('slug', slug)

    if (countError) {
      console.error('Error counting likes:', countError)
      totalLikes = 0
    } else {
      totalLikes = allLikes.reduce((sum, like) => sum + like.like_count, 0)
    }

    // Update the article's total likes to keep it in sync
    const { error: updateError } = await supabase
      .from('articles')
      .update({ likes: totalLikes })
      .eq('slug', slug)

    if (updateError) {
      console.error('Error updating article likes:', updateError)
    }

    return NextResponse.json({
      success: true,
      totalLikes,
      userLikes
    })

  } catch (error) {
    console.error('Like API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

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
    const slug = searchParams.get('slug')

    if (!slug) {
      return NextResponse.json(
        { error: 'Missing slug parameter' },
        { status: 400 }
      )
    }

    // Get client IP for anonymous tracking
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0] : 'unknown'
    const userIdentifier = `ip_${ip}`

    // Get article stats
    console.log('Looking for article with slug:', slug)
    const { data: article, error: articleError } = await supabase
      .from('articles')
      .select('views')
      .eq('slug', slug)
      .single()

    console.log('Article query result:', { article, error: articleError })

    if (articleError && articleError.code !== 'PGRST116') {
      console.error('Error fetching article:', articleError)
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      )
    }

    // If article doesn't exist, create it with default values
    if (!article) {
      console.log('Article not found, creating new record')
      
      // Try to get article data from Prismic to populate artist field
      let artists = null
      let articleType = 'Live report'
      
      try {
        const prismicClient = createClient()
        const prismicArticle = await prismicClient.getByUID('articles', slug)
        
        if (prismicArticle) {
          artists = extractArtistsFromPrismicArticle(prismicArticle)
          articleType = prismicArticle.data.type || 'Live report'
        }
      } catch (error) {
        console.log(`Article ${slug} not found in Prismic, creating with default values`)
      }

      const { error: insertError } = await supabase
        .from('articles')
        .insert({
          slug,
          type: articleType,
          likes: 0,
          views: 0,
          artist: artists
        })

      if (insertError) {
        console.error('Error creating article record:', insertError)
      }

      return NextResponse.json({
        totalLikes: 0,
        userLikes: 0,
        views: 0
      })
    }

    // Calculate total likes from article_likes table (more accurate)
    const { data: allLikes, error: countError } = await supabase
      .from('article_likes')
      .select('like_count')
      .eq('slug', slug)

    if (countError) {
      console.error('Error counting likes:', countError)
    }

    const totalLikes = allLikes ? allLikes.reduce((sum, like) => sum + like.like_count, 0) : 0
    const views = article.views || 0
    console.log('Returning stats:', { totalLikes, views })

    // Get user's like count
    const { data: userLike, error: userError } = await supabase
      .from('article_likes')
      .select('like_count')
      .eq('slug', slug)
      .eq('user_identifier', userIdentifier)
      .single()

    const userLikes = userError ? 0 : userLike.like_count

    return NextResponse.json({
      totalLikes,
      userLikes,
      views
    })

  } catch (error) {
    console.error('Get likes API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
