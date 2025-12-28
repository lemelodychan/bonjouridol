"use client";

import React, { useState } from "react";
import { PrismicNextImage } from "@prismicio/next";
import { useInView } from "react-intersection-observer";
import styles from "./SingleImage.module.scss";

import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import { HiChevronRight, HiChevronLeft, HiX, HiOutlineZoomIn } from "react-icons/hi";

import { TbLoader2 } from "react-icons/tb";

const SingleImage = ({ image, alt, color = "default", lightbox="false" }) => {
  if (!image || image.length === 0) {
    return null;
  }

  // Check if it's a valid Prismic image field (has dimensions or width property)
  const isPrismicImage = image.dimensions || image.width;
  
  const hasLightbox = lightbox;
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const openLightbox = (index) => {
    setCurrentIndex(index);
    setIsOpen(true);
  };
  const closeLightbox = () => {
    setIsOpen(false);
  };
  const lightboxImage = {
    src: image.url,
    thumbnail: image.url,
  };

  const { ref, inView } = useInView({
    triggerOnce: true,
    rootMargin: "200px",
  });
  const [loading, setLoading] = useState(true);
  const placeholderClass = `Placeholder ${
    color === "white" ? "GreyBg" : color === "dark" ? "DarkBg" : ""
  }`;

  return (
    <>
      <div 
        ref={ref} 
        className={`${styles.SingleImageContainer} ${loading ? styles.Loading : styles.Loaded}`}
      >
          {inView ? (
              isPrismicImage ? (
                <PrismicNextImage
                    field={image}
                    alt={alt || ""}
                    fallbackAlt=""
                    className={styles.SingleImage}
                    onLoad={() => setLoading(false)} // Called when the image is fully loaded
                />
              ) : (
                <img
                    src={image.url}
                    alt={alt || image.alt || ""}
                    className={styles.SingleImage}
                    onLoad={() => setLoading(false)}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              )
          ) : (
              <div className={`${styles.Placeholder} ${placeholderClass}`}>
                  <span>
                      <TbLoader2 size={24} />
                  </span>
              </div>
          )}

          {hasLightbox === "true" && (
            <div onClick={() => setIsOpen(true)} className={styles.ViewItem}>
              <span>
                <HiOutlineZoomIn />
              </span>
            </div>
          )}
      </div>
      {isOpen && hasLightbox === "true" && (
        <Lightbox
          render={{
            iconClose: () => <HiX size={24} />,
          }}
          open={isOpen}
          close={() => setIsOpen(false)}
          slides={[lightboxImage]}
          thumbs={[lightboxImage.thumbnail]}
          carousel={{
            finite: true,
            preload: 0,
            slidesToScroll: 1,
          }}
          controller={{
            navigation: false,
          }}
        />
      )}
    </>
  );
};

export default SingleImage;