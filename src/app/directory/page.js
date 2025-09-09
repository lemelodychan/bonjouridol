import { createClient } from "@/prismicio";
import ArtistProfile from "../components/ArtistProfile";

// Import Supabase client for server-side like fetching
const { createSupabaseClient } = await import('@/lib/supabase');

import styles from "./page.module.scss";

export const metadata = {
  title: "Artist Directory | BONJOUR IDOL",
  description:
    "Browse all artist profiles featured on Bonjour Idol, listed alphabetically.",
  openGraph: {
    title: "Artist Directory | BONJOUR IDOL",
    description:
      "Browse all artist profiles featured on Bonjour Idol, listed alphabetically.",
    images: [
      {
        url: "/FeaturedImage.png",
        width: 1200,
        height: 630,
        alt: "Artist Directory | BONJOUR IDOL",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Artist Directory | BONJOUR IDOL",
    description:
      "Browse all artist profiles featured on Bonjour Idol, listed alphabetically.",
    images: ["/FeaturedImage.png"],
  },
};

// Function to fetch like counts for multiple artists using the batch API
async function fetchArtistLikeCounts(artistNames) {
  try {
    const artistsParam = artistNames.join(',');
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/artists/batch-likes?artists=${encodeURIComponent(artistsParam)}`);
    
    if (response.ok) {
      const data = await response.json();
      return data;
    } else {
      console.error('Error fetching batch artist likes:', response.status);
      return {};
    }
  } catch (error) {
    console.error('Error in fetchArtistLikeCounts:', error);
    return {};
  }
}

export default async function DirectoryPage() {
  const client = createClient();

  const artists = await client.getAllByType("artist", {
    fetchOptions: {
      next: { 
        tags: ["prismic", "artists"],
        revalidate: 3600 // Cache for 1 hour
      },
    },
  });

  const sortedArtists = [...artists].sort((a, b) => {
    const nameA = (a?.data?.name_en || "").toLowerCase();
    const nameB = (b?.data?.name_en || "").toLowerCase();
    return nameA.localeCompare(nameB, "en", { sensitivity: "base" });
  });

  // Fetch like counts for all artists
  const artistNames = sortedArtists.map(artist => artist.data.name_en).filter(Boolean);
  const likeCounts = await fetchArtistLikeCounts(artistNames);

  return (
    <div className={styles.DirectoryPage}>
      <h1>Directory</h1>
      <div className={styles.ArtistsGrid}>
        {sortedArtists.map((artist) => (
          <ArtistProfile
            key={artist.id}
            artist={artist}
            noConstraints
            hideDescription
            likeCounts={likeCounts}
          />
        ))}
      </div>
    </div>
  );
}


