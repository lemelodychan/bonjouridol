"use client";

import React, { useState } from "react";
import Masonry from "react-masonry-css";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import { PrismicNextImage } from "@prismicio/next";
import SingleImage from "./SingleImage";
import { useInView } from "react-intersection-observer";
import styles from "./Gallery.module.scss";

import { HiChevronRight, HiChevronLeft, HiX, HiOutlineZoomIn } from "react-icons/hi";
import { TbLoader2 } from "react-icons/tb";

const Gallery = ({ images, color = "default" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const openLightbox = (index) => {
    setCurrentIndex(index);
    setIsOpen(true);
  };

  const closeLightbox = () => {
    setIsOpen(false);
  };

  const lightboxImages = images.map(item => ({
    src: item.image.url, // Full-size image URL
    thumbnail: item.image.url, // You can use the same URL for now or create a smaller thumbnail URL
  }));

  const breakpointColumnsObj = {
    default: 4,
    1100: 3,
    700: 2,
    500: 1,
  };

  return (
    <Masonry
      breakpointCols={breakpointColumnsObj}
      className={`masonry-grid ${styles.Gallery}`}
      columnClassName="masonry-grid_column"
    >
      {images.map((item, index) => {
        const { ref, inView } = useInView({
          triggerOnce: true,
          rootMargin: "200px",
        });

        return (
          <div
            key={index}
            ref={ref}
            onClick={() => openLightbox(index)}
            className={`masonry-item ${styles.GalleryItem}`}
          >
            <SingleImage 
                image={item.image}
                fallbackAlt=""
                color={color}
            />
            <div className={styles.ViewItem}>
              <span>
                <HiOutlineZoomIn />
              </span>
            </div>
          </div>
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
          close={closeLightbox} // Close lightbox when clicking close button
          index={currentIndex}
          slides={lightboxImages.map((image) => ({
            src: image.src, // Full-size image URL
            thumbnail: image.thumbnail, // Thumbnails for the lightbox
          }))}
          thumbs={lightboxImages.map((image) => image.thumbnail)} // Thumbnails for navigation
        />
      )}
    </Masonry>
  );
};

export default Gallery;