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
