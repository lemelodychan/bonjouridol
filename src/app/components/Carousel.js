"use client";

import React, { useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, EffectFade, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/effect-fade";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";

import { HiChevronRight, HiChevronLeft, HiX, HiOutlineZoomIn } from "react-icons/hi";
import styles from "./Carousel.module.scss";

import SingleImage from "./SingleImage";

const Carousel = ({ images }) => {
  if (!images || images.length === 0) {
    return null;
  }

  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const openLightbox = (index) => {
    setCurrentIndex(index);
    setIsOpen(true);
  };
  const closeLightbox = () => {
    setIsOpen(false);
  };
  const lightboxImages = images.map(item => ({
    src: item.image.url,
    thumbnail: item.image.url,
  }));

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
          <SwiperSlide 
            key={index} 
            className={styles.Slide}
          >
            <SingleImage 
              image={item.image} 
              ratio="3/2"
              alt={item.image.alt || ""} 
              color="GreyBg"
            />
            <div onClick={() => openLightbox(index)} className={styles.ViewItem}>
              <span>
                <HiOutlineZoomIn />
              </span>
            </div>
          </SwiperSlide>
        );
      })}

      {isOpen && (
        <Lightbox
          render={{
            iconPrev: () => <HiChevronLeft size={32} />,
            iconNext: () => <HiChevronRight size={32} />,
            iconClose: () => <HiX size={24} />,
          }}
          open={isOpen}
          close={closeLightbox}
          index={currentIndex}
          slides={lightboxImages.map((image) => ({
            src: image.src,
            thumbnail: image.thumbnail,
          }))}
          thumbs={lightboxImages.map((image) => image.thumbnail)}
        />
      )}
    </Swiper>
  );
};

export default Carousel;