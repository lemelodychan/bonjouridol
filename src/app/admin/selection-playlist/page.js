'use client'

import { useState, useEffect } from 'react'
import styles from './page.module.scss'
import Button from '@/app/components/IconButton'
import { IoAddOutline, IoCloseOutline } from 'react-icons/io5'
import { FiEdit, FiTrash } from 'react-icons/fi'

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

  useEffect(() => {
    loadPlaylist()
  }, [])

  useEffect(() => {
    if (showForm) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showForm])

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
    } catch (error) {
      console.error('Error uploading cover:', error)
      alert(`Failed to upload cover image: ${error.message || 'Unknown error'}`)
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    
    try {
      setError('')
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
    setFormData({
      title_en: item.title_en || '',
      title_ja: item.title_ja || '',
      artist_en: item.artist_en || '',
      artist_ja: item.artist_ja || '',
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
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading playlist...</div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Selection Playlist</h1>

        {!showForm && (
          <Button
            onClick={() => setShowForm(true)}
            variant="Pink"
            textValue="Add Song"
            icon={<IoAddOutline />}
          />
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
                  <input
                    required
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
                type="submit"
                variant="Pink"
                textValue={editingId ? 'Update Song' : 'Add Song'}
              />
            </div>
          </div>
        </div>
      )}

      <div className={styles.content}>
        <div className={styles.playlist}>
          {playlist.length === 0 ? (
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
                    {item.artist_ja ? (
                      <>
                        {item.artist_en} <span className={styles.japanese}>({item.artist_ja})</span>
                      </>
                    ) : (
                      item.artist_en
                    )}
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
