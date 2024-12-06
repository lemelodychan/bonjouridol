import { createClient } from "@/prismicio";
import { Article } from "../articles/[uid]/page.js";
import { PrismicNextImage } from "@prismicio/next";
import { PrismicLink, PrismicText, useAllPrismicDocumentsByType } from '@prismicio/react'

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
            field: 'document.first_publication_date',
            direction: 'desc',
          },
        ],
      })
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
                    <Button variant={"Pink"} textValue={"Read more"} icon={<IoArrowForwardOutline />} />
                </div>
                <div className={styles.FeaturedImage}>
                    <PrismicNextImage 
                        field={latestPost.data.featured_image} 
                        alt=""
                        fallbackAlt=""
                    />
                </div>
            </div>
        </PrismicLink>
    );
}