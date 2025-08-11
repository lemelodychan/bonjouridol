'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { HiHeart, HiOutlineHeart } from 'react-icons/hi'
import styles from './ArticleLike.module.scss'
import { useArticleStats } from './hooks/useArticleStats'

export default function ArticleLike({ articleSlug, articleType }) {
  const { totalLikes, userLikes, isLoading, error, updateStats } = useArticleStats(articleSlug)
  const [isAnimating, setIsAnimating] = useState(false)
  const [bubbleHearts, setBubbleHearts] = useState([])
  const [localLikes, setLocalLikes] = useState(0)
  const [lastUpdateTime, setLastUpdateTime] = useState(0)
  const [updateTimeout, setUpdateTimeout] = useState(null)
  const currentLikesRef = useRef(0)
  const [hasUserLiked, setHasUserLiked] = useState(false)

  // Initialize local likes when data loads
  useEffect(() => {
    if (!isLoading) {
      // Show 0 as fallback if no data or if totalLikes is undefined
      const initialLikes = totalLikes || 0
      setLocalLikes(initialLikes)
      currentLikesRef.current = initialLikes
      // Set user liked state based on server data (userLikes > 0 means this user has liked)
      setHasUserLiked(userLikes > 0)
    }
  }, [totalLikes, userLikes, isLoading])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (updateTimeout) {
        clearTimeout(updateTimeout)
      }
    }
  }, [updateTimeout])

  // Simple debounced update function
  const updateDatabase = useCallback(async (count) => {
    try {
      const response = await fetch('/api/articles/like', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          slug: articleSlug,
          type: articleType,
          batchCount: count,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        updateStats({
          totalLikes: data.totalLikes,
          userLikes: data.userLikes
        })
        setLocalLikes(data.totalLikes)
        
        // Track database update event in Umami
        if (typeof window !== 'undefined' && window.umami) {
          window.umami.track('likes_saved', {
            article_slug: articleSlug,
            article_type: articleType,
            likes_added: count,
            total_likes: data.totalLikes,
            user_likes: data.userLikes
          })
        }
      }
    } catch (error) {
      console.error('Error updating likes:', error)
      // Reset on error
      setLocalLikes(totalLikes)
    }
  }, [articleSlug, articleType, updateStats, totalLikes])

  const handleLike = () => {
    if (isLoading) return
    
    setIsAnimating(true)
    
    // Add bubble animation with mix of hearts and croissants
    const emojis = ['🩷', '🥐', '💖', '🥐', '💘', '🥐', '🥐', '🥐'] // Mix of hearts and croissants
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)]
    
    const newBubble = {
      id: Date.now(),
      x: Math.random() * 60 - 30, // Random position around button
      y: Math.random() * 40 - 20,
      emoji: randomEmoji
    }
    setBubbleHearts(prev => [...prev, newBubble])
    
    // Remove bubble after animation
    setTimeout(() => {
      setBubbleHearts(prev => prev.filter(bubble => bubble.id !== newBubble.id))
    }, 1000)
    
    // Update local state immediately for instant feedback
    const newLocalLikes = localLikes + 1
    setLocalLikes(newLocalLikes)
    currentLikesRef.current = newLocalLikes
    
    // Set user liked state immediately on first click (if not already liked)
    if (!hasUserLiked) {
      setHasUserLiked(true)
      
      // Track like event in Umami
      if (typeof window !== 'undefined' && window.umami) {
        window.umami.track('article_liked', {
          article_slug: articleSlug,
          article_type: articleType,
          total_likes: newLocalLikes
        })
      }
    }
    
    // Clear any existing timeout
    if (updateTimeout) {
      clearTimeout(updateTimeout)
    }
    
    // Set a new timeout for 5 seconds after the last click
    const timeout = setTimeout(() => {
      // Use the ref to get the current count (which includes all clicks)
      const finalLikes = currentLikesRef.current
      const newLikes = finalLikes - totalLikes
      if (newLikes > 0) {
        updateDatabase(newLikes)
      }
      setUpdateTimeout(null)
    }, 5000) // 5 second cooldown after user stops clicking
    
    setUpdateTimeout(timeout)
    
    setTimeout(() => setIsAnimating(false), 200)
  }

  return (
    <div className={styles.likeContainer}>
      <button
        onClick={handleLike}
        disabled={isLoading}
        className={`${styles.likeButton} ${isAnimating ? styles.animate : ''} ${hasUserLiked ? styles.liked : ''}`}
        aria-label={`${hasUserLiked ? 'Unlike' : 'Like'} this article`}
      >
        {hasUserLiked ? (
          <span className={styles.croissantIcon}>🥐</span>
        ) : (
          <span className={styles.croissantIcon}>🥐</span>
        )}
        <span className={styles.likeCount}>
          {isLoading ? '...' : localLikes}
        </span>
      </button>
      
      {/* Bubble animation */}
      {bubbleHearts.map(bubble => (
        <div
          key={bubble.id}
          className={styles.bubbleHeart}
          style={{
            left: `${50 + bubble.x}%`,
            top: `${50 + bubble.y}%`,
          }}
        >
          {bubble.emoji}
        </div>
      ))}
    </div>
  )
}
