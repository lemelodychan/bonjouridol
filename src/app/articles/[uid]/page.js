import { createClient } from '@/prismicio'
import styles from "./page.module.scss"

import { components } from "@/slices";
import { format } from 'date-fns';

import Breadcrumbs from '@/app/components/Breadcrumbs';
import { PrismicNextImage } from "@prismicio/next";
import { PrismicRichText, PrismicText, SliceZone } from "@prismicio/react";
import SharingOptions from '../../components/SharingOptions';
import Author from '@/app/components/Author';
import Gallery from '@/app/components/Gallery';

import { HiOutlineLocationMarker, HiOutlineCalendar } from "react-icons/hi";

export const dynamicParams = false;
export async function generateMetadata({ params }) {
  const { uid } = await params;
  const client = createClient();
  const article = await client.getByUID("articles", uid);
  return {
    title: article.data.meta_title,
    description: article.data.meta_description,
  };
}

export default async function Page({ params }) {
  const { uid } = await params;
  const client = createClient();

  const article = await client.getByUID("articles", uid, {
      ref: client.masterRef,
      fetchLinks: [
        "author.uid", 
        "author.name", 
        "author.profile_picture",
        "author.description",
        "author.twitter",
        "author.instagram",
        "author.website",
        "photographer.uid", 
        "photographer.name", 
        "photographer.profile_picture",
        "photographer.description",
        "photographer.twitter",
        "photographer.instagram",
        "photographer.website",
        "gallery.gallery"
      ],
      fetchOptions: {
        cache: 'no-store',
      },
  });

  const author = article.data.author;
  const photo = article.data.photographer;
  const galleryLink = article.data.gallery_link;

  const imageUrl = article.data.featured_image.url;

  console.log('Gallery Images:', galleryLink?.data?.gallery); // Log the gallery data

  const publicationDate = article.data.publication_date || article.first_publication_date;
  const formattedDate = publicationDate 
      ? format(new Date(publicationDate), "MMMM d, yyyy") 
      : "Unknown date";

  const eventDate = article.data.event_date || article.first_publication_date;
  const formattedEventDate = eventDate 
      ? format(new Date(eventDate), "MMMM d, yyyy") 
      : "Unknown date";

  return (
    <>
        <article className={styles.container}>
          <div 
            className={styles.header}
            style={{ backgroundImage: `url(${imageUrl})` }}
          >
            <Breadcrumbs 
              type="white"
              category={article.data.type} 
              title={article.data.title} 
              subtitle={article.data.subtitle}
              uid={article.uid}
            />

            <div className={styles.HeaderContent}>
              <div className={styles.tag}>
                {article.data.event_date && (
                  <span className={styles.date}>
                    <HiOutlineCalendar />
                    {formattedEventDate}
                  </span>
                )}
                {article.data.venue && (
                  <span className={styles.venue}>
                    <HiOutlineLocationMarker />
                    {article.data.venue}
                  </span>
                )}
              </div>

              <div className={styles.TitleContainer}>
                <h1 className={styles.title}>
                  <span>{article.data.title}</span>
                </h1>
                {article.data.subtitle && (
                  <h2 className={styles.subtitle}>
                    <span>{article.data.subtitle}</span>
                  </h2>
                )}
              </div>
              
            </div>
          </div>    

          <div className={styles.information}>
            {article.data.author && (
              <div className={styles.author}>
                <span className={styles.authorImg}>
                  <PrismicNextImage field={article.data.author?.data?.profile_picture} />
                </span>
                <span className={styles.authorInfo}>
                  <span className={styles.authorName}>{article.data.author?.data?.name || "Unknown Author"}</span>
                  <span className={styles.date}>{formattedDate}</span>
                </span>
              </div>
            )}
            <SharingOptions 
              className={styles.Sharing}
              uid={article.uid} 
              title={article.data.meta_title} 
              idol={article.data.idol_name} 
            />
          </div>

          <div className={styles.content}>
              <SliceZone slices={article.data.slices} components={components} />
          </div>

          <div className={styles.Gallery}>
            <h2>Full Gallery</h2>
            {galleryLink?.data?.gallery && galleryLink.data.gallery.length > 0 ? (
              <Gallery 
                images={galleryLink.data.gallery.map(item => ({
                  image: item.image,
                }))}
              />
            ) : (
              <p>No gallery images available.</p>
            )}
          </div>
          
        </article>
    </>
  );
}