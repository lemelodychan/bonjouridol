import { createClient } from '@/prismicio'
import styles from "./page.module.scss"

import { components } from "@/app/slices";
import { PrismicNextImage } from "@prismicio/next";
import { PrismicRichText, PrismicText, SliceZone } from "@prismicio/react";

export const dynamicParams = false;

export async function generateMetadata({ params }) {
  const client = createClient();
  const article = await client.getByUID("articles", params.uid);

  console.log("article:", article.data.slices);

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
  const client = createClient();

  const article = await client
    .getByUID("articles", params.uid)
    .catch(() => notFound());


  return (
    <>
        <article>
          <div className={styles.title}>
            <PrismicText field={article.data.title} />
          </div>
          <div className={styles.featuredimage}>
            <PrismicNextImage field={article.data.featured_image} alt={article.data.title} />
          </div>
          <div className={styles.content}>
            <SliceZone slices={article.data.slices} components={components} />
          </div>
        </article>
    </>
  );
}