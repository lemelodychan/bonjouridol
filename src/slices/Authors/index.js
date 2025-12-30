/**
 * @typedef {import("@prismicio/client").Content.AuthorsSlice} AuthorsSlice
 * @typedef {import("@prismicio/react").SliceComponentProps<AuthorsSlice>} AuthorsProps
 * @param {AuthorsProps}
 */
import Author from "@/app/components/Author";
import Logo from "@/app/assets/Square_Logo_Pink.png";
import { RiQuillPenFill } from "react-icons/ri";
import { RiCameraFill } from "react-icons/ri";
import { HiMiniCamera } from "react-icons/hi2";

import Image from "next/image";
import styles from "./page.module.scss";

const Authors = ({ slice }) => {
  const author = slice.primary.author?.data 
    ? slice.primary.author 
    : slice.primary.translator_pr;  // Fallback to translator_pr if author is not available
  const photo = slice.primary.photographer;
  const photo2 = slice.primary.photographer_2;
  const isOfficial = slice.primary.official_photos;
  const translatorJP = slice.primary.translator_jp;
  const translatorFR = slice.primary.translator_fr;
  const translatorEN = slice.primary.translator_en;

  const getTranslationString = (translatorFR, translatorEN, translatorJP) => {
    const translators = [];
  
    if (translatorFR?.data?.name) {
      translators.push(`French by <strong>${translatorFR.data.name}</strong>`);
    }
    if (translatorEN?.data?.name) {
      translators.push(`English by <strong>${translatorEN.data.name}</strong>`);
    }
    if (translatorJP?.data?.name) {
      translators.push(`Japanese by <strong>${translatorJP.data.name}</strong>`);
    }
  
    if (translators.length === 0) return null;
  
    return `Translated to ${translators.join(" and ")}`;
  };
  
  const translation = getTranslationString(translatorFR, translatorEN, translatorJP);

  // Determine if we can merge "Written and photographed"
  // Only merge if: author === photo1 AND no photo2 AND no official photos
  const canMergeWritingAndPhotography = 
    author?.uid === photo?.uid && 
    !photo2?.data && 
    !isOfficial;

  // Determine the author type text
  // Remove "Written by" but keep "Press release translated by"
  const authorType = author === slice.primary.author ? "" : "Press release translated";

  // Determine if we should use plural for titles
  // Authors section: plural if there's author + translators (count translators)
  const translatorCount = [
    translatorFR?.data?.name,
    translatorEN?.data?.name,
    translatorJP?.data?.name
  ].filter(Boolean).length;
  const hasMultipleAuthors = translatorCount > 0;
  const authorsTitle = hasMultipleAuthors ? "Authors" : "Author";

  // Photographers section: plural if there are 2 photographers
  const hasMultiplePhotographers = photo2?.data;
  const photographersTitle = hasMultiplePhotographers ? "Photographers" : "Photographer";

  return (
    <div 
      className={styles.credits}
      data-slice-type={slice.slice_type}
      data-slice-variation={slice.variation}
    >
      <div className={styles.AuthorsSection}>
        <h3 className={styles.AuthorsHeader}><RiQuillPenFill /> {authorsTitle}</h3>
        <div className={styles.AuthorsContainer}>
          {canMergeWritingAndPhotography ? (
            // Simple case: Author wrote and photographed, no other photographers or official photos
            <Author author={author} type="Written and photographed" translator={translation} />
          ) : (
            <>
              {/* Always show the author/writer */}
              <Author 
                author={author || {}} 
                type={authorType} 
                translator={translation} 
              />
              
              {/* Show official photos block if applicable */}
              {isOfficial && (
                <div className={styles.OfficialPhotos}>
                  <span className={styles.authorImg}>
                    <Image 
                      src={Logo}
                      alt="Bonjour Idol Logo" 
                      height={48}
                    />
                  </span>
                  <div className={styles.AuthorInfo}>
                    <h4>
                      Official photos courtesy of&nbsp;
                      <span className={styles.AuthorName}>event and artist management</span>.
                    </h4>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Show photographer(s) block if any photographer data exists */}
      {!canMergeWritingAndPhotography && photo?.data && (
        <div className={styles.PhotographersSection}>
          <h3 className={styles.PhotographersHeader}><HiMiniCamera /> {photographersTitle}</h3>
          <div className={styles.PhotographersContainer}>
            {photo2?.data ? (
              // Two photographers: show as separate cards
              <>
                <Author author={photo} type="" />
                <Author author={photo2} type="" />
              </>
            ) : (
              // Single photographer: show in same structure
              <Author author={photo} type="" />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Authors;
