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
    >
      {slice.primary.title && (
        <h3>{slice.primary.title}</h3>
      )}
      <div className={styles.Content}>
        <PrismicRichText field={slice.primary.text} />
      </div>
    </section>
  );
};

export default RichText;
