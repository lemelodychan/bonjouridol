'use client'

import { useState, useEffect } from 'react'
import { adminFetch } from '@/lib/admin-fetch'
import Link from 'next/link'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, Legend,
} from 'recharts'
import styles from './page.module.scss'
import Button from '@/app/components/IconButton'
import { IoRefreshOutline } from 'react-icons/io5'
import { IconSparkles, IconSettings } from '@tabler/icons-react'
import { createBrowserSupabaseClient } from '@/lib/supabase-browser'

const CACHE_KEY = 'admin_stats_cache'
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Brand colours (matching CSS variables)
const PINK   = '#FF3194'
const INDIGO = '#7272FC'
const GOLD   = '#FFC107'
const GRID   = '#ebebeb'

/** Convert "2025-03-01" → "Mar 1" for axis ticks */
function fmtDate(str) {
  if (!str) return ''
  const d = new Date(str + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** Turn an article slug into a readable label */
function fmtSlug(slug) {
  if (!slug) return ''
  // Remove leading date prefix (e.g. "2024-11-15-")
  let s = slug.replace(/^\d{4}-\d{2}-\d{2}-/, '')
  s = s.replace(/-/g, ' ')
  return s.length > 32 ? s.slice(0, 30) + '…' : s
}

/** Compact number formatter for axis ticks */
function fmtNum(n) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

function toDateStr(d) { return d.toISOString().slice(0, 10) }
const TODAY          = toDateStr(new Date())
const DEFAULT_START  = toDateStr(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
const SIX_MONTHS_AGO = toDateStr(new Date(Date.now() - 183 * 24 * 60 * 60 * 1000))

const CustomTooltip = ({ active, payload, label, unit = '' }) => {
  if (!active || !payload?.length) return null
  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipLabel}>{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color }} className={styles.tooltipRow}>
          {p.name}: <strong>{(p.value ?? 0).toLocaleString()}{unit}</strong>
        </p>
      ))}
    </div>
  )
}

