import styles from "./page.module.scss";
import skeletonStyles from "./loading.module.scss";
import docListStyles from "../components/DocList.module.scss";

export default function PageLoading() {
  return (
    <div className={styles.container}>
      {/* Page header skeleton */}
      <h1>
        <div className={skeletonStyles.titleSkeleton}>
          <div className={skeletonStyles.line} style={{ width: "60%" }}></div>
        </div>
      </h1>
      <div className={styles.pageContent}>
        {/* DocList Skeleton - using same skeleton as DocList filtering load */}
        <div className={docListStyles.DocListContainer}>
          {/* Breadcrumbs skeleton */}
          <div className={skeletonStyles.breadcrumbsSkeleton}>
            <div className={skeletonStyles.breadcrumbItem}></div>
            <div className={skeletonStyles.breadcrumbSeparator}></div>
            <div className={skeletonStyles.breadcrumbItem} style={{ width: "80px" }}></div>
          </div>
          {/* Year Filter skeleton */}
          <div className={docListStyles.YearFilter}>
            <div className={skeletonStyles.yearFilterLabel}></div>
            <div className={skeletonStyles.yearFilterSelect}></div>
          </div>
          <div className={docListStyles.DocList}>
            {[...Array(10)].map((_, i) => (
              <div key={`skeleton-${i}`} className={docListStyles.PostSkeleton}>
                <div className={docListStyles.SkeletonFeaturedImage}></div>
                <div className={docListStyles.SkeletonContent}>
                  <div className={docListStyles.SkeletonTags}>
                    <div className={docListStyles.SkeletonTag}></div>
                  </div>
                  <div className={docListStyles.SkeletonTitle}>
                    <div className={docListStyles.SkeletonLine} style={{ width: "90%" }}></div>
                    <div className={docListStyles.SkeletonLine} style={{ width: "75%" }}></div>
                  </div>
                  <div className={docListStyles.SkeletonSubtitle}>
                    <div className={docListStyles.SkeletonLine} style={{ width: "80%" }}></div>
                  </div>
                  <div className={docListStyles.SkeletonDate}>
                    <div className={docListStyles.SkeletonLine} style={{ width: "50%" }}></div>
                  </div>
                  <div className={docListStyles.SkeletonExcerpt}>
                    <div className={docListStyles.SkeletonLine} style={{ width: "100%" }}></div>
                    <div className={docListStyles.SkeletonLine} style={{ width: "98%" }}></div>
                    <div className={docListStyles.SkeletonLine} style={{ width: "85%" }}></div>
                  </div>
                  <div className={docListStyles.SkeletonButton}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

