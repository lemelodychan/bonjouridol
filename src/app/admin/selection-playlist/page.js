'use client'

import { useState, useEffect } from 'react'
import styles from './page.module.scss'
import Button from '@/app/components/IconButton'
import SingleImage from '@/app/components/SingleImage'
import { IoAddOutline, IoCloseOutline, IoDownloadOutline } from 'react-icons/io5'
import { FiEdit, FiTrash, FiCheck } from 'react-icons/fi'

const PLAYLIST_CACHE_KEY = 'admin_playlist_cache'
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

export default function SelectionPlaylistPage() {
  const [playlist, setPlaylist] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    title_en: '',
    title_ja: '',
    artist_en: '',
    artist_ja: '',
    link: '',
    purchase_link: '',
    cover_url: '',
    release_date: '',
    display_order: 0
  })
  const [uploading, setUploading] = useState(false)
  const [coverMode, setCoverMode] = useState('upload') // 'upload' or 'select'
  const [existingCovers, setExistingCovers] = useState([])
  const [loadingCovers, setLoadingCovers] = useState(false)
  
  // Import modal state
  const [showImportModal, setShowImportModal] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [importableSongs, setImportableSongs] = useState([])
  const [selectedSongs, setSelectedSongs] = useState([])
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    loadPlaylist()
  }, [])

  useEffect(() => {
    if (coverMode === 'select' && existingCovers.length === 0) {
      loadExistingCovers()
    }
  }, [coverMode])

  useEffect(() => {
    if (showForm || showImportModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showForm, showImportModal])

  function getCachedPlaylist() {
    try {
      const cached = localStorage.getItem(PLAYLIST_CACHE_KEY)
      if (!cached) return null

      const { data, timestamp } = JSON.parse(cached)
      const now = Date.now()

      // Check if cache is still valid (within 24 hours)
      if (now - timestamp < CACHE_DURATION) {
        return data
      }

      // Cache expired, remove it
      localStorage.removeItem(PLAYLIST_CACHE_KEY)
      return null
    } catch (error) {
      console.error('Error reading cache:', error)
      return null
    }
  }

  function setCachedPlaylist(data) {
    try {
      const cacheData = {
        data,
        timestamp: Date.now()
      }
      localStorage.setItem(PLAYLIST_CACHE_KEY, JSON.stringify(cacheData))
    } catch (error) {
      console.error('Error setting cache:', error)
    }
  }

  function clearPlaylistCache() {
    try {
      localStorage.removeItem(PLAYLIST_CACHE_KEY)
    } catch (error) {
      console.error('Error clearing cache:', error)
    }
  }

  async function loadPlaylist(forceRefresh = false) {
    // Check cache first if not forcing refresh
    if (!forceRefresh) {
      const cachedPlaylist = getCachedPlaylist()
      if (cachedPlaylist) {
        setPlaylist(cachedPlaylist)
        setLoading(false)
        // Fetch fresh data in background
        fetchPlaylist(true)
        return
      }
    }

    // No cache or force refresh - fetch from API
    await fetchPlaylist(false, forceRefresh)
  }

  async function fetchPlaylist(silent = false, forceRefresh = false) {
    try {
      if (!silent) {
        setLoading(true)
      }
      setError('')
      
      const response = await fetch('/api/admin/selection-playlist', {
        cache: 'no-store' // Always fetch fresh data from API
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch playlist')
      }

      const data = await response.json()
      setPlaylist(data.playlist || [])
      setCachedPlaylist(data.playlist || []) // Cache the fresh data
    } catch (error) {
      console.error('Error fetching playlist:', error)
      if (!silent) {
        setError('Failed to load playlist. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function loadExistingCovers() {
    try {
      setLoadingCovers(true)
      const response = await fetch('/api/admin/selection-playlist/covers')
      
      if (!response.ok) {
        throw new Error('Failed to load existing covers')
      }

      const data = await response.json()
      setExistingCovers(data.covers || [])
    } catch (error) {
      console.error('Error loading existing covers:', error)
      setError('Failed to load existing covers')
    } finally {
      setLoadingCovers(false)
    }
  }

  async function handleUploadCover(file) {
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/admin/selection-playlist/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to upload cover')
      }

      const data = await response.json()
      setFormData(prev => ({ ...prev, cover_url: data.url }))
      // Refresh existing covers list to include the new upload
      if (coverMode === 'select') {
        await loadExistingCovers()
      }
    } catch (error) {
      console.error('Error uploading cover:', error)
      alert(`Failed to upload cover image: ${error.message || 'Unknown error'}`)
    } finally {
      setUploading(false)
    }
  }

  function handleSelectCover(coverUrl) {
    setFormData(prev => ({ ...prev, cover_url: coverUrl }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    
    try {
      setError('')
      
      // Validate required fields
      if (!formData.title_en || !formData.artist_en || !formData.link) {
        setError('Please fill in all required fields: Title (EN), Artist (EN), and Link')
        return
      }
      
      if (!formData.cover_url) {
        setError('Please select or upload a cover image')
        return
      }
      
      const url = editingId 
        ? '/api/admin/selection-playlist'
        : '/api/admin/selection-playlist'
      
      const method = editingId ? 'PUT' : 'POST'
      const body = editingId ? { ...formData, id: editingId } : formData

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to save')
      }

      // Reset form and refresh
      setFormData({
        title_en: '',
        title_ja: '',
        artist_en: '',
        artist_ja: '',
        link: '',
        purchase_link: '',
        cover_url: '',
        release_date: '',
        display_order: 0
      })
      setEditingId(null)
      setShowForm(false)
      
      // Clear cache and refresh playlist after create/edit
      clearPlaylistCache()
      await loadPlaylist(true)
    } catch (error) {
      console.error('Error saving playlist item:', error)
      setError(error.message || 'Failed to save. Please try again.')
    }
  }

  async function handleDelete(id) {
    if (!confirm('Are you sure you want to delete this item?')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/selection-playlist?id=${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete')
      }

      // Clear cache and refresh playlist after delete
      clearPlaylistCache()
      await loadPlaylist(true)
    } catch (error) {
      console.error('Error deleting item:', error)
      alert('Failed to delete item')
    }
  }

  function handleEdit(item) {
    // Use artist name from artists table if available, otherwise fallback to playlist artist_en
    const artistName = item.artists?.name || item.artist_en || ''
    const artistNameJa = item.artists?.name_ja || item.artist_ja || ''
    
    setFormData({
      title_en: item.title_en || '',
      title_ja: item.title_ja || '',
      artist_en: artistName,
      artist_ja: artistNameJa,
      link: item.link || '',
      purchase_link: item.purchase_link || '',
      cover_url: item.cover_url || '',
      release_date: item.release_date || '',
      display_order: item.display_order || 0
    })
    setEditingId(item.id)
    setShowForm(true)
  }

  function handleCancel() {
    setFormData({
      title_en: '',
      title_ja: '',
      artist_en: '',
      artist_ja: '',
      link: '',
      purchase_link: '',
      cover_url: '',
      release_date: '',
      display_order: 0
    })
    setEditingId(null)
    setShowForm(false)
    setCoverMode('upload')
  }

  async function handleImportClick() {
    setShowImportModal(true)
    setImportLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/admin/selection-playlist/import')
      
      if (!response.ok) {
        throw new Error('Failed to fetch importable songs')
      }

      const data = await response.json()
      const allSongs = data.songs || []
      // Filter out duplicates - only importable songs can be selected
      const importableOnly = allSongs.filter(song => !song.isDuplicate)
      setImportableSongs(allSongs) // Store all songs for display
      // Select all importable songs by default (exclude duplicates)
      setSelectedSongs(importableOnly)
    } catch (error) {
      console.error('Error fetching importable songs:', error)
      setError('Failed to fetch importable songs. Please try again.')
    } finally {
      setImportLoading(false)
    }
  }

  function handleToggleSong(song) {
    // Don't allow toggling duplicates
    if (song.isDuplicate) {
      return
    }
    
    setSelectedSongs(prev => {
      const isSelected = prev.some(s => 
        s.title_en === song.title_en && s.artist_en === song.artist_en
      )
      
      if (isSelected) {
        return prev.filter(s => 
          !(s.title_en === song.title_en && s.artist_en === song.artist_en)
        )
      } else {
        return [...prev, song]
      }
    })
  }

  function handleToggleAll() {
    // Only toggle importable songs (exclude duplicates)
    const importableOnly = importableSongs.filter(song => !song.isDuplicate)
    
    if (selectedSongs.length === importableOnly.length) {
      setSelectedSongs([])
    } else {
      setSelectedSongs([...importableOnly])
    }
  }

  async function handleConfirmImport() {
    if (selectedSongs.length === 0) {
      setError('Please select at least one song to import')
      return
    }

    setImporting(true)
    setError('')

    try {
      const response = await fetch('/api/admin/selection-playlist/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ songs: selectedSongs })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to import songs')
      }

      const data = await response.json()
      
      // Close modal and refresh playlist
      setShowImportModal(false)
      setImportableSongs([])
      setSelectedSongs([])
      
      // Clear cache and refresh playlist
      clearPlaylistCache()
      await loadPlaylist(true)
      
      // Show success message (you can add a toast notification here)
      alert(`Successfully imported ${data.imported} song(s)!`)
    } catch (error) {
      console.error('Error importing songs:', error)
      setError(error.message || 'Failed to import songs. Please try again.')
    } finally {
      setImporting(false)
    }
  }

  function handleCancelImport() {
    setShowImportModal(false)
    setImportableSongs([])
    setSelectedSongs([])
    setError('')
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Selection Playlist</h1>

        {!showForm && !showImportModal && (
          <div className={styles.headerButtons}>
            <Button
              onClick={handleImportClick}
              variant="Grey"
              textValue="Import from Prismic"
              icon={<IoDownloadOutline />}
            />
            <Button
              onClick={() => setShowForm(true)}
              variant="Pink"
              textValue="Add Song"
              icon={<IoAddOutline />}
            />
          </div>
        )}
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {showForm && (
        <div className={styles.modalOverlay} onClick={handleCancel}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.formTitle}>
                {editingId ? 'Edit Song' : 'Add New Song'}
              </h2>
              <button
                type="button"
                onClick={handleCancel}
                className={styles.closeButton}
                aria-label="Close"
              >
                <IoCloseOutline />
              </button>
            </div>
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label htmlFor="title_en">Title (EN) <strong>※</strong></label>
                  <input
                    id="title_en"
                    type="text"
                    value={formData.title_en}
                    onChange={(e) => setFormData(prev => ({ ...prev, title_en: e.target.value }))}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="title_ja">Title (JA)</label>
                  <input
                    id="title_ja"
                    type="text"
                    value={formData.title_ja}
                    onChange={(e) => setFormData(prev => ({ ...prev, title_ja: e.target.value }))}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="artist_en">Artist (EN) <strong>※</strong></label>
                  <input
                    id="artist_en"
                    type="text"
                    value={formData.artist_en}
                    onChange={(e) => setFormData(prev => ({ ...prev, artist_en: e.target.value }))}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="artist_ja">Artist (JA)</label>
                  <input
                    id="artist_ja"
                    type="text"
                    value={formData.artist_ja}
                    onChange={(e) => setFormData(prev => ({ ...prev, artist_ja: e.target.value }))}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="link">Link <strong>※</strong></label>
                  <input
                    id="link"
                    type="url"
                    value={formData.link}
                    onChange={(e) => setFormData(prev => ({ ...prev, link: e.target.value }))}
                    required
                    placeholder="https://..."
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="purchase_link">Purchase Link</label>
                  <input
                    id="purchase_link"
                    type="url"
                    value={formData.purchase_link}
                    onChange={(e) => setFormData(prev => ({ ...prev, purchase_link: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="release_date">Release Date</label>
                  <input
                    id="release_date"
                    type="date"
                    value={formData.release_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, release_date: e.target.value }))}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="display_order">Display Order</label>
                  <input
                    id="display_order"
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                    min="0"
                  />
                </div>

                <div className={styles.formGroupFull}>
                  <label htmlFor="cover">Cover Image <strong>※</strong></label>
                  
                  {/* Mode selector */}
                  <div className={styles.coverModeSelector}>
                    <button
                      type="button"
                      className={`${styles.modeButton} ${coverMode === 'upload' ? styles.active : ''}`}
                      onClick={() => {
                        setCoverMode('upload')
                        if (coverMode === 'select') {
                          setFormData(prev => ({ ...prev, cover_url: '' }))
                        }
                      }}
                    >
                      Upload New
                    </button>
                    <button
                      type="button"
                      className={`${styles.modeButton} ${coverMode === 'select' ? styles.active : ''}`}
                      onClick={() => {
                        setCoverMode('select')
                        if (coverMode === 'upload') {
                          setFormData(prev => ({ ...prev, cover_url: '' }))
                        }
                        if (existingCovers.length === 0) {
                          loadExistingCovers()
                        }
                      }}
                    >
                      Select from Existing
                    </button>
                  </div>

                  {/* Upload mode */}
                  {coverMode === 'upload' && (
                    <>
                      <input
                        required={!formData.cover_url}
                        placeholder="Select a cover image"
                        className={styles.coverInput}
                        id="cover"
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleUploadCover(file)
                        }}
                        disabled={uploading}
                      />
                      {uploading && <p className={styles.uploadStatus}>Uploading...</p>}
                    </>
                  )}

                  {/* Select from existing mode */}
                  {coverMode === 'select' && (
                    <div className={styles.existingCoversContainer}>
                      {loadingCovers ? (
                        <p className={styles.loadingCovers}>Loading existing covers...</p>
                      ) : existingCovers.length === 0 ? (
                        <p className={styles.noCovers}>No existing covers found. Switch to "Upload New" to add one.</p>
                      ) : (
                        <div className={styles.existingCoversGrid}>
                          {existingCovers.map((cover) => (
                            <div
                              key={cover.path}
                              className={`${styles.existingCoverItem} ${formData.cover_url === cover.url ? styles.selected : ''}`}
                              onClick={() => handleSelectCover(cover.url)}
                            >
                              <img src={cover.url} alt={cover.name} />
                              <div className={styles.coverOverlay}>
                                {formData.cover_url === cover.url && (
                                  <span className={styles.checkmark}>✓</span>
                                )}
                              </div>
                              <div className={styles.coverName}>{cover.name}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Preview */}
                  {formData.cover_url && (
                    <div className={styles.coverPreview}>
                      <img src={formData.cover_url} alt="Cover preview" />
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, cover_url: '' }))}
                        className={styles.removeCover}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </form>
            <div className={styles.formActions}>
              <Button
                  onClick={handleCancel}
                  variant="Grey"
                  textValue="Cancel"
              />
              <Button
                onClick={(e) => {
                  e.preventDefault()
                  // Call handleSubmit which includes custom validation
                  handleSubmit(e)
                }}
                variant="Pink"
                textValue={editingId ? 'Update Song' : 'Add Song'}
              />
            </div>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className={styles.modalOverlay} onClick={handleCancelImport}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.formTitle}>
                Import Songs from Prismic
              </h2>
              <button
                type="button"
                onClick={handleCancelImport}
                className={styles.closeButton}
                aria-label="Close"
                disabled={importing}
              >
                <IoCloseOutline />
              </button>
            </div>

            {importLoading ? (
              <div className={styles.importLoading}>
                <div className={styles.spinner}></div>
                <p>Searching for importable songs from Prismic...</p>
              </div>
            ) : importableSongs.length === 0 ? (
              <div className={styles.importEmpty}>
                <p>No new songs found to import.</p>
                <p className={styles.emptySubtitle}>
                  All songs from recently updated artists are already in the playlist.
                </p>
              </div>
            ) : (
              <>
                <div className={styles.importHeader}>
                  <p className={styles.importCount}>
                    Found <strong>{importableSongs.filter(s => !s.isDuplicate).length}</strong> song{importableSongs.filter(s => !s.isDuplicate).length !== 1 ? 's' : ''} to import
                    {importableSongs.filter(s => s.isDuplicate).length > 0 && (
                      <span className={styles.duplicateCount}>
                        {' '}({importableSongs.filter(s => s.isDuplicate).length} duplicate{importableSongs.filter(s => s.isDuplicate).length !== 1 ? 's' : ''} excluded)
                      </span>
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={handleToggleAll}
                    className={styles.toggleAllButton}
                    disabled={importableSongs.filter(s => !s.isDuplicate).length === 0}
                  >
                    {selectedSongs.length === importableSongs.filter(s => !s.isDuplicate).length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                <div className={styles.importList}>
                  {importableSongs.map((song, index) => {
                    const isSelected = selectedSongs.some(s => 
                      s.title_en === song.title_en && s.artist_en === song.artist_en
                    )
                    const isDisabled = song.isDuplicate
                    
                    return (
                      <div
                        key={`${song.artist_uid}-${index}`}
                        className={`${styles.importItem} ${isSelected ? styles.selected : ''} ${isDisabled ? styles.disabled : ''}`}
                        onClick={() => !isDisabled && handleToggleSong(song)}
                      >
                        <div 
                          className={`${styles.importCheckbox} ${isSelected ? styles.checked : ''} ${isDisabled ? styles.disabled : ''}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            if (!isDisabled) handleToggleSong(song)
                          }}
                        >
                          {isSelected && <FiCheck />}
                        </div>
                        
                        {song.cover_url && (
                          <div className={styles.importCover}>
                            <SingleImage 
                              image={{ url: song.cover_url }} 
                              alt={`${song.title_en} cover`}
                            />
                          </div>
                        )}
                        
                        <div className={styles.importInfo}>
                          <div className={styles.importTitleRow}>
                            <h4 className={styles.importTitle}>
                              {song.title_en}
                              {song.title_ja && (
                                <span className={styles.japanese}> ({song.title_ja})</span>
                              )}
                            </h4>
                            <div className={styles.importBadges}>
                              {song.isDuplicate && (
                                <span className={`${styles.badge} ${styles.badgeExisting}`}>
                                  Existing
                                </span>
                              )}
                              {song.hasCloseMatch && !song.isDuplicate && (
                                <span className={`${styles.badge} ${styles.badgeWarning}`}>
                                  Possible Duplicate
                                </span>
                              )}
                            </div>
                          </div>
                          <p className={styles.importArtist}>
                            {song.artist_en}
                            {song.artist_ja && (
                              <span className={styles.japanese}> ({song.artist_ja})</span>
                            )}
                          </p>
                          {song.hasCloseMatch && song.closestMatch && (
                            <p className={styles.closeMatchInfo}>
                              Similar to: "{song.closestMatch.title}" by "{song.closestMatch.artist}"
                            </p>
                          )}
                          <a
                            href={song.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.importLink}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {song.link}
                          </a>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            <div className={styles.formActions}>
              <Button
                onClick={handleCancelImport}
                variant="Grey"
                textValue="Cancel"
                disabled={importing}
              />
              {!importLoading && importableSongs.length > 0 && (
                <Button
                  onClick={handleConfirmImport}
                  variant="Pink"
                  textValue={importing ? 'Importing...' : `Import ${selectedSongs.length} Song${selectedSongs.length !== 1 ? 's' : ''}`}
                  disabled={importing || selectedSongs.length === 0}
                />
              )}
            </div>
          </div>
        </div>
      )}

      <div className={styles.content}>
        <div className={styles.playlist}>
          {loading ? (
            <>
              {[...Array(5)].map((_, index) => (
                <div key={`skeleton-${index}`} className={styles.playlistItemSkeleton}>
                  <div className={styles.skeletonCover}></div>
                  <div className={styles.skeletonContent}>
                    <div className={styles.skeletonTitle}></div>
                    <div className={styles.skeletonArtist}></div>
                    <div className={styles.skeletonLinks}>
                      <div className={styles.skeletonLink}></div>
                      <div className={styles.skeletonLink}></div>
                    </div>
                    <div className={styles.skeletonMeta}>
                      <div className={styles.skeletonMetaItem}></div>
                      <div className={styles.skeletonMetaItem}></div>
                    </div>
                  </div>
                  <div className={styles.skeletonActions}>
                    <div className={styles.skeletonButton}></div>
                    <div className={styles.skeletonButton}></div>
                  </div>
                </div>
              ))}
            </>
          ) : playlist.length === 0 ? (
            <div className={styles.empty}>
              <p>No songs in the playlist yet.</p>
              <p className={styles.emptySubtitle}>Click "Add Song" to get started.</p>
            </div>
          ) : (
            playlist.map((item) => (
              <div key={item.id} className={styles.playlistItem}>
                {item.cover_url && (
                  <div className={styles.itemCover}>
                    <img src={item.cover_url} alt={`${item.title_en} cover`} />
                  </div>
                )}
                <div className={styles.itemContent}>
                  <h3 className={styles.itemTitle}>
                    {item.title_ja ? (
                      <>
                        {item.title_en} <span className={styles.japanese}>({item.title_ja})</span>
                      </>
                    ) : (
                      item.title_en
                    )}
                  </h3>
                  <p className={styles.itemArtist}>
                    {(() => {
                      // Use artist name from artists table if available, otherwise fallback to playlist artist_en
                      const artistName = item.artists?.name || item.artist_en
                      const artistNameJa = item.artists?.name_ja || item.artist_ja
                      
                      return artistNameJa ? (
                        <>
                          {artistName} <span className={styles.japanese}>({artistNameJa})</span>
                        </>
                      ) : (
                        artistName
                      )
                    })()}
                  </p>
                  <div className={styles.itemLinks}>
                    <div className={styles.itemLinkContainer}>
                      <span className={styles.itemLinkLabel}>Listen:</span>
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.itemLink}
                      >
                        {item.link}
                      </a>
                    </div>
                    {item.purchase_link && (
                      <div className={styles.itemLinkContainer}>
                        <span className={styles.itemLinkLabel}>Purchase:</span>
                        <a
                          href={item.purchase_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.itemLink}
                        >
                          {item.purchase_link}
                        </a>
                      </div>
                    )}
                  </div>
                  <div className={styles.itemMeta}>
                    {item.release_date && (
                      <p className={styles.itemDate}>Release: {new Date(item.release_date).toLocaleDateString()}</p>
                    )}
                    {item.display_order !== null && (
                      <p className={styles.itemOrder}>Order: {item.display_order}</p>
                    )}
                  </div>
                </div>
                <div className={styles.itemActions}>
                  <button
                    onClick={() => handleEdit(item)}
                    className={styles.editButton}
                  >
                    <FiEdit /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className={styles.deleteButton}
                  >
                    <FiTrash /> Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