export default function OverviewPage() {
  const [stats, setStats] = useState({
    totalArtists: 0, totalArticles: 0, totalLikes: 0,
    totalViews: 0, totalAssets: 0,
    artistRankings: [], articleLikeRankings: [], articleViewRankings: [],
  })
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [rangeStart, setRangeStart] = useState(DEFAULT_START)
  const [rangeEnd,   setRangeEnd]   = useState(TODAY)

  const [insight, setInsight] = useState(null)
  const [insightLoading, setInsightLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)
  const [rateLimitedUntil, setRateLimitedUntil] = useState(null)

  const [isAdmin, setIsAdmin] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [insightsSettings, setInsightsSettings] = useState({ rate_limit_enabled: true, custom_instructions: '' })
  const [settingsSaving, setSettingsSaving] = useState(false)

  useEffect(() => {
    loadStats()
    fetchAnalytics(DEFAULT_START, TODAY)
    fetchInsight()
    fetchInsightsSettings()
    checkAdminRole()
  }, [])

  // Recompute rate limit whenever the loaded insight or the toggle changes
  useEffect(() => {
    if (!insight || !insightsSettings.rate_limit_enabled) {
      setRateLimitedUntil(null)
      return
    }
    const nextAvailable = new Date(new Date(insight.generated_at).getTime() + 23 * 60 * 60 * 1000)
    setRateLimitedUntil(nextAvailable > new Date() ? nextAvailable : null)
  }, [insight, insightsSettings.rate_limit_enabled])

  // ── Cache helpers ──────────────────────────────────────────────────────────
  function getCached() {
    try {
      const raw = localStorage.getItem(CACHE_KEY)
      if (!raw) return null
      const { data, timestamp } = JSON.parse(raw)
      if (Date.now() - timestamp < CACHE_DURATION) return data
      localStorage.removeItem(CACHE_KEY)
      return null
    } catch { return null }
  }

  function setCached(data) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() })) }
    catch { /* storage full – ignore */ }
  }

  // ── Stats ─────────────────────────────────────────────────────────────────
  async function loadStats(forceRefresh = false) {
    if (!forceRefresh) {
      const cached = getCached()
      if (cached) {
        setStats(cached)
        setLoading(false)
        fetchStats(true)
        return
      }
    }
    await fetchStats(false, forceRefresh)
  }

  async function fetchStats(silent = false) {
    try {
      if (!silent) setLoading(true)
      else setRefreshing(true)
      setError('')

      const res = await adminFetch('/api/admin/stats', { cache: 'no-store' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Failed to fetch stats (${res.status})`)
      }
      const data = await res.json()
      setStats(data)
      setCached(data)
    } catch (e) {
      console.error(e)
      if (!silent) setError(e.message || 'Failed to load statistics.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // ── Insights ──────────────────────────────────────────────────────────────
  async function fetchInsight() {
    try {
      setInsightLoading(true)
      const res = await adminFetch('/api/admin/insights', { cache: 'no-store' })
      const data = await res.json()
      if (data.insight) setInsight(data.insight)
    } catch (e) {
      console.error('Insight fetch error:', e)
    } finally {
      setInsightLoading(false)
    }
  }

  async function handleRegenerate() {
    try {
      setRegenerating(true)
      setRateLimitedUntil(null)
      const res = await adminFetch('/api/admin/insights/run', { method: 'POST', cache: 'no-store' })
      if (res.status === 429) {
        const data = await res.json()
        setRateLimitedUntil(data.nextAvailable ? new Date(data.nextAvailable) : null)
        return
      }
      const data = await res.json()
      if (data.insight) setInsight(data.insight)
    } catch (e) {
      console.error('Regenerate error:', e)
    } finally {
      setRegenerating(false)
    }
  }

  async function checkAdminRole() {
    try {
      const supabase = createBrowserSupabaseClient()
      if (!supabase) return
      const { data: { session } } = await supabase.auth.getSession()
      setIsAdmin(session?.user?.app_metadata?.role === 'admin')
    } catch { /* non-critical */ }
  }

  async function fetchInsightsSettings() {
    try {
      const res = await adminFetch('/api/admin/insights/settings')
      const data = await res.json()
      if (data.settings) {
        setInsightsSettings({
          rate_limit_enabled: data.settings.rate_limit_enabled,
          custom_instructions: data.settings.custom_instructions || '',
        })
      }
    } catch { /* non-critical */ }
  }

  async function handleSaveSettings() {
    try {
      setSettingsSaving(true)
      await adminFetch('/api/admin/insights/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(insightsSettings),
      })
      setSettingsOpen(false)
    } catch (e) {
      console.error('Settings save error:', e)
    } finally {
      setSettingsSaving(false)
    }
  }

  // ── Analytics (Umami) ─────────────────────────────────────────────────────
  async function fetchAnalytics(start, end) {
    try {
      setAnalyticsLoading(true)
      const params = new URLSearchParams({ startAt: start, endAt: end })
      const res = await adminFetch(`/api/admin/analytics?${params}`, { cache: 'no-store' })
      const data = await res.json().catch(() => null)
      if (data) setAnalytics(data)
    } catch (e) {
      console.error('Analytics fetch error:', e)
    } finally {
      setAnalyticsLoading(false)
    }
  }

  async function handleRefresh() {
    try { localStorage.removeItem(CACHE_KEY) } catch {}
    await Promise.all([loadStats(true), fetchAnalytics(rangeStart, rangeEnd)])
  }

  // ── Derived chart data (top 10 for charts; full list for tables) ──────────
  const artistChartData = [...(stats.artistRankings || [])]
    .slice(0, 10)
    .map(r => ({ label: r.name, value: r.totalLikes }))

  const articleLikeChartData = [...(stats.articleLikeRankings || [])]
    .slice(0, 10)
    .map(r => ({ label: fmtSlug(r.slug), slug: r.slug, value: r.totalLikes }))

  const articleViewChartData = [...(stats.articleViewRankings || [])]
    .slice(0, 10)
    .map(r => ({ label: fmtSlug(r.slug), slug: r.slug, value: r.totalViews }))

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return <div className={styles.container}><div className={styles.loading}>Loading statistics…</div></div>
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{error}</div>
        <button onClick={() => loadStats(true)} className={styles.retryButton}>Retry</button>
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
            textValue={refreshing ? 'Refreshing…' : 'Refresh Data'}
            icon={<IoRefreshOutline />}
          />
        </div>

        <div className={styles.content}>

          {/* ── Stat cards ── */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{stats.totalArtists}</div>
              <div className={styles.statLabel}>Artists</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{stats.totalArticles}</div>
              <div className={styles.statLabel}>Articles</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{(stats.totalViews || 0).toLocaleString()}</div>
              <div className={styles.statLabel}>Total Views</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{(stats.totalLikes || 0).toLocaleString()}</div>
              <div className={styles.statLabel}>Total 🥐</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{(stats.totalAssets || 0).toLocaleString()}</div>
              <div className={styles.statLabel}>Photos</div>
            </div>
          </div>

          {/* ── Data Insights ── */}
          <div className={styles.insightsSection}>
            <div className={styles.insightsContent}>
              <div className={styles.insightsHeader}>
                <h2 className={styles.insightsTitle}>
                  <IconSparkles stroke="2" size={20} />
                  <span>Data Insights</span>
                  <div className={styles.insightsBeta}>Beta</div>
                </h2>
                <div className={styles.insightsMeta}>
                  {insight && (
                    <span className={styles.insightsUpdated}>
                      Last updated{' '}
                      {new Date(insight.generated_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                  )}
                  <button
                    className={styles.regenerateBtn}
                    onClick={handleRegenerate}
                    disabled={regenerating || insightLoading || !!rateLimitedUntil}
                    title={rateLimitedUntil ? `Next available at ${rateLimitedUntil.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}` : 'Generate new insights'}
                  >
                    {regenerating ? 'Generating…' : 'Regenerate'}
                  </button>
                  <button
                    className={styles.insightsSettingsBtn}
                    onClick={() => setSettingsOpen(true)}
                    title="Insights settings"
                  >
                    <IconSettings size={16} stroke={1.75} />
                  </button>
                </div>
              </div>

              {insightLoading || regenerating ? (
                <div className={styles.insightsSkeleton}>
                  <div className={`${styles.skeletonLine} ${styles.wide}`} />
                  <div className={`${styles.skeletonLine} ${styles.med}`} />
                  <div className={`${styles.skeletonLine} ${styles.short}`} />
                </div>
              ) : !insight ? (
                <p className={styles.insightsEmpty}>
                  No insights yet — first run scheduled for Monday, or click Regenerate.
                </p>
              ) : (
                <>
                  <p className={styles.insightsHeadline}>{insight.insights.headline}</p>
                  <div className={styles.insightsBody}>
                    <div className={styles.insightsCol}>
                      <span className={styles.insightsColLabel}>What&rsquo;s working</span>
                      <ul className={styles.insightsBullets}>
                        {insight.insights.whats_working.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div className={styles.insightsCol}>
                      <span className={styles.insightsColLabel}>Suggestions</span>
                      <ul className={styles.insightsBullets}>
                        {insight.insights.suggestions.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  {rateLimitedUntil && (
                    <p className={styles.insightsRateLimit}>
                      Already refreshed recently — next available tomorrow at{' '}
                      {rateLimitedUntil.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ── Insights settings modal ── */}
          {settingsOpen && (
            <div className={styles.insightsModalOverlay} onClick={() => setSettingsOpen(false)}>
              <div className={styles.insightsModal} onClick={e => e.stopPropagation()}>
                <div className={styles.insightsModalHeader}>
                  <h3 className={styles.insightsModalTitle}>Insights Settings</h3>
                  <button className={styles.insightsModalClose} onClick={() => setSettingsOpen(false)}>✕</button>
                </div>

                <div className={styles.insightsModalBody}>
                  <div className={styles.insightsSettingRow}>
                    <div>
                      <span className={styles.insightsSettingLabel}>Rate limit (23h)</span>
                      <p className={styles.insightsSettingHint}>Prevents regenerating more than once every 23 hours. Disable for testing.</p>
                    </div>
                    <label className={styles.toggle}>
                      <input
                        type="checkbox"
                        checked={insightsSettings.rate_limit_enabled}
                        onChange={e => setInsightsSettings(s => ({ ...s, rate_limit_enabled: e.target.checked }))}
                      />
                      <span className={styles.toggleTrack} />
                    </label>
                  </div>

                  <div className={styles.insightsSettingCol}>
                    <span className={styles.insightsSettingLabel}>Additional instructions</span>
                    <p className={styles.insightsSettingHint}>Appended to the AI system prompt — use this to tune the analysis over time (e.g. "We're focusing on live report coverage this month").</p>
                    <textarea
                      className={styles.insightsSettingTextarea}
                      rows={5}
                      placeholder="e.g. We're launching a new series covering underground idol groups — flag any relevant traction in the data."
                      value={insightsSettings.custom_instructions}
                      onChange={e => setInsightsSettings(s => ({ ...s, custom_instructions: e.target.value }))}
                    />
                  </div>
                </div>

                <div className={styles.insightsModalFooter}>
                  <button className={styles.insightsModalCancel} onClick={() => setSettingsOpen(false)}>Cancel</button>
                  <button className={styles.insightsModalSave} onClick={handleSaveSettings} disabled={settingsSaving}>
                    {settingsSaving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Article views chart (Supabase article_views) ── */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Article views</h2>
              {analytics?.stats && (
                <div className={styles.trafficSummary}>
                  <span className={styles.trafficStat}>
                    <span className={styles.trafficDot} style={{ background: PINK }} />
                    <strong>{(analytics.stats.pageviews?.value ?? analytics.stats.pageviews ?? 0).toLocaleString()}</strong> views
                  </span>
                  <span className={styles.trafficStat}>
                    <span className={styles.trafficDot} style={{ background: INDIGO }} />
                    <strong>{(analytics.stats.visitors?.value ?? analytics.stats.visitors ?? 0).toLocaleString()}</strong> readers
                  </span>
                </div>
              )}
              <div className={styles.dateRange}>
                <input
                  type="date" className={styles.dateInput}
                  value={rangeStart} min={SIX_MONTHS_AGO} max={rangeEnd}
                  onChange={e => setRangeStart(e.target.value)}
                />
                <span className={styles.dateRangeSep}>→</span>
                <input
                  type="date" className={styles.dateInput}
                  value={rangeEnd} min={rangeStart} max={TODAY}
                  onChange={e => setRangeEnd(e.target.value)}
                />
                <button
                  className={styles.applyBtn}
                  onClick={() => fetchAnalytics(rangeStart, rangeEnd)}
                  disabled={analyticsLoading}
                >
                  {analyticsLoading ? '…' : 'Apply'}
                </button>
              </div>
            </div>

            {analyticsLoading ? (
              <div className={styles.chartPlaceholder}>Loading article view data…</div>
            ) : analytics?.error ? (
              <div className={styles.chartPlaceholder}>{analytics.error}</div>
            ) : !analytics?.configured ? (
              <div className={styles.chartPlaceholder}>
                <p>Article view analytics not available.</p>
                <p className={styles.hint}>Check that Supabase is configured.</p>
              </div>
            ) : analytics.pageviews?.length === 0 ? (
              <div className={styles.chartPlaceholder}>No article views for this period.</div>
            ) : (
              <div className={styles.areaChartWrap}>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={analytics.pageviews} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="pvFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor={PINK}   stopOpacity={0.18} />
                        <stop offset="100%" stopColor={PINK}   stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="visFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor={INDIGO} stopOpacity={0.14} />
                        <stop offset="100%" stopColor={INDIGO} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={fmtDate}
                      tick={{ fontSize: 11, fill: '#888' }}
                      axisLine={false} tickLine={false}
                      interval={4}
                    />
                    <YAxis
                      tickFormatter={fmtNum}
                      tick={{ fontSize: 11, fill: '#888' }}
                      axisLine={false} tickLine={false}
                      width={36}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      iconType="circle" iconSize={8}
                      formatter={v => <span style={{ fontSize: 12, color: '#555' }}>{v}</span>}
                    />
                    <Area
                      type="monotone" dataKey="pageviews" name="Views"
                      stroke={PINK} strokeWidth={2} fill="url(#pvFill)" dot={false}
                    />
                    <Area
                      type="monotone" dataKey="visitors" name="Readers"
                      stroke={INDIGO} strokeWidth={2} fill="url(#visFill)" dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          {/* ── Ranking bar charts ── */}
          <div className={styles.chartsGrid}>

            {/* Artists by likes */}
            <section className={styles.chartCard}>
              <h2 className={styles.chartTitle}>Top Artists by 🥐</h2>
              {stats.artistRankings?.length === 0 ? (
                <p className={styles.noData}>No data</p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart layout="vertical" data={artistChartData}
                      margin={{ top: 0, right: 24, left: 8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
                      <XAxis type="number" tickFormatter={fmtNum}
                        tick={{ fontSize: 11, fill: '#888' }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="label" width={110}
                        tick={{ fontSize: 12, fill: '#444' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: '#fafafa' }} />
                      <Bar dataKey="value" name="🥐" fill={PINK} radius={[0, 6, 6, 0]} barSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                  <table className={styles.rankTable}>
                    <thead>
                      <tr>
                        <th className={styles.rankNum}>#</th>
                        <th className={styles.rankName}>Artist</th>
                        <th className={styles.rankCount}>🥐</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.artistRankings.map((r, i) => (
                        <tr key={r.name} className={styles.rankRow}>
                          <td className={styles.rankNum}>{i + 1}</td>
                          <td className={styles.rankName}>{r.name}</td>
                          <td className={styles.rankCount}>{r.totalLikes.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </section>

            {/* Articles by likes */}
            <section className={styles.chartCard}>
              <h2 className={styles.chartTitle}>Top Articles by 🥐</h2>
              {stats.articleLikeRankings?.length === 0 ? (
                <p className={styles.noData}>No data</p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart layout="vertical" data={articleLikeChartData}
                      margin={{ top: 0, right: 24, left: 8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
                      <XAxis type="number" tickFormatter={fmtNum}
                        tick={{ fontSize: 11, fill: '#888' }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="label" width={130}
                        tick={{ fontSize: 11, fill: '#444' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        content={({ active, payload }) =>
                          active && payload?.length ? (
                            <div className={styles.tooltip}>
                              <p className={styles.tooltipLabel}>
                                <Link href={`https://www.bonjouridol.com/articles/${payload[0]?.payload?.slug}`}
                                  target="_blank" className={styles.tooltipLink}>
                                  {payload[0]?.payload?.slug}
                                </Link>
                              </p>
                              <p style={{ color: INDIGO }} className={styles.tooltipRow}>
                                🥐 <strong>{(payload[0]?.value ?? 0).toLocaleString()}</strong>
                              </p>
                            </div>
                          ) : null
                        }
                        cursor={{ fill: '#fafafa' }}
                      />
                      <Bar dataKey="value" name="🥐" fill={INDIGO} radius={[0, 6, 6, 0]} barSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                  <table className={styles.rankTable}>
                    <thead>
                      <tr>
                        <th className={styles.rankNum}>#</th>
                        <th className={styles.rankName}>Article</th>
                        <th className={styles.rankCount}>🥐</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.articleLikeRankings.map((r, i) => (
                        <tr key={r.slug} className={styles.rankRow}>
                          <td className={styles.rankNum}>{i + 1}</td>
                          <td className={styles.rankName}>
                            <Link href={`https://www.bonjouridol.com/articles/${r.slug}`}
                              target="_blank" className={styles.rankLink}>
                              {fmtSlug(r.slug)}
                            </Link>
                          </td>
                          <td className={styles.rankCount}>{r.totalLikes.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </section>

            {/* Articles by views */}
            <section className={styles.chartCard}>
              <h2 className={styles.chartTitle}>Top Articles by Views</h2>
              {stats.articleViewRankings?.length === 0 ? (
                <p className={styles.noData}>No data</p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart layout="vertical" data={articleViewChartData}
                      margin={{ top: 0, right: 24, left: 8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
                      <XAxis type="number" tickFormatter={fmtNum}
                        tick={{ fontSize: 11, fill: '#888' }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="label" width={130}
                        tick={{ fontSize: 11, fill: '#444' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        content={({ active, payload }) =>
                          active && payload?.length ? (
                            <div className={styles.tooltip}>
                              <p className={styles.tooltipLabel}>
                                <Link href={`https://www.bonjouridol.com/articles/${payload[0]?.payload?.slug}`}
                                  target="_blank" className={styles.tooltipLink}>
                                  {payload[0]?.payload?.slug}
                                </Link>
                              </p>
                              <p style={{ color: GOLD }} className={styles.tooltipRow}>
                                Views: <strong>{(payload[0]?.value ?? 0).toLocaleString()}</strong>
                              </p>
                            </div>
                          ) : null
                        }
                        cursor={{ fill: '#fafafa' }}
                      />
                      <Bar dataKey="value" name="Views" fill={GOLD} radius={[0, 6, 6, 0]} barSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                  <table className={styles.rankTable}>
                    <thead>
                      <tr>
                        <th className={styles.rankNum}>#</th>
                        <th className={styles.rankName}>Article</th>
                        <th className={styles.rankCount}>Views</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.articleViewRankings.map((r, i) => (
                        <tr key={r.slug} className={styles.rankRow}>
                          <td className={styles.rankNum}>{i + 1}</td>
                          <td className={styles.rankName}>
                            <Link href={`https://www.bonjouridol.com/articles/${r.slug}`}
                              target="_blank" className={styles.rankLink}>
                              {fmtSlug(r.slug)}
                            </Link>
                          </td>
                          <td className={styles.rankCount}>{r.totalViews.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </section>

          </div>
        </div>
      </div>
  )
}
