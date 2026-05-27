import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin-auth'

// Helper function to extract artist name from JSONB field
function extractArtistName(artistField) {
  if (!artistField) return null
  if (typeof artistField === 'string') return artistField
  if (Array.isArray(artistField)) {
    return artistField.length === 1 ? artistField[0] : null
  }
  if (typeof artistField === 'object' && artistField.name) {
    const name = artistField.name
    if (!name.includes(',') && !name.includes('&') && !name.includes(' and ')) return name
  }
  return null
}

async function fetchPrismicAssetCount() {
  const MASTER_TOKEN = process.env.PRISMIC_MASTER_TOKEN
  const REPOSITORY_NAME = process.env.REPO_NAME || 'bonjouridol'
  if (!MASTER_TOKEN) return 0
  try {
    const res = await fetch('https://asset-api.prismic.io/assets?limit=1', {
      headers: {
        'Authorization': `Bearer ${MASTER_TOKEN}`,
        'Content-Type': 'application/json',
        'repository': REPOSITORY_NAME,
      },
    })
    if (res.ok) {
      const data = await res.json()
      return data.total || 0
    }
  } catch (e) {
    console.error('Error fetching Prismic assets:', e)
  }
  return 0
}

export async function GET(request) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

    if (!supabaseUrl || (!serviceKey && !anonKey)) {
      console.error('Supabase configuration missing')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const db = createClient(supabaseUrl, serviceKey || anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    // Fire all queries in parallel
    const [
      { count: totalArtists,  error: artistsCountError },
      { count: totalArticles, error: articlesCountError },
      { data: artistsFallback },
      { data: artistLikes,    error: artistLikesError },
      { data: allArticles,    error: allArticlesError },
      { data: articleLikes,   error: articleLikesError },
      { data: articlesByViews },
      { count: totalViewsCount },
      totalAssets,
    ] = await Promise.all([
      db.from('artists').select('*', { count: 'exact', head: true }),
      db.from('articles').select('*', { count: 'exact', head: true }),
      db.from('artists').select('name, likes').order('likes', { ascending: false }).limit(20),
      db.from('artist_likes').select('artist_name, like_count'),
      db.from('articles').select('slug, artist, likes, views'),
      db.from('article_likes').select('slug, like_count'),
      db.from('articles').select('slug, views').order('views', { ascending: false }).limit(20),
      db.from('article_views').select('*', { count: 'exact', head: true }),
      fetchPrismicAssetCount(),
    ])

    if (artistsCountError)  console.error('Error fetching artists count:', artistsCountError)
    if (articlesCountError) console.error('Error fetching articles count:', articlesCountError)

    // Build article slug → total likes map (shared by artist and article ranking logic)
    const articleLikesMap = new Map()
    if (!articleLikesError && articleLikes) {
      for (const like of articleLikes) {
        articleLikesMap.set(like.slug, (articleLikesMap.get(like.slug) || 0) + like.like_count)
      }
    }

    // ── Artist rankings ──────────────────────────────────────────────────────
    const artistLikeMap = new Map()

    if (!artistLikesError && artistLikes) {
      for (const like of artistLikes) {
        artistLikeMap.set(like.artist_name, (artistLikeMap.get(like.artist_name) || 0) + like.like_count)
      }
    }

    if (!allArticlesError && allArticles) {
      for (const article of allArticles) {
        const artistName = extractArtistName(article.artist)
        if (artistName) {
          const articleTotalLikes = articleLikesMap.get(article.slug) || article.likes || 0
          artistLikeMap.set(artistName, (artistLikeMap.get(artistName) || 0) + articleTotalLikes)
        }
      }
    }

    let artistRankings = []
    if (artistLikeMap.size > 0) {
      artistRankings = Array.from(artistLikeMap.entries())
        .map(([name, totalLikes]) => ({ name, totalLikes }))
        .sort((a, b) => b.totalLikes - a.totalLikes)
        .slice(0, 20)
    } else if (artistsFallback) {
      artistRankings = artistsFallback.map(a => ({ name: a.name, totalLikes: a.likes || 0 }))
    }

    // ── Article like rankings ────────────────────────────────────────────────
    let articleLikeRankings = []
    if (!articleLikesError && articleLikes) {
      articleLikeRankings = Array.from(articleLikesMap.entries())
        .map(([slug, totalLikes]) => ({ slug, totalLikes }))
        .sort((a, b) => b.totalLikes - a.totalLikes)
        .slice(0, 20)
    } else if (!allArticlesError && allArticles) {
      // Fallback: reuse the already-fetched allArticles — no extra query needed
      articleLikeRankings = [...allArticles]
        .sort((a, b) => (b.likes || 0) - (a.likes || 0))
        .slice(0, 20)
        .map(a => ({ slug: a.slug, totalLikes: a.likes || 0 }))
    }

    // ── Article view rankings (uses articles.views counter, kept in sync by view tracker) ──
    const articleViewRankings = (articlesByViews || []).map(a => ({
      slug: a.slug,
      totalViews: a.views || 0,
    }))

    // ── Totals ───────────────────────────────────────────────────────────────
    // totalViews from article_views COUNT — accurate even if articles.views counter drifts
    const totalViews = totalViewsCount || 0

    let totalLikes = 0
    if (!artistLikesError  && artistLikes)  artistLikes.forEach(l => { totalLikes += l.like_count || 0 })
    if (!articleLikesError && articleLikes) articleLikes.forEach(l => { totalLikes += l.like_count || 0 })

    return NextResponse.json({
      totalArtists:        totalArtists  || 0,
      totalArticles:       totalArticles || 0,
      totalLikes,
      totalViews,
      totalAssets,
      artistRankings,
      articleLikeRankings,
      articleViewRankings,
    })

  } catch (error) {
    console.error('Stats API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
