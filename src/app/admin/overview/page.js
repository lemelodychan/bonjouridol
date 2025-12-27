'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import styles from './page.module.scss'
import Button from '@/app/components/IconButton'
import { IoRefreshOutline } from 'react-icons/io5'

const CACHE_KEY = 'admin_stats_cache'
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

export default function OverviewPage() {
  const [stats, setStats] = useState({
    totalArtists: 0,
    totalArticles: 0,
    totalLikes: 0,
    artistRankings: [],
    articleLikeRankings: [],
    articleViewRankings: []
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadStats()
  }, [])

  function getCachedStats() {
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (!cached) return null

      const { data, timestamp } = JSON.parse(cached)
      const now = Date.now()

      // Check if cache is still valid (within 24 hours)
      if (now - timestamp < CACHE_DURATION) {
        return data
      }

      // Cache expired, remove it
      localStorage.removeItem(CACHE_KEY)
      return null
    } catch (error) {
      console.error('Error reading cache:', error)
      return null
    }
  }

  function setCachedStats(data) {
    try {
      const cacheData = {
        data,
        timestamp: Date.now()
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData))
    } catch (error) {
      console.error('Error setting cache:', error)
    }
  }

  function clearCache() {
    try {
      localStorage.removeItem(CACHE_KEY)
    } catch (error) {
      console.error('Error clearing cache:', error)
    }
  }

  async function loadStats(forceRefresh = false) {
    // Check cache first if not forcing refresh
    if (!forceRefresh) {
      const cachedStats = getCachedStats()
      if (cachedStats) {
        setStats(cachedStats)
        setLoading(false)
        // Fetch fresh data in background
        fetchStats(true)
        return
      }
    }

    // No cache or force refresh - fetch from API
    await fetchStats(false, forceRefresh)
  }

  async function fetchStats(silent = false, forceRefresh = false) {
    try {
      if (!silent) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }
      setError('')
      
      const response = await fetch('/api/admin/stats', {
        cache: 'no-store' // Always fetch fresh data from API
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `Failed to fetch stats (${response.status})`)
      }

      const data = await response.json()
      setStats(data)
      setCachedStats(data) // Cache the fresh data
      setError('')
    } catch (error) {
      console.error('Error fetching stats:', error)
      if (!silent) {
        setError(error.message || 'Failed to load statistics. Please try again.')
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  async function handleRefresh() {
    clearCache()
    await loadStats(true)
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading statistics...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{error}</div>
        <button onClick={() => loadStats(true)} className={styles.retryButton}>
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Overview</h1>
        <Button
          onClick={handleRefresh}
          disabled={refreshing || loading}
          variant="White"
          textValue={refreshing ? 'Refreshing...' : 'Refresh Data'}
          icon={<IoRefreshOutline />}
        />
      </div>

      <div className={styles.content}>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.totalArtists}</div>
            <div className={styles.statLabel}>Total Artists</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.totalArticles}</div>
            <div className={styles.statLabel}>Total Articles</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{(stats.totalLikes || 0).toLocaleString()}</div>
            <div className={styles.statLabel}>Total 🥐</div>
          </div>
        </div>

        <div className={styles.rankingsSection}>
          <div className={styles.rankingCard}>
            <h2 className={styles.rankingTitle}>Top Artists by Likes</h2>
            {stats.artistRankings.length > 0 ? (
              <div className={styles.tableWrapper}>
                <table className={styles.rankingTable}>
                  <thead className={styles.tableHeader}>
                    <tr>
                      <th className={styles.tableHeaderCellRank}></th>
                      <th className={styles.tableHeaderCellName}>Artist</th>
                      <th className={styles.tableHeaderCellLikes}>🥐</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.artistRankings.map((artist, index) => (
                      <tr key={artist.name} className={styles.tableRow}>
                        <td className={styles.tableCellRank}>{index + 1}</td>
                        <td className={styles.tableCellName}>{artist.name}</td>
                        <td className={styles.tableCellLikes}>{artist.totalLikes.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className={styles.noData}>No artist data available</p>
            )}
          </div>

          <div className={styles.rankingCard}>
            <h2 className={styles.rankingTitle}>Top Articles by Likes</h2>
            {stats.articleLikeRankings.length > 0 ? (
              <div className={styles.tableWrapper}>
                <table className={styles.rankingTable}>
                  <thead className={styles.tableHeader}>
                    <tr>
                      <th className={styles.tableHeaderCellRank}></th>
                      <th className={styles.tableHeaderCellName}>Article Slug</th>
                      <th className={styles.tableHeaderCellLikes}>🥐</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.articleLikeRankings.map((article, index) => (
                      <tr key={article.slug} className={styles.tableRow}>
                        <td className={styles.tableCellRank}>{index + 1}</td>
                        <td className={styles.tableCellName}>
                          <Link href={`https://www.bonjouridol.com/${article.slug}`} target="_blank" rel="noopener noreferrer" className={styles.articleLink}>
                            {article.slug}
                          </Link>
                        </td>
                        <td className={styles.tableCellLikes}>{article.totalLikes.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className={styles.noData}>No article like data available</p>
            )}
          </div>

          <div className={styles.rankingCard} style={{ gridColumn: 'span 2' }}>
            <h2 className={styles.rankingTitle}>Top Articles by Views</h2>
            {stats.articleViewRankings.length > 0 ? (
              <div className={styles.tableWrapper}>
                <table className={styles.rankingTable}>
                  <thead className={styles.tableHeader}>
                    <tr>
                      <th className={styles.tableHeaderCellRank}></th>
                      <th className={styles.tableHeaderCellName}>Article Slug</th>
                      <th className={styles.tableHeaderCellLikes}>Views</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.articleViewRankings.map((article, index) => (
                      <tr key={article.slug} className={styles.tableRow}>
                        <td className={styles.tableCellRank}>{index + 1}</td>
                        <td className={styles.tableCellName}>
                          <Link href={`https://www.bonjouridol.com/articles/${article.slug}`} target="_blank" rel="noopener noreferrer" className={styles.articleLink}>
                            {article.slug}
                          </Link>
                        </td>
                        <td className={styles.tableCellLikes}>{article.totalViews.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className={styles.noData}>No article view data available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

