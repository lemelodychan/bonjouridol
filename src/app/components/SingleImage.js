"use client";

import React, { useState } from "react";
import { PrismicNextImage } from "@prismicio/next";
import { useInView } from "react-intersection-observer";
import styles from "./SingleImage.module.scss";

import { TbLoader2 } from "react-icons/tb";

const SingleImage = ({ image, alt, color = "default" }) => {
  if (!image || image.length === 0) {
    return null;
  }
  const { ref, inView } = useInView({
    triggerOnce: true, // Load the image only once
    rootMargin: "200px", // Preload slightly before it enters the viewport
  });

  const [loading, setLoading] = useState(true);

  const placeholderClass = `Placeholder ${
    color === "white" ? "GreyBg" : color === "dark" ? "DarkBg" : ""
  }`;

  return (
    <div 
      ref={ref} 
      className={`${styles.SingleImageContainer} ${loading ? styles.Loading : styles.Loaded}`}
    >
        {inView ? (
            <PrismicNextImage
                field={image}
                alt={alt || ""}
                fallbackAlt=""
                className={styles.SingleImage}
                onLoadingComplete={() => setLoading(false)} // Called when the image is fully loaded
            />
        ) : (
            <div className={`${styles.Placeholder} ${placeholderClass}`}>
                <span>
                    <TbLoader2 size={24} />
                </span>
            </div>
        )}
    </div>
  );
};

export default SingleImage;