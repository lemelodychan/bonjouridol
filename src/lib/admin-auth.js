import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Server-side admin gate for API routes. The middleware matcher excludes /api,
// so every privileged route must call this itself. Any valid Supabase user is
// treated as an admin (signups are invite-only).
//
// Usage at the top of a handler:
//   const auth = await requireAdmin(request)
//   if (!auth.ok) return auth.response
//
// For routes also triggered server-to-server (cron / GitHub Actions):
//   const auth = await requireAdmin(request, { allowCron: true })
export async function requireAdmin(request, { allowCron = false } = {}) {
  const token = (request.headers.get('Authorization') || '')
    .replace(/^Bearer\s+/i, '')
    .trim()

  if (allowCron) {
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && token === cronSecret) {
      return { ok: true, cron: true }
    }
  }

  if (!token) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return { ok: false, response: NextResponse.json({ error: 'Auth not configured' }, { status: 500 }) }
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } })
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  return { ok: true, user }
}
