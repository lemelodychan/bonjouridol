import { NextResponse } from 'next/server'

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
      // Create new article record
      const { error: insertError } = await supabase
        .from('articles')
        .insert({
          slug,
          type,
          likes: 0,
          views: 0,
          artist: null // Will be populated later when synced with Prismic
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

      // Update total views for the article
      const { data: totalViewsResult, error: totalError } = await supabase
        .from('articles')
        .update({ 
          views: supabase.rpc('get_article_total_views', { article_slug: slug })
        })
        .eq('slug', slug)
        .select('views')
        .single()

      if (totalError) {
        // Fallback: calculate total manually
        const { data: allViews, error: countError } = await supabase
          .from('article_views')
          .select('*')
          .eq('slug', slug)

        if (countError) {
          return NextResponse.json(
            { error: 'Failed to calculate total views' },
            { status: 500 }
          )
        }

        const totalViews = allViews.length

        // Update the article with the calculated total
        await supabase
          .from('articles')
          .update({ views: totalViews })
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
