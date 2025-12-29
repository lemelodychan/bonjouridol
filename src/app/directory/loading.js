import styles from "./page.module.scss";
import skeletonStyles from "./loading.module.scss";

export default function DirectoryLoading() {
  // Generate skeleton for multiple letter sections
  const letterSections = ['A', 'B', 'C', 'D', 'E'];
  // Render 6 for card view, 8 for row view - we'll show/hide with CSS
  const cardSkeletons = 6;
  const rowSkeletons = 8;

  return (
      <div className={styles.DirectoryPage}>
      {/* Page header skeleton */}
      <h1>
        <span className={styles.title}>
          <div className={skeletonStyles.titleSkeleton}>
            <div className={skeletonStyles.line} style={{ width: "60%" }}></div>
            <div className={skeletonStyles.line} style={{ width: "40%" }}></div>
          </div>
        </span>
      </h1>

      {/* Alphabet Nav skeleton */}
      <div className={skeletonStyles.alphabetNavSkeleton}>
        <div className={skeletonStyles.alphabetNavContainer}>
        </div>
      </div>

      <div className={styles.DirectoryContainer}>
        {/* Toolbar skeleton */}
        <div className={skeletonStyles.toolbarSkeleton}>
          <div className={skeletonStyles.artistCountSkeleton}></div>
          <div className={skeletonStyles.viewToggleSkeleton}>
            <div className={skeletonStyles.toggleButtonSkeleton}></div>
            <div className={skeletonStyles.toggleButtonSkeleton}></div>
          </div>
        </div>

        <div className={styles.DirectoryContent}>
        <div className={styles.ArtistsGrid}>
          {letterSections.map((letter) => (
            <div key={letter} className={styles.LetterSection}>
              {/* Letter header skeleton with lines */}
              <h2 className={`${styles.LetterHeader} ${skeletonStyles.letterHeaderSkeleton}`}>
                <div className={skeletonStyles.letterHeaderText}></div>
              </h2>
              
              {/* Artists group skeleton - render both, hide one with inline styles */}
              {/* Card view skeletons */}
              <div 
                className={`${styles.ArtistsGroup} ${skeletonStyles.cardViewSkeletons}`} 
                data-view="card"
                suppressHydrationWarning
              >
                {[...Array(cardSkeletons)].map((_, i) => (
                  <div key={`card-skeleton-${letter}-${i}`} className={skeletonStyles.ArtistProfileSkeleton}>
                    <div className={skeletonStyles.ProfileImage}></div>
                    <div className={skeletonStyles.ProfileContent}>
                      <div className={skeletonStyles.ProfileName}>
                        <div className={skeletonStyles.NameLine} style={{ width: "70%" }}></div>
                        <div className={skeletonStyles.NameLine} style={{ width: "50%" }}></div>
                      </div>
                      <div className={skeletonStyles.InfoLine} style={{ width: "60%" }}></div>
                      <div className={skeletonStyles.SocialLinks}>
                        <div className={skeletonStyles.SocialIcon}></div>
                        <div className={skeletonStyles.SocialIcon}></div>
                        <div className={skeletonStyles.SocialIcon}></div>
                      </div>
                      <div className={skeletonStyles.CTAButton}></div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Row view skeletons */}
              <div 
                className={`${styles.ArtistsGroup} ${styles.rowView} ${skeletonStyles.rowViewSkeletons}`} 
                data-view="row"
                suppressHydrationWarning
              >
                {[...Array(rowSkeletons)].map((_, i) => (
                  <div key={`row-skeleton-${letter}-${i}`} className={skeletonStyles.ArtistRowSkeleton}>
                    <div className={skeletonStyles.RowProfileImage}></div>
                    <div className={skeletonStyles.RowProfileContent}>
                      <div className={skeletonStyles.RowProfileName}>
                        <div className={skeletonStyles.RowNameLine} style={{ width: "60%" }}></div>
                        <div className={skeletonStyles.RowNameLine} style={{ width: "40%" }}></div>
                      </div>
                      <div className={skeletonStyles.RowInfo}></div>
                      <div className={skeletonStyles.RowSocialLinks}>
                        <div className={skeletonStyles.RowSocialIcon}></div>
                        <div className={skeletonStyles.RowSocialIcon}></div>
                      </div>
                      <div className={skeletonStyles.RowLikeButton}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        </div>
      </div>
    </div>
  );
}

