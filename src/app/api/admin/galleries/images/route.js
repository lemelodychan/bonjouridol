import { NextResponse } from 'next/server'
import { createClient } from '@/prismicio'
import { requireAdmin } from '@/lib/admin-auth'

/**
 * Get all images from Media Library (including unused ones)
 * Strategy:
 * 1. Try to access Asset API to get ALL assets
 * 2. Get all used images from documents
 * 3. Compare to find unused images
 * 4. Return all images (used + unused) filtered by suffix
 */
export async function GET(request) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response
  try {
    const { searchParams } = new URL(request.url)
    const filenameSuffix = searchParams.get('suffix') // Optional: filter by filename suffix
    
    const client = createClient()
    const REPOSITORY_NAME = process.env.REPO_NAME
    const ACCESS_TOKEN = process.env.PRISMIC_ACCESS_TOKEN
    const MASTER_TOKEN = process.env.PRISMIC_MASTER_TOKEN
    
    // Step 1: Get ALL assets from Asset API
    // Asset API requires Master Token (Migration API token)
    // Note: Asset API is paginated, we'll fetch all pages
    let allAssetsFromAPI = []
    const assetEndpoint = 'https://asset-api.prismic.io/assets'

    try {
      // Use Master Token for Asset API
      const tokenToUse = MASTER_TOKEN || ACCESS_TOKEN
      
      if (tokenToUse) {
        // Limit to latest 200 images for performance
        const MAX_ASSETS = 200
        let cursor = null
        let hasMore = true
        let pageCount = 0
        const maxPages = 20 // Safety limit (20 pages * 10 items = 200 max)
        
        while (hasMore && pageCount < maxPages && allAssetsFromAPI.length < MAX_ASSETS) {
          // Try to add limit parameter if supported
          let url = assetEndpoint
          if (cursor) {
            url = `${assetEndpoint}?cursor=${encodeURIComponent(cursor)}`
          }
          // Try adding limit parameter (may or may not be supported)
          if (!cursor && !url.includes('limit')) {
            url += (url.includes('?') ? '&' : '?') + `limit=${MAX_ASSETS}`
          }
          
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${tokenToUse}`,
              'Content-Type': 'application/json',
              'repository': REPOSITORY_NAME,
            },
          })

          if (response.ok) {
            const data = await response.json()
            // Asset API returns: { total, items, cursor, is_opensearch_result }
            if (data.items && Array.isArray(data.items)) {
              // Add items up to our limit
              const remaining = MAX_ASSETS - allAssetsFromAPI.length
              if (remaining > 0) {
                allAssetsFromAPI.push(...data.items.slice(0, remaining))
              }
              
              cursor = data.cursor || null
              hasMore = !!cursor && data.items.length > 0 && allAssetsFromAPI.length < MAX_ASSETS
              pageCount++
            } else {
              hasMore = false
            }
          } else {
            hasMore = false
          }
          
          // Small delay to avoid rate limiting
          if (hasMore) {
            await new Promise(resolve => setTimeout(resolve, 100))
          }
        }
        
        // Sort by created_at descending to get latest first (if available)
        if (allAssetsFromAPI.length > 0 && allAssetsFromAPI[0].created_at) {
          allAssetsFromAPI.sort((a, b) => (b.created_at || 0) - (a.created_at || 0))
          // Keep only the latest 200
          allAssetsFromAPI = allAssetsFromAPI.slice(0, MAX_ASSETS)
        }
      }
    } catch (error) {
      // Asset API not accessible, continue with document-based search only
    }
    
    // Step 2: Get all used images from documents
    const allDocuments = await client.getAllByType('*')
    
    // Extract all images with their IDs and URLs
    const allImages = []
    const imageMap = new Map() // To avoid duplicates
    
    // Helper function to extract image from any image field
    const extractImage = (imageField, imageMap, allImages, filenameSuffix) => {
      if (!imageField || !imageField.id) return
      
      const imageId = imageField.id
      const imageUrl = imageField.url || ''
      
      // Skip if we've already seen this image
      if (imageMap.has(imageId)) {
        return
      }
      
      // Extract filename from URL
      // Format: https://images.prismic.io/bonjouridol/{id}_{filename}?query
      let filename = null
      const patterns = [
        /\/([^\/]+)_([^\/\?]+)/,  // Standard: /id_filename.jpg
        /_([^\/\?]+)$/,            // Fallback: _filename.jpg at end
        /\/([^\/\?]+)$/,           // Last resort: just filename
      ]
      
      for (const pattern of patterns) {
        const match = imageUrl.match(pattern)
        if (match) {
          filename = match[match.length - 1] // Get last capture group
          break
        }
      }
      
      // Filter by suffix if provided
      if (filenameSuffix && filename) {
        // Remove file extension for matching
        const filenameWithoutExt = filename.replace(/\.[^/.]+$/, '')
        const suffixLower = filenameSuffix.toLowerCase()
        const filenameLower = filenameWithoutExt.toLowerCase()
        
        // Check if filename contains the suffix (more flexible matching)
        if (!filenameLower.includes(suffixLower)) {
          return
        }
      }
      
      const imageData = {
        id: imageId,
        url: imageUrl,
        filename: filename,
        dimensions: imageField.dimensions || null,
        alt: imageField.alt || null,
      }
      
      allImages.push(imageData)
      imageMap.set(imageId, true)
    }
    
    // Recursive function to find all image fields in a document
    const findImagesInObject = (obj, imageMap, allImages, filenameSuffix) => {
      if (!obj || typeof obj !== 'object') return
      
      // Check if this is an image field (has id and url)
      if (obj.id && obj.url && obj.dimensions) {
        extractImage(obj, imageMap, allImages, filenameSuffix)
        return
      }
      
      // Recursively search through arrays and objects
      if (Array.isArray(obj)) {
        obj.forEach(item => findImagesInObject(item, imageMap, allImages, filenameSuffix))
      } else {
        Object.values(obj).forEach(value => {
          if (typeof value === 'object' && value !== null) {
            findImagesInObject(value, imageMap, allImages, filenameSuffix)
          }
        })
      }
    }
    
    // Search through all documents for images
    const usedImageIds = new Set()
    allDocuments.forEach(doc => {
      if (doc.data) {
        findImagesInObject(doc.data, imageMap, allImages, filenameSuffix)
        // Track used image IDs
        allImages.forEach(img => usedImageIds.add(img.id))
      }
    })
    
    // Step 3: Process assets from API and find unused ones
    if (allAssetsFromAPI.length > 0) {
      const unusedImages = []
      const unusedImageMap = new Map()
      
      allAssetsFromAPI.forEach(asset => {
        // Asset API structure based on actual response:
        // { id, url, filename, size, width, height, last_modified, kind, extension, uploader_id, created_at, tags }
        const assetId = asset.id
        const assetUrl = asset.url
        const assetFilename = asset.filename
        
        if (!assetId || !assetUrl) return
        
        if (usedImageIds.has(assetId)) return // Skip if already used
        if (unusedImageMap.has(assetId)) return // Skip duplicates
        
        // Filter by suffix if provided
        if (filenameSuffix && assetFilename) {
          const filenameWithoutExt = assetFilename.replace(/\.[^/.]+$/, '')
          const suffixLower = filenameSuffix.toLowerCase()
          const filenameLower = filenameWithoutExt.toLowerCase()
          
          if (!filenameLower.includes(suffixLower)) {
            return
          }
        }
        
        unusedImages.push({
          id: assetId,
          url: assetUrl,
          filename: assetFilename,
          dimensions: (asset.width && asset.height) ? { 
            width: asset.width, 
            height: asset.height 
          } : null,
          alt: null, // Asset API doesn't provide alt text
        })
        
        unusedImageMap.set(assetId, true)
      })
      
      // Combine used and unused images
      allImages.push(...unusedImages)
    }
    
    return NextResponse.json({
      success: true,
      images: allImages,
      total: allImages.length,
      searchSuffix: filenameSuffix || null,
      source: allAssetsFromAPI.length > 0 ? 'Asset API + Documents' : 'Documents only',
      note: allAssetsFromAPI.length > 0 
        ? `Includes unused images from latest 200 assets in Media Library` 
        : 'Only shows images used in documents (Asset API not accessible)',
      stats: allAssetsFromAPI.length > 0 ? {
        totalAssetsInLibrary: '14,000+',
        searchedLatest: 200,
        unusedFound: allImages.filter(img => !usedImageIds.has(img.id)).length,
        usedFound: allImages.filter(img => usedImageIds.has(img.id)).length,
      } : null,
    })
  } catch (error) {
    console.error('Error fetching images:', error)
    return NextResponse.json(
      { error: 'Failed to fetch images', message: error.message },
      { status: 500 }
    )
  }
}

