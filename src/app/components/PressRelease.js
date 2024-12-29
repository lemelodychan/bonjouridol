import { createClient } from "@/prismicio";
import * as prismic from "@prismicio/client";
import { format } from 'date-fns';

import { PrismicNextImage } from "@prismicio/next";
import { PrismicLink, PrismicText, useAllPrismicDocumentsByType } from '@prismicio/react'

import SingleImage from "./SingleImage.js";
import Button from './IconButton.js';
import { IoArrowForwardOutline } from "react-icons/io5";

import styles from './PressRelease.module.scss';
import "../styles/mixins.scss"
import Link from "next/link.js";

export default async function PressRelease() {
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
            prismic.filter.at(
                'document.tags',
                ['PR']
            ),
        ],
    });
    
    const sortedResults = results.sort((a, b) => {
        const dateA =
          a.data.publication_date ||
          a.first_publication_date;
        const dateB =
          b.data.publication_date ||
          b.first_publication_date;
        return new Date(dateB) - new Date(dateA);
    });   
    
    return (
        <div className={styles.PressRelease}>
            <h2>
                <span>Press Release</span>
                <Link href="/pressrelease" className={styles.btn}>
                    <Button variant={"WhiteGrey"} textValue={"See more articles"} icon={<IoArrowForwardOutline />} />
                </Link>
            </h2>

            <div className={styles.PostContainer}>
                {sortedResults.map((item) => {
                    const publicationDate = item.data.publication_date || item.first_publication_date;
                    const formattedDate = publicationDate
                        ? format(new Date(publicationDate), "MMMM d, yyyy")
                        : "Unknown date";

                    return (
                        <PrismicLink key={item.id} className={styles.Post} href={`/articles/${item.uid}`}>
                            <div className={styles.FeaturedImage}>
                                <SingleImage 
                                    image={item.data.featured_image}
                                    alt={item.data.featured_image.alt || ""}  
                                />
                            </div>
                            <div className={styles.Content}>
                                <div className={styles.Tags}>
                                    {item.tags.map((tag) => {
                                        const sanitizedTag = tag
                                            .normalize("NFD")
                                            .replace(/[\u0300-\u036f]/g, "")
                                            .replace(/\s+/g, "")
                                            .toLowerCase();
                                        return (
                                            <span key={tag} className={`${styles.Tag} ${styles[sanitizedTag]}`}>
                                                {tag}
                                            </span>
                                        );
                                    })}
                                </div>
                                <div className={styles.Title}>
                                    <h3>
                                        <span>{item.data.title}</span>
                                        <span className={styles.icon}><IoArrowForwardOutline /></span>
                                    </h3>
                                    {item.data.subtitle && (
                                        <span>{item.data.subtitle}</span>
                                    )}
                                    <span className={styles.Date}>{formattedDate}</span>
                                </div>
                            </div>
                        </PrismicLink>
                    );
                })}
            </div>

            <Link href="/pressrelease" className={styles.btn}>
                <Button variant={"Pink"} textValue={"See more articles"} icon={<IoArrowForwardOutline />} />
            </Link>
        </div>
    );
}