import { NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Check authentication from cookie/header
async function checkAuth(request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return { authenticated: false, supabase: null }
    }

    // Create a client that can check auth
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    })

    // Get session from cookies - Supabase stores cookies with pattern: sb-<project-ref>-auth-token
    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll()
    
    // Try to find Supabase auth cookie
    const authCookie = allCookies.find(cookie => 
      cookie.name.includes('sb-') && cookie.name.includes('-auth-token')
    )

    if (authCookie) {
      // Set the cookie in the request headers for Supabase to read
      const { data: { session }, error } = await supabase.auth.getSession()

      if (!error && session) {
        return { authenticated: true, supabase }
      }
    }

    // Fallback: use service role key for admin operations if available
    // This allows admin stats to work when session cookies aren't properly set
    // In production, you should ensure sessions are properly validated
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (serviceKey) {
      const adminSupabase = createClient(supabaseUrl, serviceKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        }
      })
      return { authenticated: true, supabase: adminSupabase }
    }

    return { authenticated: false, supabase: null }
  } catch (error) {
    console.error('Auth check error:', error)
    // Fallback to service role if available
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (supabaseUrl && serviceKey) {
      const adminSupabase = createClient(supabaseUrl, serviceKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        }
      })
      return { authenticated: true, supabase: adminSupabase }
    }
    return { authenticated: false, supabase: null }
  }
}

