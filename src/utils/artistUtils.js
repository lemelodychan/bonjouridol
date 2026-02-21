import { createClient } from '@/prismicio'

// ──────────────────────────────────────────────
// Server-side cache for known artist names
// Refreshes every hour to stay reasonably up-to-date
// ──────────────────────────────────────────────
let cachedArtistNames = null
let cacheTimestamp = 0
const CACHE_TTL = 1000 * 60 * 60 // 1 hour

/**
 * Fetch and cache the list of known artist names from Prismic.
 * Uses a 1-hour TTL so new artists are picked up without hammering the API.
 * @returns {Promise<string[]>} - Array of known artist English names
 */
export async function getKnownArtistNames() {
  const now = Date.now()

  if (cachedArtistNames && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedArtistNames
  }

  try {
    const client = createClient()
    const artists = await client.getAllByType('artist', {
      fetchOptions: {
        next: {
          tags: ['prismic', 'artists'],
          revalidate: 3600
        }
      }
    })

    cachedArtistNames = artists
      .map(a => a.data.name_en)
      .filter(Boolean)
      .map(name => name.trim())

    cacheTimestamp = now
    return cachedArtistNames
  } catch (error) {
    console.error('Failed to fetch known artist names:', error.message)
    // Return stale cache if available, empty array otherwise
    return cachedArtistNames || []
  }
}

/**
 * Resolve artist/group names from an idol_name string using a known-artists
 * list to avoid splitting names that contain commas.
 *
 * Algorithm:
 * 1. Split the string by commas into segments
 * 2. Try to greedily re-join consecutive segments that together form a known
 *    artist name (longest span first)
 * 3. Single segments that don't match any multi-segment known name are kept as-is
 *
 * This only operates at comma boundaries — it will never match a known name
 * inside another name (e.g. "FRUITS ZIPPER" inside "SAKURAI YUI (FRUITS ZIPPER)").
 *
 * @param {string} idolNameString - The raw idol_name field (e.g. "A, B, FRUITS ZIPPER")
 * @param {string[]} knownArtistNames - Array of known artist names from the directory
 * @returns {string[]} - Resolved array of group/artist names
 */
export function resolveArtistNames(idolNameString, knownArtistNames = []) {
  if (!idolNameString || typeof idolNameString !== 'string') return []

  const trimmed = idolNameString.trim()
  if (!trimmed) return []

  // Split by comma first
  const segments = trimmed.split(',').map(s => s.trim()).filter(Boolean)

  // If only one segment or no known artists, return as-is
  if (segments.length <= 1 || !knownArtistNames || knownArtistNames.length === 0) {
    return segments
  }

  // Build a Set of known names (lowercase) for fast lookup
  const knownLower = new Set(knownArtistNames.map(n => n.toLowerCase().trim()))
  // Map for recovering canonical casing
  const knownCasing = new Map(knownArtistNames.map(n => [n.toLowerCase().trim(), n]))

  const result = []
  let i = 0

  while (i < segments.length) {
    let matched = false

    // Try joining consecutive segments from longest span down to 2
    for (let span = segments.length - i; span >= 2; span--) {
      const joined = segments.slice(i, i + span).join(', ')
      const joinedLower = joined.toLowerCase()

      if (knownLower.has(joinedLower)) {
        // Use the canonical casing from the known artists list
        result.push(knownCasing.get(joinedLower))
        i += span
        matched = true
        break
      }
    }

    if (!matched) {
      // Single segment — use as-is
      result.push(segments[i])
      i++
    }
  }

  return result
}

/**
 * Utility function to extract artist data from idol_name field.
 * Simple version without known-artists matching (legacy / sync use).
 * @param {string} idolName - The idol_name field from Prismic
 * @returns {string[]|null} - Array of artist names or null if no data
 */
export function extractArtistsFromIdolName(idolName) {
  if (!idolName || typeof idolName !== 'string') {
    return null
  }

  const trimmedName = idolName.trim()
  if (!trimmedName) {
    return null
  }

  let artists = []
  
  if (trimmedName.includes(',')) {
    // Split by comma
    artists = trimmedName.split(',').map(artist => artist.trim()).filter(artist => artist)
  } else if (trimmedName.includes('&')) {
    // Split by ampersand
    artists = trimmedName.split('&').map(artist => artist.trim()).filter(artist => artist)
  } else if (trimmedName.includes(' and ')) {
    // Split by "and"
    artists = trimmedName.split(' and ').map(artist => artist.trim()).filter(artist => artist)
  } else {
    // Single artist
    artists = [trimmedName]
  }

  return artists.length > 0 ? artists : null
}

/**
 * Extract artist data from a Prismic article
 * @param {Object} prismicArticle - The Prismic article object
 * @returns {string[]|null} - Array of artist names or null if no data
 */
export function extractArtistsFromPrismicArticle(prismicArticle) {
  if (!prismicArticle || !prismicArticle.data || !prismicArticle.data.idol_name) {
    return null
  }

  return extractArtistsFromIdolName(prismicArticle.data.idol_name)
}

/**
 * Auto-create artist record if the article has a single artist
 * @param {Object} supabase - Supabase client instance
 * @param {any} artists - Artist data from article (string, array, or object)
 * @param {Object} prismicArticle - Optional Prismic article to extract additional artist info
 * @returns {Promise<void>}
 */
export async function autoCreateArtistRecord(supabase, artists, prismicArticle = null) {
  if (!artists) return

  let artistName = null
  
  // Extract artist name from various formats
  if (typeof artists === 'string') {
    artistName = artists
  } else if (Array.isArray(artists)) {
    if (artists.length === 1) {
      artistName = artists[0]
    }
  } else if (typeof artists === 'object') {
    if (artists.name && !artists.name.includes(',') && !artists.name.includes('&') && !artists.name.includes(' and ')) {
      artistName = artists.name
    }
  }
  
  // Create artist record if we have a single artist name
  if (artistName) {
    // Try to find the artist in Prismic to get Japanese name and UID
    let nameJa = null
    let prismicUid = null
    
    // Try to find the artist in Prismic to get Japanese name and UID
    // We search even without prismicArticle to ensure we get the best data
    try {
      const prismicClient = createClient()
      // Get all artists and filter by name in JavaScript (more reliable than Prismic filters)
      const allArtists = await prismicClient.getAllByType('artist', {
        limit: 100 // Reasonable limit for artist lookup
      })
      
      // Find matching artist by English name (case-insensitive)
      const matchingArtist = allArtists.find(artist => 
        artist.data.name_en && 
        artist.data.name_en.toLowerCase().trim() === artistName.toLowerCase().trim()
      )
      
      if (matchingArtist) {
        prismicUid = matchingArtist.uid
        nameJa = matchingArtist.data.name_jp || null
      }
    } catch (error) {
      // If we can't find the artist in Prismic, that's okay - continue with null values
      console.log(`Could not find artist "${artistName}" in Prismic:`, error.message)
    }
    
    const { error: artistInsertError } = await supabase
      .from('artists')
      .insert({
        name: artistName,
        name_ja: nameJa,
        prismic_uid: prismicUid,
        likes: 0
      })
      .onConflict('name')
      .ignore() // Ignore if artist already exists
    
    if (artistInsertError) {
      console.error('Error auto-creating artist record:', artistInsertError)
    } else {
      console.log(`Auto-created artist record for: ${artistName}`)
    }
  }
}
