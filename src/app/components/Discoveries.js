import { createClient } from "@/prismicio";
import * as prismic from "@prismicio/client";

import { PrismicNextImage } from "@prismicio/next";
import { PrismicLink, PrismicText, useAllPrismicDocumentsByType } from '@prismicio/react'

import HeroPost from './HeroPost.js';
import SingleImage from "./SingleImage.js";
import Button from './IconButton.js';
import { IoArrowForwardOutline } from "react-icons/io5";

import styles from './Discoveries.module.scss';
import Link from "next/link.js";

export default async function Discoveries() {
    const client = createClient();

    const results = await client.getAllByType('articles', {
        fetchOptions: {
            cache: 'no-store',
            next: { tags: ['prismic', 'articles'] },
        },
        limit: 5,
        orderings: [
            {
                field: 'document.first_publication_date',
                direction: 'desc',
            },
        ],
        filters: [
            prismic.filter.any(
                'document.tags',
                ['Discovery']
            ),
        ],
    });        

    console.log(results);
    
    return (
        <div className={styles.Discoveries}>
            <h2><span>Discoveries</span></h2>

            <div className={styles.DiscoveriesScroll}>
                <div className={styles.DiscoveriesContainer}>
                    {results.map((item) => (
                        <PrismicLink key={item.id} className={styles.DiscoveryPost} href={`/articles/${item.uid}`}>
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
                                </div>
                            </div>
                        </PrismicLink>
                    ))}
                </div>
            </div>
            <div className={styles.DiscoveriesFooter}>
                <Link href="/discoveries" className={styles.btn}>
                    <Button variant={"Pink"} textValue={"See more articles"} icon={<IoArrowForwardOutline />} />
                </Link>
            </div>
        </div>
    );
}