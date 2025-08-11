import { NextResponse } from 'next/server'

export async function GET(request) {
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

    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')

    if (slug) {
      // Get specific article
      const { data: article, error } = await supabase
        .from('articles')
        .select('*')
        .eq('slug', slug)
        .single()

      return NextResponse.json({
        found: !!article,
        article,
        error: error?.message
      })
    } else {
      // Get all articles
      const { data: articles, error } = await supabase
        .from('articles')
        .select('slug, likes, views, type')
        .order('created_at', { ascending: false })
        .limit(10)

      return NextResponse.json({
        articles,
        error: error?.message
      })
    }
  } catch (error) {
    console.error('Debug API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
