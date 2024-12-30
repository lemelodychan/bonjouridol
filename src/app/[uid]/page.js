import { createClient } from "@/prismicio";
import * as prismic from "@prismicio/client";

import { SliceZone } from "@prismicio/react";
import { components } from "@/slices";
import DocListContainer from "../components/DocList";

import styles from "./page.module.scss";

export async function generateMetadata({ params }) {
  const { uid } = params;
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

export default async function Page({ params, searchParams }) {
  const { uid } = params;
  const currentPage = parseInt(searchParams.page) || 1;
  const client = createClient();
  const page = await client.getByUID("page", uid);
  const isOtherType = page.data.type === "Other";

  let postType, category;
  const pageType = page.data.type || searchParams.type || "Live reports"; 

  switch (pageType) {
    case "Live reports":
      postType = "Live report";
      category = "articles";
      break;
    case "Discoveries":
      postType = "Discovery";
      category = "articles";
      break;
    case "Press Releases":
      postType = "Press release";
      category = "articles";
      break;
    case "Galleries":
      postType = "Gallery"; 
      category = "galleries";
      break;
    default:
      postType = "Unknown";
      category = "unknown";
  }

  let results = [];
  let totalPages = 0;
  const defaultPageSize = 10;

  // Fetch articles or galleries based on the postType
  if (category === "articles") {
    const articles = await client.getByType("articles", {
      fetchOptions: {
        cache: 'no-store',
      },
      pageSize: defaultPageSize,
      page: currentPage,
      orderings: [
        { field: 'my.articles.publication_date', direction: 'desc' },
        { field: 'document.first_publication_date', direction: 'desc' },
      ],
      filters: [
        prismic.filter.at('my.articles.type', postType),
      ]
    });
    results = articles.results;
    totalPages = Math.ceil(articles.total_results_size / defaultPageSize);
  }

  if (category === "galleries") {
    const galleries = await client.getByType("gallery", {
      ref: client.masterRef,
      fetchOptions: {
        cache: 'no-store',
      },
      pageSize: defaultPageSize,
      page: currentPage,
      orderings: [
        { field: 'my.gallery.event_date', direction: 'desc' },
        { field: 'document.first_publication_date', direction: 'desc' },
      ],
      fetchLinks: [
        "my.gallery.photographer.name", 
      ],
      filters: [
        prismic.filter.not('my.gallery.is_official_photos', true),
      ],
    });
    results = galleries.results;
    totalPages = Math.ceil(galleries.total_results_size / defaultPageSize); 
  }  

  return (
    <div className={styles.container}>
      <h1>{page.data.title}</h1>
      <div className={styles.pageContent}>
        <SliceZone slices={page.data.slices} components={components} />
        
        {!isOtherType && (
          <DocListContainer 
            results={results} 
            currentPage={currentPage} 
            totalPages={totalPages} 
            postType={postType} 
          />
        )}
      </div>
    </div>
  );
}
