import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin-auth'

// Get Supabase client with service role for storage operations
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

  if (!supabaseUrl) {
    console.error('NEXT_PUBLIC_SUPABASE_URL is not set')
    return null
  }

  // Prefer service role key, but fallback to anon key if available
  const key = serviceKey || anonKey
  if (!key) {
    console.error('Neither SUPABASE_SERVICE_ROLE_KEY nor NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY is set')
    return null
  }

  return createClient(supabaseUrl, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  })
}

// GET - List all cover images from the bucket
export async function GET(request) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response
  try {
    const supabase = getSupabaseClient()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // List all files in the covers folder
    const { data: files, error } = await supabase.storage
      .from('selection-playlist-covers')
      .list('covers', {
        limit: 1000,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' }
      })

    if (error) {
      console.error('Error listing covers:', error)
      return NextResponse.json(
        { error: 'Failed to list cover images', details: error.message },
        { status: 500 }
      )
    }

    // Get public URLs for all files
    const covers = files
      .filter(file => file.name && !file.name.endsWith('/')) // Filter out folders
      .map(file => {
        const filePath = `covers/${file.name}`
        const { data: urlData } = supabase.storage
          .from('selection-playlist-covers')
          .getPublicUrl(filePath)
        
        return {
          name: file.name,
          path: filePath,
          url: urlData.publicUrl,
          size: file.metadata?.size || 0,
          created_at: file.created_at,
          updated_at: file.updated_at,
        }
      })

    return NextResponse.json({
      success: true,
      covers: covers,
      total: covers.length,
    })
  } catch (error) {
    console.error('Error fetching covers:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

