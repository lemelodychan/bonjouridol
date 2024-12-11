/**
 * @typedef {import("@prismicio/client").Content.SetlistSlice} SetlistSlice
 * @typedef {import("@prismicio/react").SliceComponentProps<SetlistSlice>} SetlistProps
 * @param {SetlistProps}
 */
import { PrismicNextLink } from "@prismicio/next";
import styles from "./page.module.scss";

import { FaPlay } from "react-icons/fa6";

const Setlist = ({ slice }) => {
  return (
    <section
      data-slice-type={slice.slice_type}
      data-slice-variation={slice.variation}
      className={styles.SetlistContainer}
    >
      <div className={styles.Setlist}>
        <h3>Setlist</h3>
        <div>
          <ul className={styles.Songs}>
            {slice.primary.song.map((item, index) => (
              <li key={index} className={styles.Song}>
                <span className={styles.Number}>{item.number}.</span>
                <div className={styles.Name}>
                  <span>{item.title_en}</span>
                </div>
                {item.title_jp && (
                  <span className={styles.Jp}>{item.title_jp}</span>
                )}
                {item.link.url && (
                    <PrismicNextLink field={item.link}><FaPlay /></PrismicNextLink>
                  )}
              </li>
            ))}
          </ul>
          <ul className={styles.Encore}>
            {slice.primary.encore_song.map((item, index) => (
              <li key={index} className={styles.Song}>
                <span className={styles.Number}>
                  {`EN${String(index + 1).padStart(2, '0')}`}.
                </span>
                <div className={styles.Name}>
                  <span>{item.title_en}</span>
                </div>
                <span className={styles.Jp}>{item.title_jp}</span>
                {item.link.url && (
                    <PrismicNextLink field={item.link}><FaPlay /></PrismicNextLink>
                  )}
              </li>
            ))}
          </ul>
        </div>
      </div>

    </section>
  );
};

export default Setlist;
