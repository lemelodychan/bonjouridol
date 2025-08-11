// Lazy-load Supabase client to avoid build-time issues
let supabase = null

function createSupabaseClient() {
  if (supabase) return supabase
  
  try {
    const { createClient } = require('@supabase/supabase-js')
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

    if (supabaseUrl && supabaseAnonKey) {
      supabase = createClient(supabaseUrl, supabaseAnonKey)
    }
  } catch (error) {
    // Silently fail during build time
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Failed to create Supabase client:', error.message)
    }
  }
  
  return supabase
}

// Export a function that creates the client when needed
export { createSupabaseClient }
export { supabase }
