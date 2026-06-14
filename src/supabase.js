import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://dsqkqqaojwxouimcacgy.supabase.co";
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzcWtxcWFvand4b3VpbWNhY2d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MTM0NzcsImV4cCI6MjA5MjE4OTQ3N30.Sb-6N8L1fft_fZOP37Q3O00ihQn8kN6NdE584MwdR5Y";

// Lock custom cu fallback - previne blocajul cauzat de lock-uri orfane
// dupa ce tab-ul a fost suspendat in inactivitate.
// Daca lock-ul "lock:waf-session" e liber → il foloseste normal (serializare corecta intre tab-uri).
// Daca e ocupat sau orfan → ruleaza direct fara sa astepte (evita blocajul "Se incarca" infinit).
const lockWithFallback = async (name, acquireTimeout, fn) => {
  // Web Locks API indisponibil (browsere foarte vechi) → rulam direct
  if (typeof navigator === "undefined" || !navigator.locks) {
    return await fn();
  }

  let ranInLock = false;
  let result;
  try {
    result = await navigator.locks.request(
      name,
      { ifAvailable: true },
      async (lock) => {
        if (lock) {
          // Lock obtinut cu succes → executam in interiorul lui
          ranInLock = true;
          return await fn();
        }
        // Lock ocupat/orfan → iesim imediat, rulam mai jos fara lock
        return undefined;
      },
    );
  } catch (e) {
    ranInLock = false;
  }

  // Daca nu am reusit sa rulam in lock (ocupat/orfan), rulam direct
  if (!ranInLock) {
    return await fn();
  }
  return result;
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "waf-session",
    lock: lockWithFallback,
  },
});
