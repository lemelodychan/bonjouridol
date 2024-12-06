import { createClient } from '@/prismicio'
import styles from "./page.module.scss"

import { components } from "@/slices";
import { format } from 'date-fns';

import Breadcrumbs from '@/app/components/Breadcrumbs';
import { PrismicNextImage } from "@prismicio/next";
import { PrismicRichText, PrismicText, SliceZone } from "@prismicio/react";
import SharingOptions from '../../components/SharingOptions';

import { HiOutlineLocationMarker } from "react-icons/hi";

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

export async function generateStaticParams() {
  const client = createClient();
  const articles = await client.getAllByType("articles");

  return articles.map((article) => {
    return { uid: article.uid };
  });
}

export default async function Page({ params }) {
  const { uid } = await params;
  const client = createClient();

  const article = await client.getByUID("articles", uid, {
      ref: client.masterRef,
      fetchOptions: {
        cache: 'no-store',
      },
  });

  const publicationDate = article.data.publication_date || article.first_publication_date;
  const formattedDate = publicationDate 
      ? format(new Date(publicationDate), "MMMM d, yyyy") 
      : "Unknown date";

  return (
    <>
        <article className={styles.container}>
          <Breadcrumbs 
            category={article.data.type} 
            title={article.data.title} 
            subtitle={article.data.subtitle}
            uid={article.uid}
          />

          <div className={styles.header}>
            <span className={styles.date}>
              {formattedDate}
            </span>
            <h1 className={styles.title}>
              {article.data.title}
            </h1>
            {article.data.subtitle && (
              <h2 className={styles.subtitle}>
                {article.data.subtitle}
              </h2>
            )}
            {article.data.event && (
              <span className={styles.event}>
                <HiOutlineLocationMarker />
                {article.data.event}
              </span>
            )}
          </div>    

          {article.data.featured_image && (
            <PrismicNextImage 
              className={styles.featuredimage}
              field={article.data.featured_image} 
              alt=""
              fallbackAlt=""
            />
          )}

          <div className={styles.content}>
              <SliceZone slices={article.data.slices} components={components} />
          </div>

          <SharingOptions 
            className={styles.Sharing}
            uid={article.uid} 
            title={article.data.meta_title} 
            idol={article.data.idol_name} 
          />
        </article>
    </>
  );
}