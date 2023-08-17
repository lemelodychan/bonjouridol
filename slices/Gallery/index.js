/**
 * @typedef {import("@prismicio/client").Content.GallerySlice} GallerySlice
 * @typedef {import("@prismicio/react").SliceComponentProps<GallerySlice>} GalleryProps
 * @param {GalleryProps}
 */
import { PrismicNextImage } from "@prismicio/next";
import styles from "./Gallery.module.scss"

const Gallery = ({ slice }) => {
  return (
    <section
      data-slice-type={slice.slice_type}
      data-slice-variation={slice.variation}
    >
      <h3>Gallery</h3>
      <div className={styles.gallery}>
        {slice.items.map((item) => (
          <>
            <PrismicNextImage field={item.image} />
          </>
        ))}
      </div>
    </section>
  );
};

export default Gallery;
