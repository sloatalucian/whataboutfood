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
};

const TableContext = createContext(null);

export function TableProvider({ children, restaurantId }) {
  const [tableStates, setTableStates] = useState({});
  const [activeSessions, setActiveSessions] = useState({});

  // ── Încarcă statusurile din Supabase ──
  // CHEIE UNICĂ: table_label — consistent peste tot
  const loadTableStates = useCallback(async () => {
    if (!restaurantId) return;
    try {
      const { data } = await supabase
        .from("table_sessions")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .in("status", ["occupied", "paid", "reserved"]);

      const states = {};
      const sessions = {};
      (data || []).forEach((s) => {
        const key = s.table_label;
        if (key) {
          states[key] = s.status;
          sessions[key] = s;
        }
      });
      setTableStates(states);
      setActiveSessions(sessions);
    } catch (err) {}
  }, [restaurantId]);

  // Polling 8 secunde + Realtime
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

  // ── Ocupă masă ──
  // Primește tableId (UUID) și tableLabel — salvează AMBELE în DB
  const occupyTable = useCallback(
    async (tableId, tableLabel) => {
      if (!restaurantId || !tableLabel) return;
      try {
        // Închide sesiunile existente pentru această masă (după label)
        await supabase
          .from("table_sessions")
          .update({ status: "closed", closed_at: new Date().toISOString() })
          .eq("restaurant_id", restaurantId)
          .eq("table_label", tableLabel)
          .in("status", ["occupied", "paid", "reserved"]);

        // Creează sesiune nouă cu AMBELE chei
        const { data } = await supabase
          .from("table_sessions")
          .insert({
            restaurant_id: restaurantId,
            table_id: tableId,
            table_label: tableLabel,
            status: "occupied",
            started_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (data) {
          setTableStates((prev) => ({ ...prev, [tableLabel]: "occupied" }));
          setActiveSessions((prev) => ({ ...prev, [tableLabel]: data }));
        }
      } catch (err) {}
    },
    [restaurantId],
  );

  // ── Marchează plătită (albastru) ──
  // Apelat cu table.label
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

  // ── Eliberează masă (verde) ──
  // Apelat cu table.label după confirmare plată
  const freeTable = useCallback(
    async (tableLabel) => {
      if (!tableLabel) return;
      try {
        await supabase
          .from("table_sessions")
          .update({ status: "closed", closed_at: new Date().toISOString() })
          .eq("restaurant_id", restaurantId)
          .eq("table_label", tableLabel)
          .in("status", ["occupied", "paid", "reserved"]);

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
        await supabase.from("table_sessions").insert({
          restaurant_id: restaurantId,
          table_id: tableId,
          table_label: tableLabel,
          status: "reserved",
          started_at: new Date().toISOString(),
        });
        setTableStates((prev) => ({ ...prev, [tableLabel]: "reserved" }));
      } catch (err) {}
    },
    [restaurantId],
  );

  // getStatus(tableLabel) → "free" | "occupied" | "paid" | "reserved"
  const getStatus = useCallback(
    (tableLabel) => {
      return tableStates[tableLabel] || "free";
    },
    [tableStates],
  );

  const reload = useCallback(() => {
    loadTableStates();
  }, [loadTableStates]);

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
      occupyTable: async () => {},
      markPaid: async () => {},
      freeTable: async () => {},
      reserveTable: async () => {},
      getStatus: () => "free",
      reload: () => {},
    };
  return ctx;
}
