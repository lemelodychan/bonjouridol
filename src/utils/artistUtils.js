import { createClient } from '@/prismicio'

/**
 * Utility function to extract artist data from idol_name field
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
