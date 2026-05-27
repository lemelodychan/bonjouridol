import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin-auth'

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

  if (!supabaseUrl || (!serviceKey && !anonKey)) {
    return null
  }

  return createSupabaseClient(
    supabaseUrl,
    serviceKey || anonKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    }
  )
}

/**
 * Get all artists from Supabase for the playlist form
 */
export async function GET(request) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response
  try {
    const supabase = getSupabaseClient()

    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''

    // Build query
    let query = supabase
      .from('artists')
      .select('id, name, name_ja, prismic_uid')
      .order('name', { ascending: true })

    // Add search filter if provided. Strip PostgREST filter metacharacters
    // (, ( ) * : \ %) so the term can't break out of the ilike value and
    // inject additional .or() conditions.
    const safeSearch = search.trim().replace(/[,()*:\\%]/g, '')
    if (safeSearch) {
      query = query.or(`name.ilike.%${safeSearch}%,name_ja.ilike.%${safeSearch}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching artists:', error)
      return NextResponse.json(
        { error: 'Failed to fetch artists', message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      artists: data || [],
      total: data?.length || 0,
    })
  } catch (error) {
    console.error('Error fetching artists:', error)
    return NextResponse.json(
      { error: 'Failed to fetch artists', message: error.message },
      { status: 500 }
    )
  }
}

