import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Get Supabase client
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

  if (!supabaseUrl || (!serviceKey && !anonKey)) {
    return null
  }

  // Use service role key if available, otherwise use anon key
  return createClient(
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

// GET - Fetch a random playlist item
export async function GET(request) {
  try {
    const supabase = getSupabaseClient()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Get all playlist items - explicitly select all fields including purchase_link and join with artists
    const { data: playlist, error } = await supabase
      .from('selection_playlist')
      .select(`
        id, 
        title_en, 
        title_ja, 
        artist_en, 
        artist_ja, 
        link, 
        purchase_link, 
        cover_url, 
        release_date, 
        created_at, 
        updated_at, 
        display_order, 
        author_id,
        artists (
          id,
          name,
          name_ja,
          prismic_uid
        )
      `)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching playlist:', error)
      return NextResponse.json(
        { error: 'Failed to fetch playlist' },
        { status: 500 }
      )
    }

    console.log('Playlist items fetched:', playlist?.length)
    if (playlist && playlist.length > 0) {
      console.log('First item sample:', playlist[0])
      console.log('First item purchase_link:', playlist[0]?.purchase_link)
    }

    if (!playlist || playlist.length === 0) {
      return NextResponse.json(
        { item: null },
        { status: 200 }
      )
    }

    // Select a random item based on the current date in Tokyo timezone
    // This ensures all users see the same song on the same day (Tokyo time)
    // Uses Tokyo timezone (Asia/Tokyo, JST, UTC+9) as the base for determining the day
    const now = new Date()
    const tokyoDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(now)
    
    // Extract date components from Tokyo timezone
    const year = tokyoDate.find(part => part.type === 'year').value
    const month = tokyoDate.find(part => part.type === 'month').value
    const day = tokyoDate.find(part => part.type === 'day').value
    
    // Create date seed string (YYYYMMDD) for consistent random selection
    const dateSeed = `${year}${month}${day}`
    
    // Use date as seed for consistent random selection
    const seededRandom = (seed) => {
      const x = Math.sin(seed) * 10000
      return x - Math.floor(x)
    }
    
    const randomIndex = Math.floor(seededRandom(parseInt(dateSeed)) * playlist.length)
    const randomItem = playlist[randomIndex]
    
    console.log('Selected random item:', randomItem)
    console.log('Selected item purchase_link:', randomItem?.purchase_link)

    return NextResponse.json({ item: randomItem })
  } catch (error) {
    console.error('Playlist API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

