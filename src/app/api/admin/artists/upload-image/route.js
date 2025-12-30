import { NextResponse } from 'next/server'

/**
 * Upload an image to Prismic Asset API
 * Endpoint: POST https://asset-api.prismic.io/assets
 */
export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const notes = formData.get('notes') || ''
    const alt = formData.get('alt') || ''
    const credits = formData.get('credits') || ''

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are supported.' },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB in bytes
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      )
    }

    const REPOSITORY_NAME = process.env.REPO_NAME
    const MASTER_TOKEN = process.env.PRISMIC_MASTER_TOKEN

    if (!MASTER_TOKEN) {
      return NextResponse.json(
        { error: 'Prismic API token not configured' },
        { status: 500 }
      )
    }

    // Create FormData for Asset API
    const assetFormData = new FormData()
    assetFormData.append('file', file)
    if (notes) assetFormData.append('notes', notes)
    if (alt) assetFormData.append('alt', alt)
    if (credits) assetFormData.append('credits', credits)

    // Upload to Prismic Asset API
    const response = await fetch('https://asset-api.prismic.io/assets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MASTER_TOKEN}`,
        'repository': REPOSITORY_NAME,
      },
      body: assetFormData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Prismic Asset API error:', response.status, errorText)
      
      let errorMessage = 'Failed to upload image to Prismic'
      try {
        const errorData = JSON.parse(errorText)
        errorMessage = errorData.message || errorMessage
      } catch {
        errorMessage = errorText.substring(0, 200)
      }

      return NextResponse.json(
        { 
          error: errorMessage,
          status: response.status,
          details: errorText,
        },
        { status: response.status }
      )
    }

    // Parse success response
    const result = await response.json()

    // The Asset API returns an object with id, url, and other metadata
    // Format: { id, url, filename, kind, size, width, height, notes, credits, alt, ... }
    
    return NextResponse.json({
      success: true,
      message: 'Image uploaded successfully',
      image: {
        id: result.id,
        url: result.url,
        filename: result.filename || file.name,
        alt: result.alt || alt || null,
        credits: result.credits || credits || null,
        dimensions: {
          width: result.width || null,
          height: result.height || null,
        },
      },
    })

  } catch (error) {
    console.error('Error uploading image:', error)
    return NextResponse.json(
      { error: 'Failed to upload image', message: error.message },
      { status: 500 }
    )
  }
}

