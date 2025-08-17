'use client'

import { useState, useEffect } from 'react'

export function useArtistStats(artistName, initialLikeCount = null) {
  const [stats, setStats] = useState({
    totalLikes: initialLikeCount || 0,
    userLikes: 0,
    directArtistLikes: 0,
    articleLikes: 0,
    isLoading: initialLikeCount === null,
    error: null
  })

  useEffect(() => {
    // If we have initial data, don't fetch from API
    if (initialLikeCount !== null) {
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

    const fetchStats = async () => {
      try {
        const response = await fetch(`/api/artists/stats?artist=${encodeURIComponent(artistName)}`)
        
        if (response.ok) {
          const data = await response.json()
          setStats({
            totalLikes: data.totalLikes || 0,
            userLikes: data.userLikes || 0,
            directArtistLikes: data.directArtistLikes || 0,
            articleLikes: data.articleLikes || 0,
            isLoading: false,
            error: null
          })
        } else {
          throw new Error('Failed to fetch artist stats')
        }
      } catch (error) {
        console.error('Error fetching artist stats:', error)
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

    fetchStats()
  }, [artistName, initialLikeCount])

  const updateStats = (newStats) => {
    setStats(prev => ({
      ...prev,
      ...newStats,
      isLoading: false
    }))
  }

  return {
    ...stats,
    updateStats
  }
}

