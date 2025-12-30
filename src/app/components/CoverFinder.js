'use client'

import { useState, useEffect } from 'react'
import styles from './CoverFinder.module.scss'
import { FiSearch, FiX, FiDownload, FiImage, FiCheck, FiRefreshCw } from 'react-icons/fi'
import { IoCloseOutline } from 'react-icons/io5'

export default function CoverFinder({ artistName, songTitle, onCoverSelected, onClose }) {
  const [activeTab, setActiveTab] = useState('prismic') // 'prismic' or 'itunes'
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [uploading, setUploading] = useState(null)
  const [itunesError, setItunesError] = useState('')
  
  // Prismic assets state
  const [prismicAssets, setPrismicAssets] = useState([])
  const [loadingAssets, setLoadingAssets] = useState(false)
  const [assetsCursor, setAssetsCursor] = useState(null)
  const [hasMoreAssets, setHasMoreAssets] = useState(false)
  const [prismicError, setPrismicError] = useState('')
  const [prismicAssetsLoaded, setPrismicAssetsLoaded] = useState(false)

  async function searchCovers() {
    if (!artistName && !songTitle) {
      setItunesError('Please provide artist name or song title')
      return
    }

    setSearching(true)
    setItunesError('')
    setResults([])

    try {
      const query = `${artistName} ${songTitle}`.trim()
      const url = `/api/admin/artists/search-covers?query=${encodeURIComponent(query)}`
      
      const response = await fetch(url)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to search')
      }

      if (data.results && data.results.length > 0) {
        setResults(data.results)
      } else {
        setItunesError('No covers found. Try adjusting the artist or song name.')
      }
    } catch (err) {
      console.error('Error searching covers:', err)
      setItunesError(err.message || 'Failed to search for covers. Please try again.')
    } finally {
      setSearching(false)
    }
  }

  async function selectCover(item) {
    setUploading(item.trackId)
    setItunesError('')

    try {
      // Get high-res cover URL
      const hiResCover = item.artworkUrl100.replace('100x100bb.jpg', '1000x1000bb.jpg')
      
      // Sanitize filename
      const sanitizedArtist = sanitizeForFile(item.artistName)
      const sanitizedSong = sanitizeForFile(item.trackName)
      const fileName = `${sanitizedArtist}_${sanitizedSong}.jpg`
      const altText = `Cover for ${item.trackName} by ${item.artistName}`

      // Use our API to download and upload the cover
      const uploadResponse = await fetch('/api/admin/artists/download-cover', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: hiResCover,
          fileName: fileName,
          altText: altText,
        }),
      })

      const uploadData = await uploadResponse.json()

      if (!uploadResponse.ok) {
        throw new Error(uploadData.error || 'Failed to upload cover to Prismic')
      }

      // Return the image data to parent
      onCoverSelected({
        id: uploadData.image.id,
        url: uploadData.image.url,
        alt: uploadData.image.alt,
        width: uploadData.image.dimensions?.width,
        height: uploadData.image.dimensions?.height,
      })

      onClose()
    } catch (err) {
      console.error('Error uploading cover:', err)
      setItunesError(err.message || 'Failed to upload cover. Please try again.')
    } finally {
      setUploading(null)
    }
  }

  function sanitizeForFile(str) {
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, '_')
  }

  // Load Prismic assets or search iTunes when switching tabs
  useEffect(() => {
    if (activeTab === 'prismic') {
      // Only load assets if they haven't been loaded yet
      if (!prismicAssetsLoaded) {
        loadPrismicAssets()
      }
    } else if (activeTab === 'itunes') {
      // Automatically search iTunes when switching to iTunes tab
      if (artistName || songTitle) {
        // Only search if we don't have results yet (first time opening tab)
        if (results.length === 0) {
          searchCovers()
        }
      } else {
        setItunesError('Please provide artist name or song title')
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  async function loadPrismicAssets(cursor = null) {
    setLoadingAssets(true)
    setPrismicError('')

    try {
      const url = cursor 
        ? `/api/admin/artists/prismic-assets?cursor=${encodeURIComponent(cursor)}`
        : '/api/admin/artists/prismic-assets'
      
      const response = await fetch(url)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load assets')
      }

      if (cursor) {
        // Append to existing assets
        setPrismicAssets(prev => [...prev, ...data.assets])
      } else {
        // Replace with new assets
        setPrismicAssets(data.assets)
        setPrismicAssetsLoaded(true)
      }

      setAssetsCursor(data.cursor)
      setHasMoreAssets(data.hasMore)
    } catch (err) {
      console.error('Error loading Prismic assets:', err)
      setPrismicError(err.message || 'Failed to load Prismic assets')
    } finally {
      setLoadingAssets(false)
    }
  }

  function handleLoadMoreAssets() {
    if (assetsCursor && hasMoreAssets) {
      loadPrismicAssets(assetsCursor)
    }
  }

  function selectPrismicAsset(asset) {
    // Return the asset directly (no upload needed)
    onCoverSelected({
      id: asset.id,
      url: asset.url,
      alt: asset.alt || `Cover image: ${asset.filename}`,
      width: asset.width,
      height: asset.height,
    })

    onClose()
  }

  return (
    <div className={styles.coverFinder}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          <span className={styles.titleText}>Find Cover Image</span>
          <div className={styles.searchSubtitle}>
            Searching for: <span className={styles.searchSubtitleQuery}>{songTitle} by {artistName}</span>
          </div>
        </h3>
        <button
          type="button"
          onClick={onClose}
          className={styles.closeButton}
          aria-label="Close"
        >
          <IoCloseOutline />
        </button>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tab} ${activeTab === 'prismic' ? styles.active : ''}`}
          onClick={() => setActiveTab('prismic')}
        >
          <FiImage />
          Prismic Assets
        </button>
        <button
          type="button"
          className={`${styles.tab} ${activeTab === 'itunes' ? styles.active : ''}`}
          onClick={() => setActiveTab('itunes')}
        >
          <FiSearch />
          Search iTunes
        </button>
      </div>

      {/* Prismic Assets Tab */}
      {activeTab === 'prismic' && (
        <div className={styles.tabContent}>
          {prismicError && (
            <div className={styles.error}>
              {prismicError}
            </div>
          )}

          {(loadingAssets || prismicAssets.length > 0) && (
            <div className={styles.searchHeader}>
              <div className={styles.searchSubtitle}>
                {loadingAssets ? 'Loading assets...' : `${prismicAssets.length} asset${prismicAssets.length !== 1 ? 's' : ''} displayed`}
              </div>
            </div>
          )}
          {loadingAssets && prismicAssets.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.spinner}></div>
              <p>Loading assets...</p>
            </div>
          ) : prismicAssets.length > 0 ? (
            <>
              <div className={styles.resultsContainer}>
                <div className={styles.results}>
                  {prismicAssets.map((asset) => (
                    <div key={asset.id} className={styles.coverCard}>
                      <div className={styles.coverImageContainer}>
                        <img
                          src={asset.url}
                          alt={asset.alt || asset.filename}
                          className={styles.coverImage}
                        />
                      </div>
                      <div className={styles.coverInfo}>
                        <h4 className={styles.trackName} title={asset.filename}>
                          {asset.filename}
                        </h4>
                        <p className={styles.artistInfo} title={asset.url}>
                          {asset.url}
                        </p>
                        <button
                          onClick={() => selectPrismicAsset(asset)}
                          className={styles.selectButton}
                        >
                          <FiCheck />
                          Use This Cover
                        </button>
                      </div>
                    </div>
                  ))}
                  {hasMoreAssets && (
                    <div className={styles.loadMoreSection}>
                      <button
                        onClick={handleLoadMoreAssets}
                        disabled={loadingAssets}
                        className={styles.loadMoreButton}
                      >
                        {loadingAssets ? 'Loading...' : `Load more`}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className={styles.empty}>
              <p>No assets found in Prismic</p>
            </div>
          )}
        </div>
      )}

      {/* iTunes Search Tab */}
      {activeTab === 'itunes' && (
        <div className={styles.tabContent}>
          {itunesError && (
            <div className={styles.error}>
              {itunesError}
            </div>
          )}
          
          {(searching || results.length > 0) && (
            <div className={styles.searchHeader}>
              <div className={styles.searchSubtitle}>
                {searching ? 'Searching covers...' : `${results.length} result${results.length !== 1 ? 's' : ''} found`}
              </div>
              <button
                onClick={searchCovers}
                disabled={searching}
                className={styles.refreshButton}
                title="Refresh search"
              >
                <FiRefreshCw />
                {searching ? 'Searching...' : 'Refresh'}
              </button>
            </div>
          )}

          {searching && results.length === 0 && (
            <div className={styles.empty}>
              <div className={styles.spinner}></div>
              <p>Searching iTunes...</p>
            </div>
          )}

          {results.length > 0 && (
            <div className={styles.resultsContainer}>
              <div className={styles.results}>
                {results.map((item) => {
                  const hiResCover = item.artworkUrl100.replace('100x100bb.jpg', '600x600bb.jpg')
                  const isSingle = item.collectionName.toLowerCase().includes('single') || item.trackCount < 3
                  const badgeLabel = isSingle ? 'SINGLE' : 'ALBUM'
                  const isUploading = uploading === item.trackId

                  return (
                    <div key={item.trackId} className={styles.coverCard}>
                      <div className={styles.coverImageContainer}>
                        <img
                          src={hiResCover}
                          alt={`${item.trackName} by ${item.artistName}`}
                          className={styles.coverImage}
                        />
                        <span className={`${styles.badge} ${isSingle ? styles.badgeSingle : styles.badgeAlbum}`}>
                          {badgeLabel}
                        </span>
                      </div>
                      <div className={styles.coverInfo}>
                        <h4 className={styles.trackName} title={item.trackName}>
                          {item.trackName}
                        </h4>
                        <p className={styles.artistInfo} title={`${item.artistName} — ${item.collectionName}`}>
                          {item.artistName} — {item.collectionName}
                        </p>
                        <button
                          onClick={() => selectCover(item)}
                          disabled={isUploading || uploading !== null}
                          className={styles.selectButton}
                        >
                          {isUploading ? (
                            <>
                              <div className={styles.spinner}></div>
                              Uploading...
                            </>
                          ) : (
                            <>
                              <FiDownload />
                              Use This Cover
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {results.length === 0 && !searching && !itunesError && artistName && songTitle && (
            <div className={styles.empty}>
              <p>No results found. Try adjusting the artist or song name.</p>
            </div>
          )}

          {results.length === 0 && !searching && !itunesError && (!artistName || !songTitle) && (
            <div className={styles.empty}>
              <p>Please provide artist name and song title to search</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

