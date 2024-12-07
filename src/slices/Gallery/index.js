/**
 * @typedef {import("@prismicio/client").Content.GallerySlice} GallerySlice
 * @typedef {import("@prismicio/react").SliceComponentProps<GallerySlice>} GalleryProps
 * @param {GalleryProps}
 */

import React from "react";
import Gallery from "@/app/components/Gallery";
import styles from "./page.module.scss";

const GallerySlice = ({ slice }) => {
  const images = slice.primary.images;

  return (
    <section
      data-slice-type={slice.slice_type}
      data-slice-variation={slice.variation}
      className={styles.GalleryContainer}
    >
        <h2>Gallery</h2>
        <Gallery
          images={images}
        />
    </section>
  );
};

export default GallerySlice;