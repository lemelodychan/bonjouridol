'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import styles from './ArtistLike.module.scss'
import { useArtistStats } from './hooks/useArtistStats'

export default function ArtistLike({ artistName }) {
  const { totalLikes, userLikes, isLoading, error, updateStats } = useArtistStats(artistName)
  const [isAnimating, setIsAnimating] = useState(false)
  const [bubbleHearts, setBubbleHearts] = useState([])
  const [localLikes, setLocalLikes] = useState(0)
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
      const response = await fetch('/api/artists/like', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          artistName,
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
        if (typeof window !== 'undefined' && window.umami && !window.umami.disabled && localStorage.getItem('umami.disabled') !== '1') {
          window.umami.track('artist_likes_saved', {
            artist_name: artistName,
            artist_liked: count,
            added_likes: data.userLikes
          })
        }
      }
    } catch (error) {
      console.error('Error updating artist likes:', error)
      // Reset on error
      setLocalLikes(totalLikes)
    }
  }, [artistName, updateStats, totalLikes])

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



  if (error) {
    return (
      <div className={styles.artistLike}>
        <button 
          className={`${styles.likeButton} ${styles.error}`}
          disabled
          title="Error loading likes"
        >
          <HiOutlineHeart />
          <span>Error</span>
        </button>
      </div>
    )
  }

  return (
    <div className={styles.artistLike}>
      <button 
        className={`${styles.likeButton} ${hasUserLiked ? styles.liked : ''} ${isAnimating ? styles.animate : ''}`}
        onClick={handleLike}
        disabled={isLoading}
        title={hasUserLiked ? "You liked this artist!" : "Like this artist"}
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

