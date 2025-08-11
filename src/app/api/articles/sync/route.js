import { NextResponse } from 'next/server'
import { createClient } from '@/prismicio'
import { extractArtistsFromPrismicArticle } from '@/utils/artistUtils'

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

    if (!supabaseArticle && prismicArticle) {
      // Create article in Supabase with Prismic data
      const { data: newArticle, error: insertError } = await supabase
        .from('articles')
        .insert({
          slug,
          type: prismicArticle.data.type || 'Live report',
          likes: 0, // Start with 0 likes
          views: 0,
          artist: artists
        })
        .select()
        .single()

      if (insertError) {
        return NextResponse.json(
          { error: 'Failed to create article record' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Article synced to database',
        article: newArticle
      })
    }

    // Update existing article if it doesn't have artist data
    if (supabaseArticle && prismicArticle && (supabaseArticle.artist === null || supabaseArticle.artist === undefined)) {
      const { data: updatedArticle, error: updateError } = await supabase
        .from('articles')
        .update({ artist: artists })
        .eq('slug', slug)
        .select()
        .single()

      if (updateError) {
        return NextResponse.json(
          { error: 'Failed to update article artist data' },
          { status: 500 }
        )
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
