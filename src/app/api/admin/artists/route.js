import { NextResponse } from 'next/server'
import { createClient } from '@/prismicio'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET(request) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response
  try {
    const client = createClient()
    
    // Get all published artists
    const artists = await client.getAllByType('artist', {
      orderings: [
        {
          field: 'document.first_publication_date',
          direction: 'desc',
        },
      ],
    })

    // Format artists for frontend
    const formattedArtists = artists.map(artist => ({
      id: artist.id,
      uid: artist.uid,
      name_en: artist.data.name_en || '',
      name_jp: artist.data.name_jp || '',
      profile_picture: artist.data.profile_picture || null,
      debut: artist.data.debut || '',
      disband: artist.data.disband || '',
      description: artist.data.description || [],
      youtube_video: artist.data.youtube_video || '',
      song_list: artist.data.song_list || [],
      website: artist.data.website || null,
      twitter: artist.data.twitter || null,
      instagram: artist.data.instagram || null,
      youtube: artist.data.youtube || null,
      tiktok: artist.data.tiktok || null,
      first_publication_date: artist.first_publication_date,
      last_publication_date: artist.last_publication_date,
    }))

    return NextResponse.json({
      success: true,
      artists: formattedArtists,
      total: formattedArtists.length,
    })
  } catch (error) {
    console.error('Error fetching artists:', error)
    return NextResponse.json(
      { error: 'Failed to fetch artists', message: error.message },
      { status: 500 }
    )
  }
}

