import { NextResponse } from 'next/server'
import { createClient } from '@/prismicio'
import { extractArtistsFromPrismicArticle } from '@/utils/artistUtils'
import { requireAdmin } from '@/lib/admin-auth'

/**
 * Backfill artist_id in articles table for single-artist articles
 * Links articles to the artists table based on the artist JSONB field
 */
export async function POST(request) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response
  try {
    // Import and create Supabase client
    const { createSupabaseClient } = await import('@/lib/supabase')
    const supabase = createSupabaseClient()
    
    // Check if Supabase is configured
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase not configured', message: 'Please set up Supabase environment variables' },
        { status: 500 }
      )
    }

    // Get all articles from Supabase
    const { data: articles, error: fetchError } = await supabase
      .from('articles')
      .select('id, slug, artist, artist_id')

    if (fetchError) {
      return NextResponse.json({
        error: 'Failed to fetch articles from Supabase',
        details: fetchError.message
      }, { status: 500 })
    }

    if (!articles || articles.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No articles found',
        linked: 0,
        skipped: 0
      })
    }

    // Get all artists from Supabase for matching
    const { data: artists, error: artistsError } = await supabase
      .from('artists')
      .select('id, name, prismic_uid')

    if (artistsError) {
      return NextResponse.json({
        error: 'Failed to fetch artists from Supabase',
        details: artistsError.message
      }, { status: 500 })
    }

    // Create Prismic client for fetching article data
    const prismicClient = createClient()

    // Normalize function with Unicode normalization (NFKC) to handle special characters
    // Also normalizes common star/symbol variations
    const normalizeName = (name) => {
      if (!name) return ''
      return name
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width characters
        .normalize('NFKC') // Normalize Unicode characters (handles ⭐︎, full-width, etc.)
        // Normalize ALL star/symbol variations to empty string for matching
        // This includes: ⭐, ⭐︎, ☆, ★, ✦, ✧, ✩, ✪, ✫, ✬, ✭, ✮, ✯, ✰, and more
        .replace(/[\u2605\u2606\u2729\u272A\u272B\u272C\u272D\u272E\u272F\u2730\u2731\u2732\u2733\u2734\u2735\u2736\u2737\u2738\u2739\u273A\u273B\u273C\u273D\u273E\u273F\u2740\u2741\u2742\u2743\u2744\u2745\u2746\u2747\u2748\u2749\u274A\u274B\u274C\u274D\u274E\u274F\u2750\u2751\u2752\u2753\u2754\u2755\u2756\u2757\u2758\u2759\u275A\u275B\u275C\u275D\u275E\u275F]/g, '')
        // Also catch any remaining star-like characters
        .replace(/[⭐︎⭐☆★✦✧✩✪✫✬✭✮✯✰]/g, '')
        .trim()
    }

    // Create multiple maps for different matching strategies
    const artistMapByName = new Map() // Normalized name -> artist ID
    const artistMapByUid = new Map()  // Prismic UID -> artist ID
    
    for (const artist of artists || []) {
      const normalizedName = normalizeName(artist.name)
      if (!artistMapByName.has(normalizedName)) {
        artistMapByName.set(normalizedName, artist.id)
      }
      // Also index by prismic_uid if available
      if (artist.prismic_uid) {
        artistMapByUid.set(artist.prismic_uid, artist.id)
      }
    }

    // Process each article
    let linked = 0
    let skipped = 0
    const results = []

    for (const article of articles) {
      // Skip if already linked
      if (article.artist_id) {
        skipped++
        results.push({
          slug: article.slug,
          status: 'skipped',
          reason: 'Already linked'
        })
        continue
      }

      // Extract artist from JSONB field
      const artists = article.artist
      if (!artists) {
        skipped++
        results.push({
          slug: article.slug,
          status: 'skipped',
          reason: 'No artist data'
        })
        continue
      }

      // Check if this is a single artist
      let isSingleArtist = false
      let artistName = null
      
      if (typeof artists === 'string') {
        isSingleArtist = true
        artistName = artists
      } else if (Array.isArray(artists)) {
        if (artists.length === 1) {
          isSingleArtist = true
          artistName = artists[0]
        }
      } else if (typeof artists === 'object' && artists.name) {
        if (!artists.name.includes(',') && !artists.name.includes('&') && !artists.name.includes(' and ')) {
          isSingleArtist = true
          artistName = artists.name
        }
      }

      // Only link single artists
      if (isSingleArtist && artistName) {
        let artistId = null
        let matchMethod = null

        // Strategy 1: Try matching by normalized name
        const normalizedName = normalizeName(artistName)
        artistId = artistMapByName.get(normalizedName)
        if (artistId) {
          matchMethod = 'name'
        }

        // Strategy 2: If name match failed, try fetching from Prismic to get artist UID
        if (!artistId) {
          try {
            const prismicArticle = await prismicClient.getByUID('articles', article.slug)
            if (prismicArticle && prismicArticle.data && prismicArticle.data.idol_name) {
              // Extract artist name from Prismic article
              const prismicArtistName = prismicArticle.data.idol_name.trim()
              const normalizedPrismicName = normalizeName(prismicArtistName)
              
              // Try matching the Prismic artist name
              artistId = artistMapByName.get(normalizedPrismicName)
              if (artistId) {
                matchMethod = 'prismic_name'
              } else {
                // Strategy 3: Try to find the artist in Prismic and match by UID
                const allPrismicArtists = await prismicClient.getAllByType('artist', {
                  limit: 200
                })
                
                const matchingPrismicArtist = allPrismicArtists.find(pa => {
                  if (pa.type !== 'artist') return false
                  const paName = pa.data.name_en
                  if (!paName) return false
                  return normalizeName(paName) === normalizedPrismicName
                })
                
                if (matchingPrismicArtist && matchingPrismicArtist.uid) {
                  artistId = artistMapByUid.get(matchingPrismicArtist.uid)
                  if (artistId) {
                    matchMethod = 'prismic_uid'
                  }
                }
              }
            }
          } catch (error) {
            // Article not found in Prismic or other error - continue with name matching only
          }
        }

        if (artistId) {
          const { error: updateError } = await supabase
            .from('articles')
            .update({ artist_id: artistId })
            .eq('id', article.id)

          if (updateError) {
            results.push({
              slug: article.slug,
              status: 'error',
              error: updateError.message
            })
          } else {
            linked++
            results.push({
              slug: article.slug,
              status: 'linked',
              artist_name: artistName,
              artist_id: artistId,
              match_method: matchMethod
            })
          }
        } else {
          skipped++
          results.push({
            slug: article.slug,
            status: 'skipped',
            reason: `Artist "${artistName}" not found in artists table`,
            attempted_match: normalizedName
          })
        }
      } else {
        skipped++
        results.push({
          slug: article.slug,
          status: 'skipped',
          reason: 'Multiple artists or invalid format'
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Backfill complete: ${linked} linked, ${skipped} skipped`,
      stats: {
        total: articles.length,
        linked,
        skipped
      },
      results: results.slice(0, 100)
    })

  } catch (error) {
    console.error('Backfill API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

