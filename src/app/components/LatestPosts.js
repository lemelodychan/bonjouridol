import { createClient } from "@/prismicio";
import { PrismicNextImage } from "@prismicio/next";
import { PrismicLink, PrismicText, useAllPrismicDocumentsByType } from '@prismicio/react'

import HeroPost from './HeroPost.js';
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
    })
    delete results[0];
    
    return (
        <div className={styles.LatestPosts}>
            <HeroPost />

            <div className={styles.OtherPosts}>
                <h2><span>Other Posts</span></h2>

                {results.map((item) => (
                    <PrismicLink key={item.id} className={styles.OtherPost} href={`/articles/${item.uid}`}>
                        <div className={styles.FeaturedImage}>
                            <PrismicNextImage field={item.data.featured_image} alt={item.data.title} />
                        </div>
                        <div className={styles.Content}>
                            <div className={styles.Tags}>
                                {item.tags.map((item) => (
                                    <span key={item} className={styles.Tag}>{item}</span>
                                ))}
                            </div>
                            <h3>
                                <span><PrismicText field={item.data.title} /></span>
                                <span className={styles.icon}><IoArrowForwardOutline /></span>
                            </h3>
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