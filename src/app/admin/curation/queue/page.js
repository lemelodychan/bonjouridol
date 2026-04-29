'use client'

import Link from 'next/link'
import styles from './page.module.scss'

export default function QueuePage() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <a href="/admin/curation" className={styles.backLink}>← Content Queue</a>
        <h1 className={styles.title}>Review Queue</h1>
      </div>
      <div className={styles.placeholder}>
        <p>The queue will be available once the AI pipeline is set up in Phase 3.</p>
        <p>
          In the meantime, <Link href="/admin/curation/sources">add your sources</Link> to get ready.
        </p>
      </div>
    </div>
  )
}
