import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { supabase } from "../supabase";

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
  locked: {
    label: "În curs de rezervare",
    color: "#a0785a",
    bg: "rgba(160,120,90,.15)",
    border: "#a0785a",
    icon: "🟤",
  },
};

// Generează session ID unic: T1_02052026_1139
export function generateTableSessionId(tableLabel) {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = now.getFullYear();
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  return `${tableLabel}_${dd}${mm}${yyyy}_${hh}${min}`;
}

const TableContext = createContext(null);

export function TableProvider({ children, restaurantId }) {
  const [tableStates, setTableStates] = useState({});
  const [activeSessions, setActiveSessions] = useState({});

  // Încarcă statusurile — cheia este table_session_id
  const loadTableStates = useCallback(async () => {
    if (!restaurantId) return;
    try {
      // 1. Sesiuni active (ocupate fizic)
      const { data } = await supabase
        .from("table_sessions")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .in("status", ["occupied", "paid"]);

      const states = {};
      const sessions = {};
      (data || []).forEach((s) => {
        const key = s.table_label;
        if (key) {
          states[key] = s.status;
          sessions[key] = s;
        }
      });

      // 2. Rezervari de azi la ora curenta (+/- 30 min)
      const now = new Date();
      const todayStr = now.toISOString().split("T")[0];
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      const currentTime = `${hh}:${mm}`;

      const { data: reservations } = await supabase
        .from("reservations")
        .select("table_label, time")
        .eq("restaurant_id", restaurantId)
        .eq("date", todayStr)
        .in("status", ["pending", "confirmed"])
        .not("table_label", "is", null);

      (reservations || []).forEach((r) => {
        if (!r.table_label || !r.time) return;
        // Calculeaza diferenta in minute
        const [rh, rm] = r.time.split(":").map(Number);
        const [ch, cm] = currentTime.split(":").map(Number);
        const diffMin = rh * 60 + rm - (ch * 60 + cm);
        // Afiseaza ca rezervata intre -30 min si +120 min fata de ora rezervarii
        if (diffMin >= -30 && diffMin <= 120) {
          // Nu suprascrie daca masa e deja ocupata/platita fizic
          if (!states[r.table_label] || states[r.table_label] === "free") {
            states[r.table_label] = "reserved";
          }
        }
      });

      setTableStates(states);
      setActiveSessions(sessions);
    } catch (err) {}
  }, [restaurantId]);

  // Polling 8s + Realtime
  useEffect(() => {
    if (!restaurantId) return;
    loadTableStates();
    const interval = setInterval(loadTableStates, 8000);
    const channel = supabase
      .channel(`table_sessions_${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "table_sessions",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => loadTableStates(),
      )
      .subscribe();
    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [restaurantId, loadTableStates]);

  // ── Ocupă masă — generează session ID unic ──
  const occupyTable = useCallback(
    async (tableId, tableLabel) => {
      if (!restaurantId || !tableLabel) return null;
      try {
        const sessionId = generateTableSessionId(tableLabel);

        // Închide sesiunile active existente pe această masă
        await supabase
          .from("table_sessions")
          .update({ status: "closed", closed_at: new Date().toISOString() })
          .eq("restaurant_id", restaurantId)
          .eq("table_label", tableLabel)
          .in("status", ["occupied", "paid"]);

        // Creează sesiune nouă cu session ID unic
        const { data } = await supabase
          .from("table_sessions")
          .insert({
            restaurant_id: restaurantId,
            table_id: tableId,
            table_label: tableLabel,
            table_session_id: sessionId,
            status: "occupied",
            started_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (data) {
          setTableStates((prev) => ({ ...prev, [tableLabel]: "occupied" }));
          setActiveSessions((prev) => ({ ...prev, [tableLabel]: data }));
        }

        return sessionId;
      } catch (err) {
        return null;
      }
    },
    [restaurantId],
  );

  // ── Marchează plătită (albastru) — clientul cere nota ──
  const markPaid = useCallback(
    async (tableLabel) => {
      if (!tableLabel) return;
      try {
        const session = activeSessions[tableLabel];
        if (session?.id) {
          await supabase
            .from("table_sessions")
            .update({ status: "paid", paid_at: new Date().toISOString() })
            .eq("id", session.id);
        } else {
          await supabase
            .from("table_sessions")
            .update({ status: "paid", paid_at: new Date().toISOString() })
            .eq("restaurant_id", restaurantId)
            .eq("table_label", tableLabel)
            .eq("status", "occupied");
        }
        setTableStates((prev) => ({ ...prev, [tableLabel]: "paid" }));
      } catch (err) {}
    },
    [activeSessions, restaurantId],
  );

  // ── Eliberează masă (verde) — ospătarul confirmă plata ──
  const freeTable = useCallback(
    async (tableLabel) => {
      if (!tableLabel) return;
      try {
        await supabase
          .from("table_sessions")
          .update({ status: "closed", closed_at: new Date().toISOString() })
          .eq("restaurant_id", restaurantId)
          .eq("table_label", tableLabel)
          .in("status", ["occupied", "paid"]);

        setTableStates((prev) => {
          const next = { ...prev };
          delete next[tableLabel];
          return next;
        });
        setActiveSessions((prev) => {
          const next = { ...prev };
          delete next[tableLabel];
          return next;
        });
      } catch (err) {}
    },
    [restaurantId],
  );

  // ── Rezervă masă (galben) ──
  const reserveTable = useCallback(
    async (tableId, tableLabel) => {
      if (!tableLabel) return;
      try {
        const sessionId = generateTableSessionId(tableLabel);
        await supabase.from("table_sessions").insert({
          restaurant_id: restaurantId,
          table_id: tableId,
          table_label: tableLabel,
          table_session_id: sessionId,
          status: "reserved",
          started_at: new Date().toISOString(),
        });
        setTableStates((prev) => ({ ...prev, [tableLabel]: "reserved" }));
      } catch (err) {}
    },
    [restaurantId],
  );

  const getStatus = useCallback(
    (tableLabel) => tableStates[tableLabel] || "free",
    [tableStates],
  );

  const getSessionId = useCallback(
    (tableLabel) => activeSessions[tableLabel]?.table_session_id || null,
    [activeSessions],
  );

  const reload = useCallback(() => loadTableStates(), [loadTableStates]);

  return (
    <TableContext.Provider
      value={{
        tableStates,
        activeSessions,
        occupyTable,
        markPaid,
        freeTable,
        reserveTable,
        getStatus,
        getSessionId,
        reload,
      }}
    >
      {children}
    </TableContext.Provider>
  );
}

export function useTable() {
  const ctx = useContext(TableContext);
  if (!ctx)
    return {
      tableStates: {},
      activeSessions: {},
      occupyTable: async () => null,
      markPaid: async () => {},
      freeTable: async () => {},
      reserveTable: async () => {},
      getStatus: () => "free",
      getSessionId: () => null,
      reload: () => {},
    };
  return ctx;
}
