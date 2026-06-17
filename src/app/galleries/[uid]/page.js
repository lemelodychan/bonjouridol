import { createClient } from '@/prismicio'
import { NotFoundError } from '@prismicio/client';
import { notFound } from 'next/navigation';
import { getKnownArtistNames, resolveArtistNames } from "@/utils/artistUtils";
import styles from "./page.module.scss"

import { components } from "@/slices";
import { format } from 'date-fns';

import Breadcrumbs from '@/app/components/Breadcrumbs';
import { PrismicNextImage } from "@prismicio/next";
import Gallery from '@/app/components/Gallery';

import FeaturedImage from "@/app/assets/FeaturedImage.png";
import LogoBI from "@/app/assets/Square_Logo_Pink.png";

import { HiOutlineLocationMarker } from "react-icons/hi";
import { FiUsers } from "react-icons/fi";

// Galleries render on-demand, then are cached INDEFINITELY (revalidate = false).
// Freshness comes solely from the Prismic webhook, which regenerates this exact
// page via revalidateTag(`gallery:<uid>`) on publish. No time-based window: any
// finite window left crawled pages stale on each ~daily crawl and rewrote them,
// which was the real ISR-write driver (and immune to lengthening the window).
export const dynamicParams = true;
export const revalidate = false;

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }) {
  const { uid } = await params;
  const client = createClient();

  let gallery;
  try {
    gallery = await client.getByUID("gallery", uid, {
      fetchOptions: { next: { tags: ["prismic", `gallery:${uid}`], revalidate: false } },
    });
  } catch (error) {
    // Missing UID: don't throw a 500 here — let the Page component return the
    // 404. Return minimal fallback metadata so this segment renders cleanly.
    if (error instanceof NotFoundError) {
      return { title: "Gallery Not Found | BONJOUR IDOL" };
    }
    throw error;
  }

  const title = gallery.data.meta_title || `Gallery - ${gallery.data.title} | BONJOUR IDOL`;
  const description = gallery.data.meta_description || "Bonjour Idol is a French media about the Japanese idol scene. Our team are idol fans and will be sharing their passion through photo reports of concerts and events, interviews and more exclusive content. Check it out!";
  const imageUrl = gallery.data.meta_image?.url || '/FeaturedImage.png';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://www.bonjouridol.com/galleries/${uid}`,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function Page({ params }) {
  const { uid } = await params;
  const client = createClient();

  const gallery = await client.getByUID("gallery", uid, {
      ref: client.masterRef,
      fetchLinks: [
        "author.uid", 
        "author.name", 
        "author.profile_picture",
        "author.description",
        "author.twitter",
        "author.instagram",
        "author.website",
      ],
      fetchOptions: {
        next: {
          // Per-document tag so a publish of THIS gallery (revalidateTag(`gallery:<uid>`))
          // regenerates only this page. The shared "galleries" tag is intentionally
          // omitted here so listing-level purges don't regenerate every gallery page.
          tags: ["prismic", `gallery:${uid}`],
          revalidate: false // never time-expire; webhook revalidates `gallery:<uid>` on publish
        },
      },
  }).catch((error) => {
    // Missing UID (e.g. a bot hitting a non-existent gallery) → real 404, not a
    // cached page. Re-throw anything else so genuine errors aren't masked as 404s.
    if (error instanceof NotFoundError) notFound();
    throw error;
  });

  const knownArtists = await getKnownArtistNames();
  const artistArray = resolveArtistNames(gallery.data.artist_name, knownArtists);

  const eventDate = gallery.data.event_date || gallery.first_publication_date;
  const formattedEventDate = eventDate 
      ? format(new Date(eventDate), "MMMM d, yyyy") 
      : "Unknown date";

  return (
        <div className={styles.container}>

          <div className={styles.header}>
            <Breadcrumbs 
              type="default"
              category="Gallery" 
              title={gallery.data.title}
              subtitle={formattedEventDate}
              uid={gallery.uid}
            />

            <div className={styles.HeaderContent}>
              <div className={styles.HeaderTitle}>
                <div className={styles.tag}>
                  {gallery.data.venue && (
                    <span className={styles.venue}><HiOutlineLocationMarker />{gallery.data.venue}</span>
                  )}
                </div>
                <h1>{gallery.data.title}</h1>
                <div className={styles.artists}>
                  {artistArray.map((artist, index) => (
                    <span key={index} className={styles.Artist}>
                      <FiUsers /> {artist}
                    </span>
                  ))}
                </div>
              </div>
              <div className={styles.information}>
                {gallery.data.photographer && (
                  <div className={styles.photographer}>
                    <span className={styles.photographerInfo}>
                      <span className={styles.photographerName}>
                        Shot by <strong>{gallery.data.photographer?.data?.name || "Bonjour Idol"}</strong>
                        {gallery.data.photographer_2?.data?.name && (
                          <>
                            &nbsp;and <strong>{gallery.data.photographer_2?.data?.name}</strong>
                          </>
                        )}
                      </span>
                      <span className={styles.date}>{formattedEventDate}</span>
                    </span>
                    <span className={`${styles.photographerImgContainer} ${gallery.data.photographer_2?.data?.profile_picture? styles.withAuthor2 : ""}`}>
                      <span className={styles.photographerImg}>
                        <PrismicNextImage 
                          field={gallery.data.photographer?.data?.profile_picture || LogoBI}
                          fallbackAlt=""
                        />
                      </span>
                      {gallery.data.photographer_2?.data?.profile_picture && (
                        <span className={styles.photographerImg}>
                          <PrismicNextImage 
                            field={gallery.data.photographer_2?.data?.profile_picture}
                            fallbackAlt=""
                          />
                        </span>
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>

          </div>    

          <div className={styles.content}>
            <section className={styles.GalleryContainer}>
              <Gallery images={gallery.data.gallery} color="GreyBg" />
            </section>
          </div>
          
        </div>
  );
}