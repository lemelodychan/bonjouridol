import { NextResponse } from 'next/server'

/**
 * Download an image from a URL and upload it to Prismic
 * This proxies the download to avoid CORS and CSP issues
 */
export async function POST(request) {
  try {
    const { imageUrl, fileName, altText } = await request.json()

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      )
    }

    // Download the image from the URL
    const imageResponse = await fetch(imageUrl)
    
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.status}`)
    }

    // Get the image as a blob
    const imageBlob = await imageResponse.blob()

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (imageBlob.size > maxSize) {
      return NextResponse.json(
        { error: 'Image too large. Maximum size is 10MB.' },
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
    const formData = new FormData()
    formData.append('file', imageBlob, fileName || 'cover.jpg')
    if (altText) formData.append('alt', altText)

    // Upload to Prismic Asset API
    const uploadResponse = await fetch('https://asset-api.prismic.io/assets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MASTER_TOKEN}`,
        'repository': REPOSITORY_NAME,
      },
      body: formData,
    })

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text()
      console.error('Prismic Asset API error:', uploadResponse.status, errorText)
      
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
          status: uploadResponse.status,
          details: errorText,
        },
        { status: uploadResponse.status }
      )
    }

    // Parse success response
    const result = await uploadResponse.json()

    return NextResponse.json({
      success: true,
      message: 'Cover downloaded and uploaded to Prismic successfully',
      image: {
        id: result.id,
        url: result.url,
        filename: result.filename || fileName,
        alt: result.alt || altText || null,
        dimensions: {
          width: result.width || null,
          height: result.height || null,
        },
      },
    })

  } catch (error) {
    console.error('Error downloading/uploading cover:', error)
    return NextResponse.json(
      { error: 'Failed to download and upload cover', message: error.message },
      { status: 500 }
    )
  }
}

