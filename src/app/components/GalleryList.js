"use client";
import { format } from "date-fns";
import Link from "next/link";
import SingleImage from "./SingleImage";

import React, { useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { FreeMode, Navigation, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";

import { IoArrowForwardOutline } from "react-icons/io5";
import { HiChevronRight, HiChevronLeft } from "react-icons/hi";
import styles from "./GalleryList.module.scss";

export default function GalleryList({ results }) {
  const [isBeginning, setIsBeginning] = useState(true);
  const [isEnd, setIsEnd] = useState(false);

  const handleSlideChange = (swiper) => {
    setIsBeginning(swiper.isBeginning);
    setIsEnd(swiper.isEnd);
  };

  return (
    <div className={styles.GalleryListContainer}>
      {results.length > 0 ? (
        <div className={styles.GalleryList}>
          <Swiper
            slidesPerView="auto"
            spaceBetween={0}
            freeMode={true}
            pagination={{ clickable: true }}
            centeredSlides={false}
            navigation={{
              nextEl: ".custom-next",
              prevEl: ".custom-prev",
            }}
            modules={[FreeMode, Pagination, Navigation]}
            className={styles.SwiperContainer}
            onSlideChange={handleSlideChange}
          >
            {results.map((item) => {
              const linkPath = `/galleries/${item.uid}`;

              const publicationDate =
                item.data.publication_date ||
                item.data.event_date ||
                item.first_publication_date;
              const formattedDate = publicationDate
                ? format(new Date(publicationDate), "MMMM d, yyyy")
                : "Unknown date";

              return (
                <SwiperSlide key={item.id} className={styles.Slide}>
                  <Link className={styles.Post} href={linkPath}>
                    {item.data.featured_image && (
                      <div className={styles.FeaturedImage}>
                        <SingleImage
                          image={item.data.featured_image}
                          alt={item.data.featured_image.alt || ""}
                          color="GreyBg"
                        />
                      </div>
                    )}
                    <div className={styles.Content}>
                      {item.tags && (
                        <div className={styles.Tags}>
                          {item.tags.map((tag) => {
                            const sanitizedTag = tag
                              .normalize("NFD")
                              .replace(/[\u0300-\u036f]/g, "")
                              .replace(/\s+/g, "")
                              .toLowerCase();
                            return (
                              <span
                                key={tag}
                                className={`${styles.Tag} ${styles[sanitizedTag]}`}
                              >
                                {tag}
                              </span>
                            );
                          })}
                        </div>
                      )}
                      <h3>
                        <span>{item.data.title}</span>
                      </h3>
                      <span className={styles.Date}>
                        <span>{formattedDate}</span>
                      </span>
                    </div>
                  </Link>
                </SwiperSlide>
              );
            })}
            <SwiperSlide className={styles.Slide}>
                <Link className={styles.SeeAll} href="/galleries">
                    <span>
                    <span>See more galleries</span>
                    <IoArrowForwardOutline />
                    </span>
                </Link>
            </SwiperSlide>
            <div
                className={`custom-prev ${
                isBeginning ? styles.Hidden : ""
                }`}
            >
                <HiChevronLeft />
            </div>
            <div
                className={`custom-next ${
                isEnd ? styles.Hidden : ""
                }`}
            >
                <HiChevronRight />
            </div>
          </Swiper>
        </div>
      ) : (
        <p>No galleries found.</p>
      )}
    </div>
  );
}