import { NextResponse } from 'next/server'
import { createClient } from '@/prismicio'
import { requireAdmin } from '@/lib/admin-auth'

/**
 * Fix incorrect prismic_uid values that point to articles instead of artist documents
 * This script verifies each prismic_uid and corrects any that are wrong
 */
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

    // Get all artists from Supabase that have a prismic_uid
    const { data: supabaseArtists, error: fetchError } = await supabase
      .from('artists')
      .select('id, name, name_ja, prismic_uid')
      .not('prismic_uid', 'is', null)

    if (fetchError) {
      return NextResponse.json({
        error: 'Failed to fetch artists from Supabase',
        details: fetchError.message
      }, { status: 500 })
    }

    if (!supabaseArtists || supabaseArtists.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No artists with prismic_uid found',
        fixed: 0,
        verified: 0
      })
    }

    // Get all artist documents from Prismic
    const prismicArtists = await prismicClient.getAllByType('artist', {
      fetchOptions: {
        next: { 
          tags: ["prismic", "artists"],
          revalidate: 0
        },
      },
    })

    // Create a map of Prismic artist UIDs to verify they're actually artist documents
    const prismicArtistUids = new Set()
    const prismicArtistMap = new Map()
    
    const normalizeName = (name) => {
      if (!name) return ''
      return name.toLowerCase().trim().replace(/\s+/g, ' ')
    }

    for (const prismicArtist of prismicArtists) {
      // Verify this is actually an artist document
      if (prismicArtist.type === 'artist' && prismicArtist.data) {
        prismicArtistUids.add(prismicArtist.uid)
        
        const nameEn = prismicArtist.data.name_en
        if (nameEn) {
          const normalizedName = normalizeName(nameEn)
          if (!prismicArtistMap.has(normalizedName)) {
            prismicArtistMap.set(normalizedName, {
              uid: prismicArtist.uid,
              name_en: nameEn,
              name_jp: prismicArtist.data.name_jp || null
            })
          }
        }
      }
    }

    // Process each Supabase artist
    let fixed = 0
    let verified = 0
    let errors = 0
    const results = []

    for (const supabaseArtist of supabaseArtists) {
      const currentUid = supabaseArtist.prismic_uid
      
      // Actually fetch the document by UID to verify its type
      let documentType = null
      try {
        // Try to get it as an artist first
        const artistDoc = await prismicClient.getByUID('artist', currentUid)
        if (artistDoc && artistDoc.type === 'artist') {
          documentType = 'artist'
        }
      } catch (error) {
        // Not an artist, try as article
        try {
          const articleDoc = await prismicClient.getByUID('articles', currentUid)
          if (articleDoc && articleDoc.type === 'articles') {
            documentType = 'articles'
          }
        } catch (articleError) {
          // Document doesn't exist or is another type
          documentType = 'not_found'
        }
      }
      
      // Check if the current UID points to a valid artist document
      if (documentType === 'artist') {
        // UID is valid and points to an artist document
        verified++
        results.push({
          name: supabaseArtist.name,
          status: 'verified',
          prismic_uid: currentUid
        })
      } else {
        // Current UID is invalid (points to article, wrong type, or doesn't exist)
        const issueType = documentType === 'articles' ? 'points to an article document' : 
                         documentType === 'not_found' ? 'document not found' : 
                         'unknown type'
        
        // Try to find the correct artist document by name
        const normalizedName = normalizeName(supabaseArtist.name)
        const correctMatch = prismicArtistMap.get(normalizedName)

        if (correctMatch) {
          // Found the correct artist document
          const { error: updateError } = await supabase
            .from('artists')
            .update({
              prismic_uid: correctMatch.uid,
              name_ja: correctMatch.name_jp || supabaseArtist.name_ja
            })
            .eq('id', supabaseArtist.id)

          if (updateError) {
            errors++
            results.push({
              name: supabaseArtist.name,
              status: 'error',
              error: updateError.message,
              old_uid: currentUid,
              correct_uid: correctMatch.uid
            })
          } else {
            fixed++
            results.push({
              name: supabaseArtist.name,
              status: 'fixed',
              old_uid: currentUid,
              new_uid: correctMatch.uid,
              issue: issueType
            })
          }
        } else {
          // No match found, clear the incorrect UID
          const { error: updateError } = await supabase
            .from('artists')
            .update({ prismic_uid: null })
            .eq('id', supabaseArtist.id)

          if (updateError) {
            errors++
            results.push({
              name: supabaseArtist.name,
              status: 'error',
              error: updateError.message,
              old_uid: currentUid,
              issue: issueType
            })
          } else {
            fixed++
            results.push({
              name: supabaseArtist.name,
              status: 'cleared',
              reason: `Invalid UID (${issueType}) and no artist match found`,
              old_uid: currentUid
            })
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Fix complete: ${fixed} fixed, ${verified} verified, ${errors} errors`,
      stats: {
        total: supabaseArtists.length,
        fixed,
        verified,
        errors,
        prismicArtistsCount: prismicArtists.length
      },
      results: results.slice(0, 100) // Limit results to first 100 for response size
    })

  } catch (error) {
    console.error('Fix API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