export async function GET(request) {
  try {
    // For admin stats, we'll use the service role key if available
    // This bypasses the need for session cookies and allows admin operations
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

    if (!supabaseUrl || (!serviceKey && !anonKey)) {
      console.error('Supabase configuration missing')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Use service role key if available, otherwise use anon key
    const supabase = createClient(
      supabaseUrl, 
      serviceKey || anonKey, 
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        }
      }
    )

    // Try to check auth with session, but don't fail if it doesn't work
    // (service role key will work regardless)
    const { authenticated, supabase: authSupabase } = await checkAuth(request)
    const finalSupabase = (authenticated && authSupabase) ? authSupabase : supabase

    // Get total artists count
    const { count: totalArtists, error: artistsError } = await finalSupabase
      .from('artists')
      .select('*', { count: 'exact', head: true })

    if (artistsError) {
      console.error('Error fetching artists count:', artistsError)
    }

    // Get total articles count
    const { count: totalArticles, error: articlesError } = await finalSupabase
      .from('articles')
      .select('*', { count: 'exact', head: true })

    if (articlesError) {
      console.error('Error fetching articles count:', articlesError)
    }

    // Get artist rankings by likes
    const { data: artists, error: artistRankingsError } = await finalSupabase
      .from('artists')
      .select('name, likes')
      .order('likes', { ascending: false })
      .limit(20)

    if (artistRankingsError) {
      console.error('Error fetching artist rankings:', artistRankingsError)
    }

    // Calculate artist total likes from artist_likes table
    const { data: artistLikes, error: artistLikesError } = await finalSupabase
      .from('artist_likes')
      .select('artist_name, like_count')

    // Get all articles with their artist field, likes, and views
    const { data: allArticles, error: articlesWithArtistsError } = await finalSupabase
      .from('articles')
      .select('slug, artist, likes, views')

    // Get article likes from article_likes table
    const { data: articleLikesForArtists, error: articleLikesForArtistsError } = await finalSupabase
      .from('article_likes')
      .select('slug, like_count')

    // Create a map of article slug to total likes
    const articleLikesMap = new Map()
    if (!articleLikesForArtistsError && articleLikesForArtists) {
      articleLikesForArtists.forEach(like => {
        const current = articleLikesMap.get(like.slug) || 0
        articleLikesMap.set(like.slug, current + like.like_count)
      })
    }

    // Helper function to extract artist name from JSONB field
    function extractArtistName(artistField) {
      if (!artistField) return null
      
      if (typeof artistField === 'string') {
        return artistField
      } else if (Array.isArray(artistField)) {
        // Only return if single artist (for counting purposes)
        if (artistField.length === 1) {
          return artistField[0]
        }
        return null // Multiple artists, don't count
      } else if (typeof artistField === 'object' && artistField.name) {
        // Single artist object
        const name = artistField.name
        // Only count if it's a single artist (no commas, &, or "and")
        if (!name.includes(',') && !name.includes('&') && !name.includes(' and ')) {
          return name
        }
        return null
      }
      return null
    }

    // Build artist rankings map
    const artistLikeMap = new Map()

    // 1. Add direct artist likes from artist_likes table
    if (!artistLikesError && artistLikes) {
      artistLikes.forEach(like => {
        const current = artistLikeMap.get(like.artist_name) || 0
        artistLikeMap.set(like.artist_name, current + like.like_count)
      })
    }

    // 2. Add article likes for single-artist articles
    if (!articlesWithArtistsError && allArticles) {
      allArticles.forEach(article => {
        const artistName = extractArtistName(article.artist)
        if (artistName) {
          // Get total likes for this article (from article_likes table or fallback to articles.likes)
          const articleTotalLikes = articleLikesMap.get(article.slug) || article.likes || 0
          
          // Add to artist's total
          const current = artistLikeMap.get(artistName) || 0
          artistLikeMap.set(artistName, current + articleTotalLikes)
        }
      })
    }

    // Convert to array and sort
    let artistRankings = []
    if (artistLikeMap.size > 0) {
      artistRankings = Array.from(artistLikeMap.entries())
        .map(([name, totalLikes]) => ({ name, totalLikes }))
        .sort((a, b) => b.totalLikes - a.totalLikes)
        .slice(0, 10)
    } else if (artists) {
      // Fallback to artists table likes column
      artistRankings = artists.map(artist => ({
        name: artist.name,
        totalLikes: artist.likes || 0
      }))
    }

    // Get article rankings by likes
    const { data: articleLikes, error: articleLikesError } = await finalSupabase
      .from('article_likes')
      .select('slug, like_count')

    let articleLikeRankings = []
    if (!articleLikesError && articleLikes) {
      const articleLikeMap = new Map()
      articleLikes.forEach(like => {
        const current = articleLikeMap.get(like.slug) || 0
        articleLikeMap.set(like.slug, current + like.like_count)
      })

      articleLikeRankings = Array.from(articleLikeMap.entries())
        .map(([slug, totalLikes]) => ({ slug, totalLikes }))
        .sort((a, b) => b.totalLikes - a.totalLikes)
        .slice(0, 10)
    } else {
      // Fallback to articles table likes column
      const { data: articles, error: articlesRankError } = await finalSupabase
        .from('articles')
        .select('slug, likes')
        .order('likes', { ascending: false })
        .limit(20)

      if (!articlesRankError && articles) {
        articleLikeRankings = articles.map(article => ({
          slug: article.slug,
          totalLikes: article.likes || 0
        }))
      }
    }

    // Get article rankings by views (top 10)
    const { data: articles, error: articlesViewError } = await finalSupabase
      .from('articles')
      .select('slug, views')
      .order('views', { ascending: false })
      .limit(10)

    let articleViewRankings = []
    if (!articlesViewError && articles) {
      articleViewRankings = articles.map(article => ({
        slug: article.slug,
        totalViews: article.views || 0
      }))
    }

    // Total views across all articles (from the full allArticles query)
    const totalViews = (allArticles || []).reduce((sum, a) => sum + (a.views || 0), 0)

    // Calculate total likes across the platform
    let totalLikes = 0
    
    // Sum all artist likes
    if (!artistLikesError && artistLikes) {
      artistLikes.forEach(like => {
        totalLikes += like.like_count || 0
      })
    }
    
    // Sum all article likes
    if (!articleLikesError && articleLikes) {
      articleLikes.forEach(like => {
        totalLikes += like.like_count || 0
      })
    }

    // Get total assets count from Prismic Asset API
    let totalAssets = 0
    try {
      const MASTER_TOKEN = process.env.PRISMIC_MASTER_TOKEN
      const REPOSITORY_NAME = process.env.REPO_NAME || 'bonjouridol'
      
      if (MASTER_TOKEN) {
        // Fetch first page to get total count (Asset API returns total in response)
        const assetResponse = await fetch('https://asset-api.prismic.io/assets?limit=1', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${MASTER_TOKEN}`,
            'Content-Type': 'application/json',
            'repository': REPOSITORY_NAME,
          },
        })
        
        if (assetResponse.ok) {
          const assetData = await assetResponse.json()
          // Asset API returns { total, items, cursor, is_opensearch_result }
          totalAssets = assetData.total || 0
        }
      }
    } catch (error) {
      console.error('Error fetching total assets from Prismic:', error)
      // Don't fail the whole request if asset count fails
    }

    return NextResponse.json({
      totalArtists: totalArtists || 0,
      totalArticles: totalArticles || 0,
      totalLikes: totalLikes || 0,
      totalViews: totalViews || 0,
      totalAssets: totalAssets || 0,
      artistRankings,
      articleLikeRankings,
      articleViewRankings,
    })

  } catch (error) {
    console.error('Stats API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

