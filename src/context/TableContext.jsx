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
        // Folosim table_label ca cheie principală
        const key = s.table_label || s.table_id;
        if (key) {
          states[key] = s.status;
          sessions[key] = s;
        }
      });
      setTableStates(states);
      setActiveSessions(sessions);
    } catch (err) {}
  }, [restaurantId]);

  // Încarcă la mount + polling 8 secunde + Realtime
  useEffect(() => {
    if (!restaurantId) return;
    loadTableStates();

    // Polling la fiecare 8 secunde
    const interval = setInterval(loadTableStates, 8000);

    // Realtime ca backup
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
  const occupyTable = useCallback(
    async (tableId, tableLabel) => {
      if (!restaurantId) return;
      try {
        // Închide sesiunile active existente pentru această masă
        await supabase
          .from("table_sessions")
          .update({ status: "closed", closed_at: new Date().toISOString() })
          .eq("table_id", tableId)
          .in("status", ["occupied", "paid", "reserved"]);

        // Creează sesiune nouă
        const { data } = await supabase
          .from("table_sessions")
          .insert({
            restaurant_id: restaurantId,
            table_id: tableId,
            status: "occupied",
            started_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (data) {
          setTableStates((prev) => ({ ...prev, [tableId]: "occupied" }));
          setActiveSessions((prev) => ({ ...prev, [tableId]: data }));
        }
      } catch (err) {}
    },
    [restaurantId],
  );

  // ── Marchează plătită ──
  const markPaid = useCallback(
    async (tableId) => {
      try {
        const session = activeSessions[tableId];
        if (session?.id) {
          await supabase
            .from("table_sessions")
            .update({ status: "paid", paid_at: new Date().toISOString() })
            .eq("id", session.id);
        } else {
          await supabase
            .from("table_sessions")
            .update({ status: "paid", paid_at: new Date().toISOString() })
            .eq("table_id", tableId)
            .eq("status", "occupied");
        }
        setTableStates((prev) => ({ ...prev, [tableId]: "paid" }));
      } catch (err) {}
    },
    [activeSessions],
  );

  // ── Eliberează masă ──
  const freeTable = useCallback(async (tableId) => {
    try {
      await supabase
        .from("table_sessions")
        .update({ status: "closed", closed_at: new Date().toISOString() })
        .eq("table_id", tableId)
        .in("status", ["occupied", "paid", "reserved"]);

      setTableStates((prev) => {
        const next = { ...prev };
        delete next[tableId];
        return next;
      });
      setActiveSessions((prev) => {
        const next = { ...prev };
        delete next[tableId];
        return next;
      });
    } catch (err) {}
  }, []);

  // ── Rezervă masă ──
  const reserveTable = useCallback(
    async (tableId) => {
      try {
        await supabase.from("table_sessions").insert({
          restaurant_id: restaurantId,
          table_id: tableId,
          status: "reserved",
          started_at: new Date().toISOString(),
        });
        setTableStates((prev) => ({ ...prev, [tableId]: "reserved" }));
      } catch (err) {}
    },
    [restaurantId],
  );

  const getStatus = useCallback(
    (tableId) => {
      return tableStates[tableId] || "free";
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
