'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import styles from './page.module.scss'
import Button from '@/app/components/IconButton'
import { IoSettingsOutline, IoListOutline } from 'react-icons/io5'
import { FiAlertTriangle, FiCheck, FiRadio, FiCpu, FiDownload } from 'react-icons/fi'
import { useProcessing } from './layout'

export default function CurationDashboard() {
  const { processing, processResult, processTotal, handleProcessQueue, setProcessResult } = useProcessing()
  const [sources, setSources] = useState([])
  const [queueCounts, setQueueCounts] = useState({ raw: 0, pending: 0, approved: 0, rejected: 0, published: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [crawlingAll, setCrawlingAll] = useState(false)
  const [crawlAllResult, setCrawlAllResult] = useState(null)
  const [crawlingSourceId, setCrawlingSourceId] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (!processing && processResult) loadData()
  }, [processing])

  async function loadData() {
    setLoading(true)
    setError('')
    try {
      const [sourcesRes, queueRes] = await Promise.all([
        fetch('/api/admin/curation/sources'),
        fetch('/api/admin/curation/queue?countOnly=true'),
      ])

      if (sourcesRes.ok) {
        const { sources } = await sourcesRes.json()
        setSources(sources || [])
      }

      if (queueRes.ok) {
        const data = await queueRes.json()
        setQueueCounts(data.counts || { pending: 0, approved: 0, rejected: 0, published: 0 })
      }
    } catch {
      setError('Failed to load dashboard data.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCrawlAll() {
    setCrawlingAll(true)
    setCrawlAllResult(null)
    try {
      const res = await fetch('/api/admin/curation/crawl/all', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Crawl failed')
      setCrawlAllResult(data)
      loadData()
    } catch (err) {
      setCrawlAllResult({ error: err.message })
    } finally {
      setCrawlingAll(false)
    }
  }

  async function handleCrawlSource(sourceId) {
    setCrawlingSourceId(sourceId)
    try {
      const res = await fetch(`/api/admin/curation/sources/${sourceId}/crawl`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Crawl failed')
      setCrawlAllResult(data)
      loadData()
    } catch (err) {
      setCrawlAllResult({ error: err.message })
    } finally {
      setCrawlingSourceId(null)
    }
  }

  const activeSources = sources.filter(s => s.active)
  const errorSources = sources.filter(s => s.last_error)

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Content Queue</h1>
        <div className={styles.headerActions}>
          <Button
            href="/admin/curation/sources"
            variant="WhiteGrey"
            textValue="Manage Sources"
            icon={<FiRadio />}
          />
          <Button
            href="/admin/curation/settings"
            variant="WhiteGrey"
            textValue="Settings"
            icon={<IoSettingsOutline />}
          />
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {loading ? (
        <p className={styles.loading}>Loading…</p>
      ) : (
        <div className={styles.content}>

          {/* Queue stats */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Queue</h2>
              <Button
                href="/admin/curation/queue"
                variant="Pink"
                textValue="Review Queue"
                icon={<IoListOutline />}
              />
            </div>

            {(processing || processResult) && (
              <div className={!processing && processResult?.errors?.length && !processResult?.processed ? styles.processError : styles.processProgress}>
                {(processing || processResult?.running) && processTotal > 0 && (
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressBarFill}
                      style={{ width: `${Math.min(100, Math.round(((processResult?.processed || 0) / processTotal) * 100))}%` }}
                    />
                  </div>
                )}
                <span className={styles.progressLabel}>
                  {(processing || processResult?.running)
                    ? `Processing… ${processResult?.processed || 0} / ${processTotal}`
                    : processResult?.processed === 0 && !processResult?.errors?.length
                      ? 'Nothing to process'
                      : `${processResult?.processed ? `${processResult.processed} processed · ${processResult.pending} pending review · ${processResult.rejected} rejected` : 'Stopped early — previously processed items are saved'}`
                  }
                </span>
                {processResult?.errors?.length > 0 && (
                  <ul className={styles.processErrorList}>
                    {processResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                )}
              </div>
            )}

            <div className={styles.statCards}>
              <div className={`${styles.statCard} ${styles.statCardRaw}`}>
                <span className={styles.statNumber}>{queueCounts.raw}</span>
                <span className={styles.statLabel}>Crawled</span>
                {queueCounts.raw > 0 && (
                  <button
                    className={styles.processButton}
                    onClick={() => handleProcessQueue(queueCounts.raw)}
                    disabled={processing}
                  >
                    <FiCpu />
                    {processing ? 'Processing…' : 'Process'}
                  </button>
                )}
              </div>
              <Link href="/admin/curation/queue?status=pending" className={styles.statCard}>
                <span className={styles.statNumber}>{queueCounts.pending}</span>
                <span className={styles.statLabel}>Pending review</span>
              </Link>
              <Link href="/admin/curation/queue?status=approved" className={`${styles.statCard} ${styles.statCardApproved}`}>
                <span className={styles.statNumber}>{queueCounts.approved}</span>
                <span className={styles.statLabel}>Approved</span>
              </Link>
              <Link href="/admin/curation/queue?status=rejected" className={`${styles.statCard} ${styles.statCardRejected}`}>
                <span className={styles.statNumber}>{queueCounts.rejected}</span>
                <span className={styles.statLabel}>Rejected</span>
              </Link>
              <Link href="/admin/curation/queue?status=published" className={`${styles.statCard} ${styles.statCardPublished}`}>
                <span className={styles.statNumber}>{queueCounts.published}</span>
                <span className={styles.statLabel}>Published</span>
              </Link>
            </div>
          </section>

          {/* Source health */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                Source Health
                <span className={styles.sectionMeta}>
                  {activeSources.length} active · {sources.length} total
                </span>
              </h2>
              <div className={styles.sectionActions}>
                {sources.length > 0 && (
                  <button
                    className={styles.crawlAllButton}
                    onClick={handleCrawlAll}
                    disabled={crawlingAll || crawlingSourceId != null}
                  >
                    <FiDownload />
                    {crawlingAll ? 'Crawling…' : 'Crawl all'}
                  </button>
                )}
                <Button
                  href="/admin/curation/sources"
                  variant="WhiteGrey"
                  textValue="Manage Sources"
                />
              </div>
            </div>

            {crawlAllResult && (
              <div className={crawlAllResult.error ? styles.processError : styles.processSuccess}>
                {crawlAllResult.error
                  ? `Crawl error: ${crawlAllResult.error}`
                  : `Crawl complete — ${crawlAllResult.new} new, ${crawlAllResult.skipped} skipped, ${crawlAllResult.fetched} fetched`
                }
                {crawlAllResult.errors?.length > 0 && (
                  <ul className={styles.processErrorList}>
                    {crawlAllResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                )}
              </div>
            )}

            {sources.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No sources configured yet.</p>
                <Button
                  href="/admin/curation/sources"
                  variant="Pink"
                  textValue="Add your first source"
                />
              </div>
            ) : (
              <>
                {errorSources.length > 0 && (
                  <div className={styles.errorBanner}>
                    <FiAlertTriangle />
                    {errorSources.length} source{errorSources.length > 1 ? 's' : ''} had errors on last crawl
                  </div>
                )}
                <table className={styles.sourceTable}>
                  <thead>
                    <tr>
                      <th>Source</th>
                      <th>Type</th>
                      <th>Last crawled</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sources.map(source => (
                      <tr key={source.id} className={!source.active ? styles.inactiveRow : ''}>
                        <td className={styles.sourceLabel}>{source.label}</td>
                        <td>
                          <span className={`${styles.typeBadge} ${styles[`type_${source.type}`]}`}>
                            {source.type}
                          </span>
                        </td>
                        <td className={styles.lastCrawled}>
                          {source.last_crawled_at
                            ? formatDistanceToNow(new Date(source.last_crawled_at), { addSuffix: true })
                            : <span className={styles.never}>Never</span>
                          }
                        </td>
                        <td>
                          {!source.active ? (
                            <span className={styles.statusInactive}>Inactive</span>
                          ) : source.last_error ? (
                            <span className={styles.statusError} title={source.last_error}>
                              <FiAlertTriangle /> Error
                            </span>
                          ) : (
                            <span className={styles.statusOk}>
                              <FiCheck /> OK
                            </span>
                          )}
                        </td>
                        <td>
                          {source.active && (
                            <button
                              className={styles.crawlOneButton}
                              onClick={() => handleCrawlSource(source.id)}
                              disabled={crawlingAll || crawlingSourceId != null}
                              title="Crawl this source now"
                            >
                              {crawlingSourceId === source.id ? '…' : <FiDownload />}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </section>

        </div>
      )}
    </div>
  )
}
