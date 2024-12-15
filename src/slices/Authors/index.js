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
  const author = slice.primary.author;
  const photo = slice.primary.photographer;
  const isOfficial = slice.primary.official_photos;

  return (
    <div 
      className={styles.credits}
      data-slice-type={slice.slice_type}
      data-slice-variation={slice.variation}
    >
      {author && photo && author.uid === photo.uid ? (
        <Author author={author} type="Written and photographed" />
      ) : (
        <>
          <Author author={author} type="Written" />
          
          {isOfficial ? (
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
          ) : (
            photo && photo.data && (
              <Author author={photo} type="Photographed" />
            )
          )}
        </>
      )}
    </div>
  );
};

export default Authors;
