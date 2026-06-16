import { createClient } from "@/prismicio";
import * as prismic from "@prismicio/client";
import { format } from 'date-fns';

import { Article } from "../articles/[uid]/page.js";
import { PrismicNextImage } from "@prismicio/next";
import { PrismicLink, PrismicText, useAllPrismicDocumentsByType } from '@prismicio/react'
import SingleImage from "./SingleImage.js";

import Button from './IconButton.js';
import { IoArrowForwardOutline } from "react-icons/io5";

import styles from './HeroPost.module.scss';

export default async function HeroPost() {
    const client = createClient();

    // Use getByType with pageSize instead of getAllByType to avoid fetching all articles
    // This keeps the response small and cacheable (under 2MB limit)
    const results = await client.getByType('articles', {
        fetchOptions: {
          next: { 
            tags: ['prismic', 'articles'],
            revalidate: false // Cached until the Prismic webhook invalidates this tag
          },
        },
        pageSize: 1,
        orderings: [
          {
            field: 'my.articles.publication_date',
            direction: 'desc',
          },
          {
            field: 'document.first_publication_date',
            direction: 'desc',
          },
        ],
        filters: [
          prismic.filter.any('document.tags', ['Live Report', 'Interview', 'Discovery', 'Behind the scenes', 'Editorial']),
        ],
    });
    const latestPost = results.results[0]

    if (!latestPost) {
        return null; // No post found
    }

    const publicationDate = latestPost.data.publication_date || latestPost.first_publication_date;
    const formattedDate = publicationDate 
        ? format(new Date(publicationDate), "MMMM d, yyyy") 
        : "Unknown date";
    
    return (
        <PrismicLink href={`/articles/${latestPost.uid}`}>
            <div className={styles.Hero}>
                <div className={styles.Content}>
                    <div className={styles.Tags}>
                        {latestPost.tags.map((item) => (
                            <span key={item} className={styles.Tag}>{item}</span>
                        ))}
                        <span className={styles.Date}>{formattedDate}</span>
                    </div>
                    <h1>
                        <span>
                            {latestPost.data.title}
                        </span>
                    </h1>
                    <h2>
                        <span>
                            {latestPost.data.subtitle}
                        </span>
                    </h2>
                    <Button variant={"Pink"} textValue={"Read more"} icon={<IoArrowForwardOutline />} />
                </div>
                <div className={styles.FeaturedImage}>
                    <SingleImage 
                        image={latestPost.data.featured_image}
                        alt={latestPost.data.featured_image.alt || ""}  
                        color="dark"
                    />
                </div>
            </div>
        </PrismicLink>
    );
}