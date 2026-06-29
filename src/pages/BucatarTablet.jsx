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
  const [soundOn, setSoundOn] = useState(false);
  const channelRef = useRef(null);
  const audioCtxRef = useRef(null);
  const seenBatchesRef = useRef(null); // Set de semnaturi loturi vazute (pt sunet)
  const soundOnRef = useRef(false); // oglinda soundOn pt closure-uri

  // Ceas live (actualizeaza duratele la fiecare secunda)
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // ─── Sunet: clopotel placut la comanda noua ───
  const playDing = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const tone = (freq, start, dur, vol) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(vol, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur);
    };
    // ding-dong: doua tonuri armonioase (A5 + E5)
    tone(880, t0, 0.5, 0.25);
    tone(659.25, t0 + 0.12, 0.6, 0.22);
  }, []);

  const toggleSound = useCallback(() => {
    setSoundOn((prev) => {
      const next = !prev;
      soundOnRef.current = next;
      if (next) {
        // Initializeaza AudioContext la interactiunea user-ului (cerinta browser)
        if (!audioCtxRef.current) {
          const AC = window.AudioContext || window.webkitAudioContext;
          audioCtxRef.current = new AC();
        }
        if (audioCtxRef.current.state === "suspended") {
          audioCtxRef.current.resume();
        }
        playDing(); // confirmare
      }
      return next;
    });
  }, [playDing]);

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

  // ─── Detectare lot nou -> sunet ───
  // Semnatura unui lot activ = orderId + accepted_at (se schimba la fiecare preluare,
  // deci si la comanda noua, si la produse adaugate re-preluate).
  useEffect(() => {
    const activeSigs = new Set(
      processed
        .filter((o) => o.kStatus === "noua")
        .map((o) => `${o.id}:${o.accepted_at}`),
    );

    // Prima incarcare: doar memoram, nu sunam (altfel ar suna pt toate comenzile existente)
    if (seenBatchesRef.current === null) {
      seenBatchesRef.current = activeSigs;
      return;
    }

    // Loturi noi = cele care nu erau in setul anterior
    let hasNew = false;
    for (const sig of activeSigs) {
      if (!seenBatchesRef.current.has(sig)) {
        hasNew = true;
        break;
      }
    }
    if (hasNew && soundOnRef.current) {
      playDing();
    }
    seenBatchesRef.current = activeSigs;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders]);

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
          <button
            onClick={toggleSound}
            style={{ ...S.soundBtn, ...(soundOn ? S.soundBtnOn : {}) }}
          >
            {soundOn ? "🔔 Sunet activat" : "🔕 Activează sunetul"}
          </button>
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
      {/* Header card: masa + durata sus, badge pe rand propriu */}
      <div style={S.cardHead}>
        <div style={S.cardHeadTop}>
          <span style={S.table}>{order.table_label || "—"}</span>
          <span style={{ ...S.duration, color: isNew ? waitColor : "#888" }}>
            ⏱ {fmtDuration(durationMs)}
            {!isNew && durationMs != null ? " (prep)" : ""}
          </span>
        </div>
        <span
          style={{
            ...S.badge,
            ...(isNew ? S.badgeNew : S.badgeDone),
            ...(isAddon ? S.badgeAddon : {}),
          }}
        >
          {isAddon ? "+ Nouă · adăugat" : isNew ? "🔥 Nouă" : "✅ Gata"}
        </span>
      </div>

      {/* Ospatar */}
      {order.waiter_name && (
        <div style={S.metaRow}>
          <span style={S.waiter}>🤵 {order.waiter_name}</span>
        </div>
      )}

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
  soundBtn: {
    fontSize: 12,
    fontWeight: 700,
    padding: "6px 12px",
    borderRadius: 9,
    border: "1px solid #333",
    background: "#1a1a1a",
    color: "#bbb",
    cursor: "pointer",
    fontFamily: "inherit",
    whiteSpace: "nowrap",
  },
  soundBtnOn: {
    background: "rgba(34,197,94,.15)",
    borderColor: "rgba(34,197,94,.4)",
    color: "#4ade80",
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
    gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))",
    gap: 12,
    padding: 14,
    maxWidth: 1200,
    margin: "0 auto",
  },
  card: {
    background: "#141414",
    border: "1.5px solid #2a2a2a",
    borderRadius: 14,
    overflow: "hidden",
  },
  cardNew: {
    borderColor: "rgba(245,158,11,.5)",
    boxShadow: "0 0 0 1px rgba(245,158,11,.15)",
  },
  cardDone: {
    borderColor: "#222",
    opacity: 0.5,
    filter: "saturate(.4)",
  },
  cardAddon: {
    borderColor: "rgba(96,165,250,.5)",
    boxShadow: "0 0 0 1px rgba(96,165,250,.15)",
    opacity: 1,
    filter: "none",
  },
  cardHead: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    padding: "10px 12px 8px",
  },
  cardHeadTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  table: {
    fontFamily: "'Fraunces',serif",
    fontWeight: 900,
    fontSize: 22,
    color: "#fff",
    lineHeight: 1,
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    alignSelf: "flex-start",
    fontSize: 10.5,
    fontWeight: 800,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    padding: "4px 10px",
    borderRadius: 99,
    whiteSpace: "nowrap",
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
    padding: "0 12px 8px",
  },
  waiter: { fontSize: 11.5, color: "#aaa", fontWeight: 600 },
  duration: { fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" },
  divider: { height: 1, background: "#222", margin: "0 12px" },
  items: { padding: "8px 12px" },
  itemRow: {
    display: "flex",
    flexDirection: "column",
    gap: 1,
    padding: "6px 0",
    borderBottom: "1px solid #1a1a1a",
  },
  itemQty: {
    fontFamily: "'Fraunces',serif",
    fontWeight: 900,
    fontSize: 16,
    color: "#fbbf24",
    lineHeight: 1,
  },
  itemName: {
    fontWeight: 600,
    fontSize: 14.5,
    color: "#e8e8e8",
    lineHeight: 1.25,
  },
  note: {
    margin: "0 12px 10px",
    padding: "8px 10px",
    background: "#1a1a1a",
    borderRadius: 8,
    borderLeft: "3px solid #fbbf24",
    fontSize: 11.5,
    color: "#bbb",
    lineHeight: 1.45,
  },
  noteLabel: {
    fontSize: 9,
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
    padding: "8px 12px",
    background: "#111",
    borderTop: "1px solid #1e1e1e",
  },
  footText: { fontSize: 11, color: "#666", fontWeight: 600 },
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
