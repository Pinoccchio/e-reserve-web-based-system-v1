import { createClient } from "@supabase/supabase-js"

// During build time, these might be undefined
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Only throw error if we're not building and variables are missing
if (!supabaseUrl || !supabaseAnonKey) {
  if (process.env.NODE_ENV !== "production" || process.env.NEXT_PHASE !== "phase-production-build") {
    throw new Error("Missing Supabase environment variables")
  }
}

// Create client with empty strings as fallback
export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "")

