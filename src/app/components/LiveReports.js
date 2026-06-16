import React from "react";
import Slider from "./Slider";
import { createClient } from "@/prismicio";
import * as prismic from "@prismicio/client";
import { getKnownArtistNames, resolveArtistNames } from "@/utils/artistUtils";

import Link from "next/link";
import Button from "./IconButton";
import { IoArrowForwardOutline } from "react-icons/io5";

import styles from "./LiveReports.module.scss";

export default async function LiveReports() {
  const client = createClient();

  const [results, knownArtists] = await Promise.all([
    client.getByType("articles", {
      fetchOptions: {
        next: { 
          tags: ["prismic", "articles"],
          revalidate: false // Cached until the Prismic webhook invalidates this tag
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
        prismic.filter.any("my.articles.type", ["Live report"]),
      ],
    }),
    getKnownArtistNames(),
  ]);

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
    groups: resolveArtistNames(item.data.idol_name, knownArtists),
  }));

  return (
    <div className={styles.LiveReports}>
      <h2>
        <span className={styles.title}>
          <span className={styles.en}>Live Reports</span>
          <span className={styles.ja}>ライブレポート</span>
        </span>
        <Link href="/livereports" className={styles.btn}>
          <Button variant={"White"} textValue={"See more articles"} icon={<IoArrowForwardOutline />} />
        </Link>
      </h2>
      
      <Slider 
        slides={slides}
        className={styles.Slider} />

      <div className={styles.LiveReportsFooter}>
        <Link href="/livereports" className={styles.btn}>
          <Button variant={"Pink"} textValue={"See more articles"} icon={<IoArrowForwardOutline />} />
        </Link>
      </div>
    </div>
  );
}