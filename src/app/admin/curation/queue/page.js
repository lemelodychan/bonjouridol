'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatDistanceToNow } from 'date-fns'
import styles from './page.module.scss'
import { FiCheck, FiX, FiChevronDown, FiChevronUp, FiCopy, FiExternalLink, FiRefreshCw, FiFileText, FiSend, FiTrash2, FiRotateCcw, FiArchive, FiDownload, FiTwitter } from 'react-icons/fi'

const STATUSES = ['pending', 'approved', 'rejected']
const LIMIT = 20

const REASON_CATEGORIES = [
  { value: 'male_group',     label: 'Male group' },
  { value: 'anime_2d',       label: 'Anime / 2D / VTuber' },
  { value: 'not_idol',       label: 'Not idol-related' },
  { value: 'duplicate',      label: 'Duplicate' },
  { value: 'off_topic',      label: 'Off-topic' },
  { value: 'low_quality',    label: 'Low quality / spam' },
  { value: 'wrong_language', label: 'Wrong language' },
  { value: 'other',          label: 'Other' },
]

export default function QueuePage() {
  const [status, setStatus] = useState('pending')
  const [typeFilter, setTypeFilter] = useState('')
  const [artistFilter, setArtistFilter] = useState('')
  const [artistDebounced, setArtistDebounced] = useState('')
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actioningId, setActioningId] = useState(null)
  const [rejectingId, setRejectingId] = useState(null)
  const [rejectForm, setRejectForm] = useState({ reason_category: '', reason_text: '' })
  const [expandedId, setExpandedId] = useState(null)
  const [copiedId, setCopiedId] = useState(null)
  const [reprocessing, setReprocessing] = useState(false)
  const [reprocessResult, setReprocessResult] = useState(null)
  const [creatingDraftId, setCreatingDraftId] = useState(null)
  const [draftResults, setDraftResults] = useState({})
  const [dismissingRejected, setDismissingRejected] = useState(false)
  const [dismissResult, setDismissResult] = useState(null)

  useEffect(() => {
    const t = setTimeout(() => setArtistDebounced(artistFilter.trim()), 400)
    return () => clearTimeout(t)
  }, [artistFilter])

  const loadItems = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ status, page, limit: LIMIT })
      if (typeFilter)      params.set('type', typeFilter)
      if (artistDebounced) params.set('idol_name', artistDebounced)
      const res = await fetch(`/api/admin/curation/queue?${params}`)
      if (!res.ok) throw new Error('Failed to load queue')
      const data = await res.json()
      setItems(data.items || [])
      setTotal(data.total || 0)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [status, page, typeFilter, artistDebounced])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  function switchStatus(s) {
    setStatus(s)
    setPage(1)
    setTypeFilter('')
    setArtistFilter('')
    setArtistDebounced('')
    setRejectingId(null)
    setExpandedId(null)
  }

  function setTypeFilterAndReset(t) {
    setTypeFilter(t)
    setPage(1)
  }

  function setArtistFilterAndReset(v) {
    setArtistFilter(v)
    setPage(1)
  }

  async function handleReprocess() {
    setReprocessing(true)
    setReprocessResult(null)
    try {
      const res = await fetch('/api/admin/curation/queue/reprocess', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Reprocess failed')
      setReprocessResult(data)
      loadItems()
    } catch (err) {
      setReprocessResult({ error: err.message })
    } finally {
      setReprocessing(false)
    }
  }

  async function handleAction(item, action) {
    setActioningId(item.id)
    try {
      const res = await fetch(`/api/admin/curation/queue/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Action failed')
      // back_to_pending and reset_draft keep the item in the list but the list needs refreshing
      if (action === 'reset_draft') {
        loadItems()
      } else {
        setItems(prev => prev.filter(i => i.id !== item.id))
        setTotal(prev => prev - 1)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setActioningId(null)
    }
  }

  async function handleDelete(item) {
    if (!confirm('Permanently delete this item from the queue?' +
      (item.prismic_document_id ? '\n\nNote: the Prismic draft must be deleted manually in Prismic → Migration Releases.' : ''))) return
    setActioningId(item.id)
    try {
      const res = await fetch(`/api/admin/curation/queue/${item.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error || 'Delete failed')
      setItems(prev => prev.filter(i => i.id !== item.id))
      setTotal(prev => prev - 1)
    } catch (err) {
      setError(err.message)
    } finally {
      setActioningId(null)
    }
  }

  async function handleRegenerate(item) {
    setActioningId(item.id)
    try {
      // Clear the existing draft reference first
      const resetRes = await fetch(`/api/admin/curation/queue/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_draft' }),
      })
      if (!resetRes.ok) throw new Error('Failed to reset draft')
      // Then create a fresh one
      await handleCreateDraft({ ...item, prismic_document_id: null })
    } finally {
      setActioningId(null)
    }
  }

  async function handlePublish(item) {
    setActioningId(item.id)
    try {
      const res = await fetch(`/api/admin/curation/queue/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish' }),
      })
      if (!res.ok) throw new Error('Failed to mark as published')
      setItems(prev => prev.filter(i => i.id !== item.id))
      setTotal(prev => prev - 1)
    } catch (err) {
      setError(err.message)
    } finally {
      setActioningId(null)
    }
  }

  async function handleCreateDraft(item) {
    setCreatingDraftId(item.id)
    try {
      const res = await fetch('/api/admin/curation/articles/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queue_item_id: item.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create draft')
      setDraftResults(prev => ({ ...prev, [item.id]: { prismicUrl: data.prismicUrl } }))
      // Refresh to get updated prismic_document_id on the item
      loadItems()
    } catch (err) {
      setDraftResults(prev => ({ ...prev, [item.id]: { error: err.message } }))
    } finally {
      setCreatingDraftId(null)
    }
  }

  async function handleApprove(item) {
    setActioningId(item.id)
    try {
      const res = await fetch(`/api/admin/curation/queue/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      })
      if (!res.ok) throw new Error('Approve failed')
      setItems(prev => prev.filter(i => i.id !== item.id))
      setTotal(prev => prev - 1)
    } catch (err) {
      setError(err.message)
    } finally {
      setActioningId(null)
    }
  }

  async function handleReject(item) {
    setActioningId(item.id)
    try {
      const res = await fetch(`/api/admin/curation/queue/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          reason_category: rejectForm.reason_category || 'other',
          reason_text:     rejectForm.reason_text || null,
        }),
      })
      if (!res.ok) throw new Error('Reject failed')
      setItems(prev => prev.filter(i => i.id !== item.id))
      setTotal(prev => prev - 1)
      setRejectingId(null)
      setRejectForm({ reason_category: '', reason_text: '' })
    } catch (err) {
      setError(err.message)
    } finally {
      setActioningId(null)
    }
  }

  async function handleDismissRejected() {
    if (!confirm('Hide all rejected items from this view?\n\nThey will remain in the database for AI training but will no longer appear in the queue.')) return
    setDismissingRejected(true)
    setDismissResult(null)
    try {
      const res = await fetch('/api/admin/curation/queue/dismiss-rejected', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Dismiss failed')
      setDismissResult(data)
      setItems([])
      setTotal(0)
    } catch (err) {
      setDismissResult({ error: err.message })
    } finally {
      setDismissingRejected(false)
    }
  }

  function startRejecting(id) {
    setRejectingId(id)
    setRejectForm({ reason_category: '', reason_text: '' })
  }

  async function copyToClipboard(text, id) {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  async function handleDownloadAll(urls) {
    for (let i = 0; i < urls.length; i++) {
      const a = document.createElement('a')
      a.href = `/api/admin/curation/images/proxy?url=${encodeURIComponent(urls[i])}&download=1`
      a.download = ''
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      if (i < urls.length - 1) await new Promise(r => setTimeout(r, 400))
    }
  }

  function getItemImages(raw) {
    const seen = new Set()
    const urls = []
    for (const url of (raw.image_urls || [])) {
      if (url && !seen.has(url)) { seen.add(url); urls.push(url) }
    }
    for (const block of (raw.body_blocks || [])) {
      if (block.type === 'image' && block.url && !seen.has(block.url)) {
        seen.add(block.url); urls.push(block.url)
      }
    }
    return urls
  }

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <a href="/admin/curation" className={styles.backLink}>← Content Queue</a>
        <h1 className={styles.title}>Review Queue</h1>
      </div>

      <div className={styles.tabs}>
        {STATUSES.map(s => (
          <button
            key={s}
            className={`${styles.tab} ${status === s ? styles.tabActive : ''}`}
            onClick={() => switchStatus(s)}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
            {s === status && total > 0 && <span className={styles.tabCount}>{total}</span>}
          </button>
        ))}
      </div>

      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Type</span>
          <div className={styles.typeToggleGroup}>
            {[['', 'All'], ['article', 'Article'], ['tweet', 'Tweet']].map(([val, label]) => (
              <button
                key={val}
                className={`${styles.typeToggle} ${typeFilter === val ? styles.typeToggleActive : ''}`}
                onClick={() => setTypeFilterAndReset(val)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Artist</span>
          <input
            className={styles.artistInput}
            type="text"
            placeholder="Filter by artist…"
            value={artistFilter}
            onChange={e => setArtistFilterAndReset(e.target.value)}
          />
          {artistFilter && (
            <button className={styles.clearFilter} onClick={() => setArtistFilterAndReset('')}>✕</button>
          )}
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.content}>
        {loading ? (
          <p className={styles.loading}>Loading…</p>
        ) : items.length === 0 ? (
          <div className={styles.empty}>
            {status === 'pending'
              ? 'No items pending review. Run the crawler and process the queue to get new items.'
              : `No ${status} items.`}
          </div>
        ) : (
          <>
            {status === 'pending' && (
              <div className={styles.bulkBar}>
                <button
                  className={styles.reprocessBtn}
                  onClick={handleReprocess}
                  disabled={reprocessing}
                  title="Reset all pending items and run them through the AI again with the current prompt"
                >
                  <FiRefreshCw className={reprocessing ? styles.spinning : ''} />
                  {reprocessing ? 'Re-processing…' : 'Re-process all with current prompt'}
                </button>
                {reprocessResult && (
                  <span className={reprocessResult.error ? styles.reprocessError : styles.reprocessSuccess}>
                    {reprocessResult.error
                      ? `Error: ${reprocessResult.error}`
                      : `Done — ${reprocessResult.pending} pending, ${reprocessResult.rejected} rejected`
                    }
                  </span>
                )}
              </div>
            )}

            {status === 'rejected' && (
              <div className={styles.bulkBar}>
                <button
                  className={styles.dismissBtn}
                  onClick={handleDismissRejected}
                  disabled={dismissingRejected}
                  title="Hide all rejected items from view — they remain in the database for AI training"
                >
                  <FiArchive />
                  {dismissingRejected ? 'Clearing…' : 'Clear rejected items'}
                </button>
                {dismissResult && (
                  <span className={dismissResult.error ? styles.reprocessError : styles.reprocessSuccess}>
                    {dismissResult.error
                      ? `Error: ${dismissResult.error}`
                      : `${dismissResult.dismissed} item${dismissResult.dismissed !== 1 ? 's' : ''} cleared`
                    }
                  </span>
                )}
              </div>
            )}
            <div className={styles.itemList}>
              {items.map(item => {
                const raw = item.raw_content || {}
                const translated = item.translated_content || {}
                const isTweet = item.type === 'tweet'
                const isRejecting = rejectingId === item.id
                const isExpanded = expandedId === item.id
                const isActioning = actioningId === item.id

                return (
                  <div key={item.id} className={`${styles.card} ${isRejecting ? styles.cardRejecting : ''}`}>

                    {/* Card header */}
                    <div className={styles.cardHeader}>
                      <div className={styles.cardMeta}>
                        <span className={`${styles.typeBadge} ${isTweet ? styles.typeTweet : styles.typeArticle}`}>
                          {isTweet ? 'Tweet' : 'Article'}
                        </span>
                        {item.source && (
                          <span className={styles.sourceName}>{item.source.label}</span>
                        )}
                        {raw.published_at && (
                          <span className={styles.date}>
                            {formatDistanceToNow(new Date(raw.published_at), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                      {item.ai_confidence != null && (
                        <span className={`${styles.confidence} ${item.ai_confidence >= 0.8 ? styles.confHigh : item.ai_confidence >= 0.5 ? styles.confMid : styles.confLow}`}>
                          {Math.round(item.ai_confidence * 100)}% confident
                        </span>
                      )}
                    </div>

                    {/* Translated content */}
                    <div className={styles.cardBody}>
                      {translated.en_title && (
                        <h3 className={styles.enTitle}>{translated.en_title}</h3>
                      )}
                      {translated.en_body && (
                        <p className={styles.enBody}>{translated.en_body}</p>
                      )}

                      {/* Suggested tweet — copyable */}
                      {isTweet && translated.suggested_tweet && (
                        <div className={styles.tweetBox}>
                          <div className={styles.tweetBoxHeader}>
                            <span className={styles.tweetBoxLabel}>Suggested tweet</span>
                            <button
                              className={`${styles.copyBtn} ${copiedId === item.id ? styles.copyBtnCopied : ''}`}
                              onClick={() => copyToClipboard(translated.suggested_tweet, item.id)}
                            >
                              <FiCopy />
                              {copiedId === item.id ? 'Copied!' : 'Copy'}
                            </button>
                          </div>
                          <pre className={styles.tweetText}>{translated.suggested_tweet}</pre>
                        </div>
                      )}

                      {/* AI reasoning */}
                      {item.ai_reasoning && (
                        <p className={styles.reasoning}>
                          <span className={styles.reasoningLabel}>AI: </span>
                          {item.ai_reasoning}
                        </p>
                      )}
                    </div>

                    {/* Original content (collapsible) */}
                    <button
                      className={styles.originalToggle}
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    >
                      {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                      Original source
                      {raw.source_url && (
                        <a
                          href={raw.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.sourceLink}
                          onClick={e => e.stopPropagation()}
                        >
                          <FiExternalLink />
                        </a>
                      )}
                    </button>

                    {isExpanded && (
                      <div className={styles.originalContent}>
                        {/* Source links */}
                        <div className={styles.sourceLinks}>
                          {raw.source_url && (
                            <a href={raw.source_url} target="_blank" rel="noopener noreferrer" className={styles.sourceLinkItem}>
                              <FiExternalLink />
                              {isTweet ? 'Source' : 'Original article'}
                            </a>
                          )}
                          {raw.original_tweet_url && (
                            <a href={raw.original_tweet_url} target="_blank" rel="noopener noreferrer" className={`${styles.sourceLinkItem} ${styles.sourceLinkTweet}`}>
                              <FiTwitter />
                              Original tweet
                            </a>
                          )}
                        </div>

                        {/* Original text */}
                        {raw.title && <p className={styles.originalTitle}>{raw.title}</p>}
                        {raw.body && <p className={styles.originalBody}>{raw.body.slice(0, 800)}{raw.body.length > 800 ? '…' : ''}</p>}

                        {/* Images */}
                        {(() => {
                          const images = getItemImages(raw)
                          if (!images.length) return null
                          return (
                            <div className={styles.imageGrid}>
                              <div className={styles.imageGridHeader}>
                                <span className={styles.imageGridLabel}>{images.length} image{images.length !== 1 ? 's' : ''}</span>
                                {images.length > 1 && (
                                  <button className={styles.downloadAllBtn} onClick={() => handleDownloadAll(images)}>
                                    <FiDownload /> Download all
                                  </button>
                                )}
                              </div>
                              <div className={styles.thumbnails}>
                                {images.map((url, i) => (
                                  <div key={i} className={styles.thumbnail}>
                                    <img
                                      src={`/api/admin/curation/images/proxy?url=${encodeURIComponent(url)}`}
                                      alt=""
                                      className={styles.thumbnailImg}
                                      loading="lazy"
                                    />
                                    <a
                                      href={`/api/admin/curation/images/proxy?url=${encodeURIComponent(url)}&download=1`}
                                      download
                                      className={styles.thumbnailDownload}
                                      title="Download"
                                    >
                                      <FiDownload />
                                    </a>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                    )}

                    {/* Rejection feedback form */}
                    {isRejecting && (
                      <div className={styles.rejectForm}>
                        <select
                          className={styles.rejectSelect}
                          value={rejectForm.reason_category}
                          onChange={e => setRejectForm(f => ({ ...f, reason_category: e.target.value }))}
                        >
                          <option value="">Select a reason…</option>
                          {REASON_CATEGORIES.map(r => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                        <input
                          className={styles.rejectInput}
                          type="text"
                          placeholder="Optional note (helps train the AI)"
                          value={rejectForm.reason_text}
                          onChange={e => setRejectForm(f => ({ ...f, reason_text: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && handleReject(item)}
                        />
                      </div>
                    )}

                    {/* Approved actions */}
                    {status === 'approved' && (
                      <div className={styles.approvedActions}>
                        {/* Tweet template for approved articles */}
                        {!isTweet && translated.suggested_tweet && (
                          <div className={styles.tweetTemplate}>
                            <div className={styles.tweetBox}>
                              <div className={styles.tweetBoxHeader}>
                                <span className={styles.tweetBoxLabel}>Associated tweet template</span>
                                <button
                                  className={`${styles.copyBtn} ${copiedId === `${item.id}-tweet` ? styles.copyBtnCopied : ''}`}
                                  onClick={() => copyToClipboard(translated.suggested_tweet, `${item.id}-tweet`)}
                                >
                                  <FiCopy />
                                  {copiedId === `${item.id}-tweet` ? 'Copied!' : 'Copy'}
                                </button>
                              </div>
                              <pre className={styles.tweetText}>{translated.suggested_tweet}</pre>
                            </div>
                            <p className={styles.tweetTemplateHint}>Replace {'{ARTICLE_URL}'} with the published article link when posting</p>
                          </div>
                        )}

                        {/* Primary row */}
                        <div className={styles.cardActions}>
                          {isTweet ? (
                            <button
                              className={styles.btnPublish}
                              onClick={() => handlePublish(item)}
                              disabled={isActioning}
                            >
                              <FiSend /> Mark as posted
                            </button>
                          ) : item.prismic_document_id ? (
                            <>
                              <a
                                href={`https://${process.env.NEXT_PUBLIC_REPO_NAME || 'bonjouridol'}.prismic.io/migrations`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.btnPrismic}
                              >
                                <FiExternalLink /> View draft in Prismic
                              </a>
                              <button
                                className={styles.btnPublish}
                                onClick={() => handlePublish(item)}
                                disabled={isActioning}
                              >
                                <FiCheck /> Mark as published
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className={styles.btnCreateDraft}
                                onClick={() => handleCreateDraft(item)}
                                disabled={creatingDraftId === item.id || isActioning}
                              >
                                <FiFileText />
                                {creatingDraftId === item.id ? 'Creating draft…' : 'Create Prismic draft'}
                              </button>
                              {draftResults[item.id] && (
                                <span className={draftResults[item.id].error ? styles.reprocessError : styles.reprocessSuccess}>
                                  {draftResults[item.id].error || 'Draft created — check Prismic migrations'}
                                </span>
                              )}
                            </>
                          )}
                        </div>

                        {/* Secondary row */}
                        <div className={styles.secondaryActions}>
                          {!isTweet && item.prismic_document_id && (
                            <button
                              className={styles.btnSecondary}
                              onClick={() => handleRegenerate(item)}
                              disabled={isActioning || creatingDraftId === item.id}
                              title="Delete current draft reference and create a fresh one"
                            >
                              <FiRefreshCw /> Re-generate draft
                            </button>
                          )}
                          <button
                            className={styles.btnSecondary}
                            onClick={() => handleAction(item, 'back_to_pending')}
                            disabled={isActioning}
                            title={item.prismic_document_id ? 'Resets to pending — delete the Prismic draft manually in Migration Releases' : 'Resets to pending review'}
                          >
                            <FiRotateCcw /> Back to pending
                          </button>
                          <button
                            className={styles.btnSecondaryDanger}
                            onClick={() => handleDelete(item)}
                            disabled={isActioning}
                          >
                            <FiTrash2 /> Delete
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Pending / rejected actions */}
                    {(status === 'pending' || status === 'rejected') && (
                      <div className={styles.cardActions}>
                        {isRejecting ? (
                          <>
                            <button
                              className={styles.btnRejectConfirm}
                              onClick={() => handleReject(item)}
                              disabled={isActioning}
                            >
                              <FiX /> Confirm reject
                            </button>
                            <button
                              className={styles.btnCancel}
                              onClick={() => setRejectingId(null)}
                              disabled={isActioning}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className={styles.btnApprove}
                              onClick={() => handleApprove(item)}
                              disabled={isActioning}
                            >
                              <FiCheck /> Approve
                            </button>
                            {status !== 'rejected' && (
                              <button
                                className={styles.btnReject}
                                onClick={() => startRejecting(item.id)}
                                disabled={isActioning}
                              >
                                <FiX /> Reject
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button
                  className={styles.pageBtn}
                  onClick={() => setPage(p => p - 1)}
                  disabled={page === 1}
                >
                  ← Prev
                </button>
                <span className={styles.pageInfo}>Page {page} of {totalPages}</span>
                <button
                  className={styles.pageBtn}
                  onClick={() => setPage(p => p + 1)}
                  disabled={page === totalPages}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
