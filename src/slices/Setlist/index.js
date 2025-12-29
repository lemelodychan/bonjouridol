"use client";

/**
 * @typedef {import("@prismicio/client").Content.SetlistSlice} SetlistSlice
 * @typedef {import("@prismicio/react").SliceComponentProps<SetlistSlice>} SetlistProps
 * @param {SetlistProps}
 */
import { useState, useEffect } from "react";
import { PrismicNextLink } from "@prismicio/next";
import styles from "./page.module.scss";

import { FaPlay, FaStar } from "react-icons/fa6";

// FavoriteTag component with tooltip
function FavoriteTag() {
  const [showTooltip, setShowTooltip] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkIsDesktop = () => {
      if (typeof window !== 'undefined') {
        setIsDesktop(window.innerWidth > 768);
      }
    };
    
    checkIsDesktop();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', checkIsDesktop);
      
      return () => {
        window.removeEventListener('resize', checkIsDesktop);
      };
    }
  }, []);

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDesktop) {
      setShowTooltip(!showTooltip);
    }
  };

  const handleMouseEnter = () => {
    if (isDesktop) {
      setShowTooltip(true);
    }
  };

  const handleMouseLeave = () => {
    if (isDesktop) {
      setShowTooltip(false);
    }
  };

  return (
    <span 
      className={styles.FavoriteTag} 
      aria-label="Bonjour Idol Favorite"
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <FaStar className={styles.StarIcon} />
      {showTooltip && (
        <div className={styles.Tooltip}>
          <div className={styles.TooltipContent}>
            Bonjour Idol Favorite
          </div>
        </div>
      )}
    </span>
  );
}

const Setlist = ({ slice }) => {
  return (
    <section
      data-slice-type={slice.slice_type}
      data-slice-variation={slice.variation}
      className={styles.SetlistContainer}
      id="setlist"
    >
      <div className={styles.Setlist}>
        <h3>
          <span className={styles.title}>
            <span className={styles.english}>Setlist</span>
            <span className={styles.japanese}>セットリスト</span>
          </span>
        </h3>
        <div>
          <ul className={styles.Songs}>
            {slice.primary.song.map((item, index) => (
              <li key={index} className={styles.Song}>
                <div className={`${styles.SongContent} ${item.is_favorite ? styles.isFavorite : ""}`}>
                  {item.is_favorite && <FavoriteTag />}
                  <span className={styles.Number}>{item.number}.</span>
                  <div className={styles.Name}>
                    <span>{item.title_en}</span>
                  </div>
                  {item.title_jp && (
                    <span className={styles.Jp}>{item.title_jp}</span>
                  )}
                  {item.link.url && (
                    <PrismicNextLink field={item.link}><FaPlay /></PrismicNextLink>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {slice.primary.encore_song?.some(item => item.title_en) && (
            <>
              <ul className={styles.Encore}>
                <h4>{slice.primary.title || "Encore"}</h4>
                {slice.primary.encore_song.map((item, index) => (
                item.title_en && (
                  <li key={index} className={styles.Song}>
                    <div className={`${styles.SongContent} ${item.is_favorite ? styles.isFavorite : ""}`}>
                      {item.is_favorite && <FavoriteTag />}
                      <span className={styles.Number}>
                        {`${String(index + 1).padStart(2, '0')}`}.
                      </span>
                      <div className={styles.Name}>
                        <span>{item.title_en}</span>
                        {item.is_favorite && (
                          <span className={styles.FavoriteTag}>
                            <FaStar className={styles.StarIcon} />
                            <span>Bonjour Idol Favorite</span>
                          </span>
                        )}
                      </div>
                      <span className={styles.Jp}>{item.title_jp}</span>
                      {item.link?.url && (
                        <PrismicNextLink field={item.link}><FaPlay /></PrismicNextLink>
                      )}
                    </div>
                  </li>
                )
              ))}
            </ul>
            </>
          )}

        </div>
      </div>

    </section>
  );
};

export default Setlist;
