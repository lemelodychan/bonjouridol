'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

// Global cache and batching system
const globalCache = new Map()
const pendingRequests = new Map()
const BATCH_DELAY = 100 // 100ms delay to collect requests
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Batch processor
let batchTimeout = null
const pendingArtists = new Set()

const processBatch = async () => {
  if (pendingArtists.size === 0) return
  
  const artistsToFetch = Array.from(pendingArtists)
  pendingArtists.clear()
  
  console.log(`[useBatchedArtistStats] Processing batch of ${artistsToFetch.length} artists:`, artistsToFetch)
  
  try {
    const artistsParam = artistsToFetch.join(',')
    const response = await fetch(`/api/artists/batch-likes?artists=${encodeURIComponent(artistsParam)}`)
    
    if (response.ok) {
      const data = await response.json()
      
      // Cache the results
      const now = Date.now()
      artistsToFetch.forEach(artist => {
        globalCache.set(artist, {
          data: data[artist] || 0,
          timestamp: now
        })
      })
      
      // Resolve all pending requests
      artistsToFetch.forEach(artist => {
        const pending = pendingRequests.get(artist)
        if (pending) {
          pending.forEach(resolve => resolve(data[artist] || 0))
          pendingRequests.delete(artist)
        }
      })
      
      console.log(`[useBatchedArtistStats] Batch completed successfully:`, data)
    } else {
      console.error(`[useBatchedArtistStats] Batch request failed:`, response.status)
      // Reject all pending requests
      artistsToFetch.forEach(artist => {
        const pending = pendingRequests.get(artist)
        if (pending) {
          pending.forEach(resolve => resolve(0)) // Default to 0 on error
          pendingRequests.delete(artist)
        }
      })
    }
  } catch (error) {
    console.error(`[useBatchedArtistStats] Batch request error:`, error)
    // Reject all pending requests
    artistsToFetch.forEach(artist => {
      const pending = pendingRequests.get(artist)
      if (pending) {
        pending.forEach(resolve => resolve(0)) // Default to 0 on error
        pendingRequests.delete(artist)
      }
    })
  }
}

const queueArtistRequest = (artistName) => {
  return new Promise((resolve) => {
    // Check cache first
    const cached = globalCache.get(artistName)
    const now = Date.now()
    
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      console.log(`[useBatchedArtistStats] Using cached data for ${artistName}: ${cached.data}`)
      resolve(cached.data)
      return
    }
    
    // Add to pending requests
    if (!pendingRequests.has(artistName)) {
      pendingRequests.set(artistName, [])
    }
    pendingRequests.get(artistName).push(resolve)
    
    // Add to batch
    pendingArtists.add(artistName)
    
    // Clear existing timeout and set new one
    if (batchTimeout) {
      clearTimeout(batchTimeout)
    }
    
    batchTimeout = setTimeout(processBatch, BATCH_DELAY)
  })
}

export function useBatchedArtistStats(artistName, initialLikeCount = null) {
  const [stats, setStats] = useState({
    totalLikes: initialLikeCount !== null ? initialLikeCount : 0,
    userLikes: 0,
    directArtistLikes: 0,
    articleLikes: 0,
    isLoading: initialLikeCount === null,
    error: null
  })
  
  const mountedRef = useRef(true)

  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    // If we have initial data (including 0), don't fetch from API
    if (initialLikeCount !== null) {
      console.log(`[useBatchedArtistStats] Using server data for ${artistName}: ${initialLikeCount}`)
      setStats(prev => ({ 
        ...prev, 
        totalLikes: initialLikeCount,
        isLoading: false 
      }))
      return
    }

    if (!artistName) {
      setStats(prev => ({ ...prev, isLoading: false }))
      return
    }

    console.log(`[useBatchedArtistStats] Queuing request for ${artistName}`)
    
    const fetchStats = async () => {
      try {
        const totalLikes = await queueArtistRequest(artistName)
        
        if (mountedRef.current) {
          setStats({
            totalLikes: totalLikes || 0,
            userLikes: 0, // We don't get user-specific data from batch API
            directArtistLikes: 0,
            articleLikes: 0,
            isLoading: false,
            error: null
          })
        }
      } catch (error) {
        console.error('Error in batched artist stats:', error)
        if (mountedRef.current) {
          setStats({
            totalLikes: 0,
            userLikes: 0,
            directArtistLikes: 0,
            articleLikes: 0,
            isLoading: false,
            error: error.message
          })
        }
      }
    }

    fetchStats()
  }, [artistName, initialLikeCount])

  const updateStats = useCallback((newStats) => {
    if (mountedRef.current) {
      setStats(prev => ({
        ...prev,
        ...newStats,
        isLoading: false
      }))
      
      // Update the global cache with the new stats
      if (newStats.totalLikes !== undefined) {
        const now = Date.now()
        globalCache.set(artistName, {
          data: newStats.totalLikes,
          timestamp: now
        })
        console.log(`[useBatchedArtistStats] Updated cache for ${artistName}: ${newStats.totalLikes}`)
      }
    }
  }, [artistName])

  return {
    ...stats,
    updateStats
  }
}
