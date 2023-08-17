import styles from './page.module.scss'
import Navbar from './components/Navbar'
import LatestPosts from './components/LatestPosts.js';

import { createClient } from "@/prismicio";
import { PrismicNextImage } from "@prismicio/next";

export async function generateMetadata() {
  const client = createClient();
  const page = await client.getSingle("homepage");

  return {
    title: page.data.meta_title,
    description: page.data.meta_description,
  };
}

export default async function Page() {
  const client = createClient();
  const page = await client.getSingle("homepage");

  return (
    <div className={styles.main}>
      <div className={styles.container}>
        <LatestPosts />
      </div>
    </div>
  );
};