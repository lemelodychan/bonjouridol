/**
 * @typedef {import("@prismicio/client").Content.TaglistSlice} TaglistSlice
 * @typedef {import("@prismicio/react").SliceComponentProps<TaglistSlice>} TaglistProps
 * @param {TaglistProps}
 */

import Link from "next/link";
import styles from "./page.module.scss"

const Taglist = ({ slice }) => {
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
            <Link href={`/search?keyword=${encodeURIComponent(item.tag)}`}>
              <strong key={index}>#{item.tag}</strong>
            </Link>
          ))}
      </div>
    </section>
  );
};

export default Taglist;
