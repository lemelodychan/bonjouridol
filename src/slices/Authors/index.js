/**
 * @typedef {import("@prismicio/client").Content.AuthorsSlice} AuthorsSlice
 * @typedef {import("@prismicio/react").SliceComponentProps<AuthorsSlice>} AuthorsProps
 * @param {AuthorsProps}
 */
import Author from "@/app/components/Author";
import Logo from "@/app/assets/Square_Logo_Pink.png";

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

  return (
    <div 
      className={styles.credits}
      data-slice-type={slice.slice_type}
      data-slice-variation={slice.variation}
    >
      {(author?.uid === photo?.uid && !isOfficial) ? (
        <Author author={author} type="Written and photographed" translator={translation} />
      ) : (
        <>
          {(!photo?.uid && isOfficial) ? (
            <>
              <Author 
                author={author || {}} 
                type="Written" 
                translator={translation} 
              />
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
                    <span className={styles.AuthorName}>artist management</span>.
                  </h4>
                </div>
              </div>
            </>
          ) : (
            <>
              <Author 
                author={author} 
                type={author === slice.primary.author ? "Written" : "PR translated"} 
                translator={translation} 
              />
              
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
                      <span className={styles.AuthorName}>artist management</span>.
                    </h4>
                  </div>
                </div>
              )}

              {/* Only show the photographer block if photo data exists */}
              {photo && photo.data && (
                <Author author={photo} author2={photo2} type="Photographed" />
              )}
            </>
          )}
        </>
      )}

    </div>
  );
};

export default Authors;
