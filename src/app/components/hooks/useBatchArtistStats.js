'use client'

import { useState, useEffect, useMemo } from 'react'

export function useBatchArtistStats(artistNames) {
  const [stats, setStats] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Memoize the artist names array to prevent unnecessary re-renders
  const memoizedArtistNames = useMemo(() => {
    if (!artistNames || !Array.isArray(artistNames)) return []
    return artistNames.filter(Boolean).sort() // Sort to ensure consistent order
  }, [artistNames])

  // Create a stable key for the artist names array
  const artistNamesKey = useMemo(() => {
    return memoizedArtistNames.join(',')
  }, [memoizedArtistNames])

  useEffect(() => {
    if (!memoizedArtistNames || memoizedArtistNames.length === 0) {
      setStats({})
      setIsLoading(false)
      return
    }

    const fetchBatchStats = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        const artistsParam = memoizedArtistNames.join(',')
        const response = await fetch(`/api/artists/batch-likes?artists=${encodeURIComponent(artistsParam)}`)
        
        if (response.ok) {
          const data = await response.json()
          setStats(data)
        } else {
          throw new Error('Failed to fetch batch artist stats')
        }
      } catch (error) {
        console.error('Error fetching batch artist stats:', error)
        setError(error.message)
        // Set default values for all artists
        const defaultStats = {}
        memoizedArtistNames.forEach(name => {
          defaultStats[name] = 0
        })
        setStats(defaultStats)
      } finally {
        setIsLoading(false)
      }
    }

    fetchBatchStats()
  }, [artistNamesKey]) // Use the stable key instead of the array

  const getLikeCount = (artistName) => {
    return stats[artistName] || 0
  }

  return { 
    stats, 
    isLoading, 
    error, 
    getLikeCount 
  }
}
