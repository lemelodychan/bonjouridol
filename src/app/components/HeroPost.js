import { createClient } from "@/prismicio";
import * as prismic from "@prismicio/client";

import { Article } from "../articles/[uid]/page.js";
import { PrismicNextImage } from "@prismicio/next";
import { PrismicLink, PrismicText, useAllPrismicDocumentsByType } from '@prismicio/react'
import SingleImage from "./SingleImage.js";

import Button from './IconButton.js';
import { IoArrowForwardOutline } from "react-icons/io5";

import styles from './HeroPost.module.scss';

export default async function HeroPost() {
    const client = createClient();

    const results = await client.getAllByType('articles', {
        fetchOptions: {
          cache: 'no-store',
          next: { tags: ['prismic', 'articles'] },
        },
        limit: 1,
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
          prismic.filter.any('document.tags', ['Live Report', 'Interview']),
        ],
    });
    const latestPost = results[0]
    
    return (
        <PrismicLink href={`/articles/${latestPost.uid}`}>
            <div className={styles.Hero}>
                <div className={styles.Content}>
                    <div className={styles.Tags}>
                        {latestPost.tags.map((item) => (
                            <span key={item} className={styles.Tag}>{item}</span>
                        ))}
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