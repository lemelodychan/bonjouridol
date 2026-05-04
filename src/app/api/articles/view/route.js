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

    const { slug, type } = await request.json()

    if (!slug || !type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get client IP for anonymous tracking
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0] : 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'
    
    // Create a user identifier based on IP and user agent
    const userIdentifier = `ip_${ip}_${userAgent.slice(0, 50)}`

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

    // Check if this is a unique view (same user hasn't viewed in the last 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    
    const { data: existingView, error: viewCheckError } = await supabase
      .from('article_views')
      .select('*')
      .eq('slug', slug)
      .eq('user_identifier', userIdentifier)
      .gte('created_at', twentyFourHoursAgo)
      .single()

    if (viewCheckError && viewCheckError.code !== 'PGRST116') {
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      )
    }

    if (!existingView) {
      // This is a unique view, record it
      const { error: insertViewError } = await supabase
        .from('article_views')
        .insert({
          slug,
          user_identifier: userIdentifier,
          ip_address: ip,
          user_agent: userAgent
        })

      if (insertViewError) {
        return NextResponse.json(
          { error: 'Failed to record view' },
          { status: 500 }
        )
      }

      // Update the articles.views counter using service role (anon key is blocked by RLS)
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      if (serviceKey && supabaseUrl) {
        const { createClient: createServiceClient } = await import('@supabase/supabase-js')
        const adminSupabase = createServiceClient(supabaseUrl, serviceKey, {
          auth: { persistSession: false }
        })
        const { count } = await adminSupabase
          .from('article_views')
          .select('*', { count: 'exact', head: true })
          .eq('slug', slug)
        await adminSupabase
          .from('articles')
          .update({ views: count ?? 0 })
          .eq('slug', slug)
      }
    }

    return NextResponse.json({
      success: true,
      isUniqueView: !existingView
    })

  } catch (error) {
    console.error('View API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
