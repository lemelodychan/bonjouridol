'use client'

import { useState, useEffect, useMemo } from 'react'

export function useBatchArticleStats(slugs) {
  const [stats, setStats] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Memoize the slugs array to prevent unnecessary re-renders
  const memoizedSlugs = useMemo(() => {
    if (!slugs || !Array.isArray(slugs)) return []
    return slugs.filter(Boolean).sort() // Sort to ensure consistent order
  }, [slugs])

  // Create a stable key for the slugs array
  const slugsKey = useMemo(() => {
    return memoizedSlugs.join(',')
  }, [memoizedSlugs])

  useEffect(() => {
    if (!memoizedSlugs || memoizedSlugs.length === 0) {
      setStats({})
      setIsLoading(false)
      return
    }

    const fetchBatchStats = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        const slugsParam = memoizedSlugs.join(',')
        const response = await fetch(`/api/articles/batch-likes?slugs=${encodeURIComponent(slugsParam)}`)
        
        if (response.ok) {
          const data = await response.json()
          setStats(data)
        } else {
          throw new Error('Failed to fetch batch stats')
        }
      } catch (error) {
        console.error('Error fetching batch article stats:', error)
        setError(error.message)
        // Set default values for all slugs
        const defaultStats = {}
        memoizedSlugs.forEach(slug => {
          defaultStats[slug] = 0
        })
        setStats(defaultStats)
      } finally {
        setIsLoading(false)
      }
    }

    fetchBatchStats()
  }, [slugsKey]) // Use the stable key instead of the array

  const getLikeCount = (slug) => {
    return stats[slug] || 0
  }

  return { 
    stats, 
    isLoading, 
    error, 
    getLikeCount 
  }
}
