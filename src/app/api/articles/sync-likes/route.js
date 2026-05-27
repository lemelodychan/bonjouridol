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
      return NextResponse.json({
        error: 'Supabase not configured',
        message: 'Please set up Supabase environment variables in your .env files'
      }, { status: 500 })
    }

    const { slug } = await request.json()

    if (slug) {
      // Sync specific article
      await syncArticleLikes(slug)
      return NextResponse.json({ success: true, message: `Synced likes for ${slug}` })
    } else {
      // Sync all articles
      const { data: articles, error } = await supabase
        .from('articles')
        .select('slug')

      if (error) {
        return NextResponse.json({ error: 'Failed to fetch articles' }, { status: 500 })
      }

      const results = []
      for (const article of articles) {
        const result = await syncArticleLikes(article.slug)
        results.push({ slug: article.slug, ...result })
      }

      return NextResponse.json({ 
        success: true, 
        message: `Synced ${articles.length} articles`,
        results 
      })
    }
  } catch (error) {
    console.error('Sync likes error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function syncArticleLikes(slug) {
  try {
    // Get total likes from article_likes table
    const { data: allLikes, error: countError } = await supabase
      .from('article_likes')
      .select('like_count')
      .eq('slug', slug)

    if (countError) {
      console.error(`Error counting likes for ${slug}:`, countError)
      return { success: false, error: countError.message }
    }

    const totalLikes = allLikes.reduce((sum, like) => sum + like.like_count, 0)

    // Update the article's likes count
    const { error: updateError } = await supabase
      .from('articles')
      .update({ likes: totalLikes })
      .eq('slug', slug)

    if (updateError) {
      console.error(`Error updating likes for ${slug}:`, updateError)
      return { success: false, error: updateError.message }
    }

    return { success: true, totalLikes }
  } catch (error) {
    console.error(`Error syncing likes for ${slug}:`, error)
    return { success: false, error: error.message }
  }
}
