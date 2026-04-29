import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { crawlActiveSources } from '@/lib/curation/crawlSources'
import { logCrawlRun } from '@/lib/curation/logRun'

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
  if (!supabaseUrl || (!serviceKey && !anonKey)) return null
  return createSupabaseClient(supabaseUrl, serviceKey || anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function checkCronSecret(request) {
  const authHeader = request.headers.get('Authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  return authHeader === `Bearer ${cronSecret}`
}

export async function POST(request) {
  if (!checkCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  let body = {}
  try { body = await request.json() } catch { /* no body is fine */ }

  const githubContext = body.github_run_id ? {
    runId:     String(body.github_run_id),
    runNumber: body.github_run_number ? Number(body.github_run_number) : null,
    repo:      body.github_repo || null,
  } : null

  try {
    const totals = await crawlActiveSources(supabase, body.source_ids || null)
    await logCrawlRun(supabase, 'fetch', 'cron', totals, githubContext)
    return NextResponse.json(totals)
  } catch (err) {
    await logCrawlRun(supabase, 'fetch', 'cron', { errors: [err.message] }, githubContext)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
