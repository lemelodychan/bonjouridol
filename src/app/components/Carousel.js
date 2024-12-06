"use client";

import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, EffectFade, Autoplay } from "swiper/modules";
import { PrismicNextImage } from "@prismicio/next";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/effect-fade";

import styles from "./Carousel.module.scss";

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
      {images.map((item, index) => (
        <SwiperSlide key={index} className={styles.Slide}>
          <PrismicNextImage 
              field={item.image} 
              fallbackAlt="" />
        </SwiperSlide>
      ))}
    </Swiper>
  );
};

export default Carousel;