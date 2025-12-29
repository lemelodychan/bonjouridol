import { createClient } from "@/prismicio";
import AlphabetNav from "../components/AlphabetNav";
import DirectoryClient from "./DirectoryClient";

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
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/artists/batch-likes?artists=${encodeURIComponent(artistsParam)}`, {
      // Add timeout and better error handling for server-side fetch
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });
    
    if (response.ok) {
      const data = await response.json();
      return data;
    } else {
      console.error('Error fetching batch artist likes:', response.status);
      return {};
    }
  } catch (error) {
    // Don't log fetch errors in production to avoid noise
    if (process.env.NODE_ENV === 'development') {
      console.error('Error in fetchArtistLikeCounts:', error);
    }
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

  // Group artists by first letter
  const artistsByLetter = {};
  sortedArtists.forEach((artist) => {
    const name = (artist?.data?.name_en || "").trim();
    if (name) {
      const firstLetter = name.charAt(0).toUpperCase();
      // Handle non-alphabetic characters (numbers, symbols) in a special group
      const letter = /[A-Z]/.test(firstLetter) ? firstLetter : '#';
      if (!artistsByLetter[letter]) {
        artistsByLetter[letter] = [];
      }
      artistsByLetter[letter].push(artist);
    }
  });

  // Get available letters sorted alphabetically
  const availableLetters = Object.keys(artistsByLetter)
    .filter(letter => letter !== '#')
    .sort();
  
  // Check if we have a special characters section
  const hasSpecialChars = artistsByLetter['#'] && artistsByLetter['#'].length > 0;

  // Fetch like counts for all artists
  const artistNames = sortedArtists.map(artist => artist.data.name_en).filter(Boolean);
  const likeCounts = await fetchArtistLikeCounts(artistNames);

  const totalArtists = sortedArtists.length;

  return (
    <div className={styles.DirectoryPage}>
      <h1>
        <span className={styles.title}>
          <span className={styles.en}>Artist Directory</span>
          <span className={styles.ja}>アーティスト一覧</span>
        </span>
      </h1>
      <AlphabetNav availableLetters={availableLetters} hasSpecialChars={hasSpecialChars} />
      <DirectoryClient
        artistsByLetter={artistsByLetter}
        availableLetters={availableLetters}
        hasSpecialChars={hasSpecialChars}
        likeCounts={likeCounts}
        totalArtists={totalArtists}
      />
    </div>
  );
}


