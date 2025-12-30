'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { HiChevronRight, HiChevronLeft, HiX, HiExternalLink, HiUser, HiStar } from 'react-icons/hi'
import { FiUsers, FiMinimize2, FiMaximize2 } from 'react-icons/fi'
import Button from './IconButton'
import styles from './Playlist.module.scss'

const PLAYLIST_CACHE_KEY_PREFIX = 'main_site_playlist_cache'

// Get Tokyo date string (YYYY-MM-DD) for cache key
function getTokyoDateString() {
  const now = new Date()
  const tokyoDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(now)
  
  const year = tokyoDate.find(part => part.type === 'year').value
  const month = tokyoDate.find(part => part.type === 'month').value
  const day = tokyoDate.find(part => part.type === 'day').value
  
  return `${year}-${month}-${day}`
}

function getCacheKey() {
  return `${PLAYLIST_CACHE_KEY_PREFIX}_${getTokyoDateString()}`
}

export default function Playlist() {
  const pathname = usePathname()
  const [playlistItem, setPlaylistItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [hasMounted, setHasMounted] = useState(false)

  // Hide on article single pages
  const isArticlePage = pathname?.startsWith('/articles/') && pathname !== '/articles'
  
  useEffect(() => {
    // Mark as mounted after initial render
    setHasMounted(true)
    
    // Check if mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
      // On mobile, start collapsed
      if (window.innerWidth < 768) {
        setIsExpanded(false)
      } else {
        setIsExpanded(true)
      }
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)

    // Check for cache version mismatch - if cached item has null purchase_link, clear cache
    const cachedItem = getCachedPlaylistItem()
    if (cachedItem && cachedItem.purchase_link === null) {
      clearCache()
    }

    loadPlaylistItem()

    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  function getCachedPlaylistItem() {
    try {
      const cacheKey = getCacheKey()
      const cached = localStorage.getItem(cacheKey)
      if (!cached) {
        // Clear old cache entries (from previous days)
        clearOldCache()
        return null
      }

      const { data } = JSON.parse(cached)
      // Cache is valid for the current Tokyo date (automatically invalidates at Tokyo midnight)
      return data
    } catch (error) {
      console.error('Error reading cache:', error)
      clearOldCache()
      return null
    }
  }
  
  function clearOldCache() {
    try {
      const currentCacheKey = getCacheKey()
      // Clear any cache entries that don't match today's date
      const oldKeys = Object.keys(localStorage).filter(key => 
        key.startsWith(PLAYLIST_CACHE_KEY_PREFIX) && key !== currentCacheKey
      )
      oldKeys.forEach(key => localStorage.removeItem(key))
    } catch (error) {
      console.error('Error clearing old cache:', error)
    }
  }
  
  function clearCache() {
    try {
      clearOldCache()
    } catch (error) {
      console.error('Error clearing cache:', error)
    }
  }

  function setCachedPlaylistItem(data) {
    try {
      const cacheKey = getCacheKey()
      const cacheData = {
        data,
        date: getTokyoDateString() // Store the date for reference
      }
      localStorage.setItem(cacheKey, JSON.stringify(cacheData))
      // Clear old cache entries
      clearOldCache()
    } catch (error) {
      console.error('Error setting cache:', error)
    }
  }

  async function loadPlaylistItem() {
    // Check cache first
    const cachedItem = getCachedPlaylistItem()
    if (cachedItem) {
      setPlaylistItem(cachedItem)
      setLoading(false)
      return
    }

    // No cache or expired - fetch from API
    try {
      setLoading(true)
      const response = await fetch('/api/playlist/random', {
        cache: 'no-store'
      })

      if (!response.ok) {
        throw new Error('Failed to fetch playlist item')
      }

      const data = await response.json()
      if (data.item) {
        setPlaylistItem(data.item)
        setCachedPlaylistItem(data.item)
      }
    } catch (error) {
      console.error('Error fetching playlist item:', error)
      // Don't show error to user, just don't display the component
    } finally {
      setLoading(false)
    }
  }

  function toggleExpand() {
    setIsExpanded(!isExpanded)
  }

  if (loading || !playlistItem || isArticlePage) {
    return null
  }

  return (
    <div className={`${styles.playlistContainer} ${isExpanded ? styles.expanded : styles.collapsed} ${isMobile ? styles.mobile : ''} ${hasMounted ? styles.mounted : ''}`}>
      {!isExpanded ? (
        // Collapsed state: Use mobile design for both mobile and desktop
        isMobile ? (
          // Mobile: Open link directly
          <a
            href={playlistItem.link}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.mobileTrigger}
            aria-label="Listen to playlist suggestion"
          >
            <div className={styles.mobileTriggerContent}>
              <div className={styles.mobileDiskPreview}>
                {playlistItem.cover_url && (
                  <img src={playlistItem.cover_url} alt="" />
                )}
              </div>
              <div className={styles.mobileTriggerText}>
                <span className={styles.mobileSongTitle}>{playlistItem.title_en}</span>
                <span className={styles.mobileArtistName}>{playlistItem.artist_en}</span>
              </div>
              <div className={styles.mobileTriggerIconContainer}>
                <HiExternalLink size={16} className={styles.mobileTriggerIcon} />
              </div>
            </div>
          </a>
        ) : (
          // Desktop: Expand on click
          <button 
            onClick={toggleExpand}
            className={styles.mobileTrigger}
            aria-label="View playlist suggestion"
          >
            <div className={styles.mobileTriggerContent}>
              <div className={styles.mobileDiskPreview}>
                {playlistItem.cover_url && (
                  <img src={playlistItem.cover_url} alt="" />
                )}
              </div>
              <div className={styles.mobileTriggerText}>
                <span className={styles.mobileSongTitle}>{playlistItem.title_en}</span>
                <span className={styles.mobileArtistName}>{playlistItem.artist_en}</span>
              </div>
              <div className={styles.mobileTriggerIconContainer}>
                <FiMaximize2 size={16} className={styles.mobileTriggerIcon} />
              </div>
            </div>
          </button>
        )
      ) : (
        // Expanded state: Desktop only (mobile doesn't expand)
        !isMobile && (
          <>
            <button 
              onClick={toggleExpand}
              className={styles.toggleButton}
              aria-label="Collapse playlist"
            >
              <FiMinimize2 />
            </button>
            <PlaylistContent item={playlistItem} isMobile={false} />
          </>
        )
      )}
    </div>
  )
}

function PlaylistContent({ item, isMobile = false }) {
  return (
    <>
{/*     <span className={styles.Tag}>
      <HiStar /><span>Bonjour Selection</span>
    </span> */}
    <div className={styles.playlistContent}>
      <a 
        href={item.link}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.cdPlayerLink}
      >
        <div className={styles.cdPlayer}>
          <div className={styles.cdJacket}>
            <img src={item.cover_url} alt={`${item.title_en} cover`} className={styles.cdJacketImage} />
          </div>
          <div className={styles.cdDisk}>
            <div className={styles.diskCover}>
              <img src={item.cover_url} alt={`${item.title_en} cover`} className={styles.diskCoverImage} />
            </div>
            <div className={styles.diskCenter}></div>
          </div>
        </div>
      </a>

      <div className={styles.songInfoContainer}>
        <div className={styles.songInfo}>
          <h3 className={styles.songTitle}>
            {item.title_ja ? (
              <>
                <a 
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.songTitle_english}
                >
                  {item.title_en} <HiExternalLink />
                </a>
                <span className={styles.songTitle_japanese}>{item.title_ja}</span>
              </>
            ) : (
              <a 
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.songTitle_english}
              >
                {item.title_en} <HiExternalLink />
              </a>
            )}
          </h3>
          <p className={styles.artistName}>
            <span className={styles.artistName}>{item.artist_en}</span>
          </p>       
          {/* {!isMobile && item.release_date && (
            <p className={styles.releaseDate}>
              Released on {new Date(item.release_date).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          )} */}
        </div>

{/*         <div className={styles.actions}>
          <Button
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            variant="Pink"
            size="small"
            textValue="Listen"
            icon={<HiExternalLink />}
          />
          {item.purchase_link && typeof item.purchase_link === 'string' && item.purchase_link.trim() !== '' && (
            <Button
              href={item.purchase_link}
              target="_blank"
              rel="noopener noreferrer"
              variant="White"
              size="small"
              textValue="Purchase"
              icon={<HiExternalLink />}
            />
          )}
        </div> */}
      </div>
    </div>
    </>
  )
}

