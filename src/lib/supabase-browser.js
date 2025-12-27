// Browser-only Supabase client
// This file should only be imported in client components
import { createClient } from '@supabase/supabase-js'

let supabaseClient = null

export function createBrowserSupabaseClient() {
  if (typeof window === 'undefined') {
    return null
  }

  if (supabaseClient) return supabaseClient

  // In Next.js, NEXT_PUBLIC_* env vars are available at build time
  // They should be available in the browser, but let's add better error handling
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase environment variables not configured', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseAnonKey,
      url: supabaseUrl || 'missing',
      keyPrefix: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 10)}...` : 'missing'
    })
    return null
  }

  // Validate URL format
  try {
    new URL(supabaseUrl)
  } catch (error) {
    console.error('Invalid Supabase URL format:', supabaseUrl)
    return null
  }

  try {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        storageKey: 'supabase.auth.token'
      },
      global: {
        headers: {
          'x-client-info': 'bonjouridol-admin'
        }
      }
    })
    
    console.log('Supabase client created successfully', {
      url: supabaseUrl,
      hasClient: !!supabaseClient
    })
  } catch (error) {
    console.error('Failed to create browser Supabase client:', error)
    return null
  }

  return supabaseClient
}

