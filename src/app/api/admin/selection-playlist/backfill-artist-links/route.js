import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin-auth'

/**
 * Get authenticated Supabase client with service role key for admin operations
 */
async function getAuthenticatedSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

  if (!supabaseUrl || (!serviceKey && !anonKey)) {
    return null
  }

  // Use service role key if available, otherwise use anon key
  return createClient(
    supabaseUrl,
    serviceKey || anonKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    }
  )
}

/**
 * Backfill artist_id in selection_playlist table
 * Links playlist songs to the artists table based on artist_en field
 */
export async function POST(request) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response
  try {
    // Get authenticated Supabase client with service role key
    const supabase = await getAuthenticatedSupabase()
    
    // Check if Supabase is configured
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase not configured', message: 'Please set up Supabase environment variables' },
        { status: 500 }
      )
    }

    // Get all playlist items from Supabase that need artist_id linking
    // We'll process ALL items to ensure we catch any that need updating
    const { data: playlistItems, error: fetchError } = await supabase
      .from('selection_playlist')
      .select('id, title_en, artist_en, artist_id')
      .order('created_at', { ascending: false })

    if (fetchError) {
      return NextResponse.json({
        error: 'Failed to fetch playlist items from Supabase',
        details: fetchError.message
      }, { status: 500 })
    }

    if (!playlistItems || playlistItems.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No playlist items found',
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

    // Normalize function with Unicode normalization (NFKC) to handle special characters
    // Also normalizes common star/symbol variations and handles edge cases
    const normalizeName = (name) => {
      if (!name) return ''
      return name
        .trim() // Remove leading/trailing whitespace
        .toLowerCase()
        .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
        .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width characters
        .normalize('NFKC') // Normalize Unicode characters (handles ⭐︎, full-width, etc.)
        // Normalize ALL star/symbol variations to a single '*' character for matching
        // This includes: ⭐, ⭐︎, ☆, ★, ✦, ✧, ✩, ✪, ✫, ✬, ✭, ✮, ✯, ✰, and more
        .replace(/[\u2605\u2606\u2729\u272A\u272B\u272C\u272D\u272E\u272F\u2730\u2731\u2732\u2733\u2734\u2735\u2736\u2737\u2738\u2739\u273A\u273B\u273C\u273D\u273E\u273F\u2740\u2741\u2742\u2743\u2744\u2745\u2746\u2747\u2748\u2749\u274A\u274B\u274C\u274D\u274E\u274F\u2750\u2751\u2752\u2753\u2754\u2755\u2756\u2757\u2758\u2759\u275A\u275B\u275C\u275D\u275E\u275F]/g, '*')
        // Also catch any remaining star-like characters
        .replace(/[⭐︎⭐☆★✦✧✩✪✫✬✭✮✯✰]/g, '*')
        .replace(/\*+/g, '*') // Normalize multiple stars to single star
        .trim() // Trim again after normalization
    }
    
    // Also create a version that removes stars completely for fallback matching
    const normalizeNameNoStars = (name) => {
      return normalizeName(name).replace(/\*/g, '').trim()
    }

    // Create multiple maps for different matching strategies
    const artistMapByName = new Map() // Normalized name -> artist ID
    const artistMapByUid = new Map()  // Prismic UID -> artist ID
    const artistVariationsMap = new Map() // Store all variations of each artist
    const artistOriginalMap = new Map() // Original name (lowercased) -> artist ID
    
    for (const artist of artists || []) {
      const normalizedName = normalizeName(artist.name)
      const normalizedNameNoStars = normalizeNameNoStars(artist.name)
      const originalName = (artist.name || '').trim().toLowerCase()
      
      // Store the normalized name -> ID mapping (primary - with stars as *)
      if (!artistMapByName.has(normalizedName)) {
        artistMapByName.set(normalizedName, artist.id)
      }
      
      // Also store normalized name without stars
      if (normalizedNameNoStars && normalizedNameNoStars !== normalizedName) {
        if (!artistMapByName.has(normalizedNameNoStars)) {
          artistMapByName.set(normalizedNameNoStars, artist.id)
        }
      }
      
      // Store original name (lowercased) for exact matching
      if (originalName) {
        artistOriginalMap.set(originalName, artist.id)
      }
      
      // Also store the original name (lowercased) as a variation if different from normalized
      if (originalName && originalName !== normalizedName) {
        if (!artistVariationsMap.has(originalName)) {
          artistVariationsMap.set(originalName, artist.id)
        }
      }
      
      // Also index by prismic_uid if available
      if (artist.prismic_uid) {
        artistMapByUid.set(artist.prismic_uid, artist.id)
      }
    }

    // Process each playlist item
    let linked = 0
    let skipped = 0
    const results = []

    for (const item of playlistItems) {
      // Process all items - we'll check if they need updating based on matching
      // Don't skip items that already have artist_id, as they might have the wrong one

      // Skip if no artist name (but still count them)
      if (!item.artist_en || item.artist_en.trim() === '') {
        skipped++
        results.push({
          id: item.id,
          title: item.title_en,
          status: 'skipped',
          reason: 'No artist_en field - cannot match without artist name',
          artist_en: item.artist_en,
          artist_id: item.artist_id
        })
        continue
      }

      const normalizedName = normalizeName(item.artist_en)
      const normalizedNameNoStars = normalizeNameNoStars(item.artist_en)
      const originalLower = (item.artist_en || '').trim().toLowerCase()
      let artistId = null
      let matchMethod = null

      // Strategy 1: Try exact original name match (case-insensitive, with stars)
      artistId = artistOriginalMap.get(originalLower)
      if (artistId) {
        matchMethod = 'exact_original'
      }

      // Strategy 2: Try normalized name (stars as *)
      if (!artistId) {
        artistId = artistMapByName.get(normalizedName)
        if (artistId) matchMethod = 'normalized'
      }

      // Strategy 3: Try normalized name without stars
      if (!artistId && normalizedNameNoStars) {
        artistId = artistMapByName.get(normalizedNameNoStars)
        if (artistId) matchMethod = 'normalized_no_stars'
      }

      // Strategy 4: Try original name variations (lowercased, with stars)
      if (!artistId) {
        artistId = artistVariationsMap.get(originalLower)
        if (artistId) matchMethod = 'original_variation'
      }

      // Strategy 4: If not found, try a more aggressive normalization (remove all non-alphanumeric except spaces)
      if (!artistId) {
        const aggressiveNormalized = normalizedName.replace(/[^a-z0-9\s]/g, '').trim()
        // Try to find a match with aggressive normalization
        for (const [key, value] of artistMapByName.entries()) {
          const aggressiveKey = key.replace(/[^a-z0-9\s]/g, '').trim()
          if (aggressiveKey === aggressiveNormalized && aggressiveNormalized.length > 0) {
            artistId = value
            matchMethod = 'aggressive'
            break
          }
        }
      }

      // Strategy 5: Try matching with any star variation removed from both sides
      if (!artistId) {
        const playlistNameNoStars = normalizedName.replace(/[⭐︎⭐☆★✦✧✩✪✫✬✭✮✯✰]/g, '').trim()
        for (const artist of artists || []) {
          const artistNameNoStars = normalizeName(artist.name).replace(/[⭐︎⭐☆★✦✧✩✪✫✬✭✮✯✰]/g, '').trim()
          if (artistNameNoStars === playlistNameNoStars && playlistNameNoStars.length > 0) {
            artistId = artist.id
            matchMethod = 'no_stars'
            break
          }
        }
      }

      // Strategy 6: Try fuzzy matching - check if names are similar (contains or is contained)
      if (!artistId) {
        for (const artist of artists || []) {
          const artistNormalized = normalizeName(artist.name)
          const artistOriginal = (artist.name || '').trim().toLowerCase()
          
          // Check if one contains the other (after normalization)
          if (normalizedName && artistNormalized) {
            if (normalizedName.includes(artistNormalized) || artistNormalized.includes(normalizedName)) {
              // Only match if the difference is small (e.g., just punctuation or stars)
              const diff = Math.abs(normalizedName.length - artistNormalized.length)
              if (diff <= 3) { // Allow small differences
                artistId = artist.id
                matchMethod = 'fuzzy_contains'
                break
              }
            }
          }
          
          // Also try with original names
          if (originalLower && artistOriginal) {
            if (originalLower.includes(artistOriginal) || artistOriginal.includes(originalLower)) {
              const diff = Math.abs(originalLower.length - artistOriginal.length)
              if (diff <= 3) {
                artistId = artist.id
                matchMethod = 'fuzzy_original'
                break
              }
            }
          }
        }
      }

      if (artistId) {
        // Check if item already has this artist_id
        const needsUpdate = !item.artist_id || String(item.artist_id) !== String(artistId)
        
        if (!needsUpdate) {
          skipped++
          results.push({
            id: item.id,
            title: item.title_en,
            status: 'skipped',
            reason: 'Already has correct artist_id',
            artist_id: artistId
          })
          continue
        }
        
        // Perform the update - use service role key to bypass RLS
        const { error: updateError } = await supabase
          .from('selection_playlist')
          .update({ artist_id: artistId })
          .eq('id', item.id)

        if (updateError) {
          console.error(`Failed to update item ${item.id} (${item.title_en}):`, updateError)
          results.push({
            id: item.id,
            title: item.title_en,
            status: 'error',
            error: updateError.message,
            error_code: updateError.code,
            error_details: updateError,
            artist_name: item.artist_en,
            artist_id: artistId
          })
        } else {
          // Update succeeded - verify by fetching the updated record
          await new Promise(resolve => setTimeout(resolve, 100)) // Small delay for commit
          
          const { data: verifiedItem, error: verifyError } = await supabase
            .from('selection_playlist')
            .select('id, artist_id')
            .eq('id', item.id)
            .single()

          if (verifyError) {
            results.push({
              id: item.id,
              title: item.title_en,
              status: 'error',
              error: `Update succeeded but verification failed: ${verifyError.message}`,
              artist_name: item.artist_en,
              artist_id: artistId
            })
          } else if (verifiedItem && verifiedItem.artist_id && String(verifiedItem.artist_id) === String(artistId)) {
            // Successfully linked and verified
            linked++
            results.push({
              id: item.id,
              title: item.title_en,
              status: 'linked',
              artist_name: item.artist_en,
              artist_id: artistId,
              normalized: normalizedName,
              match_method: matchMethod,
              verified: true
            })
          } else {
            results.push({
              id: item.id,
              title: item.title_en,
              status: 'error',
              error: 'Update completed but verification shows different artist_id',
              artist_name: item.artist_en,
              expected_artist_id: artistId,
              actual_artist_id: verifiedItem?.artist_id
            })
          }
        }
      } else {
        // Debug: find closest matches for troubleshooting
        const closestMatches = []
        const playlistNameClean = normalizedName.replace(/[^a-z0-9]/g, '')
        for (const [key, value] of artistMapByName.entries()) {
          // Try multiple matching strategies
          const artistNameClean = key.replace(/[^a-z0-9]/g, '')
          if (artistNameClean.includes(playlistNameClean) || playlistNameClean.includes(artistNameClean)) {
            closestMatches.push({ name: key, id: value })
          } else if (key.includes(normalizedName) || normalizedName.includes(key)) {
            closestMatches.push({ name: key, id: value })
          }
        }
        
        skipped++
        // Include debug info to help troubleshoot
        const debugInfo = {
          original_artist: item.artist_en,
          normalized: normalizedName,
          normalized_no_stars: normalizeNameNoStars(item.artist_en),
          artist_map_size: artistMapByName.size,
          artist_original_map_size: artistOriginalMap.size
        }
        
        results.push({
          id: item.id,
          title: item.title_en,
          status: 'skipped',
          reason: `Artist "${item.artist_en}" not found in artists table`,
          normalized: normalizedName,
          closest_matches: closestMatches.slice(0, 5),
          debug: debugInfo
        })
      }
    }

    // Count how many actually needed linking (didn't have artist_id)
    const neededLinking = playlistItems.filter(item => !item.artist_id).length
    const alreadyLinked = playlistItems.filter(item => item.artist_id).length

    // Final verification: Check how many items still don't have artist_id
    // Wait a moment for updates to be committed
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Re-fetch items that should have been updated to verify
    const updatedItemIds = results
      .filter(r => r.status === 'linked' && r.id)
      .map(r => r.id)
    
    let verifiedCount = 0
    let failedCount = 0
    
    if (updatedItemIds.length > 0) {
      const { data: verifiedItems, error: verifyError } = await supabase
        .from('selection_playlist')
        .select('id, artist_id, title_en, artist_en')
        .in('id', updatedItemIds)
      
      if (!verifyError && verifiedItems) {
        for (const verified of verifiedItems) {
          const result = results.find(r => r.id === verified.id && r.status === 'linked')
          if (result && verified.artist_id && String(verified.artist_id) === String(result.artist_id)) {
            verifiedCount++
          } else {
            failedCount++
          }
        }
      }
    }
    
    // Also check overall count
    const { data: remainingItems, error: countError } = await supabase
      .from('selection_playlist')
      .select('id', { count: 'exact', head: true })
      .is('artist_id', null)
      .not('artist_en', 'is', null)

    const stillMissing = remainingItems?.length || 0

    return NextResponse.json({
      success: true,
      message: `Backfill complete: ${linked} linked, ${skipped} skipped. ${stillMissing} items still missing artist_id.`,
      stats: {
        total: playlistItems.length,
        needed_linking: neededLinking,
        already_linked: alreadyLinked,
        linked,
        skipped,
        still_missing: stillMissing,
        verified_count: verifiedCount,
        failed_verification: failedCount
      },
      results: results,
      // Include all skipped items that aren't "already linked" for debugging
      skipped_items_needing_linking: results.filter(r => 
        r.status === 'skipped' && 
        r.reason && 
        !r.reason.includes('Already linked') && 
        !r.reason.includes('No artist name')
      ).slice(0, 50)
    })

  } catch (error) {
    console.error('Backfill API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

