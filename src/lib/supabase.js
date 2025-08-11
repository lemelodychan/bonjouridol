// Completely conditional Supabase client creation
let supabase = null

function createSupabaseClient() {
  // Only create client if we're not in a build context
  if (process.env.NODE_ENV === 'production' && typeof window === 'undefined') {
    // We're in a production server environment, allow client creation
    if (supabase) return supabase
    
    try {
      const { createClient } = require('@supabase/supabase-js')
      
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

      if (supabaseUrl && supabaseAnonKey) {
        supabase = createClient(supabaseUrl, supabaseAnonKey)
      }
    } catch (error) {
      console.warn('Failed to create Supabase client:', error.message)
    }
    
    return supabase
  }
  
  // In development or browser, create client normally
  if (supabase) return supabase
  
  try {
    const { createClient } = require('@supabase/supabase-js')
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

    if (supabaseUrl && supabaseAnonKey) {
      supabase = createClient(supabaseUrl, supabaseAnonKey)
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Failed to create Supabase client:', error.message)
    }
  }
  
  return supabase
}

// Export a function that creates the client when needed
export { createSupabaseClient }
export { supabase }
