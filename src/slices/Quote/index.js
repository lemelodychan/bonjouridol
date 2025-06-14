/**
 * @typedef {import("@prismicio/client").Content.QuoteSlice} QuoteSlice
 * @typedef {import("@prismicio/react").SliceComponentProps<QuoteSlice>} QuoteProps
 * @param {QuoteProps}
 */

import { PrismicLink, PrismicRichText } from "@prismicio/react";
import styles from "./page.module.scss";
import { HiOutlineLink } from 'react-icons/hi';

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
          {slice.primary.quote_jp && slice.primary.quote_jp.length > 0 && (
            <span className={styles.QuoteTextJP}>
              <PrismicRichText field={slice.primary.quote_jp} />
            </span>
          )}
          {(slice.primary.author || (slice.primary.source && slice.primary.source.url)) && (
            <div className={styles.QuoteAuthorContainer}>
              {slice.primary.author && (
                <span className={styles.QuoteAuthor}>{slice.primary.author}</span>
              )}
              {slice.primary.source && slice.primary.source.url && (
                <PrismicLink field={slice.primary.source} className={styles.QuoteLink}>
                  <span>{slice.primary.source.text}</span>
                  <HiOutlineLink />
                </PrismicLink>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default Quote;
