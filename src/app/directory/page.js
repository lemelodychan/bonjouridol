import { createClient } from "@/prismicio";
import ArtistProfile from "../components/ArtistProfile";
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

export default async function DirectoryPage() {
  const client = createClient();

  const artists = await client.getAllByType("artist", {
    fetchOptions: {
      cache: "no-store",
    },
  });

  const sortedArtists = [...artists].sort((a, b) => {
    const nameA = (a?.data?.name_en || "").toLowerCase();
    const nameB = (b?.data?.name_en || "").toLowerCase();
    return nameA.localeCompare(nameB, "en", { sensitivity: "base" });
  });

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
          />
        ))}
      </div>
    </div>
  );
}


