/**
 * @typedef {import("@prismicio/client").Content.ImageGridSlice} ImageGridSlice
 * @typedef {import("@prismicio/react").SliceComponentProps<ImageGridSlice>} ImageGridProps
 * @param {ImageGridProps}
 */
import Gallery from "@/app/components/Gallery";
import styles from "./page.module.scss";

const ImageGrid = ({ slice }) => {
  const images = slice.primary.item;

  return (
    <section
      data-slice-type={slice.slice_type}
      data-slice-variation={slice.variation}
      className={styles.ImageGrid}
    >
      {/* <h2><span>{slice.primary.title}</span></h2> */}
      <Gallery
        images={images}
      />
    </section>
  );
};

export default ImageGrid;
