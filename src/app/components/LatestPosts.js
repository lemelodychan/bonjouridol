import { createClient } from "@/prismicio";
import * as prismic from "@prismicio/client";

import { PrismicNextImage } from "@prismicio/next";
import { PrismicLink, PrismicText, useAllPrismicDocumentsByType } from '@prismicio/react'

import HeroPost from './HeroPost.js';
import SingleImage from "./SingleImage.js";
import Button from './IconButton.js';
import { IoArrowForwardOutline } from "react-icons/io5";

import styles from './LatestPosts.module.scss';
import "../styles/mixins.scss"
import Link from "next/link.js";

export default async function LatestPost() {
    const client = createClient();

    const results = await client.getAllByType('articles', {
        fetchOptions: {
          cache: 'no-store',
          next: { tags: ['prismic', 'articles'] },
        },
        limit: 4,
        orderings: [
          {
            field: 'document.first_publication_date',
            direction: 'desc',
          },
        ],
        filters: [
            prismic.filter.any(
                'document.tags',
                ['Live Report', 'Interview']
            ),
        ],
    })

    const sortedResults = results.sort((a, b) => {
        const dateA =
          a.data.publication_date ||
          a.first_publication_date;
        const dateB =
          b.data.publication_date ||
          b.first_publication_date;
        return new Date(dateB) - new Date(dateA);
      });
    delete sortedResults[0];
    
    return (
        <div className={styles.LatestPosts}>
            <HeroPost />

            <div className={styles.OtherPosts}>
                <h2><span>Other Posts</span></h2>

                {sortedResults.map((item) => (
                    <PrismicLink key={item.id} className={styles.OtherPost} href={`/articles/${item.uid}`}>
                        <div className={styles.FeaturedImage}>
                            <SingleImage 
                                image={item.data.featured_image}
                                alt={item.data.featured_image.alt || ""}  
                            />
                        </div>
                        <div className={styles.Content}>
                            <div className={styles.Tags}>
                                {item.tags.map((item) => (
                                    <span key={item} className={styles.Tag}>{item}</span>
                                ))}
                            </div>
                            <div className={styles.Title}>
                                <h3>
                                    <span>{item.data.title}</span>
                                    <span className={styles.icon}><IoArrowForwardOutline /></span>
                                </h3>
                                {item.data.subtitle && (
                                    <span>{item.data.subtitle}</span>
                                )}
                            </div>
                        </div>
                    </PrismicLink>
                ))}

                <Link href="https://bonjouridol.com/" className={styles.btn}>
                    <Button variant={"Pink"} textValue={"See more articles"} icon={<IoArrowForwardOutline />} />
                </Link>

            </div>
        </div>
    );
}