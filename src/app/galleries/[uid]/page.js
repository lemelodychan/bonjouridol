import { createClient } from '@/prismicio'
import styles from "./page.module.scss"

import { components } from "@/slices";
import { format } from 'date-fns';

import Breadcrumbs from '@/app/components/Breadcrumbs';
import { PrismicNextImage } from "@prismicio/next";
import { SliceZone } from "@prismicio/react";
import SharingOptions from '../../components/SharingOptions';
import Gallery from '@/app/components/Gallery';
import Author from '@/app/components/Author';

import { HiOutlineLocationMarker, HiOutlineCalendar } from "react-icons/hi";

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
    <>
        <gallery className={styles.container}>
          <div 
            className={styles.header}
          >
            <Breadcrumbs 
              type="default"
              category="Gallery" 
              title={gallery.data.artist_name} 
              subtitle={formattedEventDate}
              uid={gallery.uid}
            />

            <div className={styles.HeaderContent}>
              <div className={styles.tag}>
                {gallery.data.event_date && (
                  <span className={styles.date}>
                    <HiOutlineCalendar />
                    {formattedEventDate}
                  </span>
                )}
                {gallery.data.venue && (
                  <span className={styles.venue}>
                    <HiOutlineLocationMarker />
                    {gallery.data.venue}
                  </span>
                )}

                <h1>
                    {gallery.data.artist_name}
                </h1>
              </div>
              
            </div>
          </div>    

          <div className={styles.information}>
            {gallery.data.photographer && (
              <div className={styles.photographer}>
                <span className={styles.photographerImg}>
                  <PrismicNextImage field={gallery.data.photographer?.data?.profile_picture} />
                </span>
                <span className={styles.photographerInfo}>
                  <span className={styles.photographerName}>
                    {gallery.data.photographer?.data?.name || "Unknown photographer"}
                  </span>
                  <span className={styles.date}>{formattedEventDate}</span>
                </span>
              </div>
            )}
            <SharingOptions 
              className={styles.Sharing}
              uid={gallery.uid} 
              title={gallery.data.meta_title} 
              idol={gallery.data.artist_name} 
            />
          </div>

          <div className={styles.content}>
                <section className={styles.GalleryContainer}>
                    <Gallery
                        images={gallery.data.gallery}
                    />
                </section>
          </div>
          
        </gallery>
    </>
  );
}