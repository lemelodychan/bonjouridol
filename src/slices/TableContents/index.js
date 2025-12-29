/**
 * @typedef {import("@prismicio/client").Content.TableContentsSlice} TableContentsSlice
 * @typedef {import("@prismicio/react").SliceComponentProps<TableContentsSlice>} TableContentsProps
 * @param {TableContentsProps}
 */
import { PrismicNextLink } from "@prismicio/next";

import styles from "./page.module.scss";

const TableContents = ({ slice }) => {
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
            <span className={styles.ContentItemNumber}>{index + 1}:</span>
            <PrismicNextLink field={item.link}>
              {item.link.text}
            </PrismicNextLink>
          </div>
        ))}
      </div>
    </section>
  );
};

export default TableContents;
