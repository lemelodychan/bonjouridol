import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

// POST - Upload cover image to Supabase Storage
export async function POST(request) {
  try {
    const supabase = getSupabaseClient()
    if (!supabase) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
      
      let errorMessage = 'Server configuration error. '
      if (!supabaseUrl) {
        errorMessage += 'NEXT_PUBLIC_SUPABASE_URL is missing. '
      }
      if (!serviceKey && !anonKey) {
        errorMessage += 'Neither SUPABASE_SERVICE_ROLE_KEY nor NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY is set. '
      }
      errorMessage += 'Please check your environment variables.'
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file')

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' },
        { status: 400 }
      )
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 5MB limit' },
        { status: 400 }
      )
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `covers/${fileName}`

    // Check if bucket exists by trying to list it
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets()
    if (bucketError) {
      console.error('Error checking buckets:', bucketError)
    } else {
      const bucketExists = buckets?.some(b => b.name === 'selection-playlist-covers')
      if (!bucketExists) {
        return NextResponse.json(
          { 
            error: 'Storage bucket "selection-playlist-covers" not found. Please create it in Supabase Dashboard (Storage > Create Bucket).',
            details: 'Bucket does not exist'
          },
          { status: 400 }
        )
      }
    }

    // Read file as ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer()
    
    // Upload to Supabase Storage
    // Supabase Storage accepts ArrayBuffer, Blob, File, or Uint8Array
    const { data, error } = await supabase.storage
      .from('selection-playlist-covers')
      .upload(filePath, arrayBuffer, {
        contentType: file.type,
        upsert: false
      })

    if (error) {
      console.error('Error uploading file:', error)
      
      // Provide more detailed error information
      let errorMessage = 'Failed to upload file'
      if (error.message) {
        errorMessage = error.message
      } else if (error.error) {
        errorMessage = error.error
      }
      
      // Check for specific error cases
      if (errorMessage.includes('Bucket not found') || errorMessage.includes('does not exist')) {
        errorMessage = 'Storage bucket "selection-playlist-covers" not found. Please create it in Supabase Dashboard.'
      } else if (errorMessage.includes('new row violates row-level security')) {
        errorMessage = 'Permission denied. Please check storage policies are set up correctly.'
      }
      
      return NextResponse.json(
        { error: errorMessage, details: error },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('selection-playlist-covers')
      .getPublicUrl(filePath)

    return NextResponse.json({
      url: urlData.publicUrl,
      path: filePath
    })
  } catch (error) {
    console.error('Upload API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

