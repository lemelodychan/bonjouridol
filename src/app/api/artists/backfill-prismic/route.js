import { NextResponse } from 'next/server'
import { createClient } from '@/prismicio'

/**
 * Backfill prismic_uid and name_ja for existing artists in Supabase
 * by matching them with Prismic Artist documents
 */
export async function POST(request) {
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
    const prismicArtists = await prismicClient.getAllByType('artist', {
      fetchOptions: {
        next: { 
          tags: ["prismic", "artists"],
          revalidate: 0 // Don't cache for backfill
        },
      },
    })

    // Create a map of Prismic artists by English name (normalized for matching)
    const normalizeName = (name) => {
      if (!name) return ''
      return name.toLowerCase().trim().replace(/\s+/g, ' ')
    }

    const prismicArtistMap = new Map()
    for (const prismicArtist of prismicArtists) {
      // Double-check that this is actually an artist document, not an article
      // Check both the type property and that it has artist-specific fields
      const isArtistDocument = 
        prismicArtist.type === 'artist' &&
        prismicArtist.data &&
        (prismicArtist.data.name_en !== undefined || prismicArtist.data.name_jp !== undefined)
      
      if (!isArtistDocument) {
        // Skip if this doesn't look like an artist document
        continue
      }

      const nameEn = prismicArtist.data.name_en
      if (nameEn) {
        const normalizedName = normalizeName(nameEn)
        // Store the first match (in case of duplicates, prefer the first one)
        if (!prismicArtistMap.has(normalizedName)) {
          prismicArtistMap.set(normalizedName, {
            uid: prismicArtist.uid,
            name_en: nameEn,
            name_jp: prismicArtist.data.name_jp || null,
            type: prismicArtist.type // Store type for verification
          })
        }
      }
    }

    // Get all artists from Supabase
    const { data: supabaseArtists, error: fetchError } = await supabase
      .from('artists')
      .select('id, name, name_ja, prismic_uid')

    if (fetchError) {
      return NextResponse.json({
        error: 'Failed to fetch artists from Supabase',
        details: fetchError.message
      }, { status: 500 })
    }

    // Create a set of existing artist names and UIDs for quick lookup
    const existingArtistNames = new Set((supabaseArtists || []).map(a => normalizeName(a.name)))
    const existingArtistUids = new Set((supabaseArtists || []).map(a => a.prismic_uid).filter(Boolean))

    // Find Prismic artists that don't exist in Supabase
    const artistsToInsert = []
    for (const prismicArtist of prismicArtists) {
      // Verify this is actually an artist document
      const isArtistDocument = 
        prismicArtist.type === 'artist' &&
        prismicArtist.data &&
        (prismicArtist.data.name_en !== undefined || prismicArtist.data.name_jp !== undefined)
      
      if (!isArtistDocument) {
        continue
      }

      const nameEn = prismicArtist.data.name_en
      if (nameEn) {
        const normalizedName = normalizeName(nameEn)
        // Check if artist doesn't exist by name or UID
        if (!existingArtistNames.has(normalizedName) && !existingArtistUids.has(prismicArtist.uid)) {
          artistsToInsert.push({
            name: nameEn,
            name_ja: prismicArtist.data.name_jp || null,
            prismic_uid: prismicArtist.uid,
            likes: 0
          })
        }
      }
    }

    // Insert new artists
    let inserted = 0
    if (artistsToInsert.length > 0) {
      const { data: insertedArtists, error: insertError } = await supabase
        .from('artists')
        .insert(artistsToInsert)
        .select()

      if (insertError) {
        return NextResponse.json({
          error: 'Failed to insert new artists',
          details: insertError.message
        }, { status: 500 })
      }

      inserted = insertedArtists?.length || 0
      
      // Refresh the Supabase artists list to include newly inserted ones
      const { data: refreshedArtists } = await supabase
        .from('artists')
        .select('id, name, name_ja, prismic_uid')
      
      if (refreshedArtists) {
        supabaseArtists.push(...refreshedArtists.filter(a => 
          artistsToInsert.some(newArtist => normalizeName(newArtist.name) === normalizeName(a.name))
        ))
      }
    }

    if (!supabaseArtists || supabaseArtists.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No artists found in Supabase',
        updated: 0,
        skipped: 0,
        inserted
      })
    }

    // Process each Supabase artist
    let updated = 0
    let skipped = 0
    const results = []

    for (const supabaseArtist of supabaseArtists) {
      const normalizedName = normalizeName(supabaseArtist.name)
      const prismicMatch = prismicArtistMap.get(normalizedName)

      if (prismicMatch) {
        // Verify this is an artist document, not an article
        if (prismicMatch.type !== 'artist') {
          skipped++
          results.push({
            name: supabaseArtist.name,
            status: 'skipped',
            reason: `Match found but wrong document type: ${prismicMatch.type} (expected artist)`
          })
          continue
        }

        // Check if we need to update
        const needsUpdate = 
          supabaseArtist.prismic_uid !== prismicMatch.uid ||
          (supabaseArtist.name_ja === null || supabaseArtist.name_ja === '') && prismicMatch.name_jp

        if (needsUpdate) {
          const updateData = {}
          if (supabaseArtist.prismic_uid !== prismicMatch.uid) {
            updateData.prismic_uid = prismicMatch.uid
          }
          if ((supabaseArtist.name_ja === null || supabaseArtist.name_ja === '') && prismicMatch.name_jp) {
            updateData.name_ja = prismicMatch.name_jp
          }

          const { error: updateError } = await supabase
            .from('artists')
            .update(updateData)
            .eq('id', supabaseArtist.id)

          if (updateError) {
            results.push({
              name: supabaseArtist.name,
              status: 'error',
              error: updateError.message
            })
          } else {
            updated++
            results.push({
              name: supabaseArtist.name,
              status: 'updated',
              prismic_uid: prismicMatch.uid,
              name_ja: prismicMatch.name_jp || supabaseArtist.name_ja
            })
          }
        } else {
          skipped++
          results.push({
            name: supabaseArtist.name,
            status: 'skipped',
            reason: 'Already up to date'
          })
        }
      } else {
        skipped++
        results.push({
          name: supabaseArtist.name,
          status: 'skipped',
          reason: 'No match found in Prismic'
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Backfill complete: ${inserted} inserted, ${updated} updated, ${skipped} skipped`,
      stats: {
        total: supabaseArtists.length,
        inserted,
        updated,
        skipped,
        prismicArtistsCount: prismicArtists.length
      },
      results: results.slice(0, 100) // Limit results to first 100 for response size
    })

  } catch (error) {
    console.error('Backfill API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

