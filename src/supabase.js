import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://dsqkqqaojwxouimcacgy.supabase.co";
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzcWtxcWFvand4b3VpbWNhY2d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MTM0NzcsImV4cCI6MjA5MjE4OTQ3N30.Sb-6N8L1fft_fZOP37Q3O00ihQn8kN6NdE584MwdR5Y";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "waf-session",
    lock: async (name, acquireTimeout, fn) => fn(),
  },
});
