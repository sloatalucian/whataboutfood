import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://dsqkqqaojwxouimcacgy.supabase.co";
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzcWtxcWFvand4b3VpbWNhY2d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MTM0NzcsImV4cCI6MjA5MjE4OTQ3N30.Sb-6N8L1fft_fZOP37Q3O00ihQn8kN6NdE584MwdR5Y";

// Lock custom cu fallback - previne blocajul cauzat de lock-uri orfane
// dupa ce tab-ul a fost suspendat in inactivitate.
//
// Comportament:
// - Lock LIBER → il obtine si ruleaza fn() in interiorul lui (serializare
//   corecta intre tab-uri, exact ca un lock Web Locks normal).
// - Lock OCUPAT/ORFAN → dupa un timeout scurt (LOCK_TIMEOUT_MS) abortam cererea,
//   request() arunca AbortError, il prindem si rulam fn() DIRECT, fara lock.
//   Astfel nu ramanem niciodata blocati pe un lock care nu se mai elibereaza
//   (cazul "Se incarca..." / "Se verifica..." infinit dupa inactivitate).
//
// fn() ruleaza EXACT O SINGURA DATA in toate cazurile:
// - daca lock-ul e obtinut → ruleaza in interiorul callback-ului;
// - daca cererea e abortata INAINTE de obtinerea lock-ului → callback-ul NU mai
//   este apelat de browser, deci ruleaza doar in ramura catch.
//
// NU folosim AbortSignal.timeout(...) pentru ca nu e suportat pe iOS Safari 15;
// folosim AbortController + setTimeout manual (compatibil universal).
const LOCK_TIMEOUT_MS = 5000;

const lockWithFallback = async (name, acquireTimeout, fn) => {
  // Web Locks API indisponibil (browsere foarte vechi) → rulam direct
  if (typeof navigator === "undefined" || !navigator.locks) {
    return await fn();
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    // Lock-ul nu s-a obtinut in LOCK_TIMEOUT_MS → il consideram orfan/blocat
    // si abortam cererea ca sa iesim din asteptare.
    controller.abort();
  }, LOCK_TIMEOUT_MS);

  try {
    // Daca lock-ul e liber, callback-ul ruleaza imediat cu fn() in interior.
    // Daca e ocupat, request() asteapta; la abort, arunca AbortError (catch-ul de jos).
    return await navigator.locks.request(
      name,
      { signal: controller.signal },
      async () => {
        return await fn();
      },
    );
  } catch (e) {
    // AbortError (lock orfan/blocat, timeout depasit) SAU orice alta eroare
    // legata de lock → rulam fn() direct, o singura data.
    // Important: daca cererea a fost abortata inainte de a obtine lock-ul,
    // callback-ul de mai sus NU a fost apelat, deci fn() NU a rulat inca.
    return await fn();
  } finally {
    clearTimeout(timeoutId);
  }
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
