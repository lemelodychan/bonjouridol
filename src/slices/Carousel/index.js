/**
 * @typedef {import("@prismicio/client").Content.CarouselSlice} CarouselSlice
 * @typedef {import("@prismicio/react").SliceComponentProps<CarouselSlice>} CarouselProps
 * @param {CarouselProps}
 */

import React from "react";
import Carousel from "@/app/components/Carousel";
import styles from "./page.module.scss";

const ImageCarousel = ({ slice }) => {
  const images = slice.primary.slides;

  return (
    <section
      data-slice-type={slice.slice_type}
      data-slice-variation={slice.variation}
      className={styles.Carousel}
    >
      <Carousel images={images} />
    </section>
  );
};

export default ImageCarousel;
