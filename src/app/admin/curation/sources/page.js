'use client'

import { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import styles from './page.module.scss'
import Button from '@/app/components/IconButton'
import {
  IoAddOutline, IoCloseOutline, IoCheckmarkOutline,
  IoTrashOutline, IoPencilOutline, IoRefreshOutline,
} from 'react-icons/io5'
import { FiAlertTriangle, FiCheck, FiChevronDown, FiChevronUp } from 'react-icons/fi'

const TYPE_LABELS = { rss: 'RSS Feed', html: 'Website (HTML)', twitter: 'Twitter Account' }

export default function SourcesPage() {
  const [sources, setSources] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Add / edit panel
  const [panelOpen, setPanelOpen] = useState(false)
  const [editingSource, setEditingSource] = useState(null)
  const [formData, setFormData] = useState({ type: 'rss', label: '', url: '', titleSelector: '', bodySelector: '' })
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')

  // Inline actions
  const [togglingId, setTogglingId] = useState(null)
  const [crawlingId, setCrawlingId] = useState(null)
  const [crawlResult, setCrawlResult] = useState({}) // id → { ok, message }
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  // Bulk add
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkHandles, setBulkHandles] = useState('')
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkResult, setBulkResult] = useState('')

  // Import from Artist Directory
  const [importingArtists, setImportingArtists] = useState(false)
  const [importArtistResult, setImportArtistResult] = useState(null)

  useEffect(() => { loadSources() }, [])

  async function loadSources() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/curation/sources')
      if (!res.ok) throw new Error('Failed to load sources')
      const { sources } = await res.json()
      setSources(sources || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function openAddPanel() {
    setEditingSource(null)
    setFormData({ type: 'rss', label: '', url: '', titleSelector: '', bodySelector: '' })
    setFormError('')
    setPanelOpen(true)
  }

  function openEditPanel(source) {
    setEditingSource(source)
    setFormData({
      type: source.type,
      label: source.label,
      url: source.url,
      titleSelector: source.crawl_config?.titleSelector || '',
      bodySelector: source.crawl_config?.bodySelector || '',
    })
    setFormError('')
    setPanelOpen(true)
  }

  function closePanel() {
    setPanelOpen(false)
    setEditingSource(null)
    setFormError('')
  }

  function handleFormChange(field, value) {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  function buildUrl() {
    if (formData.type === 'twitter') return formData.url.replace(/^@/, '').trim()
    return formData.url.trim()
  }

  function buildCrawlConfig() {
    if (formData.type !== 'html') return null
    if (!formData.titleSelector && !formData.bodySelector) return null
    return {
      ...(formData.titleSelector && { titleSelector: formData.titleSelector.trim() }),
      ...(formData.bodySelector && { bodySelector: formData.bodySelector.trim() }),
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')

    if (!formData.label.trim()) { setFormError('Name is required'); return }
    if (!formData.url.trim()) { setFormError('URL or handle is required'); return }

    setFormLoading(true)
    try {
      const body = {
        type: formData.type,
        label: formData.label.trim(),
        url: buildUrl(),
        crawl_config: buildCrawlConfig(),
      }

      const url = editingSource
        ? `/api/admin/curation/sources/${editingSource.id}`
        : '/api/admin/curation/sources'
      const method = editingSource ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save source')

      closePanel()
      await loadSources()
    } catch (e) {
      setFormError(e.message)
    } finally {
      setFormLoading(false)
    }
  }

  async function handleToggleActive(source) {
    setTogglingId(source.id)
    try {
      const res = await fetch(`/api/admin/curation/sources/${source.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !source.active }),
      })
      if (!res.ok) throw new Error()
      setSources(prev => prev.map(s => s.id === source.id ? { ...s, active: !s.active } : s))
    } catch {
      // silent fail — user can reload
    } finally {
      setTogglingId(null)
    }
  }

  async function handleCrawlNow(source) {
    setCrawlingId(source.id)
    setCrawlResult(prev => ({ ...prev, [source.id]: null }))
    try {
      const res = await fetch(`/api/admin/curation/sources/${source.id}/crawl`, { method: 'POST' })
      const data = await res.json()
      if (res.status === 503) {
        setCrawlResult(prev => ({ ...prev, [source.id]: { ok: false, message: 'Crawler not available yet (Phase 2)' } }))
      } else if (!res.ok) {
        setCrawlResult(prev => ({ ...prev, [source.id]: { ok: false, message: data.error || 'Crawl failed' } }))
      } else {
        setCrawlResult(prev => ({
          ...prev,
          [source.id]: { ok: true, message: `Done — ${data.new ?? 0} new item(s) queued` },
        }))
        await loadSources()
      }
    } catch {
      setCrawlResult(prev => ({ ...prev, [source.id]: { ok: false, message: 'Request failed' } }))
    } finally {
      setCrawlingId(null)
      setTimeout(() => setCrawlResult(prev => { const n = { ...prev }; delete n[source.id]; return n }), 5000)
    }
  }

  async function handleDelete(id) {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/admin/curation/sources/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setSources(prev => prev.filter(s => s.id !== id))
      setConfirmDeleteId(null)
    } catch {
      setError('Failed to delete source.')
    } finally {
      setDeletingId(null)
    }
  }

  async function handleImportArtists() {
    setImportingArtists(true)
    setImportArtistResult(null)
    try {
      const res = await fetch('/api/admin/curation/sources/import-artists', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Import failed')
      setImportArtistResult(data)
      if (data.added > 0) await loadSources()
    } catch (e) {
      setImportArtistResult({ error: e.message })
    } finally {
      setImportingArtists(false)
    }
  }

  async function handleBulkAdd() {
    setBulkLoading(true)
    setBulkResult('')
    const handles = bulkHandles
      .split('\n')
      .map(h => h.trim().replace(/^@/, ''))
      .filter(Boolean)

    if (handles.length === 0) {
      setBulkResult('No handles found. Enter one per line.')
      setBulkLoading(false)
      return
    }

    let added = 0
    let failed = 0
    for (const handle of handles) {
      try {
        const res = await fetch('/api/admin/curation/sources', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'twitter', label: `@${handle}`, url: handle }),
        })
        if (res.ok) added++
        else failed++
      } catch {
        failed++
      }
    }

    setBulkResult(`Added ${added} source(s)${failed > 0 ? `, ${failed} failed` : ''}.`)
    setBulkHandles('')
    await loadSources()
    setBulkLoading(false)
  }

  const nitterPreview = formData.url.trim().replace(/^@/, '')

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <a href="/admin/curation" className={styles.backLink}>← Content Queue</a>
          <h1 className={styles.title}>Source Manager</h1>
        </div>
        <Button
          onClick={openAddPanel}
          variant="Pink"
          textValue="Add Source"
          icon={<IoAddOutline />}
        />
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {loading ? (
        <p className={styles.loading}>Loading sources…</p>
      ) : (
        <div className={styles.content}>

          {/* Sources table */}
          {sources.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No sources yet. Add your first news site or Twitter account to get started.</p>
              <Button onClick={openAddPanel} variant="Pink" textValue="Add Source" icon={<IoAddOutline />} />
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Type</th>
                    <th>URL / Handle</th>
                    <th>Last crawled</th>
                    <th>Active</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sources.map(source => (
                    <tr key={source.id} className={!source.active ? styles.inactiveRow : ''}>
                      <td className={styles.labelCell}>
                        <span className={styles.sourceLabel}>{source.label}</span>
                        {source.last_error && (
                          <span className={styles.errorBadge} title={source.last_error}>
                            <FiAlertTriangle /> Error
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`${styles.typeBadge} ${styles[`type_${source.type}`]}`}>
                          {source.type.toUpperCase()}
                        </span>
                      </td>
                      <td className={styles.urlCell}>
                        {source.type === 'twitter' ? `@${source.url}` : source.url}
                      </td>
                      <td className={styles.dateCell}>
                        {source.last_crawled_at
                          ? formatDistanceToNow(new Date(source.last_crawled_at), { addSuffix: true })
                          : <span className={styles.never}>Never</span>}
                      </td>
                      <td>
                        <button
                          className={`${styles.toggle} ${source.active ? styles.toggleOn : styles.toggleOff}`}
                          onClick={() => handleToggleActive(source)}
                          disabled={togglingId === source.id}
                          title={source.active ? 'Disable this source' : 'Enable this source'}
                        >
                          <span className={styles.toggleThumb} />
                        </button>
                      </td>
                      <td className={styles.actionsCell}>
                        {crawlResult[source.id] && (
                          <span className={crawlResult[source.id].ok ? styles.crawlOk : styles.crawlError}>
                            {crawlResult[source.id].message}
                          </span>
                        )}
                        <button
                          className={styles.actionBtn}
                          onClick={() => handleCrawlNow(source)}
                          disabled={crawlingId === source.id}
                          title="Crawl this source now"
                        >
                          <IoRefreshOutline className={crawlingId === source.id ? styles.spinning : ''} />
                        </button>
                        <button
                          className={styles.actionBtn}
                          onClick={() => openEditPanel(source)}
                          title="Edit"
                        >
                          <IoPencilOutline />
                        </button>
                        {confirmDeleteId === source.id ? (
                          <span className={styles.confirmDelete}>
                            Delete?
                            <button
                              className={styles.confirmBtn}
                              onClick={() => handleDelete(source.id)}
                              disabled={deletingId === source.id}
                            >
                              Yes
                            </button>
                            <button className={styles.cancelBtn} onClick={() => setConfirmDeleteId(null)}>
                              No
                            </button>
                          </span>
                        ) : (
                          <button
                            className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                            onClick={() => setConfirmDeleteId(source.id)}
                            title="Delete"
                          >
                            <IoTrashOutline />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Bulk add Twitter handles */}
          <div className={styles.bulkSection}>
            <button className={styles.bulkToggle} onClick={() => setBulkOpen(p => !p)}>
              <span>Bulk add Twitter accounts</span>
              {bulkOpen ? <FiChevronUp /> : <FiChevronDown />}
            </button>
            {bulkOpen && (
              <div className={styles.bulkForm}>
                <div className={styles.importArtists}>
                  <div className={styles.importArtistsText}>
                    <span className={styles.importArtistsTitle}>Import from Artist Directory</span>
                    <span className={styles.importArtistsHint}>Automatically add Twitter sources for all artists in Prismic who have a Twitter link.</span>
                  </div>
                  <Button
                    onClick={handleImportArtists}
                    variant="WhiteGrey"
                    textValue={importingArtists ? 'Importing…' : 'Import'}
                    disabled={importingArtists}
                  />
                </div>
                {importArtistResult && (
                  <p className={importArtistResult.error ? styles.importError : styles.bulkResult}>
                    {importArtistResult.error
                      ? `Error: ${importArtistResult.error}`
                      : importArtistResult.added === 0
                        ? `All ${importArtistResult.total} artist handles already added`
                        : `Added ${importArtistResult.added} source${importArtistResult.added !== 1 ? 's' : ''}${importArtistResult.skipped > 0 ? ` (${importArtistResult.skipped} already existed)` : ''}`
                    }
                  </p>
                )}

                <div className={styles.bulkDivider} />

                <p className={styles.bulkHint}>
                  Or paste handles manually, one per line (with or without @):
                </p>
                <textarea
                  className={styles.bulkTextarea}
                  value={bulkHandles}
                  onChange={e => setBulkHandles(e.target.value)}
                  placeholder={'CUTIE_STREET_\nfruits_zipper\nWACK_OFFICIAL'}
                  rows={6}
                />
                {bulkResult && (
                  <p className={styles.bulkResult}>{bulkResult}</p>
                )}
                <Button
                  onClick={handleBulkAdd}
                  variant="Pink"
                  textValue={bulkLoading ? 'Adding…' : 'Import handles'}
                  disabled={bulkLoading || !bulkHandles.trim()}
                />
              </div>
            )}
          </div>

        </div>
      )}

      {/* Add / Edit slide-in panel */}
      {panelOpen && (
        <div className={styles.overlay} onClick={closePanel}>
          <div className={styles.panel} onClick={e => e.stopPropagation()}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>
                {editingSource ? 'Edit Source' : 'Add Source'}
              </h2>
              <button className={styles.closeBtn} onClick={closePanel}>
                <IoCloseOutline />
              </button>
            </div>

            <form className={styles.form} onSubmit={handleSubmit}>
              {/* Type selector */}
              {!editingSource && (
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Source type</label>
                  <div className={styles.typeOptions}>
                    {['rss', 'html', 'twitter'].map(t => (
                      <button
                        key={t}
                        type="button"
                        className={`${styles.typeOption} ${formData.type === t ? styles.typeOptionActive : ''}`}
                        onClick={() => handleFormChange('type', t)}
                      >
                        {TYPE_LABELS[t]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Name */}
              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="source-label">
                  Name <span className={styles.required}>*</span>
                </label>
                <input
                  id="source-label"
                  className={styles.input}
                  type="text"
                  value={formData.label}
                  onChange={e => handleFormChange('label', e.target.value)}
                  placeholder={
                    formData.type === 'twitter' ? 'CUTIE STREET' :
                    formData.type === 'rss' ? 'PR Times Entertainment' :
                    'Natalie.mu Idol Section'
                  }
                />
              </div>

              {/* URL / Handle */}
              <div className={styles.fieldGroup}>
                {formData.type === 'twitter' ? (
                  <>
                    <label className={styles.label} htmlFor="source-handle">
                      Twitter handle <span className={styles.required}>*</span>
                    </label>
                    <div className={styles.handleInput}>
                      <span className={styles.handleAt}>@</span>
                      <input
                        id="source-handle"
                        className={styles.input}
                        type="text"
                        value={formData.url}
                        onChange={e => handleFormChange('url', e.target.value.replace(/^@/, ''))}
                        placeholder="CUTIE_STREET_"
                      />
                    </div>
                    {formData.url.trim() && (
                      <p className={styles.urlPreview}>
                        Will monitor: nitter.net/{nitterPreview}/rss
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <label className={styles.label} htmlFor="source-url">
                      {formData.type === 'rss' ? 'RSS feed URL' : 'Page URL'}
                      <span className={styles.required}> *</span>
                    </label>
                    <input
                      id="source-url"
                      className={styles.input}
                      type="url"
                      value={formData.url}
                      onChange={e => handleFormChange('url', e.target.value)}
                      placeholder={
                        formData.type === 'rss'
                          ? 'https://prtimes.jp/rss3.0.xml?category_id=entertainment'
                          : 'https://natalie.mu/music/tag/idol'
                      }
                    />
                  </>
                )}
              </div>

              {/* HTML-only: CSS selectors */}
              {formData.type === 'html' && (
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>CSS selectors <span className={styles.optional}>(optional)</span></label>
                  <p className={styles.hint}>
                    If the scraper doesn't find content automatically, provide the CSS selectors for the article title and body.
                  </p>
                  <input
                    className={styles.input}
                    type="text"
                    value={formData.titleSelector}
                    onChange={e => handleFormChange('titleSelector', e.target.value)}
                    placeholder="Title selector, e.g. h1.article-title"
                  />
                  <input
                    className={`${styles.input} ${styles.inputMt}`}
                    type="text"
                    value={formData.bodySelector}
                    onChange={e => handleFormChange('bodySelector', e.target.value)}
                    placeholder="Body selector, e.g. div.article-body"
                  />
                </div>
              )}

              {formError && <p className={styles.formError}>{formError}</p>}

              <div className={styles.formActions}>
                <Button
                  type="submit"
                  variant="Pink"
                  textValue={formLoading ? 'Saving…' : editingSource ? 'Save changes' : 'Add Source'}
                  icon={editingSource ? <IoCheckmarkOutline /> : <IoAddOutline />}
                  disabled={formLoading}
                />
                <Button
                  type="button"
                  variant="WhiteGrey"
                  textValue="Cancel"
                  onClick={closePanel}
                />
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
