import { createClient } from '@supabase/supabase-js'

// Only create client if we're in the browser or if environment variables are available
const isServer = typeof window === 'undefined'
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

let supabase = null

// Only create client if environment variables are available
if (supabaseUrl && supabaseAnonKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey)
  } catch (error) {
    console.warn('Failed to create Supabase client:', error.message)
  }
} else if (isServer) {
  // Only warn on server side to avoid console spam in browser
  console.warn('Missing Supabase environment variables. Please check your .env files.')
}

export { supabase }
