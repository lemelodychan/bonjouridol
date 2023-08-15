import styles from './page.module.scss'
import Link from 'next/link'
import Navbar from './components/Navbar'
import Button from './components/IconButton.js';
import LatestPosts from './components/LatestPosts.js';

import { IoArrowForwardOutline } from "react-icons/io5";

import { asText } from "@prismicio/client";
import { SliceZone } from "@prismicio/react";

import { createClient } from "@/prismicio";
import { components } from "@/app/slices";
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

  console.log("Page:", page)

  return (
    <div className={styles.main}>
      <Navbar />

      <h1>{page.data.meta_title}</h1>

      <div className={styles.container}>
        <LatestPosts />
      </div>

      <div className={styles.homeBackground}>
        <PrismicNextImage field={page.data.background} />
      </div>
    </div>
  );
};