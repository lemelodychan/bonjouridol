import styles from "./page.module.scss";
import skeletonStyles from "./loading.module.scss";

export default function SearchLoading() {
  return (
    <div className={styles.SearchPage}>
      {/* Title Skeleton */}
      <h1>
        <span className={styles.title}>
          <div className={skeletonStyles.titleSkeleton}>
            <div className={skeletonStyles.line} style={{ width: "60%" }}></div>
            <div className={skeletonStyles.line} style={{ width: "40%" }}></div>
          </div>
        </span>
      </h1>

      {/* Gallery List Skeleton */}
      <div className={styles.GalleryList}>
        <div className={skeletonStyles.sectionTitle}></div>
        <div className={skeletonStyles.galleryGrid}>
          {[...Array(3)].map((_, i) => (
            <div key={i} className={skeletonStyles.galleryItem}>
              <div className={skeletonStyles.image}></div>
            </div>
          ))}
        </div>
      </div>

      {/* Search Results Skeleton */}
      <div className={styles.SearchResults}>
        <div className={styles.DocList}>
          <div className={skeletonStyles.docListContainer}>
            {[...Array(5)].map((_, i) => (
              <div key={i} className={skeletonStyles.post}>
                <div className={skeletonStyles.featuredImage}></div>
                <div className={skeletonStyles.content}>
                  <div className={skeletonStyles.tags}>
                    <div className={skeletonStyles.tag}></div>
                  </div>
                  <div className={skeletonStyles.title}>
                    <div className={skeletonStyles.line} style={{ width: "90%" }}></div>
                    <div className={skeletonStyles.line} style={{ width: "75%" }}></div>
                  </div>
                  <div className={skeletonStyles.subtitle}>
                    <div className={skeletonStyles.line} style={{ width: "80%" }}></div>
                  </div>
                  <div className={skeletonStyles.date}>
                    <div className={skeletonStyles.line} style={{ width: "50%" }}></div>
                  </div>
                  <div className={skeletonStyles.excerpt}>
                    <div className={skeletonStyles.line} style={{ width: "100%" }}></div>
                    <div className={skeletonStyles.line} style={{ width: "98%" }}></div>
                    <div className={skeletonStyles.line} style={{ width: "85%" }}></div>
                  </div>
                  <div className={skeletonStyles.button}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

