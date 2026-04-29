'use client'

import { useState, useEffect } from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import styles from './page.module.scss'
import { FiAlertTriangle, FiCheckCircle, FiAlertCircle, FiXCircle } from 'react-icons/fi'

// Group fetch + process rows that share a github_run_id into a single "job" entry.
// Multiple process batches (from the loop) are aggregated into one.
function groupRuns(runs) {
  const jobs = []
  const byRunId = new Map()

  for (const run of runs) {
    if (run.github_run_id) {
      if (!byRunId.has(run.github_run_id)) {
        const job = {
          github_run_id:     run.github_run_id,
          github_run_number: run.github_run_number,
          github_repo:       run.github_repo,
          triggered_by:      run.triggered_by,
          ran_at:            run.ran_at,
          fetch:             null,
          process:           null,
        }
        byRunId.set(run.github_run_id, job)
        jobs.push(job)
      }
      const job = byRunId.get(run.github_run_id)
      if (run.run_type === 'fetch') {
        job.fetch = run
        job.ran_at = run.ran_at  // fetch is the start of the job
      } else {
        if (!job.process) {
          job.process = { ...run }
        } else {
          // Aggregate multiple process batches
          job.process.processed      = (job.process.processed      || 0) + (run.processed      || 0)
          job.process.pending_review = (job.process.pending_review || 0) + (run.pending_review || 0)
          job.process.rejected       = (job.process.rejected       || 0) + (run.rejected       || 0)
          if (run.errors?.length) job.process.errors = [...(job.process.errors || []), ...run.errors]
          if (run.status !== 'ok') job.process.status = run.status
        }
      }
    } else {
      // No GitHub context — standalone manual run
      jobs.push({ ...run, standalone: true, ran_at: run.ran_at })
    }
  }

  return jobs
}

const DEFAULT_PROMPT_PLACEHOLDER = `Add any extra rules or context for the AI here. These are injected directly into the classification prompt.

Examples:
- Always include content about [specific group] even if confidence is low
- Ignore content from [agency name] unless it mentions a concert
- Posts that only contain tour date graphics with no text body should be rejected
- When in doubt about graduation vs hiatus announcements, mark as relevant`

export default function CurationSettingsPage() {
  const [tab, setTab] = useState('settings')

  // Settings state
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

  // Run history state
  const [runs, setRuns] = useState([])
  const [runsLoading, setRunsLoading] = useState(false)
  const [runsError, setRunsError] = useState('')

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

  useEffect(() => {
    if (tab !== 'history') return
    setRunsLoading(true)
    setRunsError('')
    fetch('/api/admin/curation/runs')
      .then(r => r.json())
      .then(({ runs, error }) => {
        if (error) throw new Error(error)
        setRuns(runs || [])
      })
      .catch(e => setRunsError(e.message))
      .finally(() => setRunsLoading(false))
  }, [tab])

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
          nitter_instance:       form.nitter_instance.split('\n').map(s => s.trim()).filter(Boolean).join('\n') || null,
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

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === 'settings' ? styles.tabActive : ''}`}
          onClick={() => setTab('settings')}
        >
          Settings
        </button>
        <button
          className={`${styles.tab} ${tab === 'history' ? styles.tabActive : ''}`}
          onClick={() => setTab('history')}
        >
          Run History
        </button>
      </div>

      {tab === 'settings' && (
        <>
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
                  Nitter instances
                  <span className={styles.labelHint}>One URL per line — tried in order. If the first fails (socket hangup, timeout), the next is tried automatically.</span>
                </label>
                <textarea
                  id="nitter"
                  className={styles.nitterTextarea}
                  value={form.nitter_instance}
                  onChange={e => set('nitter_instance', e.target.value)}
                  placeholder={'https://nitter.net\nhttps://nitter.privacydev.net\nhttps://nitter.cz'}
                  rows={4}
                  spellCheck={false}
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

          {/* Danger zone */}
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
        </>
      )}

      {tab === 'history' && (
        <div className={styles.runsContainer}>
          {runsLoading ? (
            <p className={styles.loading}>Loading run history…</p>
          ) : runsError ? (
            <p className={styles.errorMsg}>{runsError}</p>
          ) : runs.length === 0 ? (
            <p className={styles.runsEmpty}>No runs logged yet. History is recorded from the next crawl onwards.</p>
          ) : (
            <table className={styles.runsTable}>
              <thead>
                <tr>
                  <th>Job</th>
                  <th>When</th>
                  <th>Crawl</th>
                  <th>AI</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {groupRuns(runs).map((job, i) => {
                  const worstStatus = [job.fetch?.status, job.process?.status]
                    .filter(Boolean)
                    .reduce((w, s) => s === 'error' ? 'error' : s === 'partial' && w !== 'error' ? 'partial' : w, 'ok')
                  const allErrors = [
                    ...(job.fetch?.errors || []),
                    ...(job.process?.errors || []),
                  ]
                  const ghLink = job.github_run_id && job.github_repo
                    ? `https://github.com/${job.github_repo}/actions/runs/${job.github_run_id}`
                    : null

                  return (
                    <tr key={i}>
                      <td>
                        {ghLink ? (
                          <a href={ghLink} target="_blank" rel="noopener noreferrer" className={styles.runJobLink}>
                            {job.github_run_number ? `Run #${job.github_run_number}` : 'View run'} ↗
                          </a>
                        ) : (
                          <span className={styles.runJobManual}>Manual</span>
                        )}
                        <div className={styles.runTrigger}>{job.triggered_by === 'cron' ? 'Cron' : 'Manual'}</div>
                      </td>
                      <td className={styles.runTime}>
                        <div>{formatDistanceToNow(new Date(job.ran_at), { addSuffix: true })}</div>
                        <div className={styles.runTimeAbs}>{format(new Date(job.ran_at), 'MMM d, HH:mm')}</div>
                      </td>
                      <td>
                        {job.fetch ? (
                          job.fetch.new_items > 0 || job.fetch.fetched > 0 ? (
                            <span className={styles.runStats}>
                              <strong>{job.fetch.new_items ?? 0} new</strong>
                              <span className={styles.runStatsSub}>{job.fetch.fetched ?? 0} fetched · {job.fetch.skipped ?? 0} skipped</span>
                            </span>
                          ) : (
                            <span className={styles.runStatsNone}>Nothing new</span>
                          )
                        ) : <span className={styles.runStatsNone}>—</span>}
                      </td>
                      <td>
                        {job.process ? (
                          job.process.processed > 0 ? (
                            <span className={styles.runStats}>
                              <strong>{job.process.processed} classified</strong>
                              <span className={styles.runStatsSub}>{job.process.pending_review ?? 0} pending · {job.process.rejected ?? 0} rejected</span>
                            </span>
                          ) : (
                            <span className={styles.runStatsNone}>Nothing to process</span>
                          )
                        ) : <span className={styles.runStatsNone}>—</span>}
                        {allErrors.length > 0 && (
                          <ul className={styles.runErrors}>
                            {allErrors.map((e, i) => <li key={i}>{e}</li>)}
                          </ul>
                        )}
                      </td>
                      <td>
                        {worstStatus === 'ok'      && <span className={styles.runStatusOk}><FiCheckCircle /> OK</span>}
                        {worstStatus === 'partial'  && <span className={styles.runStatusPartial}><FiAlertCircle /> Partial</span>}
                        {worstStatus === 'error'    && <span className={styles.runStatusError}><FiXCircle /> Error</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
