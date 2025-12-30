import { NextResponse } from 'next/server'
import { createClient } from '@/prismicio'
import { extractArtistsFromPrismicArticle, autoCreateArtistRecord } from '@/utils/artistUtils'

export async function POST(request) {
  try {
    // Import and create Supabase client
    const { createSupabaseClient } = await import('@/lib/supabase')
    const supabase = createSupabaseClient()
    
    // Check if Supabase is configured
    if (!supabase) {
      return NextResponse.json({
        error: 'Supabase not configured',
        message: 'Please set up Supabase environment variables in your .env files'
      }, { status: 500 })
    }

    const { slug } = await request.json()

    if (!slug) {
      return NextResponse.json(
        { error: 'Missing slug parameter' },
        { status: 400 }
      )
    }

    // Get article from Prismic
    const prismicClient = createClient()
    let prismicArticle = null

    try {
      prismicArticle = await prismicClient.getByUID('articles', slug)
    } catch (error) {
      console.log('Article not found in Prismic:', slug)
    }

    // Check if article exists in Supabase
    const { data: supabaseArticle, error: fetchError } = await supabase
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

    // Extract and process artist data from idol_name
    const artists = extractArtistsFromPrismicArticle(prismicArticle)

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
          await autoCreateArtistRecord(supabase, artists, prismicArticle)
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

    if (!supabaseArticle && prismicArticle) {
      // Create article in Supabase with Prismic data
      const { data: newArticle, error: insertError } = await supabase
        .from('articles')
        .insert({
          slug,
          type: prismicArticle.data.type || 'Live report',
          likes: 0, // Start with 0 likes
          views: 0,
          artist: artists,
          artist_id: artistId // Link to artists table
        })
        .select()
        .single()

      if (insertError) {
        return NextResponse.json(
          { error: 'Failed to create article record' },
          { status: 500 }
        )
      }

      // Auto-create artist record if this is a single artist article (if not already created)
      if (!artistId) {
        await autoCreateArtistRecord(supabase, artists, prismicArticle)
      }

      return NextResponse.json({
        success: true,
        message: 'Article synced to database',
        article: newArticle
      })
    }

    // Update existing article if it doesn't have artist data
    // For single artists, also update artist_id if missing
    if (supabaseArticle && prismicArticle && (supabaseArticle.artist === null || supabaseArticle.artist === undefined)) {
      const updateData = { artist: artists }
      // Only set artist_id for single artists
      if (artistId) {
        updateData.artist_id = artistId
      } else {
        // If multiple artists, ensure artist_id is NULL
        updateData.artist_id = null
      }

      const { data: updatedArticle, error: updateError } = await supabase
        .from('articles')
        .update(updateData)
        .eq('slug', slug)
        .select()
        .single()

      if (updateError) {
        return NextResponse.json(
          { error: 'Failed to update article artist data' },
          { status: 500 }
        )
      }

      // Auto-create artist record if this is a single artist article (if not already created)
      if (!artistId) {
        await autoCreateArtistRecord(supabase, artists, prismicArticle)
      }

      return NextResponse.json({
        success: true,
        message: 'Article artist data updated',
        article: updatedArticle
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Article already exists in database',
      article: supabaseArticle
    })

  } catch (error) {
    console.error('Sync API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
