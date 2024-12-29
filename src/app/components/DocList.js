import { createClient } from "@/prismicio";
import { PrismicNextImage } from "@prismicio/next";
import { PrismicLink, PrismicText, useAllPrismicDocumentsByType } from '@prismicio/react'

import { IoArrowForwardOutline } from "react-icons/io5";

import styles from "./DocList.module.scss";

export default async function DocListContent({ type }) {
    const client = createClient();

    let category;
    let postType;

    if (type === "Live reports") {
        postType = "Live report";
        category = "articles";
    } else if (type === "Discoveries") {
        postType = "Discovery";
        category = "articles";
    } else if (type === "Press release") {
        postType = "Press release";
        category = "articles";
    } else if (type === "Galleries") {
        postType = "Gallery";
        category = "galleries";
    }

    let results = [];
    const articles = await client.getAllByType("articles", {
        fetchOptions: {
            cache: 'no-store',
            next: { tags: ['prismic', 'articles'] },
        },
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
    });

    const filteredArticles = articles.filter(
        (article) => article.data.type === postType
    );

    if (filteredArticles.length === 0) {
        const galleries = await client.getAllByType("gallery", {
            fetchOptions: {
                cache: 'no-store',
                next: { tags: ['prismic', 'gallery'] },
            },
            orderings: [
                {
                  field: 'my.gallery.event_date',
                  direction: 'desc',
                },
                {
                  field: 'document.first_publication_date',
                  direction: 'desc',
                },
            ],
        });

        results = galleries.filter(
            (gallery) => gallery.data.type === postType
        );
    } else {
        results = filteredArticles;
    }

    console.log("Type:", type);
    console.log("Results:", results);
    
    
    return (
        <div className={styles.DocList}>
            {results.map((item) => {
                const linkPath = type === "Galleries" 
                ? `/galleries/${item.uid}` 
                : `/articles/${item.uid}`;

                return (
                    <PrismicLink key={item.id} className={styles.Post} href={linkPath}>
                        {item.data.featured_image && (
                            <div className={styles.FeaturedImage}>
                                <PrismicNextImage 
                                    field={item.data.featured_image} 
                                    alt=""
                                    fallbackAlt=""
                                />
                            </div>
                        )}
                        <div className={styles.Content}>
                            {item.tags && (
                                <div className={styles.Tags}>
                                    {item.tags.map((item) => (
                                        <span key={item} className={styles.Tag}>{item}</span>
                                    ))}
                                </div>
                            )}
                            <h3>
                                <span>{item.data.title}</span>
                                <span className={styles.icon}><IoArrowForwardOutline /></span>
                            </h3>
                        </div>
                    </PrismicLink>
                );
            })}
        </div>
    );
}