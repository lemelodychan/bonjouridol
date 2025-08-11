import { NextResponse } from 'next/server'
import { createClient } from '@/prismicio'

export async function POST(request) {
  try {
    // Import supabase
    const { supabase } = await import('@/lib/supabase')
    
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

    if (!supabaseArticle && prismicArticle) {
      // Create article in Supabase with Prismic data
      const { data: newArticle, error: insertError } = await supabase
        .from('articles')
        .insert({
          slug,
          type: prismicArticle.data.type || 'Live report',
          likes: 0, // Start with 0 likes
          views: 0
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
