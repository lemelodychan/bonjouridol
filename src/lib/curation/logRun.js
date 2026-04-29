export async function logCrawlRun(supabase, runType, triggeredBy, stats, githubContext = null) {
  const errors = stats.errors?.length > 0 ? stats.errors : null
  const hasWork = (stats.new ?? 0) > 0 || (stats.processed ?? 0) > 0
  const status = errors?.length
    ? (hasWork ? 'partial' : 'error')
    : 'ok'

  try {
    await supabase.from('crawl_runs').insert({
      run_type:           runType,
      triggered_by:       triggeredBy,
      fetched:            stats.fetched       ?? null,
      new_items:          stats.new           ?? null,
      skipped:            stats.skipped       ?? null,
      processed:          stats.processed     ?? null,
      pending_review:     stats.pending       ?? null,
      rejected:           stats.rejected      ?? null,
      errors,
      status,
      github_run_id:      githubContext?.runId     ?? null,
      github_run_number:  githubContext?.runNumber ?? null,
      github_repo:        githubContext?.repo      ?? null,
    })
  } catch { /* best-effort — never throws */ }
}
