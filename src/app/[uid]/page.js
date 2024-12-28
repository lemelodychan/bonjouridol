import { createClient } from "@/prismicio";
import { SliceZone } from "@prismicio/react";
import { components } from "@/slices";

import styles from "./page.module.scss";

export async function generateMetadata({ params }) {
  const { uid } = await params;
  const client = createClient();
  const page = await client.getByUID("page", uid);

  return {
    title: page.data.meta_title,
    description: page.data.meta_description,
  };
}

export async function generateStaticParams() {
  const client = createClient();
  const pages = await client.getAllByType("page");

  return pages.map((page) => ({ uid: page.uid }));
}

export default async function Page({ params }) {
  const { uid } = await params;
  const client = createClient();
  const page = await client.getByUID("page", uid);

  return (
    <div className={styles.container}>
        <h1>{page.data.title}</h1>
        <div className={styles.pageContent}>
          <SliceZone slices={page.data.slices} components={components} />
        </div>
    </div>
  );
}
