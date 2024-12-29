"use client";
import React from "react";
import { useState, useEffect } from "react";

import { Swiper, SwiperSlide } from 'swiper/react'; // Import Swiper and SwiperSlide
import { FreeMode } from "swiper/modules";
import { Navigation, Pagination } from "swiper/modules";
import 'swiper/css';
import "swiper/css/pagination";
import "swiper/css/navigation";

import { format } from "date-fns";
import { IoArrowForwardOutline } from "react-icons/io5"; // For the arrow icon
import { HiChevronRight, HiChevronLeft} from "react-icons/hi";

import styles from "./Slider.module.scss";
import { PrismicLink } from "@prismicio/react";
import SingleImage from "./SingleImage"; 

const Slider = ({ slides }) => {

    const [isBeginning, setIsBeginning] = useState(true);
    const [isEnd, setIsEnd] = useState(false);

    const handleSlideChange = (swiper) => {
        setIsBeginning(swiper.isBeginning);
        setIsEnd(swiper.isEnd);
    };

    return (
            <Swiper
                slidesPerView="auto"
                spaceBetween={0}
                freeMode={true}
                pagination={{clickable: true,}}
                centeredSlides={false}
                navigation={{
                    nextEl: '.custom-next',
                    prevEl: '.custom-prev',
                }}
                modules={[FreeMode, Pagination, Navigation]}
                className={styles.SwiperContainer}
                onSlideChange={handleSlideChange}
            >
                {slides.map((item) => {
                    const publicationDate = item.data.publication_date || item.first_publication_date;
                    const formattedDate = publicationDate
                    ? format(new Date(publicationDate), "MMMM d, yyyy")
                    : "Unknown date";

                    return (
                    <SwiperSlide key={item.id} className={styles.Slide}>
                        <PrismicLink className={styles.DiscoveryPost} href={`/articles/${item.uid}`}>
                        <div className={styles.FeaturedImage}>
                            <SingleImage
                            image={item.data.featured_image}
                            alt={item.data.featured_image.alt || ""}
                            />
                        </div>
                        <div className={styles.Content}>
                            <div className={styles.Tags}>
                            {item.tags.map((tag) => {
                                const sanitizedTag = tag
                                .normalize("NFD")
                                .replace(/[\u0300-\u036f]/g, "")
                                .replace(/\s+/g, "")
                                .toLowerCase();
                                return (
                                <span key={tag} className={`${styles.Tag} ${styles[sanitizedTag]}`}>
                                    {tag}
                                </span>
                                );
                            })}
                            </div>
                            <div className={styles.Title}>
                            <h3>
                                <span>{item.data.title}</span>
                                <span className={styles.icon}>
                                <IoArrowForwardOutline />
                                </span>
                            </h3>
                            </div>
                            <span className={styles.Date}>{formattedDate}</span>
                        </div>
                        </PrismicLink>
                    </SwiperSlide>
                    );
                })}
                <div 
                    className={`custom-prev ${isBeginning ? 'hidden' : ''}`}
                >
                    <HiChevronLeft />
                </div>
                <div 
                    className={`custom-next ${isEnd ? 'hidden' : ''}`}
                >
                    <HiChevronRight />
                </div>
            </Swiper>
    );
};

export default Slider;
