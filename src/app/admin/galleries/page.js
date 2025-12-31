'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import styles from './page.module.scss'
import Button from '@/app/components/IconButton'
import CustomSelect from '@/app/components/CustomSelect'
import { IoAddOutline, IoCloseOutline, IoDownloadOutline } from 'react-icons/io5'
import { FiEdit, FiTrash2, FiSearch, FiExternalLink, FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import { IoStarOutline, IoStar, IoCheckmark } from 'react-icons/io5'
import { FaCheck } from "react-icons/fa6";
import { FaRegStar, FaStar } from "react-icons/fa6";
import { FaImage } from "react-icons/fa6";

import { format } from 'date-fns'

const GALLERIES_CACHE_KEY = 'admin_galleries_cache'
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

export default function GalleriesPage() {
  const [activeTab, setActiveTab] = useState('pending') // 'pending' or 'published'
  const [formTab, setFormTab] = useState('content') // 'content' or 'seo'
  const [galleries, setGalleries] = useState([])
  const [pendingMigrations, setPendingMigrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingPending, setLoadingPending] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('latest') // 'latest' or 'alphabetical'
  const [editingMigrationId, setEditingMigrationId] = useState(null)
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
    featured_image_id: null, // ID of selected image from gallery
    tags: [], // Array of tag strings
    meta_title: '',
    meta_description: '',
    meta_image: null,
    images: [], // Array of { id, url, filename, dimensions }
  })
  // Fixed list of available tags
  const existingTags = ['Artist', 'Behind the scenes', 'Discovery', 'Gallery', 'Interview', 'Live Report', 'PR']
  const [authors, setAuthors] = useState([])
  const [availableImages, setAvailableImages] = useState([])
  const [imageSearchSuffix, setImageSearchSuffix] = useState('')
  const [searchingImages, setSearchingImages] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [manualImageId, setManualImageId] = useState('')
  const [manualImageUrl, setManualImageUrl] = useState('') // Reusing for create operation
  const [showConfirmClose, setShowConfirmClose] = useState(false)
  
  // Memoize selected and featured image IDs as Sets for O(1) lookup performance
  const selectedImageIds = useMemo(() => new Set(formData.images.map(img => img.id)), [formData.images])
  const featuredImageId = useMemo(() => formData.featured_image_id, [formData.featured_image_id])

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

  function getCachedGalleries() {
    try {
      const cached = localStorage.getItem(GALLERIES_CACHE_KEY)
      if (!cached) return null

      const { data, timestamp } = JSON.parse(cached)
      const now = Date.now()

      // Check if cache is still valid (within 24 hours)
      if (now - timestamp < CACHE_DURATION) {
        return data
      }

      // Cache expired, remove it
      localStorage.removeItem(GALLERIES_CACHE_KEY)
      return null
    } catch (error) {
      console.error('Error reading galleries cache:', error)
      return null
    }
  }

  function setCachedGalleries(data) {
    try {
      const cacheData = {
        data,
        timestamp: Date.now()
      }
      localStorage.setItem(GALLERIES_CACHE_KEY, JSON.stringify(cacheData))
    } catch (error) {
      console.error('Error setting galleries cache:', error)
    }
  }

  function clearGalleriesCache() {
    try {
      localStorage.removeItem(GALLERIES_CACHE_KEY)
    } catch (error) {
      console.error('Error clearing galleries cache:', error)
    }
  }

  async function loadGalleries(forceRefresh = false) {
    // Check cache first if not forcing refresh
    if (!forceRefresh) {
      const cachedGalleries = getCachedGalleries()
      if (cachedGalleries) {
        setGalleries(cachedGalleries)
        setLoading(false)
        // Fetch fresh data in background
        fetchGalleries(true)
        return
      }
    }

    // No cache or force refresh - fetch from API
    await fetchGalleries(false, forceRefresh)
  }

  async function fetchGalleries(silent = false, forceRefresh = false) {
    try {
      if (!silent) {
        setLoading(true)
      }
      setError('')
      
      const response = await fetch('/api/admin/galleries', {
        cache: 'no-store', // Always fetch fresh data from API
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch galleries')
      }

      const data = await response.json()
      setGalleries(data.galleries || [])
      setCachedGalleries(data.galleries || []) // Cache the fresh data
      setError('')
    } catch (error) {
      console.error('Error fetching galleries:', error)
      if (!silent) {
        setError('Failed to load galleries. Please try again.')
      }
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
        const serverMigrations = data.pending || []
        setPendingMigrations(serverMigrations)
      } else {
        setError('Failed to load pending migrations')
      }
    } catch (error) {
      console.error('Error fetching pending migrations:', error)
      setError('Failed to load pending migrations')
    } finally {
      setLoadingPending(false)
    }
  }

  async function removePendingMigration(id) {
    try {
      // Update status to 'published' instead of deleting
      const response = await fetch(`/api/admin/galleries/pending?id=${id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to mark as published')
      }
      
      // Clear cache and reload
      clearGalleriesCache()
      
      // Reload to get fresh data
      await loadPendingMigrations()
      await loadGalleries(true)
    } catch (error) {
      console.error('Error marking migration as published:', error)
      setError(error.message || 'Failed to mark as published')
    }
  }

  async function discardPendingMigration(migration) {
    if (!confirm(`Are you sure you want to discard "${migration.title}"? This will archive it in Prismic and remove it from the pending list.`)) {
      return
    }
    
    try {
      const response = await fetch('/api/admin/galleries/pending/discard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: migration.id,
          uid: migration.uid,
          documentId: migration.documentId,
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to discard gallery')
      }
      
      // Clear cache
      clearGalleriesCache()
      
      // Reload to get fresh data
      await loadPendingMigrations()
      
      alert('Gallery discarded successfully. It has been archived and removed from the pending list.')
    } catch (error) {
      console.error('Error discarding pending migration:', error)
      alert(`Error discarding gallery: ${error.message}`)
    }
  }

  // Filter and sort galleries (only for published tab)
  const filteredAndSortedGalleries = useMemo(() => {
    if (activeTab !== 'published') {
      return galleries
    }
    
    let result = [...galleries]
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      result = result.filter(gallery => 
        gallery.title?.toLowerCase().includes(query) ||
        gallery.uid?.toLowerCase().includes(query) ||
        gallery.artist_name?.toLowerCase().includes(query) ||
        gallery.venue?.toLowerCase().includes(query)
      )
    }
    
    // Sort
    if (sortBy === 'alphabetical') {
      result.sort((a, b) => {
        const titleA = (a.title || '').toLowerCase()
        const titleB = (b.title || '').toLowerCase()
        return titleA.localeCompare(titleB)
      })
    } else if (sortBy === 'latest') {
      // Sort by last_publication_date (most recent first)
      result.sort((a, b) => {
        const dateA = new Date(a.last_publication_date || 0)
        const dateB = new Date(b.last_publication_date || 0)
        return dateB - dateA
      })
    }
    
    return result
  }, [galleries, searchQuery, sortBy, activeTab])
  
  // Reset to page 1 when search, sort, or tab changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, sortBy, activeTab])
  
  // Pagination calculations
  const totalPages = Math.ceil(filteredAndSortedGalleries.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedGalleries = filteredAndSortedGalleries.slice(startIndex, endIndex)

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

  // Helper function to sort images alphabetically by media title (filename)
  // Prismic media title is the filename (e.g., "251229-UUG2_-165" or "251229-UUG2_-165.jpg")
  function sortImagesAlphabetically(images) {
    return [...images].sort((a, b) => {
      // Use filename (media title) as primary sort key, fallback to id if filename is missing
      const filenameA = (a.filename || a.id || '').toLowerCase().trim()
      const filenameB = (b.filename || b.id || '').toLowerCase().trim()
      
      // Use localeCompare for proper alphabetical sorting (handles numbers, special chars)
      return filenameA.localeCompare(filenameB, undefined, { 
        numeric: true,  // Enable numeric sorting (e.g., "2" comes before "10")
        sensitivity: 'base' // Case-insensitive, ignore accents
      })
    })
  }

  function toggleImageSelection(image) {
    setFormData(prev => {
      const isSelected = prev.images.some(img => img.id === image.id)
      if (isSelected) {
        // When removing, maintain alphabetical order
        return {
          ...prev,
          images: sortImagesAlphabetically(prev.images.filter(img => img.id !== image.id)),
        }
      } else {
        // When adding, add to array and sort alphabetically
        return {
          ...prev,
          images: sortImagesAlphabetically([...prev.images, image]),
        }
      }
    })
  }

  function selectAllImages() {
    setFormData(prev => ({
      ...prev,
      images: sortImagesAlphabetically([...availableImages]),
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
        images: sortImagesAlphabetically([...prev.images, newImage]),
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
      // Ensure images are sorted alphabetically before sending to API
      const sortedImages = sortImagesAlphabetically(formData.images)
      
      // If editing, include the documentId so we can try to update the existing document
      const payload = {
        ...formData,
        images: sortedImages, // Use sorted images
        ...(editingMigrationId && pendingMigrations.find(m => m.id === editingMigrationId)?.documentId
          ? { documentId: pendingMigrations.find(m => m.id === editingMigrationId).documentId }
          : {}),
      }
      
      const response = await fetch('/api/admin/galleries/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const responseData = await response.json()

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to create gallery')
      }

      // Show success message with clear instructions
      const prismicUrl = responseData.prismicUrl || `https://${responseData.repositoryName || 'bonjouridol'}.prismic.io/migrations`
      const documentId = responseData.documentId || 'your gallery'
      const releaseTitle = responseData.releaseTitle || 'New Galleries - [date] - [gallery title]'
      const isUpdate = responseData.updated || editingMigrationId
      
      const successMessage = isUpdate
        ? `✅ Gallery updated successfully!\n\n📋 Document ID: ${documentId}\n📝 Release Title: ${releaseTitle}\n\n📍 The updated draft is in Prismic Dashboard > Migration Releases.\n\n🔗 Direct link: ${prismicUrl}\n\n⚠️  Note: You still need to publish the release in Prismic to make it live.`
        : `✅ Gallery created successfully as a DRAFT!\n\n📋 Document ID: ${documentId}\n📝 Release Title: ${releaseTitle}\n\n📍 Where to find it:\n1. Go to Prismic Dashboard\n2. Click on "Migration Releases" in the left sidebar\n3. Look for the release titled: "${releaseTitle}"\n4. Review and publish it when ready\n\n🔗 Direct link: ${prismicUrl}\n\n⚠️  Note: The gallery will NOT appear in your regular documents list until you publish it from Migration Releases.`
      
      alert(successMessage)
      
          // Store pending migration info with full gallery data for editing
          if (responseData.releaseTitle) {
            try {
              // Get the existing migration to preserve the Supabase UUID
              const existingMigration = editingMigrationId 
                ? pendingMigrations.find(m => m.id === editingMigrationId || m.uid === formData.uid)
                : null
              
              const migrationData = {
                // Don't include id - Supabase will generate it on POST or we'll use UID for PUT
                title: formData.title,
                uid: formData.uid,
                releaseTitle: responseData.releaseTitle,
                documentId: responseData.documentId,
                repositoryName: responseData.repositoryName,
                createdAt: existingMigration?.createdAt || new Date().toISOString(),
                galleryData: {
                  ...formData,
                  images: sortedImages, // Store sorted images in gallery data
                },
              }
              
              // Also sync with server (Supabase) - MUST happen for persistence
              // Use PUT if we have a valid Supabase UUID, otherwise use POST (which will upsert by UID)
              const hasValidSupabaseId = existingMigration?.id && 
                existingMigration.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
              
              const method = editingMigrationId && hasValidSupabaseId ? 'PUT' : 'POST'
              const url = method === 'PUT'
                ? `/api/admin/galleries/pending?id=${existingMigration.id}` // Use Supabase UUID (must be valid UUID)
                : '/api/admin/galleries/pending' // POST will upsert by UID
              
              const serverResponse = await fetch(url, {
                method,
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(migrationData),
              })
              
              if (!serverResponse.ok) {
                const errorText = await serverResponse.text()
                console.error('Failed to sync with Supabase:', errorText)
                throw new Error(`Failed to save to Supabase: ${errorText}`)
              }
              
              const serverData = await serverResponse.json()
              
              // Use the server response data (which has the correct Supabase UUID and updated data)
              const finalMigrationData = serverData.migration || {
                ...migrationData,
                id: serverData.migration?.id, // Use Supabase UUID from response
              }
              
              // Update local state with the server response data
              // Always match by UID to prevent duplicates (UID is the stable identifier)
              const existingIndex = pendingMigrations.findIndex(m => m.uid === finalMigrationData.uid)
              
              let updatedMigrations
              if (existingIndex >= 0) {
                // Update existing entry with same UID (whether editing or creating)
                updatedMigrations = [...pendingMigrations]
                updatedMigrations[existingIndex] = finalMigrationData
              } else {
                // Add new entry (only if UID doesn't exist)
                updatedMigrations = [...pendingMigrations, finalMigrationData]
              }
              
              // Clear localStorage to avoid duplicates before saving
              clearGalleriesCache()
              
              setPendingMigrations(updatedMigrations)
            } catch (error) {
              console.error('Error storing pending migration:', error)
            }
          }
      
      // Reset form and close modal without confirmation after successful submission
      confirmCancel()
      
      // Switch to pending tab to show the new migration
      setActiveTab('pending')
      
      // Reload pending migrations to show the new entry
      await loadPendingMigrations()
      
      // Invalidate cache and reload galleries list (won't show the new one until published, but good to refresh)
      clearGalleriesCache()
      await loadGalleries(true)
    } catch (error) {
      console.error('Error creating gallery:', error)
      setError(error.message || 'Failed to create gallery')
    } finally {
      setExporting(false)
    }
  }

  function handleCancel() {
    // Check if form has any data
    const hasData = formData.title || 
                   formData.uid || 
                   formData.artist_name || 
                   formData.event_date || 
                   formData.venue || 
                   formData.photographer || 
                   formData.photographer_2 || 
                   formData.featured_image || 
                   formData.featured_image_id ||
                   formData.tags.length > 0 ||
                   formData.meta_title ||
                   formData.meta_description ||
                   formData.meta_image ||
                   formData.images.length > 0

    if (hasData) {
      setShowConfirmClose(true)
    } else {
      confirmCancel()
    }
  }

  function confirmCancel() {
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
      featured_image_id: null,
      tags: [],
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
    setEditingMigrationId(null)
    setFormTab('content') // Reset to content tab
    setError('')
    setShowConfirmClose(false)
  }

  function handleToggleTag(tag) {
    setFormData(prev => {
      if (prev.tags.includes(tag)) {
        // Remove tag if already selected
        return { ...prev, tags: prev.tags.filter(t => t !== tag) }
      } else {
        // Add tag if not selected
        return { ...prev, tags: [...prev.tags, tag] }
      }
    })
  }


  function handleSetFeaturedImage(imageId, event) {
    // Stop event propagation to prevent toggling selection
    if (event) {
      event.stopPropagation()
    }
    
    // If clicking the same image that's already featured, unset it
    if (formData.featured_image_id === imageId) {
      setFormData(prev => ({
        ...prev,
        featured_image: null,
        featured_image_id: null,
      }))
    } else {
      const image = formData.images.find(img => img.id === imageId)
      if (image) {
        setFormData(prev => ({
          ...prev,
          featured_image: {
            id: image.id,
            url: image.url,
            width: image.dimensions?.width || null,
            height: image.dimensions?.height || null,
          },
          featured_image_id: image.id,
        }))
      }
    }
  }

  function handleEditMigration(migration) {
    // Load the full gallery data from the migration
    if (migration.galleryData) {
      // Restore all form data including tags
      const galleryData = migration.galleryData
      // Sort images alphabetically when loading from existing data
      const sortedImages = galleryData.images ? sortImagesAlphabetically(galleryData.images) : []
      setFormData({
        title: galleryData.title || '',
        uid: galleryData.uid || '',
        type: galleryData.type || 'Gallery',
        artist_name: galleryData.artist_name || '',
        event_date: galleryData.event_date || '',
        venue: galleryData.venue || '',
        is_official_photos: galleryData.is_official_photos || false,
        photographer: galleryData.photographer || '',
        photographer_2: galleryData.photographer_2 || '',
        featured_image: galleryData.featured_image || null,
        featured_image_id: galleryData.featured_image_id || null,
        tags: galleryData.tags || [],
        meta_title: galleryData.meta_title || '',
        meta_description: galleryData.meta_description || '',
        meta_image: galleryData.meta_image || null,
        images: sortedImages,
      })
      setEditingMigrationId(migration.id)
      setShowForm(true)
      // Scroll to top of modal
      window.scrollTo(0, 0)
    } else {
      // If we don't have the full data, show an error
      setError('Cannot edit: Gallery data not available. Please recreate the gallery.')
    }
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
            className={`${styles.tab} ${activeTab === 'pending' ? styles.active : ''}`}
            onClick={() => {
              setActiveTab('pending')
              setCurrentPage(1)
            }}
          >
            Pending Migrations ({pendingMigrations.length})
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'published' ? styles.active : ''}`}
            onClick={() => {
              setActiveTab('published')
              setCurrentPage(1)
            }}
          >
            Published Galleries ({galleries.length})
          </button>
        </div>
      )}

      {showForm && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <div>
                <h2 className={styles.formTitle}>
                  {editingMigrationId ? 'Edit Gallery Draft' : 'Create New Gallery'}
                </h2>
                <p className={styles.draftNote}>
                  ⚠️ This gallery will be created as a pending migration and must be manually released in Prismic Dashboard.
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

            {/* Form Tabs */}
            <div className={styles.formTabs}>
              <button
                type="button"
                className={`${styles.formTab} ${formTab === 'content' ? styles.formTabActive : ''}`}
                onClick={() => setFormTab('content')}
              >
                Gallery Content
              </button>
              <button
                type="button"
                className={`${styles.formTab} ${formTab === 'seo' ? styles.formTabActive : ''}`}
                onClick={() => setFormTab('seo')}
              >
                SEO
              </button>
            </div>

            <form 
              className={styles.form}
              onSubmit={(e) => {
                e.preventDefault()
                handleCreate()
              }}
            >
              {formTab === 'content' && (
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

                <div className={styles.formGroupFull} style={{ gridRow: '2/3' }}>
                  <label htmlFor="tags">
                    <span>Tags <strong>※</strong></span>
                    {formData.tags.length > 0 && (
                        <div className={styles.selectedTagsInfo}>
                        {formData.tags.length} tag{formData.tags.length !== 1 ? 's' : ''} selected
                        </div>
                    )}
                  </label>
                  <div className={styles.tagsPillsContainer}>
                    {existingTags.map((tag) => {
                      const isSelected = formData.tags.includes(tag)
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleToggleTag(tag)}
                          className={`${styles.tagPill} ${isSelected ? styles.tagPillSelected : ''}`}
                          aria-label={isSelected ? `Deselect tag ${tag}` : `Select tag ${tag}`}
                        >
                          {tag}
                          {isSelected && <span className={styles.tagPillCheckmark}>✓</span>}
                        </button>
                      )}
                    )}
                  </div>
                </div>

                <div className={styles.formGroup} style={{ gridRow: '3/4' }}>
                  <label htmlFor="artist_name">Artist Name</label>
                  <input
                    id="artist_name"
                    type="text"
                    value={formData.artist_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, artist_name: e.target.value }))}
                    placeholder="Artist Name"
                  />
                </div>

                <div className={styles.formGroup} style={{ gridRow: '3/4' }}>
                  <label htmlFor="event_date">Event Date</label>
                  <input
                    id="event_date"
                    type="date"
                    value={formData.event_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, event_date: e.target.value }))}
                  />
                </div>

                <div className={styles.formGroup} style={{ gridRow: '3/4' }}>
                  <label htmlFor="venue">Venue</label>
                  <input
                    id="venue"
                    type="text"
                    value={formData.venue}
                    onChange={(e) => setFormData(prev => ({ ...prev, venue: e.target.value }))}
                    placeholder="Venue Name"
                  />
                </div>

                <div className={styles.formGroup} style={{ gridRow: '4/5' }}>
                  <label htmlFor="photographer">Photographer</label>
                  <CustomSelect
                    id="photographer"
                    value={formData.photographer}
                    onChange={(e) => setFormData(prev => ({ ...prev, photographer: e.target.value }))}
                    placeholder="Select photographer..."
                    options={authors.map(author => ({
                      value: author.id,
                      label: author.name
                    }))}
                    disabled={formData.is_official_photos}
                  />
                </div>

                <div className={styles.formGroup} style={{ gridRow: '4/5' }}>
                  <label htmlFor="photographer_2">Photographer 2</label>
                  <CustomSelect
                    id="photographer_2"
                    value={formData.photographer_2}
                    onChange={(e) => setFormData(prev => ({ ...prev, photographer_2: e.target.value }))}
                    placeholder="Select photographer..."
                    options={authors.map(author => ({
                      value: author.id,
                      label: author.name
                    }))}
                    disabled={formData.is_official_photos}
                  />
                </div>

                <div className={styles.formGroup} style={{ gridRow: '4/5', gridColumn: '1/2' }}>
                  <label htmlFor="is_official_photos" className={styles.toggleLabel}>
                    <span className={styles.toggleLabelText}>
                        <span>Official Photos?</span>
                        <p className={styles.toggleHelpText}>
                        Photographer fields are disabled for official photos
                        </p>
                    </span>
                    <div className={styles.toggleSwitch}>
                      <input
                        type="checkbox"
                        id="is_official_photos"
                        checked={formData.is_official_photos}
                        onChange={(e) => {
                          const isOfficial = e.target.checked
                          setFormData(prev => ({ 
                            ...prev, 
                            is_official_photos: isOfficial,
                            // Clear photographer fields when toggled on
                            photographer: isOfficial ? '' : prev.photographer,
                            photographer_2: isOfficial ? '' : prev.photographer_2,
                          }))
                        }}
                        className={styles.toggleInput}
                      />
                      <span className={styles.toggleSlider}></span>
                    </div>
                  </label>
                </div>

              </div>
              )}

              {formTab === 'seo' && (
              <div className={styles.formGrid}>
                <div className={styles.formGroupFull} style={{ gridRow: '1/2', gridColumn: '1/3' }}>
                  <label htmlFor="meta_title">Meta Title (SEO)</label>
                  <input
                    id="meta_title"
                    type="text"
                    value={formData.meta_title}
                    onChange={(e) => setFormData(prev => ({ ...prev, meta_title: e.target.value }))}
                    placeholder="SEO Title (defaults to gallery title if empty)"
                  />
                </div>

                <div className={styles.formGroupFull} style={{ gridRow: '2/3', gridColumn: '1/3' }}>
                  <label htmlFor="meta_description">Meta Description (SEO)</label>
                  <textarea
                    id="meta_description"
                    value={formData.meta_description}
                    onChange={(e) => setFormData(prev => ({ ...prev, meta_description: e.target.value }))}
                    placeholder="SEO Description"
                    rows={4}
                  />
                </div>
              </div>
              )}

              {/* Image Selection Section - Only show in content tab */}
              {formTab === 'content' && (
                <div className={styles.imageSelectionSection}>
                    <div className={styles.imageSelectionSectionHeader}>
                        <h3 className={styles.sectionTitle}>Select Images</h3>
                        <p className={styles.sectionDescription}>
                        Search for images by filename pattern. Enter part of the filename to search the Media Library.
                        </p>
                    </div>

                    <div className={styles.imageSearch}>
                    <input
                        type="text"
                        value={imageSearchSuffix}
                        onChange={(e) => setImageSearchSuffix(e.target.value)}
                        placeholder="Enter filename pattern (e.g., '251214-BabyzBreath')"
                        className={styles.searchInput}
                    />
                    <Button
                        onClick={searchImagesBySuffix}
                        disabled={searchingImages || !imageSearchSuffix.trim()}
                        variant="White"
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
                        {formData.images.length > 0 && (
                        <div className={styles.selectedImagesCount}>
                            {formData.images.length} image{formData.images.length !== 1 ? 's' : ''} selected
                        </div>
                        )}
                    </div>
                    )}

                    {availableImages.length > 0 && (
                    <div className={styles.imageGrid}>
                        {availableImages.map(image => {
                        const isSelected = selectedImageIds.has(image.id)
                        const isFeatured = featuredImageId === image.id
                        return (
                            <div
                            key={image.id}
                            className={`${styles.imageItem} ${isSelected ? styles.selected : ''} ${isFeatured ? styles.featured : ''}`}
                            onClick={() => toggleImageSelection(image)}
                            >
                            <img 
                              src={image.url} 
                              alt={image.filename || image.id} 
                              loading="lazy"
                              decoding="async"
                            />
                            <div className={styles.imageOverlay}>
                                {isSelected && <FaCheck className={styles.checkmark} />}
                            </div>
                            {isSelected && (
                                <button
                                type="button"
                                className={styles.featuredStarButton}
                                onClick={(e) => handleSetFeaturedImage(image.id, e)}
                                aria-label={isFeatured ? 'Remove featured image' : 'Set as featured image'}
                                title={isFeatured ? 'Remove featured image' : 'Set as featured image'}
                                >
                                {isFeatured ? (
                                    <FaStar className={styles.featuredStarIcon} />
                                ) : (
                                    <FaRegStar className={styles.featuredStarIcon} />
                                )}
                                </button>
                            )}
                            <div className={styles.imageInfo}>
                                <span className={styles.imageFilename}>
                                {image.filename || image.id}
                                </span>
                                {isFeatured && (
                                <span className={styles.featuredBadge}>Featured</span>
                                )}
                            </div>
                            </div>
                        )
                        })}
                    </div>
                    )}


                    {/* Manual Image Entry */}
                    {/* <div className={styles.manualImageEntry}>
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
                    </div> */}
                </div>
              )}
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
                textValue={
                  exporting 
                    ? (editingMigrationId ? 'Updating Draft...' : 'Creating Draft...')
                    : editingMigrationId
                      ? `Update Draft Gallery (${formData.images.length})`
                      : `Create Draft Gallery (${formData.images.length})`
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmClose && (
        <div className={styles.modalOverlay}>
          <div className={styles.confirmModal}>
            <h3 className={styles.confirmTitle}>Discard Changes?</h3>
            <p className={styles.confirmMessage}>
              You have unsaved changes. Are you sure you want to close? All your changes will be lost.
            </p>
            <div className={styles.confirmActions}>
              <Button
                onClick={() => setShowConfirmClose(false)}
                variant="Grey"
                textValue="Keep Editing"
              />
              <Button
                onClick={confirmCancel}
                variant="Pink"
                textValue="Discard Changes"
              />
            </div>
          </div>
        </div>
      )}

      {!showForm && (
        <div className={styles.content}>
          {activeTab === 'published' && loading ? (
            <div className={styles.galleriesList}>
              {[...Array(5)].map((_, index) => (
                <div key={`skeleton-${index}`} className={styles.galleryItemSkeleton}>
                  <div className={styles.skeletonImage}></div>
                  <div className={styles.skeletonContent}>
                    <div className={styles.skeletonTitle}></div>
                    <div className={styles.skeletonMeta}>
                      <div className={styles.skeletonMetaItem}></div>
                      <div className={styles.skeletonMetaItem}></div>
                      <div className={styles.skeletonMetaItem}></div>
                    </div>
                    <div className={styles.skeletonUID}></div>
                  </div>
                </div>
              ))}
            </div>
          ) : activeTab === 'published' ? (
            <>
              {/* Search and Sort Controls */}
              <div className={styles.searchAndSortControls}>
                <div className={styles.searchBar}>
                  <FiSearch className={styles.searchIcon} />
                  <input
                    type="text"
                    placeholder="Search by gallery title, UID, artist, or venue..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={styles.searchInput}
                  />
                </div>
                <div className={styles.controlsRight}>
                  <div className={styles.sortControl}>
                    <label htmlFor="sort-select" className={styles.sortLabel}>Sort by:</label>
                    <CustomSelect
                      id="sort-select"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      options={[
                        { value: 'latest', label: 'Latest Updated' },
                        { value: 'alphabetical', label: 'Alphabetical' }
                      ]}
                      className={styles.sortSelect}
                    />
                  </div>
                </div>
              </div>
              
              <div className={styles.galleriesList}>
                {paginatedGalleries.length === 0 ? (
                  <div className={styles.empty}>
                    <p>{searchQuery ? 'No galleries found matching your search.' : 'No galleries found.'}</p>
                    <p className={styles.emptySubtitle}>
                      {searchQuery ? 'Try a different search term.' : 'Click "Create Gallery" to get started.'}
                    </p>
                  </div>
                ) : (
                  paginatedGalleries.map((gallery) => {
                    const featuredImageUrl = gallery.featured_image?.url || null
                    
                    return (
                    <div key={gallery.id} className={styles.galleryItem}>
                      {featuredImageUrl ? (
                        <div className={styles.featuredImageContainer}>
                          <img 
                            src={featuredImageUrl} 
                            alt={gallery.title}
                            className={styles.featuredImage}
                          />
                        </div>
                      ) : (
                        <div className={styles.featuredImagePlaceholder}>
                          <FaImage className={styles.placeholderIcon} />
                        </div>
                      )}
                      <div className={styles.galleryContent}>
                        <div className={styles.galleryHeader}>
                          <div className={styles.galleryHeaderContent}>
                            <h3 className={styles.galleryTitle}>{gallery.title}</h3>
                          </div>
                        </div>
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
                    )
                  })
                )}
              </div>
              {totalPages > 1 && (
                <div className={styles.pagination}>
                  <button
                    className={styles.paginationButton}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    <FiChevronLeft />
                    Previous
                  </button>
                  <span className={styles.paginationInfo}>
                    Page {currentPage} of {totalPages} ({filteredAndSortedGalleries.length} total{searchQuery ? ` matching "${searchQuery}"` : ''})
                  </span>
                  <button
                    className={styles.paginationButton}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <FiChevronRight />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className={styles.galleriesList}>
              {loadingPending ? (
                <>
                  {[...Array(3)].map((_, index) => (
                    <div key={`skeleton-pending-${index}`} className={styles.galleryItemSkeleton}>
                      <div className={styles.skeletonImage}></div>
                      <div className={styles.skeletonContent}>
                        <div className={styles.skeletonTitle}></div>
                        <div className={styles.skeletonMeta}>
                          <div className={styles.skeletonMetaItem}></div>
                          <div className={styles.skeletonMetaItem}></div>
                        </div>
                        <div className={styles.skeletonUID}></div>
                      </div>
                    </div>
                  ))}
                </>
              ) : pendingMigrations.length === 0 ? (
                <div className={styles.empty}>
                  <p>No pending migrations.</p>
                  <p className={styles.emptySubtitle}>Galleries you create will appear here until they're published in Prismic.</p>
                </div>
              ) : (
                pendingMigrations.map((migration) => {
                  const featuredImage = migration.galleryData?.featured_image
                  const featuredImageUrl = featuredImage?.url || null
                  
                  return (
                  <div key={migration.id} className={styles.galleryItem}>
                    {featuredImageUrl ? (
                        <div className={styles.featuredImageContainer}>
                        <img 
                            src={featuredImageUrl} 
                            alt={migration.title}
                            className={styles.featuredImage}
                        />
                        </div>
                    ) : (
                        <div className={styles.featuredImagePlaceholder}>
                        <FaImage className={styles.placeholderIcon} />
                        </div>
                    )}
                    <div className={styles.galleryContent}>
                      <div className={styles.galleryHeader}>
                        <div className={styles.galleryHeaderContent}>
                          <h3 className={styles.galleryTitle}>{migration.title}</h3>
                        </div>
                      </div>
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
                    </div>
                    <div className={styles.pendingActions}>
                        <span className={styles.pendingActionsLeft}>
                            <button
                            onClick={() => handleEditMigration(migration)}
                            className={styles.editPending}
                            >
                            <FiEdit />
                            Edit
                            </button>
                            <a
                            href={`https://${migration.repositoryName || 'bonjouridol'}.prismic.io/builder/migration`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.viewInPrismic}
                            >
                            <FiExternalLink />
                            View in Prismic
                            </a>
                        </span>
                        <span className={styles.pendingActionsRight}>
                          <button
                            onClick={() => discardPendingMigration(migration)}
                            className={styles.discardPending}
                            title="Discard and archive this gallery"
                          >
                            <FiTrash2 />
                            Discard
                          </button>
                          <button
                            onClick={() => removePendingMigration(migration.id)}
                            className={styles.removePending}
                          >
                            <FaCheck />
                            Mark as Published
                          </button>
                        </span>
                      </div>
                  </div>
                  )
                })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

