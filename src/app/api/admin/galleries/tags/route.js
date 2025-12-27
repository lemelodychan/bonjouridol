import { NextResponse } from 'next/server'
import { createClient } from '@/prismicio'

/**
 * Get all unique tags from published galleries
 * This is used to suggest tags when creating/editing galleries
 */
export async function GET(request) {
  try {
    const client = createClient()
    
    // Get ALL published galleries (getAllByType fetches all pages automatically)
    const galleries = await client.getAllByType('gallery', {
      orderings: [
        {
          field: 'document.first_publication_date',
          direction: 'desc',
        },
      ],
    })
    
    // Extract all unique tags from galleries
    const allTags = new Set()
    galleries.forEach(gallery => {
      // Prismic documents have tags at the root level (gallery.tags)
      // Tags are an array of strings
      if (gallery.tags && Array.isArray(gallery.tags)) {
        gallery.tags.forEach(tag => {
          // Exclude the special 'pending-migration' tag from suggestions
          if (tag && typeof tag === 'string' && tag !== 'pending-migration') {
            allTags.add(tag.trim())
          }
        })
      }
    })
    
    console.log(`Found ${galleries.length} galleries, extracted ${allTags.size} unique tags`)
    
    // Also get tags from pending migrations in Supabase
    try {
      const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

      if (supabaseUrl && (serviceKey || anonKey)) {
        const supabase = createSupabaseClient(
          supabaseUrl,
          serviceKey || anonKey,
          {
            auth: {
              persistSession: false,
              autoRefreshToken: false,
            }
          }
        )

        const { data: pendingMigrations } = await supabase
          .from('pending_gallery_migrations')
          .select('gallery_data')
          .eq('status', 'pending')

        if (pendingMigrations) {
          pendingMigrations.forEach(migration => {
            if (migration.gallery_data?.tags && Array.isArray(migration.gallery_data.tags)) {
              migration.gallery_data.tags.forEach(tag => {
                if (tag && typeof tag === 'string' && tag !== 'pending-migration') {
                  allTags.add(tag.trim())
                }
              })
            }
          })
        }
      }
    } catch (error) {
      // If Supabase query fails, continue with Prismic tags only
      console.log('Could not fetch tags from Supabase:', error.message)
    }
    
    // Convert Set to sorted array
    const tagsArray = Array.from(allTags).sort()
    
    return NextResponse.json({
      success: true,
      tags: tagsArray,
      total: tagsArray.length,
    })
  } catch (error) {
    console.error('Error fetching tags:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tags', message: error.message },
      { status: 500 }
    )
  }
}

