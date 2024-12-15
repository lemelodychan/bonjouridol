"use client";

import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, EffectFade, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/effect-fade";
import styles from "./Carousel.module.scss";

import SingleImage from "./SingleImage";

const Carousel = ({ images }) => {
  if (!images || images.length === 0) {
    return null;
  }

  return (
    <Swiper
      modules={[Pagination, EffectFade, Autoplay]}
      effect="fade"
      pagination={{ clickable: true }}
      loop={true}
      autoplay={{
        delay: 5000,
        disableOnInteraction: false,
      }}
      className={styles.Carousel}
    >
      {images.map((item, index) => {
        return (
          <SwiperSlide key={index} className={styles.Slide}>
            <SingleImage image={item.image} alt={item.image.alt || ""} />
          </SwiperSlide>
        );
      })}
    </Swiper>
  );
};

export default Carousel;