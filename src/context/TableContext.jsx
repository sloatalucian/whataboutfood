import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from "react";

// ─── STĂRILE MESEI ────────────────────────────────────────────────────────────
export const TABLE_STATUS = {
  free: {
    label: "Liberă",
    color: "#4a6e4a",
    bg: "rgba(74,110,74,.15)",
    border: "#4a6e4a",
    icon: "🟢",
  },
  reserved: {
    label: "Rezervată",
    color: "#c8a97e",
    bg: "rgba(200,169,126,.15)",
    border: "#c8a97e",
    icon: "🟡",
  },
  occupied: {
    label: "Ocupată",
    color: "#c0622f",
    bg: "rgba(192,98,47,.15)",
    border: "#c0622f",
    icon: "🔴",
  },
  paid: {
    label: "Achitată",
    color: "#5b8dd9",
    bg: "rgba(91,141,217,.15)",
    border: "#5b8dd9",
    icon: "🔵",
  },
};

// ─── STORE GLOBAL (în afara componentelor — persiste între re-render-uri) ────
// Acesta este "creierul" — un singur obiect partajat în toată aplicația
const globalTableStates = {}; // { tableId: "free"|"occupied"|"reserved"|"paid" }
const globalSessions = {}; // { tableId: { id, tableLabel, startedAt } }
const listeners = new Set(); // componente care ascultă schimbările

const notifyAll = () => {
  listeners.forEach((fn) => fn({})); // forțează re-render la toți abonații
};

// ─── CONTEXT ─────────────────────────────────────────────────────────────────
const TableContext = createContext(null);

export function TableProvider({ children, restaurantId }) {
  // State local doar pentru a forța re-render când globalTableStates se schimbă
  const [, forceUpdate] = useState({});

  // Abonare la schimbări globale
  const forceUpdateRef = useRef(null);
  if (!forceUpdateRef.current) {
    forceUpdateRef.current = () => forceUpdate({});
    listeners.add(forceUpdateRef.current);
  }

  // Cleanup la unmount
  const cleanup = useCallback(() => {
    if (forceUpdateRef.current) {
      listeners.delete(forceUpdateRef.current);
    }
  }, []);

  // ── Ocupă masă ──
  const occupyTable = useCallback(
    async (tableId, tableLabel) => {
      const session = {
        id: Date.now(),
        tableId,
        tableLabel,
        restaurantId,
        status: "occupied",
        started_at: new Date().toISOString(),
      };
      globalTableStates[tableId] = "occupied";
      globalSessions[tableId] = session;
      notifyAll();

      // Încearcă și Supabase în background (nu blochează UI)
      try {
        const { supabase } = await import("../supabase");
        await supabase.from("table_sessions").insert({
          restaurant_id: restaurantId,
          table_id: String(tableId),
          table_label: tableLabel,
          status: "occupied",
          started_at: session.started_at,
        });
      } catch (err) {
        // Ignoră — starea locală e deja setată
      }

      return session;
    },
    [restaurantId],
  );

  // ── Marchează achitat ──
  const markPaid = useCallback(async (tableId) => {
    globalTableStates[tableId] = "paid";
    notifyAll();

    try {
      const { supabase } = await import("../supabase");
      const session = globalSessions[tableId];
      if (session?.id) {
        await supabase
          .from("table_sessions")
          .update({ status: "paid", paid_at: new Date().toISOString() })
          .eq("id", session.id);
      }
    } catch (err) {}
  }, []);

  // ── Eliberează masă ──
  const freeTable = useCallback(async (tableId) => {
    // Salvăm sesiunea înainte să o ștergem
    const session = globalSessions[tableId];
    delete globalTableStates[tableId];
    delete globalSessions[tableId];
    notifyAll();

    try {
      const { supabase } = await import("../supabase");
      if (session?.id) {
        await supabase
          .from("table_sessions")
          .update({ status: "closed", closed_at: new Date().toISOString() })
          .eq("id", session.id);
      } else {
        // Dacă nu avem sesiune, ștergem după table_id și status activ
        await supabase
          .from("table_sessions")
          .update({ status: "closed", closed_at: new Date().toISOString() })
          .eq("table_id", tableId)
          .in("status", ["occupied", "paid"]);
      }
    } catch (err) {}
  }, []);

  // ── Setează rezervată ──
  const reserveTable = useCallback((tableId) => {
    globalTableStates[tableId] = "reserved";
    notifyAll();
  }, []);

  // ── Obține status ──
  const getStatus = useCallback((tableId) => {
    return globalTableStates[tableId] || "free";
  }, []);

  // ── Reload (pentru butonul 🔄) ──
  const reload = useCallback(() => {
    notifyAll();
  }, []);

  return (
    <TableContext.Provider
      value={{
        tableStates: { ...globalTableStates },
        activeSessions: { ...globalSessions },
        occupyTable,
        markPaid,
        freeTable,
        reserveTable,
        getStatus,
        reload,
      }}
    >
      {children}
    </TableContext.Provider>
  );
}

export const useTable = () => useContext(TableContext);
