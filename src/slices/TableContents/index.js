'use client';

/**
 * @typedef {import("@prismicio/client").Content.TableContentsSlice} TableContentsSlice
 * @typedef {import("@prismicio/react").SliceComponentProps<TableContentsSlice>} TableContentsProps
 * @param {TableContentsProps}
 */
import { PrismicNextLink } from "@prismicio/next";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

import styles from "./page.module.scss";

const TableContents = ({ slice }) => {
  const pathname = usePathname();

  // Handle smooth scroll for anchor links after page navigation
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const anchorId = hash.substring(1);
      setTimeout(() => {
        const element = document.getElementById(anchorId);
        if (element) {
          const offset = 100; // Offset for fixed headers
          const elementPosition = element.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - offset;

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }
      }, 100);
    }
  }, [pathname]);

  const handleLinkClick = (e, link) => {
    const url = link?.url || '';
    
    // Check if this is a same-page anchor link (starts with #)
    if (url.startsWith('#')) {
      e.preventDefault();
      const anchorId = url.substring(1);
      const element = document.getElementById(anchorId);
      
      if (element) {
        const offset = 100; // Offset for fixed headers
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    } else {
      // Check if it's a same-page link with anchor (e.g., /articles/xxx#anchor)
      const hashIndex = url.indexOf('#');
      if (hashIndex !== -1) {
        const baseUrl = url.substring(0, hashIndex);
        const isSamePage = baseUrl === pathname || baseUrl === '' || baseUrl === window.location.pathname;
        
        if (isSamePage) {
          e.preventDefault();
          const anchorId = url.substring(hashIndex + 1);
          const element = document.getElementById(anchorId);
          
          if (element) {
            const offset = 100;
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - offset;

            window.scrollTo({
              top: offsetPosition,
              behavior: 'smooth'
            });
          }
        }
        // If it's a different page, let PrismicNextLink handle navigation
        // The useEffect will handle smooth scroll after navigation
      }
    }
  };

  return (
    <section
      data-slice-type={slice.slice_type}
      data-slice-variation={slice.variation}
      className={styles.TableContents}
    >
      <h3>
        <span className={styles.title}>
          <span className={styles.english}>{slice.primary.title_en || "Table of Contents"}</span>
          <span className={styles.japanese}>{slice.primary.title_ja || "目次"}</span>
        </span>
      </h3>
      <div className={styles.Content}>
        {slice.primary.content_link.map((item, index) => (
          <div key={index} className={styles.ContentItem}>
            <span className={styles.ContentItemNumber}>{index + 1}</span>
            <PrismicNextLink 
              field={item.link}
              onClick={(e) => handleLinkClick(e, item.link)}
            >
              {item.link.text}
            </PrismicNextLink>
          </div>
        ))}
      </div>
    </section>
  );
};

export default TableContents;
