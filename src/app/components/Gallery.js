"use client";

import React, { useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css"; // Import the lightbox styles
import { PrismicNextImage } from "@prismicio/next";
import styles from "./Gallery.module.scss";

import { HiChevronRight, HiChevronLeft, HiX } from "react-icons/hi";

const Gallery = ({ images }) => {
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
    src: item.image.url, // Full-size image URL
    thumbnail: item.image.url, // You can use the same URL for now or create a smaller thumbnail URL
  }));

  return (
    <section className={styles.Gallery}>
      {images.map((item, index) => (
        <div
          key={index}
          className={styles.GalleryItem}
          onClick={() => openLightbox(index)}
        >
          <PrismicNextImage
            field={item.image}
            alt={`Gallery Image ${index + 1}`}
            width={400}
            height={400}
          />
        </div>
      ))}

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
          thumbs={lightboxImages.map(image => image.thumbnail)} // Thumbnails for navigation
        />
      )}
    </section>
  );
};

export default Gallery;