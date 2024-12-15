/**
 * @typedef {import("@prismicio/client").Content.ImageSlice} ImageSlice
 * @typedef {import("@prismicio/react").SliceComponentProps<ImageSlice>} ImageProps
 * @param {ImageProps}
 */
import SingleImage from "@/app/components/SingleImage";
import styles from "./page.module.scss";

const Image = ({ slice }) => {
  const isFullwidth = !!slice.primary.is_fullwidth;
  const width = slice.primary.image_width;

  return (
    <section className={styles.ImageSlice}>
      <SingleImage 
        image={slice.primary.image}
        alt={slice.primary.image.alt}
        ratio="3/2"
        className={`${styles.Image} ${isFullwidth ? styles.FullWidth : ""}`}
        style={!isFullwidth ? { 
          width: `${width}px` 
        } : undefined}
      />
    </section>
  );
};

export default Image;