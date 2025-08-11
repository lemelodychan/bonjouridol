'use client'

import { useState, useEffect } from 'react'

export function useArticleStats(slug) {
  const [stats, setStats] = useState({
    totalLikes: 0,
    userLikes: 0,
    views: 0,
    isLoading: true,
    error: null
  })

  useEffect(() => {
    if (!slug) {
      setStats(prev => ({ ...prev, isLoading: false }))
      return
    }

    const fetchStats = async () => {
      try {
        const response = await fetch(`/api/articles/like?slug=${encodeURIComponent(slug)}`)
        
        if (response.ok) {
          const data = await response.json()
          setStats({
            totalLikes: data.totalLikes || 0,
            userLikes: data.userLikes || 0,
            views: data.views || 0,
            isLoading: false,
            error: null
          })
        } else if (response.status === 404) {
          // Article not found in database, try to sync it
          const syncResponse = await fetch('/api/articles/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ slug }),
          })

          if (syncResponse.ok) {
            // Retry fetching stats after sync
            const retryResponse = await fetch(`/api/articles/like?slug=${encodeURIComponent(slug)}`)
            if (retryResponse.ok) {
              const data = await retryResponse.json()
              setStats({
                totalLikes: data.totalLikes || 0,
                userLikes: data.userLikes || 0,
                views: data.views || 0,
                isLoading: false,
                error: null
              })
            } else {
              throw new Error('Failed to fetch stats after sync')
            }
          } else {
            throw new Error('Failed to sync article')
          }
        } else {
          throw new Error('Failed to fetch stats')
        }
      } catch (error) {
        console.error('Error fetching article stats:', error)
        setStats(prev => ({
          ...prev,
          isLoading: false,
          error: error.message
        }))
      }
    }

    fetchStats()
  }, [slug])

  const updateStats = (newStats) => {
    setStats(prev => ({
      ...prev,
      ...newStats
    }))
  }

  return { ...stats, updateStats }
}
