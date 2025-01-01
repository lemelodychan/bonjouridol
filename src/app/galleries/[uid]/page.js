import { createClient } from '@/prismicio'
import styles from "./page.module.scss"

import { components } from "@/slices";
import { format } from 'date-fns';

import Breadcrumbs from '@/app/components/Breadcrumbs';
import { PrismicNextImage } from "@prismicio/next";
import Gallery from '@/app/components/Gallery';

import { HiOutlineLocationMarker } from "react-icons/hi";

export const dynamicParams = false;
export async function generateMetadata({ params }) {
  const { uid } = await params;
  const client = createClient();
  const gallery = await client.getByUID("gallery", uid);
  return {
    title: gallery.data.meta_title,
    description: gallery.data.meta_description,
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
        cache: 'no-store',
      },
  });

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
                          field={gallery.data.photographer?.data?.profile_picture}
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