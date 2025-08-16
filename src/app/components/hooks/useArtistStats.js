'use client'

import { useState, useEffect } from 'react'

export function useArtistStats(artistName) {
  const [stats, setStats] = useState({
    totalLikes: 0,
    userLikes: 0,
    directArtistLikes: 0,
    articleLikes: 0,
    isLoading: true,
    error: null
  })

  useEffect(() => {
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
  }, [artistName])

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

