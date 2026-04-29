'use client'

import { useState, useEffect } from 'react'
import styles from './page.module.scss'
import { FiAlertTriangle } from 'react-icons/fi'

const DEFAULT_PROMPT_PLACEHOLDER = `Add any extra rules or context for the AI here. These are injected directly into the classification prompt.

Examples:
- Always include content about [specific group] even if confidence is low
- Ignore content from [agency name] unless it mentions a concert
- Posts that only contain tour date graphics with no text body should be rejected
- When in doubt about graduation vs hiatus announcements, mark as relevant`

export default function CurationSettingsPage() {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [resetting, setResetting] = useState(false)
  const [resetResult, setResetResult] = useState(null)

  const [form, setForm] = useState({
    nitter_instance:      '',
    confidence_threshold: 0.5,
    low_confidence_action: 'flag',
    prompt_instructions:  '',
  })

  useEffect(() => {
    fetch('/api/admin/curation/settings')
      .then(r => r.json())
      .then(({ settings }) => {
        if (settings) {
          setSettings(settings)
          setForm({
            nitter_instance:       settings.nitter_instance       || 'https://nitter.net',
            confidence_threshold:  settings.confidence_threshold  ?? 0.5,
            low_confidence_action: settings.low_confidence_action || 'flag',
            prompt_instructions:   settings.prompt_instructions   || '',
          })
        }
      })
      .catch(() => setError('Failed to load settings.'))
      .finally(() => setLoading(false))
  }, [])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    setError('')

    try {
      const res = await fetch('/api/admin/curation/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nitter_instance:       form.nitter_instance.trim(),
          confidence_threshold:  parseFloat(form.confidence_threshold),
          low_confidence_action: form.low_confidence_action,
          prompt_instructions:   form.prompt_instructions.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      setSettings(data.settings)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  function set(key, value) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleReset() {
    if (!confirm(
      'This will permanently delete ALL queue items, crawl history, and AI feedback.\n\n' +
      'Prismic drafts must be removed manually in Prismic → Migration Releases.\n\n' +
      'Type OK to confirm.'
    )) return

    setResetting(true)
    setResetResult(null)
    try {
      const res = await fetch('/api/admin/curation/reset', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Reset failed')
      setResetResult({ success: true })
    } catch (err) {
      setResetResult({ error: err.message })
    } finally {
      setResetting(false)
    }
  }

  if (loading) return <div className={styles.container}><p className={styles.loading}>Loading…</p></div>

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <a href="/admin/curation" className={styles.backLink}>← Content Queue</a>
        <h1 className={styles.title}>Curation Settings</h1>
      </div>

      <form className={styles.form} onSubmit={handleSave}>

        {/* AI Prompt */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>AI Prompt Instructions</h2>
            <p className={styles.sectionDesc}>
              Extra instructions injected into the AI classification prompt. Use this to fine-tune what gets approved or rejected without changing the code. Changes take effect on the next processing run.
            </p>
          </div>
          <textarea
            className={styles.promptTextarea}
            value={form.prompt_instructions}
            onChange={e => set('prompt_instructions', e.target.value)}
            placeholder={DEFAULT_PROMPT_PLACEHOLDER}
            rows={12}
            spellCheck={false}
          />
        </section>

        {/* Classification */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Classification</h2>
            <p className={styles.sectionDesc}>
              Control how the AI handles uncertain classifications.
            </p>
          </div>

          <div className={styles.fieldRow}>
            <label className={styles.label}>
              Confidence threshold
              <span className={styles.labelHint}>Items below this score are considered low confidence</span>
            </label>
            <div className={styles.sliderRow}>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={form.confidence_threshold}
                onChange={e => set('confidence_threshold', e.target.value)}
                className={styles.slider}
              />
              <span className={styles.sliderValue}>{Math.round(form.confidence_threshold * 100)}%</span>
            </div>
          </div>

          <div className={styles.fieldRow}>
            <label className={styles.label}>
              Low confidence action
              <span className={styles.labelHint}>What to do when confidence is below the threshold</span>
            </label>
            <div className={styles.radioGroup}>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  value="flag"
                  checked={form.low_confidence_action === 'flag'}
                  onChange={() => set('low_confidence_action', 'flag')}
                />
                Send to pending (let a human decide)
              </label>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  value="auto_reject"
                  checked={form.low_confidence_action === 'auto_reject'}
                  onChange={() => set('low_confidence_action', 'auto_reject')}
                />
                Auto-reject
              </label>
            </div>
          </div>
        </section>

        {/* Crawler */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Crawler</h2>
            <p className={styles.sectionDesc}>
              Settings for how content is fetched from sources.
            </p>
          </div>

          <div className={styles.fieldRow}>
            <label className={styles.label} htmlFor="nitter">
              Nitter instance
              <span className={styles.labelHint}>Used to fetch Twitter/X accounts as RSS. Change if the current instance goes down.</span>
            </label>
            <input
              id="nitter"
              type="url"
              className={styles.input}
              value={form.nitter_instance}
              onChange={e => set('nitter_instance', e.target.value)}
              placeholder="https://nitter.net"
            />
          </div>
        </section>

        {/* Save */}
        <div className={styles.footer}>
          {error && <span className={styles.errorMsg}>{error}</span>}
          {saved && <span className={styles.savedMsg}>Settings saved.</span>}
          <button type="submit" className={styles.saveBtn} disabled={saving}>
            {saving ? 'Saving…' : 'Save settings'}
          </button>
        </div>

      </form>

      {/* Danger zone — outside the form so it doesn't submit on Enter */}
      <div className={styles.dangerZone}>
        <div className={styles.sectionHeader}>
          <h2 className={`${styles.sectionTitle} ${styles.dangerTitle}`}>
            <FiAlertTriangle /> Danger Zone
          </h2>
          <p className={styles.sectionDesc}>
            These actions are irreversible. Use only for debugging or starting fresh.
          </p>
        </div>

        <div className={styles.dangerAction}>
          <div>
            <strong className={styles.dangerActionTitle}>Wipe all crawl data</strong>
            <p className={styles.dangerActionDesc}>
              Deletes all queue items, crawl history, and AI feedback. Crawler will re-fetch everything on next run.
              Prismic drafts must be manually removed in Prismic → Migration Releases.
            </p>
          </div>
          <button
            className={styles.dangerBtn}
            onClick={handleReset}
            disabled={resetting}
            type="button"
          >
            {resetting ? 'Wiping…' : 'Wipe all data'}
          </button>
        </div>

        {resetResult && (
          <p className={resetResult.error ? styles.errorMsg : styles.savedMsg}>
            {resetResult.error ? `Error: ${resetResult.error}` : 'All data wiped successfully.'}
          </p>
        )}
      </div>
    </div>
  )
}
