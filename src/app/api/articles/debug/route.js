import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request) {
  try {
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
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
