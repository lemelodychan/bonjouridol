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

  const results = await client.getAllByType("articles", {
    fetchOptions: {
      cache: "no-store",
      next: { tags: ["prismic", "articles"] },
    },
    limit: 5,
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

  const slides = results.map((item) => ({
    uid: item.uid,
    id: item.id,
    data: item.data,
    tags: item.tags,
    first_publication_date: item.first_publication_date,
    publication_date: item.data.publication_date,
  }));

  return (
    <div className={styles.Discoveries}>
      <h2>
        <span>Discoveries</span>
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