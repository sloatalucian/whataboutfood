import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { useTable, TABLE_STATUS } from "../context/TableContext";
import { useApp } from "../context/AppContext";

// ═══════════════════════════════════════════════════════════════════════════
// SELECTARE MASĂ — pagina clientului
// ═══════════════════════════════════════════════════════════════════════════
export function SelectTable({ restaurant, onSelected, onBack }) {
  const { getStatus, occupyTable } = useTable();
  const [selectedFloor, setSelectedFloor] = useState(0);
  const [confirming, setConfirming] = useState(null);
  const [loading, setLoading] = useState(false);

  const floors = restaurant?.floors || [];
  const floor = floors[selectedFloor];
  const tables = floor?.tables || [];

  const handleSelect = (table) => {
    const status = getStatus(table.id);
    if (status !== "free") return;
    setConfirming(table);
  };

  const handleConfirm = async () => {
    if (!confirming) return;
    setLoading(true);
    try {
      const session = await occupyTable(confirming.id, confirming.label);
      if (onSelected) onSelected({ table: confirming, session });
    } catch (err) {
      if (onSelected) onSelected({ table: confirming, session: null });
    }
    setLoading(false);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0d0a07",
        fontFamily: "'Plus Jakarta Sans',sans-serif",
        color: "#f0ebe3",
        paddingBottom: 80,
      }}
    >
      <div
        style={{
          padding: "44px 20px 24px",
          background:
            restaurant?.cover || "linear-gradient(135deg,#2d1507,#1a0e05)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <button
            onClick={onBack}
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: "rgba(0,0,0,.3)",
              border: "1px solid rgba(255,255,255,.15)",
              color: "#fff",
              fontSize: 17,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ←
          </button>
        </div>
        <div style={{ fontSize: 48, marginBottom: 10 }}>
          {restaurant?.emoji}
        </div>
        <div
          style={{
            fontFamily: "'Fraunces',serif",
            fontSize: 26,
            fontWeight: 900,
            marginBottom: 4,
          }}
        >
          {restaurant?.name}
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,.6)" }}>
          Selectează masa la care stai
        </div>
      </div>

      <div style={{ padding: 20 }}>
        {/* Legendă */}
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 20,
          }}
        >
          {Object.entries(TABLE_STATUS).map(([key, val]) => (
            <div
              key={key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11,
                color: "rgba(240,235,227,.6)",
                background: "rgba(255,255,255,.05)",
                padding: "4px 10px",
                borderRadius: 20,
              }}
            >
              <span>{val.icon}</span> {val.label}
            </div>
          ))}
        </div>

        {/* Etaje */}
        {floors.length > 1 && (
          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 16,
              flexWrap: "wrap",
            }}
          >
            {floors.map((fl, i) => (
              <button
                key={fl.id}
                onClick={() => {
                  setSelectedFloor(i);
                  setConfirming(null);
                }}
                style={{
                  padding: "8px 16px",
                  borderRadius: 20,
                  fontSize: 13,
                  cursor: "pointer",
                  background: selectedFloor === i ? "#c0622f" : "#1e1a14",
                  border: `1px solid ${selectedFloor === i ? "#c0622f" : "#2a2218"}`,
                  color: selectedFloor === i ? "#fff" : "#6b6050",
                  fontWeight: selectedFloor === i ? 700 : 400,
                }}
              >
                {fl.name}
              </button>
            ))}
          </div>
        )}

        <div
          style={{
            fontSize: 10,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: "#6b6050",
            marginBottom: 12,
          }}
        >
          {floor?.name} — {tables.length} mese
        </div>

        {/* Grid mese */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: 10,
            marginBottom: 24,
          }}
        >
          {tables.map((table) => {
            const status = getStatus(table.id);
            const cfg = TABLE_STATUS[status];
            const isFree = status === "free";
            return (
              <div
                key={table.id}
                onClick={() => isFree && handleSelect(table)}
                style={{
                  background: cfg.bg,
                  border: `2px solid ${cfg.border}`,
                  borderRadius: 14,
                  padding: "14px 8px",
                  textAlign: "center",
                  cursor: isFree ? "pointer" : "not-allowed",
                  opacity: status === "paid" ? 0.6 : 1,
                  transition: "all .15s",
                  transform:
                    confirming?.id === table.id ? "scale(1.05)" : "scale(1)",
                  boxShadow:
                    confirming?.id === table.id
                      ? `0 0 0 3px ${cfg.border}`
                      : "none",
                }}
              >
                <div style={{ fontSize: 22, marginBottom: 4 }}>🪑</div>
                <div
                  style={{
                    fontFamily: "'Fraunces',serif",
                    fontSize: 16,
                    fontWeight: 700,
                    color: cfg.color,
                  }}
                >
                  {table.label}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: cfg.color,
                    opacity: 0.8,
                    marginTop: 2,
                  }}
                >
                  {table.seats}p
                </div>
                <div
                  style={{
                    fontSize: 9,
                    color: cfg.color,
                    opacity: 0.6,
                    marginTop: 4,
                    fontWeight: 600,
                  }}
                >
                  {cfg.icon} {cfg.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Confirmare */}
        {confirming && (
          <div
            style={{
              background: "#1e1a14",
              border: "1px solid #2a2218",
              borderRadius: 20,
              padding: 20,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                fontFamily: "'Fraunces',serif",
                fontSize: 18,
                fontWeight: 700,
                marginBottom: 6,
              }}
            >
              Confirmi masa {confirming.label}?
            </div>
            <div
              style={{
                fontSize: 13,
                color: "#6b6050",
                marginBottom: 16,
                lineHeight: 1.6,
              }}
            >
              Masă pentru{" "}
              <b style={{ color: "#f0ebe3" }}>{confirming.seats} persoane</b>.
              <br />
              Va fi marcată ca <b style={{ color: "#c0622f" }}>ocupată</b> până
              la plată.
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
              <button
                onClick={() => setConfirming(null)}
                style={{
                  padding: 13,
                  borderRadius: 12,
                  background: "none",
                  border: "1px solid #2a2218",
                  color: "#6b6050",
                  fontSize: 14,
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Anulează
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                style={{
                  padding: 13,
                  borderRadius: 12,
                  background: "linear-gradient(135deg,#c0622f,#8b3a18)",
                  border: "none",
                  color: "#fff",
                  fontSize: 14,
                  cursor: loading ? "not-allowed" : "pointer",
                  fontFamily: "'Fraunces',serif",
                  fontWeight: 700,
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? "Se procesează..." : "✅ Confirmă masa"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TABLETA OSPĂTARULUI
// ═══════════════════════════════════════════════════════════════════════════
export function WaiterTablet({
  restaurant,
  orders = [],
  onOrderUpdate,
  onOrderClose,
  onBack,
  waiterName,
  waiterId,
}) {
  const { tableStates, activeSessions, markPaid, freeTable, reload } =
    useTable();
  const { dispatch, showToast } = useApp();
  const [tab, setTab] = useState("orders");
  const [reservations, setRes] = useState([]);
  const [loadingRes, setLoadingRes] = useState(true);

  // Demo rezervări
  const DEMO_RESERVATIONS = [
    {
      id: "r1",
      table_label: "T2",
      customer_name: "Ion Popescu",
      persons: 3,
      date: "azi",
      time: "13:00",
      confirmed: false,
    },
    {
      id: "r2",
      table_label: "T5",
      customer_name: "Maria Constantin",
      persons: 6,
      date: "azi",
      time: "19:00",
      confirmed: true,
    },
    {
      id: "r3",
      table_label: "E1",
      customer_name: "Andrei Gheorghe",
      persons: 2,
      date: "azi",
      time: "20:30",
      confirmed: false,
    },
  ];

  const [displayReservations, setDisplayReservations] =
    useState(DEMO_RESERVATIONS);
  const [activeMapFloor, setActiveMapFloor] = useState(0);

  useEffect(() => {
    loadReservations();
    const interval = setInterval(loadReservations, 60000);
    return () => clearInterval(interval);
  }, [restaurant?.id]);

  const loadReservations = async () => {
    if (!restaurant?.id) {
      setLoadingRes(false);
      return;
    }
    try {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("reservations")
        .select("*")
        .eq("restaurant_id", restaurant.id)
        .gte("date", today)
        .order("date")
        .order("time");
      if (data && data.length > 0) setDisplayReservations(data);
    } catch {}
    setLoadingRes(false);
  };

  // ── Acceptă comanda — atribuie ospătarului și notifică clientul ──
  const acceptOrder = (orderId) => {
    onOrderUpdate(orderId, "cooking", { waiterId, waiterName });

    // Trimite notificare clientului
    dispatch({
      type: "ADD_NOTIFICATION",
      payload: {
        id: Date.now(),
        type: "order_accepted",
        message: "Comanda ta a fost preluată!",
        details: `Ospătarul ${waiterName || "nostru"} se ocupă de comanda ta.`,
        isRead: false,
        createdAt: new Date().toISOString(),
      },
    });

    showToast("✅ Comandă acceptată!");
  };

  // ── Marchează gata — notifică clientul ──
  const markReady = (orderId) => {
    onOrderUpdate(orderId, "ready", {});

    dispatch({
      type: "ADD_NOTIFICATION",
      payload: {
        id: Date.now(),
        type: "order_ready",
        message: "Comanda ta este gata! 🍽️",
        details: "Ospătarul vine cu comanda la masa ta.",
        isRead: false,
        createdAt: new Date().toISOString(),
      },
    });

    showToast("🍽️ Comandă gata de servit!");
  };

  const confirmReservation = async (resId) => {
    try {
      await supabase
        .from("reservations")
        .update({ confirmed: true, confirmed_at: new Date().toISOString() })
        .eq("id", resId);
    } catch {}
    setDisplayReservations((prev) =>
      prev.map((r) => (r.id === resId ? { ...r, confirmed: true } : r)),
    );
    showToast("✅ Rezervare confirmată!");
  };

  const refuseReservation = (resId) => {
    setDisplayReservations((prev) => prev.filter((r) => r.id !== resId));
    showToast("❌ Rezervare refuzată");
  };

  const pendingOrders = orders.filter((o) => o.status === "pending");
  const cookingOrders = orders.filter((o) => o.status === "cooking");
  const readyOrders = orders.filter((o) => o.status === "ready");
  const pendingRes = displayReservations.filter((r) => !r.confirmed);
  const confirmedRes = displayReservations.filter((r) => r.confirmed);

  const DEMO_FLOORS =
    restaurant?.floors?.length > 0
      ? restaurant.floors
      : [
          {
            id: 1,
            name: "Parter",
            tables: [
              { id: 1, label: "T1", seats: 4 },
              { id: 2, label: "T2", seats: 4 },
              { id: 3, label: "T3", seats: 2 },
              { id: 4, label: "T4", seats: 8 },
              { id: 5, label: "T5", seats: 8 },
              { id: 6, label: "T6", seats: 4 },
              { id: 7, label: "T7", seats: 4 },
              { id: 8, label: "T8", seats: 2 },
            ],
          },
          {
            id: 2,
            name: "Etaj 1 — Terasă",
            tables: [
              { id: 9, label: "E1", seats: 4 },
              { id: 10, label: "E2", seats: 4 },
              { id: 11, label: "E3", seats: 8 },
              { id: 12, label: "E4", seats: 4 },
            ],
          },
        ];
  const mapFloors = DEMO_FLOORS;
  const allTables = mapFloors.flatMap((f) => f.tables || []);
  const freeCount = allTables.filter(
    (t) => !tableStates[t.id] || tableStates[t.id] === "free",
  ).length;
  const occCount = allTables.filter(
    (t) => tableStates[t.id] === "occupied",
  ).length;

  const now = new Date();
  const timeStr = now.toLocaleTimeString("ro-RO", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const dateStr = now.toLocaleDateString("ro-RO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const today = now.toISOString().split("T")[0];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0d0a07",
        fontFamily: "'Plus Jakarta Sans',sans-serif",
        color: "#f0ebe3",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "40px 20px 20px",
          background: "linear-gradient(135deg,#1a1200,#0d0a07)",
          borderBottom: "1px solid #2a2218",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "'Fraunces',serif",
                fontSize: 22,
                fontWeight: 900,
              }}
            >
              🤵 {waiterName || "Ospătar"}
            </div>
            <div style={{ fontSize: 11, color: "#6b6050", marginTop: 2 }}>
              {restaurant?.name || "Restaurant"} • {dateStr} • {timeStr}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={reload}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                background: "#1e1a14",
                border: "1px solid #2a2218",
                color: "#c8a97e",
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              🔄
            </button>
            {onBack && (
              <button
                onClick={onBack}
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  background: "rgba(192,57,43,.15)",
                  border: "1px solid rgba(192,57,43,.3)",
                  color: "#e05050",
                  fontSize: 11,
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Ieși
              </button>
            )}
          </div>
        </div>
        {/* Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4,1fr)",
            gap: 8,
            marginTop: 14,
          }}
        >
          {[
            { label: "Mese libere", value: freeCount, color: "#4a6e4a" },
            { label: "Mese ocupate", value: occCount, color: "#c0622f" },
            {
              label: "Comenzi noi",
              value: pendingOrders.length,
              color: "#e07a47",
            },
            {
              label: "De confirmat",
              value: pendingRes.length,
              color: "#c8a97e",
            },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                background: "rgba(255,255,255,.04)",
                borderRadius: 10,
                padding: "10px 6px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontFamily: "'Fraunces',serif",
                  fontSize: 20,
                  fontWeight: 900,
                  color: s.color,
                }}
              >
                {s.value}
              </div>
              <div
                style={{
                  fontSize: 8,
                  color: "#6b6050",
                  marginTop: 2,
                  lineHeight: 1.3,
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          background: "#161210",
          borderBottom: "1px solid #2a2218",
          flexShrink: 0,
        }}
      >
        {[
          {
            id: "orders",
            icon: "🍽️",
            label: "Comenzi",
            badge: pendingOrders.length + cookingOrders.length,
          },
          { id: "map", icon: "🗺️", label: "Harta mese" },
          {
            id: "reservations",
            icon: "📅",
            label: "Rezervări",
            badge: pendingRes.length,
          },
        ].map((t) => (
          <div
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "12px 8px",
              textAlign: "center",
              cursor: "pointer",
              position: "relative",
              borderBottom: `2px solid ${tab === t.id ? "#c0622f" : "transparent"}`,
            }}
          >
            <div style={{ fontSize: 18, marginBottom: 2 }}>{t.icon}</div>
            <div
              style={{
                fontSize: 9,
                color: tab === t.id ? "#c0622f" : "#6b6050",
                fontWeight: tab === t.id ? 700 : 400,
              }}
            >
              {t.label}
            </div>
            {t.badge > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: 6,
                  right: "calc(50% - 18px)",
                  width: 16,
                  height: 16,
                  background: "#c0622f",
                  borderRadius: "50%",
                  fontSize: 9,
                  fontWeight: 800,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {t.badge}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Content */}
      <div
        style={{ flex: 1, overflowY: "auto", padding: 16, paddingBottom: 24 }}
      >
        {/* ── COMENZI ── */}
        {tab === "orders" && (
          <div>
            {/* Comenzi noi — necesită acceptare */}
            {pendingOrders.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div
                  style={{
                    fontSize: 10,
                    letterSpacing: 2,
                    textTransform: "uppercase",
                    color: "#e07a47",
                    marginBottom: 10,
                  }}
                >
                  🆕 Comenzi noi — necesită acceptare
                </div>
                {pendingOrders.map((o) => (
                  <div
                    key={o.id}
                    style={{
                      background: "rgba(224,122,71,.08)",
                      border: "1px solid rgba(224,122,71,.3)",
                      borderRadius: 16,
                      padding: 16,
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: 10,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontFamily: "'Fraunces',serif",
                            fontSize: 18,
                            fontWeight: 900,
                          }}
                        >
                          🪑 Masa {o.tableLabel || o.table}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "#6b6050",
                            marginTop: 2,
                          }}
                        >
                          Ora {o.time}
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          padding: "4px 10px",
                          borderRadius: 20,
                          background: "rgba(224,122,71,.2)",
                          color: "#e07a47",
                        }}
                      >
                        🆕 Nouă
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                        marginBottom: o.observations ? 8 : 12,
                      }}
                    >
                      {(o.items || []).map((item, i) => (
                        <div
                          key={i}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: 13,
                          }}
                        >
                          <span style={{ color: "rgba(240,235,227,.7)" }}>
                            {item.emoji} {item.name}
                          </span>
                          <span style={{ color: "#c8a97e", fontWeight: 700 }}>
                            ×{item.qty}
                          </span>
                        </div>
                      ))}
                    </div>
                    {o.observations && (
                      <div
                        style={{
                          background: "rgba(200,169,126,.08)",
                          border: "1px solid rgba(200,169,126,.2)",
                          borderRadius: 10,
                          padding: "8px 12px",
                          marginBottom: 12,
                          fontSize: 12,
                          color: "#c8a97e",
                        }}
                      >
                        💬 <b>Observații:</b> {o.observations}
                      </div>
                    )}
                    {/* Buton ACCEPTĂ */}
                    <button
                      onClick={() => acceptOrder(o.id)}
                      style={{
                        width: "100%",
                        padding: 12,
                        borderRadius: 12,
                        background: "linear-gradient(135deg,#4a6e4a,#2d4a2d)",
                        border: "none",
                        color: "#fff",
                        fontFamily: "'Fraunces',serif",
                        fontSize: 15,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      ✅ Acceptă comanda
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Comenzi în pregătire */}
            {cookingOrders.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    fontSize: 10,
                    letterSpacing: 2,
                    textTransform: "uppercase",
                    color: "#6b6050",
                    marginBottom: 10,
                  }}
                >
                  ⏳ În pregătire — {cookingOrders.length}
                </div>
                {cookingOrders.map((o) => (
                  <WaiterOrderCard
                    key={o.id}
                    order={o}
                    onMarkReady={markReady}
                    onClose={onOrderClose}
                  />
                ))}
              </div>
            )}

            {/* Comenzi gata */}
            {readyOrders.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    fontSize: 10,
                    letterSpacing: 2,
                    textTransform: "uppercase",
                    color: "#6b6050",
                    marginBottom: 10,
                  }}
                >
                  ✅ Gata de servit — {readyOrders.length}
                </div>
                {readyOrders.map((o) => (
                  <WaiterOrderCard
                    key={o.id}
                    order={o}
                    onMarkReady={markReady}
                    onClose={onOrderClose}
                  />
                ))}
              </div>
            )}

            {pendingOrders.length === 0 &&
              cookingOrders.length === 0 &&
              readyOrders.length === 0 && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "60px 0",
                    color: "#6b6050",
                  }}
                >
                  <div style={{ fontSize: 40, marginBottom: 10 }}>🍽️</div>
                  <div style={{ fontSize: 15 }}>Nicio comandă activă</div>
                  <div style={{ fontSize: 12, marginTop: 6 }}>
                    Comenzile clienților apar automat aici
                  </div>
                </div>
              )}
          </div>
        )}

        {/* ── HARTA MESE ── */}
        {tab === "map" && (
          <div>
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                marginBottom: 14,
              }}
            >
              {[
                { label: "🟢 Liberă" },
                { label: "🟡 Rezervată" },
                { label: "🔴 Ocupată" },
                { label: "🔵 Achitată" },
              ].map((l) => (
                <div
                  key={l.label}
                  style={{
                    fontSize: 10,
                    color: "rgba(240,235,227,.5)",
                    background: "rgba(255,255,255,.04)",
                    padding: "3px 8px",
                    borderRadius: 20,
                  }}
                >
                  {l.label}
                </div>
              ))}
            </div>
            {mapFloors.length > 1 && (
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginBottom: 14,
                  flexWrap: "wrap",
                }}
              >
                {mapFloors.map((fl, i) => (
                  <button
                    key={fl.id}
                    onClick={() => setActiveMapFloor(i)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 20,
                      fontSize: 12,
                      cursor: "pointer",
                      background: activeMapFloor === i ? "#c0622f" : "#1e1a14",
                      border: `1px solid ${activeMapFloor === i ? "#c0622f" : "#2a2218"}`,
                      color: activeMapFloor === i ? "#fff" : "#6b6050",
                    }}
                  >
                    {fl.name}
                  </button>
                ))}
              </div>
            )}
            <div
              style={{
                fontSize: 10,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: "#6b6050",
                marginBottom: 10,
              }}
            >
              {mapFloors[activeMapFloor]?.name} —{" "}
              {mapFloors[activeMapFloor]?.tables?.length} mese
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3,1fr)",
                gap: 8,
              }}
            >
              {(mapFloors[activeMapFloor]?.tables || []).map((table) => {
                const status = tableStates[table.id] || "free";
                const colors = {
                  free: "#4a6e4a",
                  reserved: "#c8a97e",
                  occupied: "#c0622f",
                  paid: "#5b8dd9",
                };
                const bgs = {
                  free: "rgba(74,110,74,.15)",
                  reserved: "rgba(200,169,126,.15)",
                  occupied: "rgba(192,98,47,.15)",
                  paid: "rgba(91,141,217,.15)",
                };
                const session = activeSessions?.[table.id];
                return (
                  <div
                    key={table.id}
                    style={{
                      background: bgs[status],
                      border: `2px solid ${colors[status]}`,
                      borderRadius: 14,
                      padding: "10px 6px",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: 16, marginBottom: 2 }}>🪑</div>
                    <div
                      style={{
                        fontFamily: "'Fraunces',serif",
                        fontSize: 14,
                        fontWeight: 700,
                        color: colors[status],
                      }}
                    >
                      {table.label}
                    </div>
                    <div
                      style={{
                        fontSize: 9,
                        color: colors[status],
                        opacity: 0.7,
                      }}
                    >
                      {table.seats}p
                    </div>
                    {session?.started_at && (
                      <div
                        style={{ fontSize: 8, color: "#c8a97e", marginTop: 3 }}
                      >
                        din{" "}
                        {new Date(session.started_at).toLocaleTimeString(
                          "ro-RO",
                          { hour: "2-digit", minute: "2-digit" },
                        )}
                      </div>
                    )}
                    {status === "occupied" && (
                      <button
                        onClick={() => markPaid(table.id)}
                        style={{
                          marginTop: 5,
                          padding: "3px 7px",
                          borderRadius: 8,
                          background: "rgba(91,141,217,.2)",
                          border: "1px solid rgba(91,141,217,.4)",
                          color: "#5b8dd9",
                          fontSize: 8,
                          cursor: "pointer",
                          fontWeight: 700,
                        }}
                      >
                        💳 Achitat
                      </button>
                    )}
                    {status === "paid" && (
                      <button
                        onClick={() => freeTable(table.id)}
                        style={{
                          marginTop: 5,
                          padding: "3px 7px",
                          borderRadius: 8,
                          background: "rgba(74,110,74,.2)",
                          border: "1px solid rgba(74,110,74,.4)",
                          color: "#6b9e6b",
                          fontSize: 8,
                          cursor: "pointer",
                          fontWeight: 700,
                        }}
                      >
                        ✅ Eliberează
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── REZERVĂRI ── */}
        {tab === "reservations" && (
          <div>
            {pendingRes.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div
                  style={{
                    fontSize: 10,
                    letterSpacing: 2,
                    textTransform: "uppercase",
                    color: "#c8a97e",
                    marginBottom: 10,
                  }}
                >
                  ⏳ Necesită confirmare — {pendingRes.length}
                </div>
                {pendingRes.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      background: "rgba(200,169,126,.08)",
                      border: "1px solid rgba(200,169,126,.25)",
                      borderRadius: 16,
                      padding: "14px 16px",
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        marginBottom: 12,
                      }}
                    >
                      <div
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 12,
                          flexShrink: 0,
                          background: "rgba(200,169,126,.15)",
                          border: "1px solid rgba(200,169,126,.3)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontFamily: "'Fraunces',serif",
                          fontSize: 15,
                          fontWeight: 700,
                          color: "#c8a97e",
                        }}
                      >
                        {r.table_label || "T?"}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: 14,
                            marginBottom: 2,
                          }}
                        >
                          {r.customer_name || "Client"}
                        </div>
                        <div style={{ fontSize: 11, color: "#6b6050" }}>
                          📅 {r.date} • 🕐 {r.time} • 👥 {r.persons} persoane
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 8,
                      }}
                    >
                      <button
                        onClick={() => refuseReservation(r.id)}
                        style={{
                          padding: "9px",
                          borderRadius: 10,
                          background: "rgba(192,57,43,.15)",
                          border: "1px solid rgba(192,57,43,.3)",
                          color: "#e05050",
                          fontSize: 12,
                          cursor: "pointer",
                          fontWeight: 600,
                        }}
                      >
                        ❌ Refuză
                      </button>
                      <button
                        onClick={() => confirmReservation(r.id)}
                        style={{
                          padding: "9px",
                          borderRadius: 10,
                          background: "rgba(74,110,74,.2)",
                          border: "1px solid rgba(74,110,74,.4)",
                          color: "#6b9e6b",
                          fontSize: 12,
                          cursor: "pointer",
                          fontWeight: 600,
                        }}
                      >
                        ✅ Confirmă
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {confirmedRes.length > 0 && (
              <div>
                <div
                  style={{
                    fontSize: 10,
                    letterSpacing: 2,
                    textTransform: "uppercase",
                    color: "#6b6050",
                    marginBottom: 10,
                  }}
                >
                  ✅ Confirmate — {confirmedRes.length}
                </div>
                {confirmedRes.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      background: "#161210",
                      border: "1px solid #2a2218",
                      borderRadius: 14,
                      padding: "12px 14px",
                      marginBottom: 8,
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        flexShrink: 0,
                        background: "rgba(74,110,74,.1)",
                        border: "1px solid rgba(74,110,74,.2)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: "'Fraunces',serif",
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#6b9e6b",
                      }}
                    >
                      {r.table_label || "T?"}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>
                        {r.customer_name || "Client"}
                      </div>
                      <div
                        style={{ fontSize: 11, color: "#6b6050", marginTop: 2 }}
                      >
                        📅 {r.date} • 🕐 {r.time} • 👥 {r.persons} pers.
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 9,
                        fontWeight: 800,
                        padding: "3px 8px",
                        borderRadius: 20,
                        background: "rgba(74,110,74,.2)",
                        color: "#6b9e6b",
                      }}
                    >
                      ✅ Confirmat
                    </div>
                  </div>
                ))}
              </div>
            )}
            {pendingRes.length === 0 && confirmedRes.length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  padding: "60px 0",
                  color: "#6b6050",
                }}
              >
                <div style={{ fontSize: 36, marginBottom: 10 }}>📅</div>
                <div>Nicio rezervare</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer nav ospătar */}
      <div
        style={{
          position: "sticky",
          bottom: 0,
          background: "rgba(22,18,16,.97)",
          borderTop: "1px solid #2a2218",
          display: "flex",
          padding: "8px 0 16px",
          flexShrink: 0,
        }}
      >
        {[
          {
            id: "orders",
            icon: "🍽️",
            label: "Comenzi",
            badge: pendingOrders.length + cookingOrders.length,
          },
          { id: "map", icon: "🗺️", label: "Harta mese" },
          {
            id: "reservations",
            icon: "📅",
            label: "Rezervări",
            badge: pendingRes.length,
          },
        ].map((t) => (
          <div
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              cursor: "pointer",
              padding: "6px 4px",
              position: "relative",
            }}
          >
            <div style={{ position: "relative", display: "inline-block" }}>
              <span style={{ fontSize: 20, lineHeight: 1 }}>{t.icon}</span>
              {t.badge > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: -4,
                    right: -8,
                    width: 15,
                    height: 15,
                    background: "#c0622f",
                    borderRadius: "50%",
                    fontSize: 8,
                    fontWeight: 800,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {t.badge}
                </span>
              )}
            </div>
            <span
              style={{
                fontSize: 9,
                letterSpacing: 0.5,
                textTransform: "uppercase",
                color: tab === t.id ? "#c0622f" : "#6b6050",
              }}
            >
              {t.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Waiter Order Card ──────────────────────────────────────────────────────
function WaiterOrderCard({ order, onMarkReady, onClose }) {
  return (
    <div
      style={{
        background: "#161210",
        border: "1px solid #2a2218",
        borderRadius: 16,
        padding: 16,
        marginBottom: 10,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          background:
            order.status === "cooking"
              ? "linear-gradient(180deg,#c0622f,#e07a47)"
              : "linear-gradient(180deg,#4a6e4a,#6b9e6b)",
        }}
      />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 10,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "'Fraunces',serif",
              fontSize: 18,
              fontWeight: 900,
            }}
          >
            🪑 Masa {order.tableLabel || order.table}
          </div>
          <div style={{ fontSize: 11, color: "#6b6050", marginTop: 2 }}>
            Ora {order.time}
            {order.waiterName && (
              <span style={{ marginLeft: 8, color: "#c8a97e" }}>
                • {order.waiterName}
              </span>
            )}
          </div>
        </div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: 1,
            textTransform: "uppercase",
            padding: "4px 10px",
            borderRadius: 20,
            background:
              order.status === "cooking"
                ? "rgba(192,98,47,.2)"
                : "rgba(74,110,74,.2)",
            color: order.status === "cooking" ? "#e07a47" : "#6b9e6b",
          }}
        >
          {order.status === "cooking" ? "⏳ Pregătire" : "✅ Gata"}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 5,
          marginBottom: order.observations ? 8 : 12,
        }}
      >
        {(order.items || []).map((item, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 13,
            }}
          >
            <span style={{ color: "rgba(240,235,227,.7)" }}>
              {item.emoji} {item.name}
            </span>
            <span style={{ color: "#c8a97e", fontWeight: 700 }}>
              ×{item.qty}
            </span>
          </div>
        ))}
      </div>
      {order.observations && (
        <div
          style={{
            background: "rgba(200,169,126,.08)",
            border: "1px solid rgba(200,169,126,.2)",
            borderRadius: 10,
            padding: "8px 12px",
            marginBottom: 12,
            fontSize: 12,
            color: "#c8a97e",
          }}
        >
          💬 <b>Observații:</b> {order.observations}
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        {order.status === "cooking" && (
          <button
            onClick={() => onMarkReady(order.id)}
            style={{
              flex: 1,
              padding: 9,
              borderRadius: 10,
              background: "rgba(74,110,74,.2)",
              border: "1px solid rgba(74,110,74,.4)",
              color: "#6b9e6b",
              fontSize: 12,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            ✅ Marchează gata
          </button>
        )}
        <button
          onClick={() => onClose(order.id)}
          style={{
            flex: 1,
            padding: 9,
            borderRadius: 10,
            background: "#1e1a14",
            border: "1px solid #2a2218",
            color: "#f0ebe3",
            fontSize: 12,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          🗑️ Închide
        </button>
      </div>
    </div>
  );
}
