'use client'

import { useState, useEffect, useMemo } from 'react'
import styles from './page.module.scss'
import Button from '@/app/components/IconButton'
import CustomSelect from '@/app/components/CustomSelect'
import SimpleRichTextEditor from '@/app/components/SimpleRichTextEditor'
import CoverFinder from '@/app/components/CoverFinder'
import { IoAddOutline, IoCloseOutline, IoPersonOutline } from 'react-icons/io5'
import { FiEdit, FiTrash2, FiExternalLink, FiChevronLeft, FiChevronRight, FiImage, FiX, FiUpload, FiSearch, FiCheck } from 'react-icons/fi'
import { FaCheck } from "react-icons/fa6"
import { format } from 'date-fns'

const ARTISTS_CACHE_KEY = 'admin_artists_cache'
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

export default function ArtistProfilesPage() {
  const [activeTab, setActiveTab] = useState('pending') // 'pending' or 'published'
  const [formTab, setFormTab] = useState('basic') // 'basic', 'songs', or 'social'
  const [artists, setArtists] = useState([])
  const [pendingMigrations, setPendingMigrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingPending, setLoadingPending] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20
  const [editingMigrationId, setEditingMigrationId] = useState(null)
  const [isEditingPublished, setIsEditingPublished] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('latest') // 'latest' or 'alphabetical'
  const [formData, setFormData] = useState({
    name_en: '',
    name_jp: '',
    uid: '',
    profile_picture: null,
    debut: '',
    disband: '',
    description: [],
    youtube_video: '',
    song_list: [],
    website: { link_type: 'Web', url: '' },
    twitter: { link_type: 'Web', url: '' },
    instagram: { link_type: 'Web', url: '' },
    youtube: { link_type: 'Web', url: '' },
    tiktok: { link_type: 'Web', url: '' },
  })
  const [exporting, setExporting] = useState(false)
  const [uploadingCover, setUploadingCover] = useState({}) // Track upload state per song index
  const [uploadingProfilePicture, setUploadingProfilePicture] = useState(false)
  const [showCoverFinder, setShowCoverFinder] = useState(null) // Stores song index or null
  const [songExistsStatus, setSongExistsStatus] = useState({}) // Track which songs exist in playlist {index: true/false}
  const [songsToImport, setSongsToImport] = useState(new Set()) // Track which songs are marked for import

  useEffect(() => {
    loadArtists()
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

  // Auto-generate UID from name_en
  useEffect(() => {
    if (formData.name_en && !formData.uid && !editingMigrationId && !isEditingPublished) {
      const slug = formData.name_en
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
      setFormData(prev => ({ ...prev, uid: slug }))
    }
  }, [formData.name_en, editingMigrationId, isEditingPublished])

  // Check song existence when artist name or song list changes
  useEffect(() => {
    if (formData.name_en && formData.song_list.length > 0 && showForm) {
      checkSongExistence(formData.song_list, formData.name_en)
    }
  }, [formData.name_en, formData.song_list.length, showForm])

  function getCachedArtists() {
    try {
      const cached = localStorage.getItem(ARTISTS_CACHE_KEY)
      if (!cached) return null

      const { data, timestamp } = JSON.parse(cached)
      const now = Date.now()

      if (now - timestamp < CACHE_DURATION) {
        return data
      }

      localStorage.removeItem(ARTISTS_CACHE_KEY)
      return null
    } catch (error) {
      console.error('Error reading artists cache:', error)
      return null
    }
  }

  function setCachedArtists(data) {
    try {
      const cacheData = {
        data,
        timestamp: Date.now()
      }
      localStorage.setItem(ARTISTS_CACHE_KEY, JSON.stringify(cacheData))
    } catch (error) {
      console.error('Error setting artists cache:', error)
    }
  }

  function clearArtistsCache() {
    try {
      localStorage.removeItem(ARTISTS_CACHE_KEY)
    } catch (error) {
      console.error('Error clearing artists cache:', error)
    }
  }

  async function loadArtists(forceRefresh = false) {
    if (!forceRefresh) {
      const cachedArtists = getCachedArtists()
      if (cachedArtists) {
        setArtists(cachedArtists)
        setLoading(false)
        fetchArtists(true)
        return
      }
    }

    await fetchArtists(false, forceRefresh)
  }

  async function fetchArtists(silent = false, forceRefresh = false) {
    try {
      if (!silent) {
        setLoading(true)
      }
      setError('')
      
      const response = await fetch('/api/admin/artists', {
        cache: 'no-store',
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch artists')
      }

      const data = await response.json()
      setArtists(data.artists || [])
      setCachedArtists(data.artists || [])
      setError('')
    } catch (error) {
      console.error('Error fetching artists:', error)
      if (!silent) {
        setError('Failed to load artists. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function loadPendingMigrations() {
    try {
      setLoadingPending(true)
      
      const response = await fetch('/api/admin/artists/pending')
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
      const response = await fetch(`/api/admin/artists/pending?id=${id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to mark as published')
      }
      
      // Clear cache and reload
      clearArtistsCache()
      
      // Update local state - filter out the published migration
      const updatedMigrations = pendingMigrations.filter(m => m.id !== id)
      setPendingMigrations(updatedMigrations)
      
      // Reload to get fresh data
      await loadPendingMigrations()
      await loadArtists(true)
    } catch (error) {
      console.error('Error marking migration as published:', error)
      setError(error.message || 'Failed to mark as published')
    }
  }

  async function discardPendingMigration(migration) {
    if (!confirm(`Are you sure you want to discard "${migration.name_en}"? This will archive it in Prismic and remove it from the pending list.`)) {
      return
    }
    
    try {
      const response = await fetch('/api/admin/artists/pending/discard', {
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
        throw new Error(errorData.message || 'Failed to discard artist')
      }
      
      // Clear cache
      clearArtistsCache()
      
      // Update local state - filter out the cancelled migration
      const updatedMigrations = pendingMigrations.filter(m => m.id !== migration.id)
      setPendingMigrations(updatedMigrations)
      
      // Reload to get fresh data
      await loadPendingMigrations()
      
      alert('Artist discarded successfully. It has been archived and removed from the pending list.')
    } catch (error) {
      console.error('Error discarding pending migration:', error)
      alert(`Error discarding artist: ${error.message}`)
    }
  }

  // Filter and sort artists
  const filteredAndSortedArtists = useMemo(() => {
    let result = [...artists]
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      result = result.filter(artist => 
        artist.name_en?.toLowerCase().includes(query) ||
        artist.name_jp?.toLowerCase().includes(query) ||
        artist.uid?.toLowerCase().includes(query)
      )
    }
    
    // Sort
    if (sortBy === 'alphabetical') {
      result.sort((a, b) => {
        const nameA = (a.name_en || '').toLowerCase()
        const nameB = (b.name_en || '').toLowerCase()
        return nameA.localeCompare(nameB)
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
  }, [artists, searchQuery, sortBy])
  
  // Reset to page 1 when search or sort changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, sortBy])
  
  // Pagination calculations
  const totalPages = Math.ceil(filteredAndSortedArtists.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedArtists = filteredAndSortedArtists.slice(startIndex, endIndex)

  async function handleCreate() {
    if (!formData.name_en || !formData.name_en.trim()) {
      setError('Artist name (EN) is required')
      return
    }

    setExporting(true)
    setError('')
    
    try {
      const payload = {
        ...formData,
        ...(editingMigrationId && pendingMigrations.find(m => m.id === editingMigrationId)?.documentId
          ? { documentId: pendingMigrations.find(m => m.id === editingMigrationId).documentId }
          : {}),
      }
      
      const response = await fetch('/api/admin/artists/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const responseData = await response.json()

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to create artist')
      }

      const prismicUrl = responseData.prismicUrl || `https://${responseData.repositoryName || 'bonjouridol'}.prismic.io/migrations`
      const documentId = responseData.documentId || 'your artist'
      const releaseTitle = responseData.releaseTitle || 'New Artists - [date] - [artist name]'
      const isUpdate = responseData.updated || editingMigrationId
      
      const successMessage = isUpdate
        ? `✅ Artist updated successfully and synced with Supabase!\n\n📋 Document ID: ${documentId}\n📝 Release Title: ${releaseTitle}\n\n📍 The updated draft is in Prismic Dashboard > Migration Releases.\n\n🔗 Direct link: ${prismicUrl}\n\n⚠️  Note: You still need to publish the release in Prismic to make it live.`
        : `✅ Artist created successfully as a DRAFT and synced with Supabase!\n\n📋 Document ID: ${documentId}\n📝 Release Title: ${releaseTitle}\n\n📍 Where to find it:\n1. Go to Prismic Dashboard\n2. Click on "Migration Releases" in the left sidebar\n3. Look for the release titled: "${releaseTitle}"\n4. Review and publish it when ready\n\n🔗 Direct link: ${prismicUrl}\n\n⚠️  Note: The artist will NOT appear in your regular documents list until you publish it from Migration Releases.`
      
      alert(successMessage)
      
      if (responseData.releaseTitle) {
        try {
          const existingMigration = editingMigrationId 
            ? pendingMigrations.find(m => m.id === editingMigrationId || m.uid === formData.uid)
            : null
          
          const migrationData = {
            name_en: formData.name_en,
            uid: formData.uid,
            releaseTitle: responseData.releaseTitle,
            documentId: responseData.documentId,
            repositoryName: responseData.repositoryName,
            createdAt: existingMigration?.createdAt || new Date().toISOString(),
            artistData: formData,
          }
          
          const hasValidSupabaseId = existingMigration?.id && 
            existingMigration.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
          
          const method = editingMigrationId && hasValidSupabaseId ? 'PUT' : 'POST'
          const url = method === 'PUT'
            ? `/api/admin/artists/pending?id=${existingMigration.id}`
            : '/api/admin/artists/pending'
          
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
          
          const finalMigrationData = serverData.migration || {
            ...migrationData,
            id: serverData.migration?.id,
          }
          
          const existingIndex = pendingMigrations.findIndex(m => m.uid === finalMigrationData.uid)
          
          let updatedMigrations
          if (existingIndex >= 0) {
            updatedMigrations = [...pendingMigrations]
            updatedMigrations[existingIndex] = finalMigrationData
          } else {
            updatedMigrations = [...pendingMigrations, finalMigrationData]
          }
          
          clearArtistsCache()
          
          setPendingMigrations(updatedMigrations)
        } catch (error) {
          console.error('Error storing pending migration:', error)
        }
      }
      
      // Import marked songs before closing
      if (songsToImport.size > 0) {
        await importMarkedSongs()
      }
      
      handleCancel()
      setActiveTab('pending')
      clearArtistsCache()
      await loadArtists(true)
    } catch (error) {
      console.error('Error creating artist:', error)
      setError(error.message || 'Failed to create artist')
    } finally {
      setExporting(false)
    }
  }

  function handleCancel() {
    setFormData({
      name_en: '',
      name_jp: '',
      uid: '',
      profile_picture: null,
      debut: '',
      disband: '',
      description: [],
      youtube_video: '',
      song_list: [],
      website: { link_type: 'Web', url: '' },
      twitter: { link_type: 'Web', url: '' },
      instagram: { link_type: 'Web', url: '' },
      youtube: { link_type: 'Web', url: '' },
      tiktok: { link_type: 'Web', url: '' },
    })
    setShowForm(false)
    setEditingMigrationId(null)
    setIsEditingPublished(false)
    setFormTab('basic')
    setError('')
    setSongExistsStatus({})
    setSongsToImport(new Set())
  }

  async function checkSongExistence(songs, artistName) {
    if (!songs || songs.length === 0 || !artistName) {
      setSongExistsStatus({})
      return
    }

    try {
      const response = await fetch('/api/admin/artists/check-songs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          songs: songs,
          artistName: artistName,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const statusMap = {}
        data.songStatus.forEach(({ index, exists }) => {
          statusMap[index] = exists
        })
        setSongExistsStatus(statusMap)
      }
    } catch (error) {
      console.error('Error checking song existence:', error)
    }
  }

  function handleEditMigration(migration) {
    if (migration.artistData) {
      const artistData = migration.artistData
      setFormData({
        name_en: artistData.name_en || '',
        name_jp: artistData.name_jp || '',
        uid: artistData.uid || '',
        profile_picture: artistData.profile_picture || null,
        debut: artistData.debut || '',
        disband: artistData.disband || '',
        description: artistData.description || [],
        youtube_video: artistData.youtube_video || '',
        song_list: artistData.song_list || [],
        website: artistData.website || { link_type: 'Web', url: '' },
        twitter: artistData.twitter || { link_type: 'Web', url: '' },
        instagram: artistData.instagram || { link_type: 'Web', url: '' },
        youtube: artistData.youtube || { link_type: 'Web', url: '' },
        tiktok: artistData.tiktok || { link_type: 'Web', url: '' },
      })
      setEditingMigrationId(migration.id)
      setIsEditingPublished(false)
      setShowForm(true)
      
      // Check song existence
      if (artistData.song_list && artistData.song_list.length > 0 && artistData.name_en) {
        checkSongExistence(artistData.song_list, artistData.name_en)
      }
      
      window.scrollTo(0, 0)
    } else {
      setError('Cannot edit: Artist data not available. Please recreate the artist.')
    }
  }

  function handleEditPublished(artist) {
    setFormData({
      name_en: artist.name_en || '',
      name_jp: artist.name_jp || '',
      uid: artist.uid || '',
      profile_picture: artist.profile_picture || null,
      debut: artist.debut || '',
      disband: artist.disband || '',
      description: artist.description || [],
      youtube_video: artist.youtube_video || '',
      song_list: artist.song_list || [],
      website: artist.website || { link_type: 'Web', url: '' },
      twitter: artist.twitter || { link_type: 'Web', url: '' },
      instagram: artist.instagram || { link_type: 'Web', url: '' },
      youtube: artist.youtube || { link_type: 'Web', url: '' },
      tiktok: artist.tiktok || { link_type: 'Web', url: '' },
    })
    setIsEditingPublished(true)
    setEditingMigrationId(null)
    setShowForm(true)
    
    // Check song existence
    if (artist.song_list && artist.song_list.length > 0 && artist.name_en) {
      checkSongExistence(artist.song_list, artist.name_en)
    }
    
    window.scrollTo(0, 0)
  }

  function handleAddSong() {
    const newIndex = formData.song_list.length
    setFormData(prev => ({
      ...prev,
      song_list: [
        ...prev.song_list,
        {
          song_title_en: '',
          song_title_ja: '',
          song_link: { link_type: 'Web', url: '' },
          song_cover: {},
        }
      ]
    }))
    // New songs don't exist by default
    setSongExistsStatus(prev => ({ ...prev, [newIndex]: false }))
  }

  function handleToggleImport(index) {
    setSongsToImport(prev => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }

  async function importMarkedSongs() {
    if (songsToImport.size === 0) return

    const songsToImportArray = Array.from(songsToImport)
      .map(index => {
        const song = formData.song_list[index]
        if (!song.song_title_en || !song.song_link?.url) return null
        
        return {
          title_en: song.song_title_en,
          title_ja: song.song_title_ja || '',
          artist_en: formData.name_en,
          artist_ja: formData.name_jp || '',
          link: song.song_link.url,
          cover_url: song.song_cover?.url || '',
          artist_uid: formData.uid,
        }
      })
      .filter(song => song !== null)

    if (songsToImportArray.length === 0) return

    try {
      const response = await fetch('/api/admin/selection-playlist/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ songs: songsToImportArray }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to import songs')
      }

      const data = await response.json()
      console.log(`Successfully imported ${data.imported} song(s) to playlist`)
      
      // Clear import marks and refresh song status
      setSongsToImport(new Set())
      if (formData.song_list.length > 0 && formData.name_en) {
        await checkSongExistence(formData.song_list, formData.name_en)
      }
    } catch (error) {
      console.error('Error importing songs:', error)
      setError(error.message || 'Failed to import songs to playlist')
    }
  }

  function handleRemoveSong(index) {
    setFormData(prev => ({
      ...prev,
      song_list: prev.song_list.filter((_, i) => i !== index)
    }))
    
    // Update status maps
    const newStatus = { ...songExistsStatus }
    delete newStatus[index]
    // Re-index remaining songs
    const reindexedStatus = {}
    Object.keys(newStatus).forEach(key => {
      const oldIndex = parseInt(key)
      if (oldIndex > index) {
        reindexedStatus[oldIndex - 1] = newStatus[key]
      } else if (oldIndex < index) {
        reindexedStatus[oldIndex] = newStatus[key]
      }
    })
    setSongExistsStatus(reindexedStatus)
    
    const newImportSet = new Set()
    songsToImport.forEach(i => {
      if (i < index) {
        newImportSet.add(i)
      } else if (i > index) {
        newImportSet.add(i - 1)
      }
    })
    setSongsToImport(newImportSet)
  }

  function handleSongChange(index, field, value) {
    setFormData(prev => ({
      ...prev,
      song_list: prev.song_list.map((song, i) => 
        i === index ? { ...song, [field]: value } : song
      )
    }))
    
    // Re-check song existence when title or link changes
    if ((field === 'song_title_en' || field === 'song_link') && formData.name_en) {
      const updatedSongs = formData.song_list.map((song, i) => 
        i === index ? { ...song, [field]: value } : song
      )
      checkSongExistence(updatedSongs, formData.name_en)
    }
  }

  function handleSongCoverChange(index, url) {
    if (!url.trim()) {
      // Clear cover if empty
      handleSongChange(index, 'song_cover', {})
      return
    }

    // Try to extract image ID and create proper image object
    let imageId = ''
    let imageUrl = url.trim()
    
    // Check if it's a Prismic URL
    const prismicMatch = imageUrl.match(/\/([^\/]+)_([^\/\?]+)/)
    if (prismicMatch) {
      imageId = prismicMatch[1]
    }

    // Create image object
    const imageObj = {
      id: imageId,
      url: imageUrl,
      alt: null,
    }

    handleSongChange(index, 'song_cover', imageObj)
  }

  function clearSongCover(index) {
    handleSongChange(index, 'song_cover', {})
  }

  function handleCoverFinderOpen(index) {
    setShowCoverFinder(index)
  }

  function handleCoverFinderClose() {
    setShowCoverFinder(null)
  }

  function handleCoverSelected(index, coverData) {
    handleSongChange(index, 'song_cover', coverData)
    setShowCoverFinder(null)
  }

  async function handleSongCoverUpload(index, file) {
    if (!file) return

    // Validate file
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      setError('Invalid file type. Only JPEG, PNG, GIF, and WebP are supported.')
      return
    }

    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      setError('File too large. Maximum size is 10MB.')
      return
    }

    setUploadingCover(prev => ({ ...prev, [index]: true }))
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('alt', `Cover for ${formData.song_title_en || 'song'}`)

      const response = await fetch('/api/admin/artists/upload-image', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload image')
      }

      // Set the uploaded image
      handleSongChange(index, 'song_cover', {
        id: data.image.id,
        url: data.image.url,
        alt: data.image.alt,
        width: data.image.dimensions?.width,
        height: data.image.dimensions?.height,
      })

      setError('')
    } catch (error) {
      console.error('Error uploading cover:', error)
      setError(error.message || 'Failed to upload cover image')
    } finally {
      setUploadingCover(prev => ({ ...prev, [index]: false }))
    }
  }

  async function handleProfilePictureUpload(file) {
    if (!file) return

    // Validate file
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      setError('Invalid file type. Only JPEG, PNG, GIF, and WebP are supported.')
      return
    }

    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      setError('File too large. Maximum size is 10MB.')
      return
    }

    setUploadingProfilePicture(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('alt', `Profile picture for ${formData.name_en || 'artist'}`)

      const response = await fetch('/api/admin/artists/upload-image', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload image')
      }

      // Set the uploaded image
      setFormData(prev => ({
        ...prev,
        profile_picture: {
          id: data.image.id,
          url: data.image.url,
          alt: data.image.alt,
          dimensions: {
            width: data.image.dimensions?.width,
            height: data.image.dimensions?.height,
          }
        }
      }))

      setError('')
    } catch (error) {
      console.error('Error uploading profile picture:', error)
      setError(error.message || 'Failed to upload profile picture')
    } finally {
      setUploadingProfilePicture(false)
    }
  }

  function clearProfilePicture() {
    setFormData(prev => ({ ...prev, profile_picture: null }))
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Artist Profiles</h1>

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
              textValue="Create Artist"
              icon={<IoAddOutline />}
            />
          </div>
        )}
      </div>

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
            Published Artists ({artists.length})
          </button>
        </div>
      )}

      {showForm && (
        <div className={styles.modalOverlay} onClick={handleCancel}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h2 className={styles.formTitle}>
                  {isEditingPublished 
                    ? 'Edit Published Artist' 
                    : editingMigrationId 
                      ? 'Edit Artist Draft' 
                      : 'Create New Artist'}
                </h2>
                <p className={styles.draftNote}>
                  {isEditingPublished
                    ? '⚠️ Changes will be queued as a migration and must be manually released in Prismic Dashboard.'
                    : '⚠️ This artist will be created as a pending migration and must be manually released in Prismic Dashboard.'}
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
                className={`${styles.formTab} ${formTab === 'basic' ? styles.formTabActive : ''}`}
                onClick={() => setFormTab('basic')}
              >
                Basic Info
              </button>
              <button
                type="button"
                className={`${styles.formTab} ${formTab === 'songs' ? styles.formTabActive : ''}`}
                onClick={() => setFormTab('songs')}
              >
                Songs ({formData.song_list.length})
              </button>
              <button
                type="button"
                className={`${styles.formTab} ${formTab === 'social' ? styles.formTabActive : ''}`}
                onClick={() => setFormTab('social')}
              >
                Social Links
              </button>
            </div>

            <form className={styles.form}>
              {formTab === 'basic' && (
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label htmlFor="name_en">Name (EN) <strong>※</strong></label>
                    <input
                      id="name_en"
                      type="text"
                      value={formData.name_en}
                      onChange={(e) => setFormData(prev => ({ ...prev, name_en: e.target.value }))}
                      required
                      placeholder="Artist Name (English)"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="name_jp">Name (JP)</label>
                    <input
                      id="name_jp"
                      type="text"
                      value={formData.name_jp}
                      onChange={(e) => setFormData(prev => ({ ...prev, name_jp: e.target.value }))}
                      placeholder="アーティスト名 (日本語)"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="uid">UID (Slug)</label>
                    <input
                      id="uid"
                      type="text"
                      value={formData.uid}
                      onChange={(e) => setFormData(prev => ({ ...prev, uid: e.target.value }))}
                      placeholder="auto-generated-from-name"
                      disabled={isEditingPublished}
                    />
                    {isEditingPublished && (
                      <p className={styles.fieldNote}>UID cannot be changed for published artists</p>
                    )}
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="debut">Debut</label>
                    <input
                      id="debut"
                      type="text"
                      value={formData.debut}
                      onChange={(e) => setFormData(prev => ({ ...prev, debut: e.target.value }))}
                      placeholder="e.g., 2020"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="disband">Disband</label>
                    <input
                      id="disband"
                      type="text"
                      value={formData.disband}
                      onChange={(e) => setFormData(prev => ({ ...prev, disband: e.target.value }))}
                      placeholder="e.g., 2023 (leave empty if active)"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="youtube_video">YouTube Video ID</label>
                    <input
                      id="youtube_video"
                      type="text"
                      value={formData.youtube_video}
                      onChange={(e) => setFormData(prev => ({ ...prev, youtube_video: e.target.value }))}
                      placeholder="e.g., dQw4w9WgXcQ"
                    />
                  </div>

                  <div className={styles.formGroupFull}>
                    <label>Profile Picture</label>
                    <div className={styles.profilePictureSection}>
                      {formData.profile_picture?.url ? (
                        <div className={styles.profilePicturePreview}>
                          <img 
                            src={formData.profile_picture.url} 
                            alt={formData.name_en || 'Artist'}
                            className={styles.profilePictureImage}
                          />
                          <button
                            type="button"
                            onClick={clearProfilePicture}
                            className={styles.clearProfilePictureButton}
                            title="Remove profile picture"
                          >
                            <FiX />
                          </button>
                        </div>
                      ) : uploadingProfilePicture ? (
                        <div className={styles.profilePicturePlaceholder}>
                          <div className={styles.uploadingSpinner}></div>
                          <p>Uploading...</p>
                        </div>
                      ) : (
                        <div className={styles.profilePicturePlaceholder}>
                          <IoPersonOutline />
                          <p>No profile picture</p>
                        </div>
                      )}
                      <input
                        type="file"
                        id="profile-picture-upload"
                        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            handleProfilePictureUpload(file)
                          }
                        }}
                        style={{ display: 'none' }}
                      />
                      <label
                        htmlFor="profile-picture-upload"
                        className={styles.uploadProfileButton}
                      >
                        <FiUpload />
                        {formData.profile_picture?.url ? 'Change Picture' : 'Upload Picture'}
                      </label>
                      <p className={styles.profilePictureHelp}>
                        Recommended: Square image, at least 400x400px (max 10MB)
                      </p>
                    </div>
                  </div>

                  <div className={styles.formGroupFull}>
                    <label htmlFor="description">Description</label>
                    <SimpleRichTextEditor
                      value={formData.description}
                      onChange={(value) => setFormData(prev => ({ ...prev, description: value }))}
                      placeholder="Enter artist description... Use the toolbar to format text with bold and links."
                    />
                    <p className={styles.fieldNote}>Supports bold text, inline links, and paragraphs. Press Enter for new paragraph.</p>
                  </div>
                </div>
              )}

              {formTab === 'songs' && (
                <div className={styles.songsSection}>

                  {formData.song_list.length === 0 ? (
                    <div className={styles.emptyState}>
                      <p>No songs added yet. Click "Add Song" to get started.
                          <Button
                            onClick={handleAddSong}
                            variant="Pink"
                            textValue="Add Song"
                            icon={<IoAddOutline />}
                          />
                      </p>
                    </div>
                  ) : (
                    <div className={styles.songsList}>
                      {formData.song_list.map((song, index) => {
                        const exists = songExistsStatus[index] === true
                        const markedForImport = songsToImport.has(index)
                        const showImportCheckbox = !exists && song.song_title_en && song.song_link?.url
                        
                        return (
                          <div key={index} className={styles.songItem}>
                            <div className={styles.songHeader}>
                              <div className={styles.songHeaderLeft}>
                                <span className={styles.songNumber}>Song {index + 1}</span>
                                {exists && (
                                  <span className={styles.existingBadge}>
                                    <FiCheck />
                                    Existing
                                  </span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveSong(index)}
                                className={styles.removeSongButton}
                              >
                                <FiTrash2 />
                                Remove
                              </button>
                            </div>
                            <div className={styles.songFields}>
                              <div className={styles.formGroup}>
                                <label>Title (EN)</label>
                                <input
                                  type="text"
                                  value={song.song_title_en}
                                  onChange={(e) => handleSongChange(index, 'song_title_en', e.target.value)}
                                  placeholder="Song Title (English)"
                                />
                              </div>
                              <div className={styles.formGroup}>
                                <label>Title (JA)</label>
                                <input
                                  type="text"
                                  value={song.song_title_ja}
                                  onChange={(e) => handleSongChange(index, 'song_title_ja', e.target.value)}
                                  placeholder="曲名 (日本語)"
                                />
                              </div>
                              <div className={styles.formGroup}>
                                <label>Link URL</label>
                                <input
                                  type="url"
                                  value={song.song_link?.url || ''}
                                  onChange={(e) => handleSongChange(index, 'song_link', { link_type: 'Web', url: e.target.value })}
                                  placeholder="https://..."
                                />
                              </div>
                               {showImportCheckbox && (
                                 <div className={styles.importCheckboxWrapper}>
                                   <div 
                                     className={`${styles.importCheckbox} ${markedForImport ? styles.checked : ''}`}
                                     onClick={() => handleToggleImport(index)}
                                   >
                                     {markedForImport && <FiCheck />}
                                   </div>
                                   <span onClick={() => handleToggleImport(index)}>Mark for import to playlist</span>
                                 </div>
                               )}
                              <div className={styles.formGroupFull}>
                                <div className={styles.coverImageSection}>
                                    {song.song_cover?.url ? (
                                      <div className={styles.coverImagePreview}>
                                        <img 
                                          src={song.song_cover.url} 
                                          alt={song.song_title_en || 'Song cover'}
                                          className={styles.coverImage}
                                        />
                                        <button
                                          type="button"
                                          onClick={() => clearSongCover(index)}
                                          className={styles.clearCoverButton}
                                          title="Remove cover image"
                                        >
                                          <FiX />
                                        </button>
                                      </div>
                                    ) : uploadingCover[index] ? (
                                      <div className={styles.coverImagePlaceholder}>
                                        <div className={styles.uploadingSpinner}></div>
                                        <p>Uploading...</p>
                                      </div>
                                    ) : (
                                      <div className={styles.coverImagePlaceholder}>
                                        <FiImage />
                                        <p>No cover image</p>
                                      </div>
                                    )}
                                </div>
                                <div className={styles.formGroupFullContent}>
                                  <div className={styles.formGroupTitle}>
                                    <label>Cover Image</label>
                                    <p className={styles.coverImageHelp}>
                                        Upload a new image or search iTunes for album/single covers (max 10MB)
                                    </p>
                                  </div>
                                  <div className={styles.coverImageActions}>
                                    <input
                                      type="file"
                                      id={`cover-upload-${index}`}
                                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0]
                                        if (file) {
                                          handleSongCoverUpload(index, file)
                                        }
                                      }}
                                      style={{ display: 'none' }}
                                    />
                                    <label
                                      htmlFor={`cover-upload-${index}`}
                                      className={styles.uploadButton}
                                    >
                                      <FiUpload />
                                      Upload
                                    </label>
                                    <button
                                      type="button"
                                      onClick={() => handleCoverFinderOpen(index)}
                                      className={styles.findCoverButton}
                                    >
                                      <FiSearch />
                                      Find Cover
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                      <Button
                        onClick={handleAddSong}
                        variant="White"
                        textValue="Add Song"
                        icon={<IoAddOutline />}
                      />
                    </div>
                  )}
                </div>
              )}

              {formTab === 'social' && (
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label htmlFor="website">Website</label>
                    <input
                      id="website"
                      type="url"
                      value={formData.website?.url || ''}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        website: { link_type: 'Web', url: e.target.value }
                      }))}
                      placeholder="https://..."
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="twitter">Twitter/X</label>
                    <input
                      id="twitter"
                      type="url"
                      value={formData.twitter?.url || ''}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        twitter: { link_type: 'Web', url: e.target.value }
                      }))}
                      placeholder="https://twitter.com/..."
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="instagram">Instagram</label>
                    <input
                      id="instagram"
                      type="url"
                      value={formData.instagram?.url || ''}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        instagram: { link_type: 'Web', url: e.target.value }
                      }))}
                      placeholder="https://instagram.com/..."
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="youtube">YouTube</label>
                    <input
                      id="youtube"
                      type="url"
                      value={formData.youtube?.url || ''}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        youtube: { link_type: 'Web', url: e.target.value }
                      }))}
                      placeholder="https://youtube.com/..."
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="tiktok">TikTok</label>
                    <input
                      id="tiktok"
                      type="url"
                      value={formData.tiktok?.url || ''}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        tiktok: { link_type: 'Web', url: e.target.value }
                      }))}
                      placeholder="https://tiktok.com/..."
                    />
                  </div>
                </div>
              )}
            </form>

            <div className={styles.formActions}>
              {songsToImport.size > 0 && (
                <p className={styles.importNotice}>
                  {songsToImport.size} song{songsToImport.size !== 1 ? 's' : ''} will be imported to the selection playlist
                </p>
              )}
              <div className={styles.formActionsLeft}>
                <Button
                  onClick={handleCancel}
                  variant="Grey"
                  textValue="Cancel"
                />
                <Button
                  onClick={handleCreate}
                  disabled={exporting || !formData.name_en}
                  variant="Pink"
                  textValue={
                    exporting 
                      ? (editingMigrationId || isEditingPublished ? 'Updating...' : 'Creating...')
                      : (editingMigrationId || isEditingPublished 
                        ? 'Update Artist'
                        : 'Create Artist')
                  }
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cover Finder Modal */}
      {showCoverFinder !== null && (
        <div className={styles.modalOverlay} onClick={handleCoverFinderClose}>
          <div className={styles.coverFinderModal} onClick={(e) => e.stopPropagation()}>
            <CoverFinder
              artistName={formData.name_en}
              songTitle={formData.song_list[showCoverFinder]?.song_title_en || ''}
              onCoverSelected={(coverData) => handleCoverSelected(showCoverFinder, coverData)}
              onClose={handleCoverFinderClose}
            />
          </div>
        </div>
      )}

      {!showForm && (
        <div className={styles.content}>
          {activeTab === 'published' && loading ? (
            <div className={styles.artistsList}>
              {[...Array(5)].map((_, index) => (
                <div key={`skeleton-${index}`} className={styles.artistItemSkeleton}>
                  <div className={styles.skeletonImage}></div>
                  <div className={styles.skeletonContent}>
                    <div className={styles.skeletonTitle}></div>
                    <div className={styles.skeletonMeta}></div>
                  </div>
                </div>
              ))}
            </div>
          ) : activeTab === 'published' ? (
            <>
              {error && <div className={styles.error}>{error}</div>}
              
              {/* Search and Sort Controls */}
              <div className={styles.searchAndSortControls}>
                <div className={styles.searchBar}>
                  <FiSearch className={styles.searchIcon} />
                  <input
                    type="text"
                    placeholder="Search by artist name or UID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={styles.searchInput}
                  />
                </div>
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
              
              <div className={styles.artistsList}>
                {paginatedArtists.length === 0 ? (
                  <div className={styles.empty}>
                    <p>No artists found.</p>
                    <p className={styles.emptySubtitle}>Click "Create Artist" to get started.</p>
                  </div>
                ) : (
                  paginatedArtists.map((artist) => {
                    const profilePictureUrl = artist.profile_picture?.url || null
                    
                    return (
                      <div key={artist.id} className={styles.artistItem}>
                        {profilePictureUrl ? (
                          <div className={styles.profilePictureContainer}>
                            <img 
                              src={profilePictureUrl} 
                              alt={artist.name_en}
                              className={styles.profilePicture}
                            />
                          </div>
                        ) : (
                          <div className={styles.profilePicturePlaceholder}>
                            <IoPersonOutline className={styles.placeholderIcon} />
                          </div>
                        )}
                        <div className={styles.artistContent}>
                          <div className={styles.artistHeader}>
                            <div>
                              <h3 className={styles.artistTitle}>{artist.name_en}</h3>
                              {artist.name_jp && (
                                <p className={styles.artistTitleJp}>{artist.name_jp}</p>
                              )}
                            </div>
                            <button
                              onClick={() => handleEditPublished(artist)}
                              className={styles.editButton}
                              title="Edit artist (queue changes for migration)"
                            >
                              <FiEdit />
                              Edit
                            </button>
                          </div>
                          <div className={styles.artistMeta}>
                            {artist.debut && (
                              <span className={styles.metaItem}>Debut: {artist.debut}</span>
                            )}
                            {artist.disband && (
                              <span className={styles.metaItem}>Disband: {artist.disband}</span>
                            )}
                            {artist.song_list?.length > 0 && (
                              <span className={styles.metaItem}>{artist.song_list.length} songs</span>
                            )}
                          </div>
                          <div className={styles.artistUID}>
                            UID: <code>{artist.uid}</code>
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
                    Page {currentPage} of {totalPages} ({filteredAndSortedArtists.length} total{searchQuery ? ` matching "${searchQuery}"` : ''})
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
            <div className={styles.artistsList}>
              {loadingPending ? (
                <>
                  {[...Array(3)].map((_, index) => (
                    <div key={`skeleton-pending-${index}`} className={styles.artistItemSkeleton}>
                      <div className={styles.skeletonImage}></div>
                      <div className={styles.skeletonContent}>
                        <div className={styles.skeletonTitle}></div>
                        <div className={styles.skeletonMeta}></div>
                      </div>
                    </div>
                  ))}
                </>
              ) : pendingMigrations.length === 0 ? (
                <div className={styles.empty}>
                  <p>No pending migrations.</p>
                  <p className={styles.emptySubtitle}>Artists you create will appear here until they're published in Prismic.</p>
                </div>
              ) : (
                pendingMigrations.map((migration) => {
                  const profilePicture = migration.artistData?.profile_picture
                  const profilePictureUrl = profilePicture?.url || null
                  
                  return (
                    <div key={migration.id} className={styles.artistItem}>
                      {profilePictureUrl ? (
                        <div className={styles.profilePictureContainer}>
                          <img 
                            src={profilePictureUrl} 
                            alt={migration.name_en}
                            className={styles.profilePicture}
                          />
                        </div>
                      ) : (
                        <div className={styles.profilePicturePlaceholder}>
                          <IoPersonOutline className={styles.placeholderIcon} />
                        </div>
                      )}
                      <div className={styles.artistContent}>
                        <div className={styles.artistHeader}>
                          <div>
                            <h3 className={styles.artistTitle}>{migration.name_en}</h3>
                            {migration.artistData?.name_jp && (
                              <p className={styles.artistTitleJp}>{migration.artistData.name_jp}</p>
                            )}
                          </div>
                        </div>
                        <div className={styles.artistMeta}>
                          <span className={styles.metaItem}>
                            Created: {format(new Date(migration.createdAt), 'MMM d, yyyy HH:mm')}
                          </span>
                          <span className={styles.metaItem}>
                            Release: {migration.releaseTitle}
                          </span>
                        </div>
                        <div className={styles.artistUID}>
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
                            title="Discard and archive this artist"
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

