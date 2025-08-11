/**
 * @typedef {import("@prismicio/client").Content.TaglistSlice} TaglistSlice
 * @typedef {import("@prismicio/react").SliceComponentProps<TaglistSlice>} TaglistProps
 * @param {TaglistProps}
 */

"use client";

import Link from "next/link";
import styles from "./page.module.scss"

const Taglist = ({ slice }) => {
  const handleTagClick = (tag) => {
    // Track tag click with Umami
    if (typeof window !== 'undefined' && window.umami) {
      window.umami.track('tag_search', {
        tag_name: tag,
        click_location: 'homepage'
      });
    }
  };

  return (
    <section
      data-slice-type={slice.slice_type}
      data-slice-variation={slice.variation}
      className={styles.Taglist}
    >
      <div className={styles.TaglistContainer}>
        {slice.primary.tags
          .sort((a, b) => a.tag.localeCompare(b.tag))
          .map((item, index) => (
            <Link 
              key={index} 
              href={`/search?keyword=${encodeURIComponent(item.tag)}`}
              onClick={() => handleTagClick(item.tag)}
            >
              <strong>#{item.tag}</strong>
            </Link>
          ))}
      </div>
    </section>
  );
};

export default Taglist;
