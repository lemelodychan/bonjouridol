/**
 * @typedef {import("@prismicio/client").Content.ImageSlice} ImageSlice
 * @typedef {import("@prismicio/react").SliceComponentProps<ImageSlice>} ImageProps
 * @param {ImageProps}
 */
import { PrismicNextImage } from "@prismicio/next";
import styles from "./page.module.scss";

const Image = ({ slice }) => {
  const isFullwidth = !!slice.primary.is_fullwidth;
  const width = slice.primary.image_width;

  return (
    <section className={styles.SingleImageContainer}>
      <PrismicNextImage
        field={slice.primary.image}
        alt={slice.primary.image.alt || ""}
        className={`${styles.SingleImage} ${isFullwidth ? styles.FullWidth : ""}`}
        style={!isFullwidth ? { width: `${width}px` } : undefined}
      />
    </section>
  );
};

export default Image;