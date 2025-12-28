import React from "react";
import Slider from "./Slider";
import { createClient } from "@/prismicio";
import * as prismic from "@prismicio/client";

import Link from "next/link";
import Button from "./IconButton";
import { IoArrowForwardOutline } from "react-icons/io5";

import styles from "./Discoveries.module.scss";

export default async function Discoveries() {
  const client = createClient();

  const results = await client.getByType("articles", {
    fetchOptions: {
      next: { 
        tags: ["prismic", "articles"],
        revalidate: 3600 // Cache for 1 hour
      },
    },
    pageSize: 8,
    orderings: [
      {
        field: "my.articles.publication_date",
        direction: "desc",
      },
      {
        field: "document.first_publication_date",
        direction: "desc",
      },
    ],
    filters: [
      prismic.filter.any("document.tags", ["Discovery"]),
    ],
  });

  if (!results || !results.results || results.results.length === 0) {
    return null; // Return nothing if no articles found
  }

  const slides = results.results.map((item) => ({
    uid: item.uid,
    id: item.id,
    data: item.data,
    tags: item.tags,
    first_publication_date: item.first_publication_date,
    publication_date: item.data.publication_date,
    idol_name: item.data.idol_name,
  }));

  return (
    <div className={styles.Discoveries}>
      <h2>
        <span className={styles.title}>
          <span className={styles.en}>Discoveries</span>
          <span className={styles.ja}>ピックアップ</span>
        </span>
        <Link href="/discoveries" className={styles.btn}>
          <Button variant={"White"} textValue={"See more articles"} icon={<IoArrowForwardOutline />} />
        </Link>
      </h2>
      
      <Slider 
        slides={slides}
        className={styles.Slider} />

      <div className={styles.DiscoveriesFooter}>
        <Link href="/discoveries" className={styles.btn}>
          <Button variant={"Pink"} textValue={"See more articles"} icon={<IoArrowForwardOutline />} />
        </Link>
      </div>
    </div>
  );
}