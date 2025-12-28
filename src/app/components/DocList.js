"use client";

import { format } from "date-fns";
import Link from "next/link";
import { IoArrowForwardOutline } from "react-icons/io5";
import Button from "./IconButton";
import SingleImage from "./SingleImage";
import Breadcrumbs from "./Breadcrumbs";
import DocListPagination from "./DocListPagination";
import StaticLikeCount from "./StaticLikeCount";
import CustomSelect from "./CustomSelect";
import { useBatchArticleStats } from "./hooks/useBatchArticleStats";
import { useState, useMemo, useEffect, useRef } from "react";
import React from "react";
import { useRouter } from "next/navigation";

import styles from "./DocList.module.scss";

export default function DocListContainer({ results, currentPage, totalPages, postType, likeCounts = {}, availableYears = [], selectedYear = null }) {
  return <DocListContent results={results} currentPage={currentPage} totalPages={totalPages} postType={postType} likeCounts={likeCounts} availableYears={availableYears} selectedYear={selectedYear} />;
}

export function DocListContent({ results, currentPage, totalPages, postType, likeCounts = {}, availableYears = [], selectedYear = null }) {
  const folderName = postType;
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [localSelectedYear, setLocalSelectedYear] = useState(selectedYear);
  const [expectedYear, setExpectedYear] = useState(undefined);
  const previousResultsRef = useRef(results);
  const previousSelectedYearRef = useRef(selectedYear);
  const loadingTimeoutRef = useRef(null);
  
  // Initialize refs on mount and sync local state with prop
  useEffect(() => {
    previousResultsRef.current = results;
    previousSelectedYearRef.current = selectedYear;
    // Update local state when prop changes (after server response)
    setLocalSelectedYear(selectedYear);
  }, [selectedYear]);
  
  // Use server-side like counts if available, otherwise use client-side batch fetching
  const hasServerLikeCounts = Object.keys(likeCounts).length > 0;
  
  // Memoize article slugs to prevent unnecessary re-renders
  const articleSlugs = useMemo(() => {
    if (postType === "Gallery") return [];
    return results.map(item => item.uid).filter(Boolean);
  }, [postType, results]);
  
  // Use batch hook for like counts only if server-side data is not available
  const { getLikeCount: getClientLikeCount, isLoading: likesLoading } = useBatchArticleStats(
    hasServerLikeCounts ? [] : articleSlugs
  );
  
  // Function to get like count (server-side takes precedence)
  const getLikeCount = (slug) => {
    if (hasServerLikeCounts) {
      return likeCounts[slug] || 0;
    }
    return getClientLikeCount(slug);
  };

  // Clear loading state when results or selectedYear change (indicating server response)
  useEffect(() => {
    // Clear any existing timeout
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }

    if (isLoading && expectedYear !== undefined) {
      // Check if selectedYear prop matches what we're expecting (server responded)
      // Handle null case explicitly (for "All years" - both null means match)
      const yearMatches = selectedYear === expectedYear || 
        (selectedYear === null && expectedYear === null);
      
      // Check if results have actually changed by comparing IDs
      const currentIds = results.length > 0 ? results.map(r => r.id).join(',') : '';
      const previousIds = previousResultsRef.current.length > 0 ? previousResultsRef.current.map(r => r.id).join(',') : '';
      const resultsChanged = currentIds !== previousIds;
      
      // Also check if selectedYear changed from previous (even if it doesn't match expected)
      // This helps catch cases where the server responds but the comparison above fails
      const selectedYearChanged = selectedYear !== previousSelectedYearRef.current;
      
      // Check if we're waiting for "All years" (null) and we got it
      const waitingForAllYears = expectedYear === null && selectedYear === null;
      
      if (yearMatches || resultsChanged || selectedYearChanged || waitingForAllYears) {
        setIsLoading(false);
        setExpectedYear(undefined);
        previousResultsRef.current = results;
        previousSelectedYearRef.current = selectedYear;
      } else {
        // Fallback: clear loading after 5 seconds to prevent infinite loading
        loadingTimeoutRef.current = setTimeout(() => {
          setIsLoading(false);
          setExpectedYear(undefined);
        }, 5000);
      }
    } else {
      // Update refs even when not loading to track current state
      previousResultsRef.current = results;
      previousSelectedYearRef.current = selectedYear;
    }

    // Cleanup timeout on unmount
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [results, selectedYear, isLoading, expectedYear]);

  // Handle year filter change
  const handleYearChange = (e) => {
    const newYear = e.target.value;
    const yearValue = newYear ? parseInt(newYear) : null;
    
    // Update local state immediately for instant UI feedback
    setLocalSelectedYear(yearValue);
    
    // Track what year we're expecting to receive from server
    setExpectedYear(yearValue);
    
    // Set loading immediately
    setIsLoading(true);
    
    const url = new URL(window.location.href);
    
    if (newYear) {
      url.searchParams.set("year", newYear);
    } else {
      url.searchParams.delete("year");
    }
    
    // Reset to page 1 when year changes
    url.searchParams.set("page", "1");
    
    router.push(url.toString());
  };

  // Show filter for articles and galleries when years are available
  const showYearFilter = availableYears.length > 0;

  return (
    <div className={styles.DocListContainer}>
      <Breadcrumbs className={styles.Breadcrumbs} category={folderName} />
      {showYearFilter && (
        <div className={styles.YearFilter}>
          <label htmlFor="year-filter" className={styles.YearFilterLabel}>
            Filter by:
          </label>
          <CustomSelect
            id="year-filter"
            value={localSelectedYear || ""}
            onChange={handleYearChange}
            placeholder="All years"
            options={availableYears.map((year) => ({
              value: year.toString(),
              label: year.toString()
            }))}
            className={styles.YearFilterSelect}
          />
        </div>
      )}
      <div className={`${styles.DocList} ${postType === "Gallery" ? styles.Galleries : ""}`}>
        {isLoading ? (
          // Show skeleton while loading
          [...Array(postType === "Gallery" ? 6 : 10)].map((_, i) => (
            postType === "Gallery" ? (
              // Gallery skeleton - full width image with content overlay
              <div key={`skeleton-${i}`} className={styles.GallerySkeleton}>
                <div className={styles.SkeletonGalleryImage}></div>
                <div className={styles.SkeletonGalleryContent}>
                  <div className={styles.SkeletonTags}>
                    <div className={styles.SkeletonTag}></div>
                  </div>
                  <div className={styles.SkeletonTitle}>
                    <div className={styles.SkeletonLine} style={{ width: "80%" }}></div>
                    <div className={styles.SkeletonLine} style={{ width: "60%" }}></div>
                  </div>
                  <div className={styles.SkeletonDate}>
                    <div className={styles.SkeletonLine} style={{ width: "70%" }}></div>
                  </div>
                  <div className={styles.SkeletonButton}></div>
                </div>
              </div>
            ) : (
              // Article skeleton
              <div key={`skeleton-${i}`} className={styles.PostSkeleton}>
                <div className={styles.SkeletonFeaturedImage}></div>
                <div className={styles.SkeletonContent}>
                  <div className={styles.SkeletonTags}>
                    <div className={styles.SkeletonTag}></div>
                  </div>
                  <div className={styles.SkeletonTitle}>
                    <div className={styles.SkeletonLine} style={{ width: "90%" }}></div>
                    <div className={styles.SkeletonLine} style={{ width: "75%" }}></div>
                  </div>
                  <div className={styles.SkeletonSubtitle}>
                    <div className={styles.SkeletonLine} style={{ width: "80%" }}></div>
                  </div>
                  <div className={styles.SkeletonDate}>
                    <div className={styles.SkeletonLine} style={{ width: "50%" }}></div>
                  </div>
                  <div className={styles.SkeletonExcerpt}>
                    <div className={styles.SkeletonLine} style={{ width: "100%" }}></div>
                    <div className={styles.SkeletonLine} style={{ width: "98%" }}></div>
                    <div className={styles.SkeletonLine} style={{ width: "85%" }}></div>
                  </div>
                  <div className={styles.SkeletonButton}></div>
                </div>
              </div>
            )
          ))
        ) : results.length > 0 ? (
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

            // Use artist_name for galleries, idol_name for articles
            const artistNames = postType === "Gallery" 
              ? (item.data.artist_name || "")
              : (item.data.idol_name || "");
            const artistArray = artistNames.split(',').map(name => name.trim()).filter(name => name);

            return (
              <Link key={item.id} className={styles.Post} href={linkPath}>
                {item.data.featured_image && (
                  <div className={styles.FeaturedImage}>
                    <SingleImage 
                      image={item.data.featured_image}
                      alt={item.data.featured_image.alt || ""}
                      color="GreyBg"  
                    />
                    {postType !== "Gallery" && (
                      <StaticLikeCount 
                        articleSlug={item.uid} 
                        likeCount={getLikeCount(item.uid)}
                        isLoading={likesLoading}
                      />
                    )}
                    {postType !== "Gallery" && artistArray?.length > 0 && (
                      <ArtistTags artists={artistArray} />
                    )}
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