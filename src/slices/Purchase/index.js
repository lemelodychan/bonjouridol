/**
 * @typedef {import("@prismicio/client").Content.PurchaseSlice} PurchaseSlice
 * @typedef {import("@prismicio/react").SliceComponentProps<PurchaseSlice>} PurchaseProps
 * @param {PurchaseProps}
 */
import { PrismicNextImage } from "@prismicio/next";
import { PrismicNextLink } from "@prismicio/next";
import { format } from 'date-fns';

import styles from "./page.module.scss";

const Purchase = ({ slice }) => {
  const releaseDate = slice.primary.release_date;
  const release = releaseDate 
      ? format(new Date(releaseDate), "MMMM d, yyyy") 
      : "Unknown date";

  return (
    <section
      data-slice-type={slice.slice_type}
      data-slice-variation={slice.variation}
      className={styles.Purchase}
    >
      <h3>Support the artist</h3>
      <div className={styles.PurchaseContainer}>
        <div className={styles.ImageContainer}>
          <PrismicNextImage 
            field={slice.primary.cd_cover}
            fallbackAlt=""
          />
        </div>
        <div className={styles.Info}>
          <h4>{slice.primary.title}</h4>
          <span className={styles.Artist}>{slice.primary.artist}</span>
          <span className={styles.Release}>Released on <strong>{release}</strong></span>
          <div className={styles.Buttons}>
            {slice.primary.links.map((item) => (
              <PrismicNextLink field={item.link} />
            ))}
          </div>
        </div>
      </div>
      <div className={styles.Buttons}>
        {slice.primary.links.map((item) => (
          <PrismicNextLink field={item.link} />
        ))}
      </div>
    </section>
  );
};

export default Purchase;
