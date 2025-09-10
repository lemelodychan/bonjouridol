import { NextResponse } from 'next/server'
import { invalidateArtistCache } from './cache-utils'

// Check if Supabase is configured
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables not configured. Artist like system will not work.')
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

    const { artistName, batchCount = 1 } = await request.json()

    if (!artistName) {
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

    // Check if artist exists, if not create it
    const { data: existingArtist, error: fetchError } = await supabase
      .from('artists')
      .select('*')
      .eq('name', artistName)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      )
    }

    if (!existingArtist) {
      // Create new artist record
      const { error: insertError } = await supabase
        .from('artists')
        .insert({
          name: artistName,
          likes: 0
        })

      if (insertError) {
        return NextResponse.json(
          { error: 'Failed to create artist record' },
          { status: 500 }
        )
      }
    }

    // Check if user has already liked this artist
    const { data: existingLike, error: likeCheckError } = await supabase
      .from('artist_likes')
      .select('*')
      .eq('artist_name', artistName)
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
        .from('artist_likes')
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
      
      // Invalidate cache for this artist
      invalidateArtistCache(artistName)
    } else {
      // First time liking this artist
      const { data: newLike, error: insertLikeError } = await supabase
        .from('artist_likes')
        .insert({
          artist_name: artistName,
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
      
      // Invalidate cache for this artist
      invalidateArtistCache(artistName)
    }

    // Calculate total likes from artist_likes table
    const { data: allLikes, error: countError } = await supabase
      .from('artist_likes')
      .select('like_count')
      .eq('artist_name', artistName)

    if (countError) {
      console.error('Error counting likes:', countError)
      totalLikes = 0
    } else {
      totalLikes = allLikes.reduce((sum, like) => sum + like.like_count, 0)
    }

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

    // Calculate total likes (direct artist likes + article likes)
    const totalCombinedLikes = totalLikes + articleLikesTotal

    // Update the artist's total likes to keep it in sync
    const { error: updateError } = await supabase
      .from('artists')
      .update({ likes: totalCombinedLikes })
      .eq('name', artistName)

    if (updateError) {
      console.error('Error updating artist likes:', updateError)
    }

    return NextResponse.json({
      success: true,
      totalLikes: totalCombinedLikes, // Return the combined total
      userLikes
    })

  } catch (error) {
    console.error('Artist like API error:', error)
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

    // Get artist stats
    console.log('Looking for artist:', artistName)
    const { data: artist, error: artistError } = await supabase
      .from('artists')
      .select('likes')
      .eq('name', artistName)
      .single()

    console.log('Artist query result:', { artist, error: artistError })

    if (artistError && artistError.code !== 'PGRST116') {
      console.error('Error fetching artist:', artistError)
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      )
    }

    // If artist doesn't exist, create it with default values
    if (!artist) {
      console.log('Artist not found, creating new record')
      
      const { error: insertError } = await supabase
        .from('artists')
        .insert({
          name: artistName,
          likes: 0
        })

      if (insertError) {
        console.error('Error creating artist record:', insertError)
      }

      return NextResponse.json({
        totalLikes: 0,
        userLikes: 0
      })
    }

    // Calculate total likes from artist_likes table (more accurate)
    const { data: allLikes, error: countError } = await supabase
      .from('artist_likes')
      .select('like_count')
      .eq('artist_name', artistName)

    if (countError) {
      console.error('Error counting likes:', countError)
    }

    const totalLikes = allLikes ? allLikes.reduce((sum, like) => sum + like.like_count, 0) : 0
    console.log('Returning artist stats:', { totalLikes })

    // Get user's like count
    const { data: userLike, error: userError } = await supabase
      .from('artist_likes')
      .select('like_count')
      .eq('artist_name', artistName)
      .eq('user_identifier', userIdentifier)
      .single()

    const userLikes = userError ? 0 : userLike.like_count

    return NextResponse.json({
      totalLikes,
      userLikes
    })

  } catch (error) {
    console.error('Artist like GET API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

