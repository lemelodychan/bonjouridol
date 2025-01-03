/**
 * @typedef {import("@prismicio/client").Content.ImageSlice} ImageSlice
 * @typedef {import("@prismicio/react").SliceComponentProps<ImageSlice>} ImageProps
 * @param {ImageProps}
 */
import SingleImage from "@/app/components/SingleImage";
import styles from "./page.module.scss";

const Image = ({ slice }) => {
  const isFullwidth = Boolean(slice.primary.is_fullwidth); // Default behavior if true: no styling
  const width = slice.primary.image_width 
    ? `${slice.primary.image_width}px` 
    : "100%"; // Default to 100% if no custom width is provided

  return (
    <section className={styles.ImageSlice}>
      <div
        className={`${styles.ImageContainer} ${isFullwidth ? styles.FullWidth : ""}`}
        style={isFullwidth ? undefined : { width }}
      >
        <SingleImage 
          image={slice.primary.image}
          alt={slice.primary.image.alt || "Image"}
          className={styles.Image}
          color="GreyBg"
          lightbox="true"
        />
      </div>
      {slice.primary.comment && 
        <span className={styles.Caption}>{slice.primary.comment}</span>
      }
    </section>
  );
};

export default Image;