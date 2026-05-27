import { NextResponse } from 'next/server'
import { createClient } from '@/prismicio'
import { extractArtistsFromPrismicArticle } from '@/utils/artistUtils'
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
      return NextResponse.json({
        error: 'Supabase not configured',
        message: 'Please set up Supabase environment variables in your .env files'
      }, { status: 500 })
    }

    // Create Prismic client
    const prismicClient = createClient()

    // Step 1: Add the artist column to the articles table
    console.log('Adding artist column to articles table...')
    
    // Try to add the column using direct SQL
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE articles ADD COLUMN IF NOT EXISTS artist JSONB DEFAULT NULL'
    })
    
    if (alterError) {
      console.log('Direct SQL failed, trying alternative approach...')
      // Alternative: try to create the column through a different method
      // This might fail if the RPC doesn't exist, but that's okay
    }

    // Step 2: Get all articles from Supabase
    console.log('Fetching existing articles from Supabase...')
    const { data: supabaseArticles, error: fetchError } = await supabase
      .from('articles')
      .select('slug, artist')

    if (fetchError) {
      return NextResponse.json({
        error: 'Failed to fetch articles from Supabase',
        details: fetchError.message
      }, { status: 500 })
    }

    console.log(`Found ${supabaseArticles.length} articles in Supabase`)

    // Step 3: Update each article with artist data from Prismic
    let updatedCount = 0
    let errorCount = 0
    let skippedCount = 0
    const results = []

    for (const supabaseArticle of supabaseArticles) {
      try {
        // Skip if artist data already exists
        if (supabaseArticle.artist !== null && supabaseArticle.artist !== undefined) {
          console.log(`Skipping ${supabaseArticle.slug} - artist data already exists`)
          skippedCount++
          results.push({
            slug: supabaseArticle.slug,
            status: 'skipped',
            reason: 'artist data already exists'
          })
          continue
        }

        // Get article data from Prismic
        let prismicArticle = null
        try {
          prismicArticle = await prismicClient.getByUID('articles', supabaseArticle.slug)
        } catch (error) {
          console.log(`Article ${supabaseArticle.slug} not found in Prismic, skipping...`)
          skippedCount++
          results.push({
            slug: supabaseArticle.slug,
            status: 'skipped',
            reason: 'not found in Prismic'
          })
          continue
        }

        // Extract idol_name from Prismic
        const idolName = prismicArticle.data.idol_name
        
        if (!idolName) {
          console.log(`No idol_name found for ${supabaseArticle.slug}, setting to null`)
          // Update with null to mark as processed
          await supabase
            .from('articles')
            .update({ artist: null })
            .eq('slug', supabaseArticle.slug)
          
          updatedCount++
          results.push({
            slug: supabaseArticle.slug,
            status: 'updated',
            artist: null,
            reason: 'no idol_name in Prismic'
          })
          continue
        }

        // Convert idol_name to artist array using utility function
        const artists = extractArtistsFromPrismicArticle(prismicArticle)

        // Update the article in Supabase
        const { error: updateError } = await supabase
          .from('articles')
          .update({ artist: artists })
          .eq('slug', supabaseArticle.slug)

        if (updateError) {
          console.error(`Error updating ${supabaseArticle.slug}:`, updateError)
          errorCount++
          results.push({
            slug: supabaseArticle.slug,
            status: 'error',
            error: updateError.message
          })
        } else {
          console.log(`Updated ${supabaseArticle.slug} with artists:`, artists)
          updatedCount++
          results.push({
            slug: supabaseArticle.slug,
            status: 'updated',
            artist: artists
          })
        }

        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (error) {
        console.error(`Error processing ${supabaseArticle.slug}:`, error)
        errorCount++
        results.push({
          slug: supabaseArticle.slug,
          status: 'error',
          error: error.message
        })
      }
    }

    const summary = {
      total: supabaseArticles.length,
      updated: updatedCount,
      skipped: skippedCount,
      errors: errorCount
    }

    console.log(`\nMigration completed!`)
    console.log(`Updated: ${updatedCount} articles`)
    console.log(`Skipped: ${skippedCount} articles`)
    console.log(`Errors: ${errorCount} articles`)
    console.log(`Total processed: ${supabaseArticles.length} articles`)

    return NextResponse.json({
      success: true,
      summary,
      results
    })

  } catch (error) {
    console.error('Migration failed:', error)
    return NextResponse.json({
      error: 'Migration failed',
      details: error.message
    }, { status: 500 })
  }
}
