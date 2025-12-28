import styles from './page.module.scss'
import LatestPosts from './components/LatestPosts.js';
import LiveReports from './components/LiveReports';
import ArtistHighlight from './components/ArtistHighlight';
import Discoveries from './components/Discoveries';
import Videos from './components/Videos';
import PressRelease from './components/PressRelease';

import { createClient } from "@/prismicio";
import { SliceZone } from "@prismicio/react";
import { components } from '@/slices';

export async function generateMetadata() {
  try {
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
  } catch (error) {
    console.error('Error fetching homepage metadata:', error);
    return {
      title: 'BONJOUR IDOL',
      description: 'Bonjour Idol is a French media about the Japanese idol scene. Our team are idol fans and will be sharing their passion through photo reports of concerts and events, interviews and more exclusive content.',
      openGraph: {
        title: 'BONJOUR IDOL',
        description: 'Bonjour Idol is a French media about the Japanese idol scene. Our team are idol fans and will be sharing their passion through photo reports of concerts and events, interviews and more exclusive content.',
        url: 'https://www.bonjouridol.com',
        images: [
          {
            url: '/FeaturedImage.png',
            width: 1200,
            height: 630,
            alt: 'Bonjour Idol',
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: 'BONJOUR IDOL',
        description: 'Bonjour Idol is a French media about the Japanese idol scene. Our team are idol fans and will be sharing their passion through photo reports of concerts and events, interviews and more exclusive content.',
        images: ['/FeaturedImage.png'],
      },
    };
  }
}

export default async function Page() {
  try {
    const client = createClient();
    const page = await client.getSingle("homepage");

    return (
      <div className={styles.main}>
        <div className={styles.container}>
          <LatestPosts />
          <LiveReports />
          {/* <ArtistHighlight /> */}
          <Discoveries />
          <Videos />
          <PressRelease />
          <div className={styles.Slices}>
            <SliceZone slices={page.data.slices} components={components} />
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error fetching homepage data:', error);
    return (
      <div className={styles.main}>
        <div className={styles.container}>
          <LatestPosts />
          <LiveReports />
          {/* <ArtistHighlight /> */}
          <Discoveries />
          <Videos />
          <PressRelease />
          <div className={styles.Slices}>
            <p>Content loading...</p>
          </div>
        </div>
      </div>
    );
  }
};