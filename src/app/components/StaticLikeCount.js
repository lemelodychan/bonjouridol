'use client'

import styles from './StaticLikeCount.module.scss'

export default function StaticLikeCount({ articleSlug, likeCount = 0, isLoading = false }) {
  if (isLoading) {
    return null
  }

  return (
    <div className={styles.staticLikeCount}>
      <span className={styles.croissantIcon}>🥐</span>
      <span className={styles.likeCount}>{likeCount}</span>
    </div>
  )
}
