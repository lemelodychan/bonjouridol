import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { runProcessQueue } from '@/lib/curation/processor'
import { logCrawlRun } from '@/lib/curation/logRun'
import { requireAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
  if (!supabaseUrl || (!serviceKey && !anonKey)) return null
  return createSupabaseClient(supabaseUrl, serviceKey || anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

// Called by GitHub Actions on schedule (CRON_SECRET) or manually by an admin.
export async function POST(request) {
  const auth = await requireAdmin(request, { allowCron: true })
  if (!auth.ok) return auth.response

  let supabase = null
  let githubContext = null

  try {
    supabase = getSupabaseClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    let body = {}
    try { body = await request.json() } catch { /* no body is fine */ }

    githubContext = body.github_run_id ? {
      runId:     String(body.github_run_id),
      runNumber: body.github_run_number ? Number(body.github_run_number) : null,
      repo:      body.github_repo || null,
    } : null

    const results = await runProcessQueue(supabase)
    if (results.processed > 0) await logCrawlRun(supabase, 'process', 'cron', results, githubContext)
    return NextResponse.json(results)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (supabase) {
      await logCrawlRun(supabase, 'process', 'cron', { errors: [message] }, githubContext).catch(() => {})
    }
    return NextResponse.json({ error: message }, { status: 503 })
  }
}
