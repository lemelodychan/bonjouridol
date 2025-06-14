import styles from './page.module.scss'
import LatestPosts from './components/LatestPosts.js';
import Discoveries from './components/Discoveries';
import Videos from './components/Videos';
import PressRelease from './components/PressRelease';

import { createClient } from "@/prismicio";
import { SliceZone } from "@prismicio/react";
import { components } from '@/slices';

export async function generateMetadata() {
  const client = createClient();
  const page = await client.getSingle("homepage");

  const title = page.data.meta_title || 'BONJOUR IDOL';
  const description = page.data.meta_description || 'Bonjour Idol is a French media about the Japanese idol scene. Our team are idol fans and will be sharing their passion through photo reports of concerts and events, interviews and more exclusive content.';
  const imageUrl = page.data.meta_image?.url || '/FeaturedImage.png';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: 'https://www.bonjouridol.com',
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

export default async function Page() {
  const client = createClient();
  const page = await client.getSingle("homepage");

  return (
    <div className={styles.main}>
      <div className={styles.container}>
        <LatestPosts />
        <Discoveries />
        <Videos />
        <PressRelease />
        <div className={styles.Slices}>
          <SliceZone slices={page.data.slices} components={components} />
        </div>
      </div>
    </div>
  );
};