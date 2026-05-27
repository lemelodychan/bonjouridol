import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'

/**
 * Get Prismic assets with pagination
 * Returns 50 assets per page
 */
export async function GET(request) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response
  try {
    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get('cursor') || null
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    const REPOSITORY_NAME = process.env.REPO_NAME
    const MASTER_TOKEN = process.env.PRISMIC_MASTER_TOKEN

    if (!MASTER_TOKEN) {
      return NextResponse.json(
        { error: 'Prismic API token not configured' },
        { status: 500 }
      )
    }

    // Build URL with pagination
    const assetEndpoint = 'https://asset-api.prismic.io/assets'
    let url = assetEndpoint
    
    if (cursor) {
      url += `?cursor=${encodeURIComponent(cursor)}`
    }
    
    // Add limit parameter
    url += (url.includes('?') ? '&' : '?') + `limit=${limit}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${MASTER_TOKEN}`,
        'Content-Type': 'application/json',
        'repository': REPOSITORY_NAME,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Prismic Asset API error:', response.status, errorText)
      
      return NextResponse.json(
        { error: 'Failed to fetch Prismic assets', message: errorText },
        { status: response.status }
      )
    }

    const data = await response.json()

    // Format assets for frontend
    const assets = (data.items || []).map(asset => ({
      id: asset.id,
      url: asset.url || '',
      filename: asset.filename || '',
      kind: asset.kind || 'image',
      size: asset.size || 0,
      width: asset.width || null,
      height: asset.height || null,
      alt: asset.alt || null,
      credits: asset.credits || null,
      notes: asset.notes || null,
      created_at: asset.created_at || null,
    }))

    return NextResponse.json({
      success: true,
      assets: assets,
      cursor: data.cursor || null,
      hasMore: !!data.cursor && assets.length === limit,
      total: data.total || assets.length,
    })

  } catch (error) {
    console.error('Error fetching Prismic assets:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Prismic assets', message: error.message },
      { status: 500 }
    )
  }
}

