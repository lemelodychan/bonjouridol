'use client'

import { useState, useEffect } from 'react'
import styles from './StaticLikeCount.module.scss'

export default function StaticLikeCount({ articleSlug }) {
  const [likeCount, setLikeCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!articleSlug) {
      setIsLoading(false)
      return
    }

    const fetchLikeCount = async () => {
      try {
        const response = await fetch(`/api/articles/like?slug=${encodeURIComponent(articleSlug)}`)
        
        if (response.ok) {
          const data = await response.json()
          setLikeCount(data.totalLikes || 0)
        } else if (response.status === 404) {
          // Article not found in database, try to sync it
          const syncResponse = await fetch('/api/articles/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ slug: articleSlug }),
          })

          if (syncResponse.ok) {
            // Retry fetching stats after sync
            const retryResponse = await fetch(`/api/articles/like?slug=${encodeURIComponent(articleSlug)}`)
            if (retryResponse.ok) {
              const data = await retryResponse.json()
              setLikeCount(data.totalLikes || 0)
            }
          }
        }
      } catch (error) {
        console.error('Error fetching like count:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchLikeCount()
  }, [articleSlug])

  if (isLoading) {
    return null
  }

  return (
    <div className={styles.staticLikeCount}>
      <span className={styles.croissantIcon}>🥐</span>
      <span className={styles.likeCount}>{likeCount}</span>
    </div>
  )
}
