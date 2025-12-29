/**
 * @typedef {import("@prismicio/client").Content.RichTextSlice} RichTextSlice
 * @typedef {import("@prismicio/react").SliceComponentProps<RichTextSlice>} RichTextProps
 * @param {RichTextProps}
 */
import { PrismicRichText } from "@prismicio/react";

import styles from "./page.module.scss";

const RichText = ({ slice }) => {
  return (
    <section
      data-slice-type={slice.slice_type}
      data-slice-variation={slice.variation}
      className={styles.RichText}
      {...(slice.primary.anchor && { id: slice.primary.anchor })}
    >
      {slice.primary.title && (
        <h3>
          <span className={styles.title}>
            <span className={styles.english}>{slice.primary.title}</span>
            {slice.primary.title_ja && (
              <span className={styles.japanese}>{slice.primary.title_ja}</span>
            )}
          </span>
        </h3>
      )}
      <div className={styles.Content}>
        <span className={styles.english}>
          <PrismicRichText field={slice.primary.text} />
        </span>
        {slice.primary.text_ja && (
          <span className={styles.japanese}>
            <PrismicRichText field={slice.primary.text_ja} />
          </span>
        )}
      </div>
    </section>
  );
};

export default RichText;
