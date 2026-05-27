// Client-side fetch wrapper that attaches the current Supabase session token
// as a Bearer Authorization header, so server-side requireAdmin() can validate
// the caller. Use this for every call to a protected /api/admin/** (or other
// admin-gated) route from client components.
import { createBrowserSupabaseClient } from '@/lib/supabase-browser'

export async function adminFetch(input, init = {}) {
  const headers = new Headers(init.headers || {})

  try {
    const supabase = createBrowserSupabaseClient()
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        headers.set('Authorization', `Bearer ${session.access_token}`)
      }
    }
  } catch {
    // If the session can't be read, fall through; the server returns 401.
  }

  return fetch(input, { ...init, headers })
}
