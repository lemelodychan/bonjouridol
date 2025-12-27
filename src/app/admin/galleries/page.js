'use client'

import { useState, useEffect } from 'react'
import styles from './page.module.scss'
import Button from '@/app/components/IconButton'
import { IoAddOutline, IoCloseOutline, IoDownloadOutline } from 'react-icons/io5'
import { FiEdit, FiTrash, FiSearch, FiExternalLink } from 'react-icons/fi'
import { format } from 'date-fns'

const GALLERIES_CACHE_KEY = 'admin_galleries_cache'
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

export default function GalleriesPage() {
  const [activeTab, setActiveTab] = useState('published') // 'published' or 'pending'
  const [galleries, setGalleries] = useState([])
  const [pendingMigrations, setPendingMigrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingPending, setLoadingPending] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20
  const [formData, setFormData] = useState({
    title: '',
    uid: '',
    type: 'Gallery',
    artist_name: '',
    event_date: '',
    venue: '',
    is_official_photos: false,
    photographer: '',
    photographer_2: '',
    featured_image: null,
    meta_title: '',
    meta_description: '',
    meta_image: null,
    images: [], // Array of { id, url, filename, dimensions }
  })
  const [authors, setAuthors] = useState([])
  const [availableImages, setAvailableImages] = useState([])
  const [imageSearchSuffix, setImageSearchSuffix] = useState('')
  const [searchingImages, setSearchingImages] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [manualImageId, setManualImageId] = useState('')
  const [manualImageUrl, setManualImageUrl] = useState('') // Reusing for create operation

  useEffect(() => {
    loadGalleries()
    loadAuthors()
    loadPendingMigrations()
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

  // Auto-generate UID from title
  useEffect(() => {
    if (formData.title && !formData.uid) {
      const slug = formData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
      setFormData(prev => ({ ...prev, uid: slug }))
    }
  }, [formData.title])

  async function loadGalleries(forceRefresh = false) {
    try {
      setLoading(true)
      setError('')
      
      const response = await fetch('/api/admin/galleries', {
        cache: 'no-store',
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch galleries')
      }

      const data = await response.json()
      setGalleries(data.galleries || [])
    } catch (error) {
      console.error('Error fetching galleries:', error)
      setError('Failed to load galleries. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function loadAuthors() {
    try {
      const response = await fetch('/api/admin/galleries/authors')
      if (response.ok) {
        const data = await response.json()
        setAuthors(data.authors || [])
      }
    } catch (error) {
      console.error('Error fetching authors:', error)
    }
  }

  async function loadPendingMigrations() {
    try {
      setLoadingPending(true)
      const response = await fetch('/api/admin/galleries/pending')
      if (response.ok) {
        const data = await response.json()
        setPendingMigrations(data.pending || [])
      }
    } catch (error) {
      console.error('Error fetching pending migrations:', error)
    } finally {
      setLoadingPending(false)
    }
  }

  async function removePendingMigration(id) {
    try {
      const response = await fetch(`/api/admin/galleries/pending?id=${id}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        await loadPendingMigrations()
      }
    } catch (error) {
      console.error('Error removing pending migration:', error)
    }
  }

  // Pagination calculations
  const totalPages = Math.ceil(galleries.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedGalleries = galleries.slice(startIndex, endIndex)

  async function searchImagesBySuffix() {
    if (!imageSearchSuffix.trim()) {
      setAvailableImages([])
      return
    }

    setSearchingImages(true)
    try {
      const response = await fetch(
        `/api/admin/galleries/images?suffix=${encodeURIComponent(imageSearchSuffix)}`
      )
      
      if (response.ok) {
        const data = await response.json()
        const images = data.images || []
        setAvailableImages(images)
        
        if (images.length === 0) {
          setError(`No images found matching "${imageSearchSuffix}". Try a different suffix or check if images exist in galleries.`)
        } else {
          setError('') // Clear any previous errors
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        setError(errorData.error || 'Failed to search images')
      }
    } catch (error) {
      console.error('Error searching images:', error)
      setError('Failed to search images')
    } finally {
      setSearchingImages(false)
    }
  }

  function toggleImageSelection(image) {
    setFormData(prev => {
      const isSelected = prev.images.some(img => img.id === image.id)
      if (isSelected) {
        return {
          ...prev,
          images: prev.images.filter(img => img.id !== image.id),
        }
      } else {
        return {
          ...prev,
          images: [...prev.images, image],
        }
      }
    })
  }

  function selectAllImages() {
    setFormData(prev => ({
      ...prev,
      images: [...availableImages],
    }))
  }

  function clearImageSelection() {
    setFormData(prev => ({
      ...prev,
      images: [],
    }))
  }

  async function addManualImage() {
    if (!manualImageId.trim() && !manualImageUrl.trim()) {
      setError('Please provide either an image ID or URL')
      return
    }

    try {
      let imageId = manualImageId.trim()
      let imageUrl = manualImageUrl.trim()

      // If URL provided but no ID, try to extract ID from URL
      if (imageUrl && !imageId) {
        // Prismic URL format: https://images.prismic.io/bonjouridol/{id}_{filename}
        const urlMatch = imageUrl.match(/\/([^\/]+)_([^\/\?]+)/)
        if (urlMatch) {
          imageId = urlMatch[1]
        }
      }

      // If ID provided but no URL, we need the filename too
      // For now, we'll construct a basic URL - user should provide full URL if possible
      if (imageId && !imageUrl) {
        // We can't construct the full URL without filename, so ask user to provide URL
        setError('Please provide the full image URL. Image ID alone is not sufficient.')
        return
      }

      if (!imageId) {
        setError('Could not extract image ID from URL. Please provide the image ID directly.')
        return
      }

      // Check if image already selected
      if (formData.images.some(img => img.id === imageId)) {
        setError('This image is already selected')
        return
      }

      // Extract filename from URL
      const urlMatch = imageUrl.match(/\/([^\/]+)_([^\/\?]+)/)
      const filename = urlMatch ? urlMatch[2] : `image-${imageId}`

      // Try to get image dimensions by loading the image
      let dimensions = null
      try {
        // We can't easily get dimensions client-side without loading the image
        // For now, we'll set it to null and let Prismic handle it
      } catch (fetchError) {
        // Continue anyway
      }

      // Add image to selection
      const newImage = {
        id: imageId,
        url: imageUrl,
        filename: filename,
        dimensions: dimensions,
        alt: null,
      }

      setFormData(prev => ({
        ...prev,
        images: [...prev.images, newImage],
      }))

      // Clear manual entry fields
      setManualImageId('')
      setManualImageUrl('')
      setError('')
    } catch (error) {
      console.error('Error adding manual image:', error)
      setError('Failed to add image: ' + error.message)
    }
  }

  async function handleCreate() {
    if (formData.images.length === 0) {
      setError('Please select at least one image')
      return
    }

    setExporting(true)
    setError('')
    
    try {
      const response = await fetch('/api/admin/galleries/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const responseData = await response.json()

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to create gallery')
      }

      // Show success message with clear instructions
      const prismicUrl = responseData.prismicUrl || `https://${responseData.repositoryName || 'bonjouridol'}.prismic.io/migrations`
      const documentId = responseData.documentId || 'your gallery'
      const releaseTitle = responseData.releaseTitle || 'New Galleries - [date] - [gallery title]'
      
      const successMessage = `✅ Gallery created successfully as a DRAFT!\n\n📋 Document ID: ${documentId}\n📝 Release Title: ${releaseTitle}\n\n📍 Where to find it:\n1. Go to Prismic Dashboard\n2. Click on "Migration Releases" in the left sidebar\n3. Look for the release titled: "${releaseTitle}"\n4. Review and publish it when ready\n\n🔗 Direct link: ${prismicUrl}\n\n⚠️  Note: The gallery will NOT appear in your regular documents list until you publish it from Migration Releases.`
      
      alert(successMessage)
      
      // Store pending migration info
      if (responseData.releaseTitle) {
        try {
          await fetch('/api/admin/galleries/pending', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              title: formData.title,
              uid: formData.uid,
              releaseTitle: responseData.releaseTitle,
              documentId: responseData.documentId,
              repositoryName: responseData.repositoryName,
              createdAt: new Date().toISOString(),
            }),
          })
          await loadPendingMigrations()
        } catch (error) {
          console.error('Error storing pending migration:', error)
        }
      }
      
      // Reset form and close modal
      handleCancel()
      
      // Switch to pending tab to show the new migration
      setActiveTab('pending')
      
      // Reload galleries list (won't show the new one until published, but good to refresh)
      await loadGalleries(true)
    } catch (error) {
      console.error('Error creating gallery:', error)
      setError(error.message || 'Failed to create gallery')
    } finally {
      setExporting(false)
    }
  }

  function handleCancel() {
    setFormData({
      title: '',
      uid: '',
      type: 'Gallery',
      artist_name: '',
      event_date: '',
      venue: '',
      is_official_photos: false,
      photographer: '',
      photographer_2: '',
      featured_image: null,
      meta_title: '',
      meta_description: '',
      meta_image: null,
      images: [],
    })
    setImageSearchSuffix('')
    setAvailableImages([])
    setManualImageId('')
    setManualImageUrl('')
    setShowForm(false)
    setError('')
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading galleries...</div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Gallery Manager</h1>

        {!showForm && (
          <div className={styles.headerActions}>
            <a
              href="https://bonjouridol.prismic.io/builder/migration"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.migrationLink}
            >
              <FiExternalLink />
              <span>Migration Releases</span>
            </a>
            <Button
              onClick={() => setShowForm(true)}
              variant="Pink"
              textValue="Create Gallery"
              icon={<IoAddOutline />}
            />
          </div>
        )}
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {!showForm && (
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'published' ? styles.active : ''}`}
            onClick={() => {
              setActiveTab('published')
              setCurrentPage(1)
            }}
          >
            Published Galleries ({galleries.length})
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'pending' ? styles.active : ''}`}
            onClick={() => {
              setActiveTab('pending')
              setCurrentPage(1)
            }}
          >
            Pending Migrations ({pendingMigrations.length})
          </button>
        </div>
      )}

      {showForm && (
        <div className={styles.modalOverlay} onClick={handleCancel}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h2 className={styles.formTitle}>Create New Gallery</h2>
                <p className={styles.draftNote}>
                  ⚠️ Gallery will be created as a <strong>DRAFT</strong> and must be manually published in Prismic Dashboard
                </p>
              </div>
              <button
                type="button"
                onClick={handleCancel}
                className={styles.closeButton}
                aria-label="Close"
              >
                <IoCloseOutline />
              </button>
            </div>

            <form className={styles.form}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label htmlFor="title">Title <strong>※</strong></label>
                  <input
                    id="title"
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    required
                    placeholder="Gallery Title"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="uid">UID (Slug)</label>
                  <input
                    id="uid"
                    type="text"
                    value={formData.uid}
                    onChange={(e) => setFormData(prev => ({ ...prev, uid: e.target.value }))}
                    placeholder="auto-generated-from-title"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="artist_name">Artist Name</label>
                  <input
                    id="artist_name"
                    type="text"
                    value={formData.artist_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, artist_name: e.target.value }))}
                    placeholder="Artist Name"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="event_date">Event Date</label>
                  <input
                    id="event_date"
                    type="date"
                    value={formData.event_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, event_date: e.target.value }))}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="venue">Venue</label>
                  <input
                    id="venue"
                    type="text"
                    value={formData.venue}
                    onChange={(e) => setFormData(prev => ({ ...prev, venue: e.target.value }))}
                    placeholder="Venue Name"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="photographer">Photographer</label>
                  <select
                    id="photographer"
                    value={formData.photographer}
                    onChange={(e) => setFormData(prev => ({ ...prev, photographer: e.target.value }))}
                  >
                    <option value="">Select photographer...</option>
                    {authors.map(author => (
                      <option key={author.id} value={author.id}>
                        {author.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="photographer_2">Photographer 2</label>
                  <select
                    id="photographer_2"
                    value={formData.photographer_2}
                    onChange={(e) => setFormData(prev => ({ ...prev, photographer_2: e.target.value }))}
                  >
                    <option value="">Select photographer...</option>
                    {authors.map(author => (
                      <option key={author.id} value={author.id}>
                        {author.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.is_official_photos}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_official_photos: e.target.checked }))}
                    />
                    Official Photos
                  </label>
                </div>

                <div className={styles.formGroupFull}>
                  <label htmlFor="meta_title">Meta Title (SEO)</label>
                  <input
                    id="meta_title"
                    type="text"
                    value={formData.meta_title}
                    onChange={(e) => setFormData(prev => ({ ...prev, meta_title: e.target.value }))}
                    placeholder="SEO Title"
                  />
                </div>

                <div className={styles.formGroupFull}>
                  <label htmlFor="meta_description">Meta Description (SEO)</label>
                  <textarea
                    id="meta_description"
                    value={formData.meta_description}
                    onChange={(e) => setFormData(prev => ({ ...prev, meta_description: e.target.value }))}
                    placeholder="SEO Description"
                    rows={3}
                  />
                </div>
              </div>

              {/* Image Selection Section */}
              <div className={styles.imageSelectionSection}>
                <h3 className={styles.sectionTitle}>Select Images</h3>
                <p className={styles.sectionDescription}>
                  Search for images by filename pattern. Enter part of the filename (e.g., "251214-BabyzBreath" will find "251214-BabyzBreath-4430.jpg").
                  <strong> Includes unused images</strong> from your Media Library!
                </p>

                <div className={styles.imageSearch}>
                  <input
                    type="text"
                    value={imageSearchSuffix}
                    onChange={(e) => setImageSearchSuffix(e.target.value)}
                    placeholder="Enter filename pattern (e.g., '251214-BabyzBreath' or 'event-name')"
                    className={styles.searchInput}
                  />
                  <Button
                    onClick={searchImagesBySuffix}
                    disabled={searchingImages || !imageSearchSuffix.trim()}
                    variant="Pink"
                    textValue={searchingImages ? 'Searching...' : 'Search Images'}
                    icon={<FiSearch />}
                  />
                </div>

                {availableImages.length > 0 && (
                  <div className={styles.imageSearchActions}>
                    <button
                      type="button"
                      onClick={selectAllImages}
                      className={styles.selectAllButton}
                    >
                      Select All ({availableImages.length})
                    </button>
                    <button
                      type="button"
                      onClick={clearImageSelection}
                      className={styles.clearButton}
                    >
                      Clear Selection
                    </button>
                  </div>
                )}

                {availableImages.length > 0 && (
                  <div className={styles.imageGrid}>
                    {availableImages.map(image => {
                      const isSelected = formData.images.some(img => img.id === image.id)
                      return (
                        <div
                          key={image.id}
                          className={`${styles.imageItem} ${isSelected ? styles.selected : ''}`}
                          onClick={() => toggleImageSelection(image)}
                        >
                          <img src={image.url} alt={image.filename || image.id} />
                          <div className={styles.imageOverlay}>
                            {isSelected && <span className={styles.checkmark}>✓</span>}
                          </div>
                          <div className={styles.imageInfo}>
                            <span className={styles.imageFilename}>
                              {image.filename || image.id}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {formData.images.length > 0 && (
                  <div className={styles.selectedImagesCount}>
                    {formData.images.length} image{formData.images.length !== 1 ? 's' : ''} selected
                  </div>
                )}

                {/* Manual Image Entry */}
                <div className={styles.manualImageEntry}>
                  <h4 className={styles.manualTitle}>Add Image Manually</h4>
                  <p className={styles.manualDescription}>
                    If an image isn't found by search, you can add it manually using its Prismic image ID or URL.
                    Find the ID in Prismic Media Library by clicking on an image.
                  </p>
                  <div className={styles.manualInputs}>
                    <input
                      type="text"
                      value={manualImageId}
                      onChange={(e) => setManualImageId(e.target.value)}
                      placeholder="Image ID (e.g., aPL9fp5xUNkB2HYB)"
                      className={styles.manualInput}
                    />
                    <span className={styles.orText}>OR</span>
                    <input
                      type="text"
                      value={manualImageUrl}
                      onChange={(e) => setManualImageUrl(e.target.value)}
                      placeholder="Full Image URL"
                      className={styles.manualInput}
                    />
                    <Button
                      onClick={addManualImage}
                      disabled={(!manualImageId.trim() && !manualImageUrl.trim())}
                      variant="Pink"
                      textValue="Add Image"
                      icon={<IoAddOutline />}
                    />
                  </div>
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
                onClick={handleCreate}
                disabled={exporting || formData.images.length === 0}
                variant="Pink"
                textValue={exporting ? 'Creating Draft...' : `Create Draft Gallery (${formData.images.length} images)`}
                icon={<IoAddOutline />}
              />
            </div>
          </div>
        </div>
      )}

      {!showForm && (
        <div className={styles.content}>
          {activeTab === 'published' ? (
            <>
              <div className={styles.galleriesList}>
                {paginatedGalleries.length === 0 ? (
                  <div className={styles.empty}>
                    <p>No galleries found.</p>
                    <p className={styles.emptySubtitle}>Click "Create Gallery" to get started.</p>
                  </div>
                ) : (
                  paginatedGalleries.map((gallery) => (
                    <div key={gallery.id} className={styles.galleryItem}>
                      <div className={styles.galleryContent}>
                        <h3 className={styles.galleryTitle}>{gallery.title}</h3>
                        <div className={styles.galleryMeta}>
                          {gallery.artist_name && (
                            <span className={styles.metaItem}>Artist: {gallery.artist_name}</span>
                          )}
                          {gallery.venue && (
                            <span className={styles.metaItem}>Venue: {gallery.venue}</span>
                          )}
                          {gallery.event_date && (
                            <span className={styles.metaItem}>
                              Date: {format(new Date(gallery.event_date), 'MMM d, yyyy')}
                            </span>
                          )}
                          <span className={styles.metaItem}>{gallery.image_count} images</span>
                        </div>
                        <div className={styles.galleryUID}>
                          UID: <code>{gallery.uid}</code>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {totalPages > 1 && (
                <div className={styles.pagination}>
                  <button
                    className={styles.paginationButton}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>
                  <span className={styles.paginationInfo}>
                    Page {currentPage} of {totalPages} ({galleries.length} total)
                  </span>
                  <button
                    className={styles.paginationButton}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className={styles.galleriesList}>
              {loadingPending ? (
                <div className={styles.empty}>
                  <p>Loading pending migrations...</p>
                </div>
              ) : pendingMigrations.length === 0 ? (
                <div className={styles.empty}>
                  <p>No pending migrations.</p>
                  <p className={styles.emptySubtitle}>Galleries you create will appear here until they're published in Prismic.</p>
                </div>
              ) : (
                pendingMigrations.map((migration) => (
                  <div key={migration.id} className={styles.galleryItem}>
                    <div className={styles.galleryContent}>
                      <h3 className={styles.galleryTitle}>{migration.title}</h3>
                      <div className={styles.galleryMeta}>
                        <span className={styles.metaItem}>
                          Created: {format(new Date(migration.createdAt), 'MMM d, yyyy HH:mm')}
                        </span>
                        <span className={styles.metaItem}>
                          Release: {migration.releaseTitle}
                        </span>
                      </div>
                      <div className={styles.galleryUID}>
                        UID: <code>{migration.uid}</code>
                      </div>
                      <div className={styles.pendingActions}>
                        <a
                          href={`https://${migration.repositoryName || 'bonjouridol'}.prismic.io/builder/migration`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.viewInPrismic}
                        >
                          <FiExternalLink />
                          View in Prismic
                        </a>
                        <button
                          onClick={() => removePendingMigration(migration.id)}
                          className={styles.removePending}
                        >
                          Mark as Published
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

