// Client-side Supabase client
export { createClient as createBrowserClient } from './client'

// Server-side Supabase client
export { createClient as createServerClient } from './server'

// Middleware helper
export { updateSession } from './middleware'

// Database types
export type { Database } from './types'