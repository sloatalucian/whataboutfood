import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../supabase";

// ─────────────────────────────────────────────────────────────────────────
// Cuvinte cheie care indica o categorie de bauturi (case-insensitive).
// Produsele din aceste categorii NU apar la bucatarie.
const DRINK_KEYWORDS = [
  "bautur",
  "băutur",
  "racoritoare",
  "răcoritoare",
  "sucuri",
  "suc",
  "drink",
  "beverage",
  "apa",
  "apă",
  "cafea",
  "coffee",
  "cocktail",
  "alcool",
  "bere",
  "vin",
  "wine",
  "bar",
  "limonad",
];

function isDrinkCategory(catName) {
  const c = (catName || "").toLowerCase();
  return DRINK_KEYWORDS.some((k) => c.includes(k));
}

// Inceputul zilei curente (00:00 local) ca ISO, pentru filtrarea "comenzi de azi"
function startOfTodayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

// Formateaza durata in minute:secunde sau "X min"
function fmtDuration(ms) {
  if (ms == null || ms < 0) return "—";
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min < 1) return `${sec}s`;
  return `${min} min`;
}

function fmtClock(date) {
  return date.toLocaleTimeString("ro-RO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function BucatarTablet({ restaurantId, kitchenName, onBack }) {
  const [orders, setOrders] = useState([]);
  const [catMap, setCatMap] = useState({}); // category_id -> name
  const [view, setView] = useState("active"); // 'active' | 'all'
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const channelRef = useRef(null);

  // Ceas live (actualizeaza duratele la fiecare secunda)
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Incarca categoriile restaurantului (pt filtrarea bauturilor dupa nume)
  useEffect(() => {
    if (!restaurantId) return;
    (async () => {
      const { data } = await supabase
        .from("menu_categories")
        .select("id, name")
        .eq("restaurant_id", restaurantId);
      const map = {};
      (data || []).forEach((c) => {
        map[c.id] = c.name;
      });
      setCatMap(map);
    })();
  }, [restaurantId]);

  // Incarca comenzile de azi cu status relevant pentru bucatarie
  const loadOrders = useCallback(async () => {
    if (!restaurantId) return;
    const { data, error } = await supabase
      .from("orders")
      .select(
        "id, table_label, status, items, observations, waiter_name, accepted_at, completed_at, created_at, cooked_count, prev_cooked_count",
      )
      .eq("restaurant_id", restaurantId)
      .in("status", ["cooking", "ready", "paying", "paid"])
      .gte("accepted_at", startOfTodayISO())
      .order("accepted_at", { ascending: true });
    if (!error) setOrders(data || []);
    setLoading(false);
  }, [restaurantId]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Realtime: orice schimbare la orders -> reincarca
  useEffect(() => {
    if (!restaurantId) return;
    const channel = supabase
      .channel(`kitchen-orders-${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => loadOrders(),
      )
      .subscribe();
    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, loadOrders]);

  // ─── Procesare comenzi: filtrare bauturi + maparea statusului la bucatarie ───
  // Status bucatarie: cooking -> "noua", ready/paying/paid -> "gata"
  function kitchenStatus(dbStatus) {
    if (dbStatus === "cooking") return "noua";
    return "gata"; // ready, paying, paid = bucatarul a terminat
  }

  // Produsele relevante pentru bucatarie, dupa logica de loturi:
  //   - "noua" (cooking): produsele negatite = items.slice(cooked_count)
  //   - "gata" (ready):   ultimul lot terminat = items.slice(prev_cooked_count, cooked_count)
  // Apoi se filtreaza bauturile.
  function kitchenItems(order, kStatus) {
    const allItems = order.items || [];
    const cooked = order.cooked_count || 0;
    const prev = order.prev_cooked_count || 0;

    let batch;
    if (kStatus === "noua") {
      batch = allItems.slice(cooked); // produsele inca nefacute
    } else {
      // gata: ultimul lot terminat (daca exista granite valide), altfel tot
      batch =
        cooked > prev
          ? allItems.slice(prev, cooked)
          : allItems.slice(0, cooked);
    }

    // filtrare bauturi
    return batch.filter((it) => {
      const catName = catMap[it.category_id];
      return !isDrinkCategory(catName);
    });
  }

  // E o adaugire la o masa care a primit deja mancare? (lot nou, nu prima comanda)
  function isAddonBatch(order) {
    return (order.cooked_count || 0) > 0 && order.status === "cooking";
  }

  // Comenzile care au cel putin un preparat (dupa filtrarea bauturilor)
  const processed = orders
    .map((o) => {
      const kStatus = kitchenStatus(o.status);
      return {
        ...o,
        kStatus,
        cookItems: kitchenItems(o, kStatus),
        isAddon: isAddonBatch(o),
      };
    })
    .filter((o) => o.cookItems.length > 0);

  // Vizualizare
  const visible = processed.filter((o) =>
    view === "active" ? o.kStatus === "noua" : true,
  );

  // Sortare: noua inainte de gata; in cadrul fiecaruia, cele mai vechi sus
  const sorted = [...visible].sort((a, b) => {
    const order = { noua: 0, gata: 1 };
    if (order[a.kStatus] !== order[b.kStatus])
      return order[a.kStatus] - order[b.kStatus];
    return new Date(a.accepted_at) - new Date(b.accepted_at);
  });

  const activeCount = processed.filter((o) => o.kStatus === "noua").length;
  const doneCount = processed.filter((o) => o.kStatus === "gata").length;

  return (
    <div style={S.page}>
      {/* HEADER */}
      <div style={S.header}>
        <div style={S.brand}>
          <div style={S.logo}>🍽 Bucătărie</div>
          <div style={S.rest}>{kitchenName || "Bucătar"}</div>
        </div>
        <div style={S.clock}>{fmtClock(new Date(now))}</div>
        <div style={S.stats}>
          <span style={{ ...S.pill, ...S.pillActive }}>
            {activeCount} active
          </span>
          <span style={{ ...S.pill, ...S.pillDone }}>{doneCount} gata</span>
          {onBack && (
            <button onClick={onBack} style={S.logout}>
              Ieși
            </button>
          )}
        </div>
      </div>

      {/* TABS */}
      <div style={S.tabs}>
        <button
          onClick={() => setView("active")}
          style={{ ...S.tab, ...(view === "active" ? S.tabOn : {}) }}
        >
          Doar active
        </button>
        <button
          onClick={() => setView("all")}
          style={{ ...S.tab, ...(view === "all" ? S.tabOn : {}) }}
        >
          Toate comenzile de azi
        </button>
      </div>

      {/* GRID */}
      {loading ? (
        <div style={S.empty}>
          <div style={S.emptyIco}>⏳</div>
          <h2 style={S.emptyTitle}>Se încarcă...</h2>
        </div>
      ) : sorted.length === 0 ? (
        <div style={S.empty}>
          <div style={S.emptyIco}>🍳</div>
          <h2 style={S.emptyTitle}>
            {view === "active"
              ? "Nicio comandă activă"
              : "Nicio comandă astăzi"}
          </h2>
          <p style={S.emptyText}>Comenzile noi vor apărea automat</p>
        </div>
      ) : (
        <div style={S.grid}>
          {sorted.map((o) => (
            <OrderCard key={o.id} order={o} now={now} />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderCard({ order, now }) {
  const isNew = order.kStatus === "noua";
  const isAddon = order.isAddon; // lot nou adaugat la o masa cu mancare deja facuta

  // Durata: pentru "noua" = cronometru live (acum - accepted_at)
  //         pentru "gata" = inghetat (completed_at - accepted_at)
  let durationMs = null;
  if (order.accepted_at) {
    const start = new Date(order.accepted_at).getTime();
    if (isNew) {
      durationMs = now - start;
    } else if (order.completed_at) {
      durationMs = new Date(order.completed_at).getTime() - start;
    }
  }

  // Prag de culoare pentru timpul de asteptare (doar la active)
  let waitColor = "#22c55e";
  if (isNew && durationMs != null) {
    const min = durationMs / 60000;
    if (min >= 15) waitColor = "#ff6b6b";
    else if (min >= 8) waitColor = "#fbbf24";
  }

  const totalPieces = order.cookItems.reduce((s, i) => s + (i.qty || 1), 0);
  const placedAt = order.accepted_at
    ? fmtClock(new Date(order.accepted_at))
    : "";
  const readyAt = order.completed_at
    ? fmtClock(new Date(order.completed_at))
    : null;

  return (
    <div
      style={{
        ...S.card,
        ...(isNew ? S.cardNew : S.cardDone),
        ...(isAddon ? S.cardAddon : {}),
      }}
    >
      {/* Header card */}
      <div style={S.cardHead}>
        <div style={S.table}>{order.table_label || "—"}</div>
        <span
          style={{
            ...S.badge,
            ...(isNew ? S.badgeNew : S.badgeDone),
            ...(isAddon ? S.badgeAddon : {}),
          }}
        >
          {isAddon ? "+ Nouă" : isNew ? "🔥 Nouă" : "✅ Gata"}
        </span>
      </div>

      {/* Ospatar + durata */}
      <div style={S.metaRow}>
        <span style={S.waiter}>
          {order.waiter_name && <>🤵 {order.waiter_name}</>}
          {isAddon && (
            <span style={S.addonFlag}>
              {order.waiter_name ? " · " : ""}adăugat la comandă
            </span>
          )}
        </span>
        <span style={{ ...S.duration, color: isNew ? waitColor : "#888" }}>
          ⏱ {fmtDuration(durationMs)}
          {!isNew && durationMs != null ? " (preparare)" : ""}
        </span>
      </div>

      <div style={S.divider} />

      {/* Produse (fara bauturi) */}
      <div style={S.items}>
        {order.cookItems.map((it, idx) => (
          <div key={idx} style={S.itemRow}>
            <span style={S.itemQty}>{it.qty || 1}×</span>
            <span style={S.itemName}>{it.name}</span>
          </div>
        ))}
      </div>

      {/* Mentiuni client */}
      {order.observations && (
        <div style={S.note}>
          <div style={S.noteLabel}>📝 Mențiuni</div>
          {order.observations}
        </div>
      )}

      {/* Footer */}
      <div style={S.cardFoot}>
        <span style={S.footText}>{totalPieces} preparate</span>
        <span style={S.footText}>
          {readyAt ? `Gata la ${readyAt}` : `Preluată la ${placedAt}`}
        </span>
      </div>
    </div>
  );
}

// ─── Stiluri (fundal negru, contrast ridicat pentru bucatarie) ───
const S = {
  page: {
    minHeight: "100vh",
    background: "#0a0a0a",
    color: "#fff",
    fontFamily: "'Plus Jakarta Sans',sans-serif",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 20px",
    background: "#111",
    borderBottom: "1px solid #222",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  brand: { display: "flex", flexDirection: "column" },
  logo: {
    fontFamily: "'Fraunces',serif",
    fontWeight: 900,
    fontSize: 20,
    color: "#e07a47",
  },
  rest: { fontSize: 13, color: "#888", fontWeight: 500 },
  clock: {
    fontFamily: "'Fraunces',serif",
    fontWeight: 700,
    fontSize: 22,
    letterSpacing: "0.04em",
  },
  stats: { display: "flex", gap: 10, alignItems: "center" },
  pill: {
    fontSize: 12,
    fontWeight: 700,
    padding: "5px 12px",
    borderRadius: 99,
  },
  pillActive: {
    background: "rgba(245,158,11,.15)",
    color: "#fbbf24",
    border: "1px solid rgba(245,158,11,.3)",
  },
  pillDone: {
    background: "rgba(34,197,94,.12)",
    color: "#4ade80",
    border: "1px solid rgba(34,197,94,.25)",
  },
  logout: {
    fontSize: 12,
    fontWeight: 700,
    padding: "6px 12px",
    borderRadius: 9,
    border: "1px solid #333",
    background: "#1a1a1a",
    color: "#bbb",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  tabs: {
    display: "flex",
    gap: 0,
    borderBottom: "1px solid #222",
    padding: "0 20px",
  },
  tab: {
    padding: "12px 20px",
    border: "none",
    background: "transparent",
    color: "#888",
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
    borderBottom: "2px solid transparent",
    marginBottom: -1,
    fontFamily: "inherit",
  },
  tabOn: { color: "#e07a47", borderBottomColor: "#e07a47" },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))",
    gap: 16,
    padding: 20,
  },
  card: {
    background: "#141414",
    border: "2px solid #2a2a2a",
    borderRadius: 20,
    overflow: "hidden",
  },
  cardNew: {
    borderColor: "rgba(245,158,11,.5)",
    boxShadow: "0 0 0 1px rgba(245,158,11,.2), 0 8px 24px rgba(245,158,11,.1)",
  },
  cardDone: {
    borderColor: "#222",
    opacity: 0.5,
    filter: "saturate(.4)",
  },
  cardAddon: {
    borderColor: "rgba(96,165,250,.5)",
    boxShadow: "0 0 0 1px rgba(96,165,250,.2), 0 8px 24px rgba(96,165,250,.1)",
    opacity: 1,
    filter: "none",
  },
  cardHead: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 16px 10px",
  },
  table: {
    fontFamily: "'Fraunces',serif",
    fontWeight: 900,
    fontSize: 26,
    color: "#fff",
  },
  badge: {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    padding: "5px 11px",
    borderRadius: 99,
  },
  badgeNew: {
    background: "rgba(245,158,11,.2)",
    color: "#fbbf24",
    border: "1px solid rgba(245,158,11,.4)",
  },
  badgeDone: {
    background: "#1a1a1a",
    color: "#4ade80",
    border: "1px solid rgba(34,197,94,.3)",
  },
  badgeAddon: {
    background: "rgba(96,165,250,.2)",
    color: "#93c5fd",
    border: "1px solid rgba(96,165,250,.4)",
  },
  metaRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 16px 12px",
    gap: 8,
  },
  waiter: { fontSize: 12.5, color: "#aaa", fontWeight: 600 },
  addonFlag: { color: "#93c5fd", fontWeight: 700 },
  duration: { fontSize: 13, fontWeight: 700 },
  divider: { height: 1, background: "#222", margin: "0 16px" },
  items: { padding: "10px 14px" },
  itemRow: {
    display: "flex",
    alignItems: "baseline",
    gap: 10,
    padding: "5px 0",
    borderBottom: "1px solid #1a1a1a",
  },
  itemQty: {
    fontFamily: "'Fraunces',serif",
    fontWeight: 900,
    fontSize: 20,
    color: "#fff",
    flexShrink: 0,
    minWidth: 28,
  },
  itemName: {
    fontWeight: 600,
    fontSize: 15,
    color: "#e8e8e8",
    lineHeight: 1.3,
  },
  note: {
    margin: "0 16px 14px",
    padding: "10px 12px",
    background: "#1a1a1a",
    borderRadius: 10,
    borderLeft: "3px solid #fbbf24",
    fontSize: 12.5,
    color: "#bbb",
    lineHeight: 1.5,
  },
  noteLabel: {
    fontSize: 10,
    fontWeight: 800,
    color: "#fbbf24",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: 3,
  },
  cardFoot: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    background: "#111",
    borderTop: "1px solid #1e1e1e",
  },
  footText: { fontSize: 12, color: "#666", fontWeight: 600 },
  empty: { textAlign: "center", padding: "80px 20px", color: "#555" },
  emptyIco: { fontSize: 48, marginBottom: 16 },
  emptyTitle: {
    fontFamily: "'Fraunces',serif",
    fontWeight: 700,
    fontSize: 22,
    color: "#444",
    marginBottom: 8,
  },
  emptyText: { fontSize: 14, color: "#444" },
};
