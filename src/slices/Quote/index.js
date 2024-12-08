/**
 * @typedef {import("@prismicio/client").Content.QuoteSlice} QuoteSlice
 * @typedef {import("@prismicio/react").SliceComponentProps<QuoteSlice>} QuoteProps
 * @param {QuoteProps}
 */

import { PrismicRichText } from "@prismicio/react";
import styles from "./page.module.scss";

const Quote = ({ slice }) => {
  return (
    <section
      data-slice-type={slice.slice_type}
      data-slice-variation={slice.variation}
      className={styles.Quote}
    >
      <div className={styles.QuoteContainer}>
        <div>
          <span className={styles.QuoteText}>
            <PrismicRichText field={slice.primary.quote} />
          </span>
          <span className={styles.QuoteAuthor}>{slice.primary.author}</span>
        </div>
      </div>

    </section>
  );
};

export default Quote;
