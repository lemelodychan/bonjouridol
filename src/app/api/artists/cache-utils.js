// Shared cache management for artist likes
const cache = new Map()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export function getCacheKey(artistNames) {
  return Array.isArray(artistNames) 
    ? artistNames.sort().join(',')
    : artistNames
}

export function getCachedData(artistNames) {
  const cacheKey = getCacheKey(artistNames)
  const now = Date.now()
  
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey)
    if (now - cached.timestamp < CACHE_DURATION) {
      return cached.data
    } else {
      // Remove expired cache entry
      cache.delete(cacheKey)
    }
  }
  
  return null
}

export function setCachedData(artistNames, data) {
  const cacheKey = getCacheKey(artistNames)
  const now = Date.now()
  
  cache.set(cacheKey, {
    data,
    timestamp: now
  })
}

export function invalidateArtistCache(artistName) {
  // Remove all cache entries that contain this artist
  const keysToDelete = []
  
  for (const [key, value] of cache.entries()) {
    if (key.includes(artistName)) {
      keysToDelete.push(key)
    }
  }
  
  keysToDelete.forEach(key => {
    cache.delete(key)
    console.log(`[Cache] Invalidated cache for key: ${key}`)
  })
  
  return keysToDelete.length
}

export function clearAllCache() {
  const size = cache.size
  cache.clear()
  console.log(`[Cache] Cleared all cache entries (${size} entries)`)
  return size
}

// Export the cache for direct access if needed
export { cache }
