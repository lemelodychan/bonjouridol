"use client";

import { format } from "date-fns";
import Link from "next/link";
import { IoArrowForwardOutline } from "react-icons/io5";
import Button from "./IconButton";
import SingleImage from "./SingleImage";
import Breadcrumbs from "./Breadcrumbs";
import DocListPagination from "./DocListPagination";
import { useState } from "react";
import React from "react";

import styles from "./DocList.module.scss";

export default function DocListContainer({ results, currentPage, totalPages, postType }) {
  const folderName = postType;

  return (
    <div className={styles.DocListContainer}>
      <Breadcrumbs className={styles.Breadcrumbs} category={folderName} />
      <div className={`${styles.DocList} ${postType === "Gallery" ? styles.Galleries : ""}`}>
        {results.length > 0 ? (
          results.map((item) => {
            const linkPath = postType === "Gallery"
              ? `/galleries/${item.uid}`
              : `/articles/${item.uid}`;

            const publicationDate = item.data.publication_date || item.data.event_date || item.first_publication_date;
            const formattedDate = publicationDate
              ? format(new Date(publicationDate), "MMMM d, yyyy")
              : "Unknown date";

            const richTextSlice = item.data.slices.find(
              (slice) => slice.slice_type === "rich_text" && slice.primary?.text
            );
            const paragraphs = richTextSlice?.primary?.text?.map((block) => block.text) || [];
            const joinedText = paragraphs.join(" ");
            
            const photographerName = item.data.photographer?.uid || "Bonjour Idol";
            const photographerName2 = item.data.photographer_2?.uid;

            const artistNames = item.data.artist_name || "";
            const artistArray = artistNames.split(',').map(name => name.trim());

            return (
              <Link key={item.id} className={styles.Post} href={linkPath}>
                {item.data.featured_image && (
                  <div className={styles.FeaturedImage}>
                    <SingleImage 
                      image={item.data.featured_image}
                      alt={item.data.featured_image.alt || ""}
                      color="GreyBg"  
                    />
                  </div>
                )}
                {postType === "Gallery" && artistArray?.length > 0 && (
                  <ArtistTags artists={artistArray} />
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
                          <span key={tag} className={`${styles.Tag} ${styles[sanitizedTag]}`}>
                            {tag}
                          </span>
                        );
                      })}
                    </div>
                  )}
                  <h3>
                    <span>{item.data.title}</span>
                    <span className={styles.icon}><IoArrowForwardOutline /></span>
                  </h3>
                  {item.data.subtitle && (
                    <span className={styles.Subtitle}>{item.data.subtitle}</span>
                  )}
                  <span className={styles.Date}>
                    <span>{formattedDate}</span>
                    {postType === "Gallery" && !item.data.photographer_2.uid && (
                        <span className={styles.Photographer}>&nbsp;ー Shot by <strong>{photographerName}</strong></span>
                    )}
                    {postType === "Gallery" && item.data.photographer_2.uid && (
                        <span className={styles.Photographer}>&nbsp;ー Shot by <strong>{photographerName}</strong> and <strong>{photographerName2}</strong></span>
                    )}
                  </span>

                  {joinedText && (
                    <p className={styles.Excerpt}>{joinedText}</p>
                  )}

                  <Button variant={"White"} textValue={`${postType === "Gallery" ? "View" : "Read more"}`} icon={<IoArrowForwardOutline />} />
                </div>
              </Link>
            );
          })
        ) : (
          <p>No results found.</p>
        )}
      </div>
      <DocListPagination currentPage={currentPage} totalPages={totalPages} />
    </div>
  );
}

// ArtistTags component with tooltip functionality
function ArtistTags({ artists }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  
  const displayArtists = artists.slice(0, 3);
  const remainingCount = artists.length - 3;
  const hasMoreArtists = remainingCount > 0;

  // Set desktop detection on mount
  React.useEffect(() => {
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

  const handleCounterClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowTooltip(!showTooltip);
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
    <span className={styles.Artists}>
      {displayArtists.map((artist, index) => (
        <span key={index} className={styles.Artist}>
          {artist}
        </span>
      ))}
      {hasMoreArtists && (
        <span 
          className={`${styles.Artist} ${styles.ArtistCounter}`}
          onClick={handleCounterClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          +{remainingCount}
          {showTooltip && (
            <div className={styles.ArtistTooltip}>
              <div className={styles.TooltipContent}>
                <div className={styles.TooltipArtists}>
                  {artists.slice(3).join(', ')}
                </div>
              </div>
            </div>
          )}
        </span>
      )}
    </span>
  );
}