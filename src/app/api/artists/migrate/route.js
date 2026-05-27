import { NextResponse } from 'next/server'
import { createClient } from '@/prismicio'
import { requireAdmin } from '@/lib/admin-auth'

export async function POST(request) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response
  try {
    // Import and create Supabase client
    const { createSupabaseClient } = await import('@/lib/supabase')
    const supabase = createSupabaseClient()
    
    // Check if Supabase is configured
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase not configured', message: 'Please set up Supabase environment variables' },
        { status: 500 }
      )
    }

    // Create Prismic client
    const prismicClient = createClient()

    // Get all artists from Prismic
    console.log('Fetching artists from Prismic...')
    const prismicArtists = await prismicClient.getAllByType('artist', {
      fetchOptions: {
        next: { 
          tags: ["prismic", "artists"],
          revalidate: 3600 // Cache for 1 hour
        },
      },
    })

    console.log(`Found ${prismicArtists.length} artists in Prismic`)

    // Get existing artists from Supabase
    const { data: existingArtists, error: fetchError } = await supabase
      .from('artists')
      .select('name')

    if (fetchError) {
      return NextResponse.json({
        error: 'Failed to fetch existing artists from Supabase',
        details: fetchError.message
      }, { status: 500 })
    }

    const existingArtistNames = new Set(existingArtists?.map(a => a.name) || [])
    console.log(`Found ${existingArtistNames.size} existing artists in Supabase`)

    // Prepare artists to insert
    const artistsToInsert = []
    const results = []

    for (const prismicArtist of prismicArtists) {
      const artistName = prismicArtist.data.name_en || prismicArtist.data.name_jp
      
      if (!artistName) {
        results.push({
          id: prismicArtist.id,
          name: 'Unknown',
          status: 'skipped',
          reason: 'No name found'
        })
        continue
      }

      if (existingArtistNames.has(artistName)) {
        results.push({
          id: prismicArtist.id,
          name: artistName,
          status: 'skipped',
          reason: 'Already exists in Supabase'
        })
        continue
      }

      artistsToInsert.push({
        name: artistName,
        likes: 0
      })

      results.push({
        id: prismicArtist.id,
        name: artistName,
        status: 'queued',
        reason: 'Ready to insert'
      })
    }

    // Insert new artists
    if (artistsToInsert.length > 0) {
      console.log(`Inserting ${artistsToInsert.length} new artists...`)
      
      const { data: insertedArtists, error: insertError } = await supabase
        .from('artists')
        .insert(artistsToInsert)
        .select()

      if (insertError) {
        return NextResponse.json({
          error: 'Failed to insert artists',
          details: insertError.message
        }, { status: 500 })
      }

      console.log(`Successfully inserted ${insertedArtists.length} artists`)

      // Update results for inserted artists
      for (const insertedArtist of insertedArtists) {
        const resultIndex = results.findIndex(r => r.name === insertedArtist.name)
        if (resultIndex !== -1) {
          results[resultIndex].status = 'inserted'
          results[resultIndex].reason = 'Successfully added to Supabase'
        }
      }
    }

    // Get final count
    const { data: finalArtists, error: finalCountError } = await supabase
      .from('artists')
      .select('name')

    if (finalCountError) {
      console.error('Error getting final count:', finalCountError)
    }

    return NextResponse.json({
      success: true,
      message: 'Artist migration completed',
      summary: {
        totalPrismicArtists: prismicArtists.length,
        existingArtists: existingArtistNames.size,
        newArtistsInserted: artistsToInsert.length,
        totalArtistsInSupabase: finalArtists?.length || 0
      },
      results: results
    })

  } catch (error) {
    console.error('Artist migration API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
