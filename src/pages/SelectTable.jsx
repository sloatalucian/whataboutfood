import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabase";
import { useTable, TABLE_STATUS } from "../context/TableContext";
import { useApp } from "../context/AppContext";

// ═══════════════════════════════════════════════════════════════════════════
// SELECTARE MASĂ — planșeu vizual cu zoom automat
// ═══════════════════════════════════════════════════════════════════════════
export function SelectTable({ restaurant, onSelected, onBack }) {
  const { getStatus, occupyTable } = useTable();
  const [selectedFloor, setSelectedFloor] = useState(0);
  const [confirming, setConfirming] = useState(null);
  const [loading, setLoading] = useState(false);
  const [zoom, setZoom] = useState(70); // zoom automat mic la start
  const containerRef = useRef(null);

  const ZOOM_MIN = 40;
  const ZOOM_MAX = 150;
  const ZOOM_STEP = 10;

  // Zoom automat la deschidere — calculează cât trebuie să fie zoom-ul
  // ca tot planșeul să încapă pe ecran
  useEffect(() => {
    const calcAutoZoom = () => {
      if (!containerRef.current) return;
      const containerW = containerRef.current.offsetWidth;
      const containerH = 420; // înălțimea fixă a canvasului
      const canvasW = 900;
      const canvasH = 700;
      const zoomW = Math.floor((containerW / canvasW) * 100);
      const zoomH = Math.floor((containerH / canvasH) * 100);
      const autoZoom = Math.max(ZOOM_MIN, Math.min(zoomW, zoomH, 90));
      setZoom(autoZoom);
    };
    // Mic delay ca DOM-ul să fie randat
    const timer = setTimeout(calcAutoZoom, 100);
    return () => clearTimeout(timer);
  }, []);

  const floors = restaurant?.floors || [];
  const floor = floors[selectedFloor];
  const tables = floor?.tables || [];
  const elements = floor?.elements || [];

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
    } catch {
      if (onSelected) onSelected({ table: confirming, session: null });
    }
    setLoading(false);
  };

  const getElementStyle = (el) => ({
    position: "absolute",
    left: el.x,
    top: el.y,
    width: el.w,
    height: el.h,
    background: `${el.color}22`,
    border: `2px solid ${el.color}66`,
    borderRadius: 8,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    pointerEvents: "none", // elementele fixe nu sunt clickabile
  });

  const getTableStyle = (table) => {
    const status = getStatus(table.id);
    const cfg = TABLE_STATUS[status] || TABLE_STATUS.free;
    const isFree = status === "free";
    const isSel = confirming?.id === table.id;
    return {
      position: "absolute",
      left: table.x,
      top: table.y,
      width: table.seats <= 2 ? 52 : table.seats <= 4 ? 64 : 80,
      height: table.seats <= 2 ? 52 : table.seats <= 4 ? 64 : 52,
      background: cfg.bg,
      border: `2px solid ${isSel ? "#fff" : cfg.border}`,
      borderRadius: 10,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 1,
      cursor: isFree ? "pointer" : "not-allowed",
      outline: isSel ? `3px solid #fff` : "none",
      transition: "transform .15s",
      transform: isSel ? "scale(1.1)" : "scale(1)",
    };
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
      {/* Hero */}
      <div
        style={{
          padding: "44px 20px 20px",
          background:
            restaurant?.cover || "linear-gradient(135deg,#2d1507,#1a0e05)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 14,
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
          <div
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,.6)",
              letterSpacing: 1,
              textTransform: "uppercase",
            }}
          >
            Selectează masa
          </div>
          <div style={{ width: 38 }} />
        </div>
        <div style={{ fontSize: 36, marginBottom: 8 }}>{restaurant?.emoji}</div>
        <div
          style={{
            fontFamily: "'Fraunces',serif",
            fontSize: 24,
            fontWeight: 900,
          }}
        >
          {restaurant?.name}
        </div>
        <div
          style={{ fontSize: 12, color: "rgba(255,255,255,.5)", marginTop: 2 }}
        >
          {restaurant?.type}
        </div>
      </div>

      <div style={{ padding: "16px 16px 0" }}>
        {/* Legendă */}
        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            marginBottom: 14,
          }}
        >
          {[
            { color: "#4a6e4a", label: "Liberă" },
            { color: "#c0622f", label: "Ocupată" },
            { color: "#c8a97e", label: "Rezervată" },
            { color: "#5b8dd9", label: "Achitată" },
          ].map((l) => (
            <div
              key={l.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11,
                color: "rgba(240,235,227,.6)",
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: l.color,
                }}
              />
              {l.label}
            </div>
          ))}
        </div>

        {/* Etaje */}
        {floors.length > 1 && (
          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 12,
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
                  padding: "6px 14px",
                  borderRadius: 20,
                  fontSize: 12,
                  cursor: "pointer",
                  background: selectedFloor === i ? "#c0622f" : "#1e1a14",
                  border: `1px solid ${selectedFloor === i ? "#c0622f" : "#2a2218"}`,
                  color: selectedFloor === i ? "#fff" : "#6b6050",
                }}
              >
                {fl.type === "terrace" ? "☀️" : "🏢"} {fl.name}
              </button>
            ))}
          </div>
        )}

        {/* Canvas planșeu cu zoom */}
        <div style={{ position: "relative", marginBottom: 16 }}>
          {/* Butoane zoom */}
          <div
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              zIndex: 10,
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <button
              onClick={() => setZoom((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP))}
              disabled={zoom >= ZOOM_MAX}
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                background: "rgba(13,10,7,.9)",
                border: "1px solid #2a2218",
                color: zoom >= ZOOM_MAX ? "#3a3228" : "#f0ebe3",
                fontSize: 16,
                cursor: zoom >= ZOOM_MAX ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
              }}
            >
              +
            </button>
            <div
              style={{
                width: 32,
                height: 22,
                borderRadius: 7,
                background: "rgba(13,10,7,.9)",
                border: "1px solid #2a2218",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 9,
                color: "#c8a97e",
                fontWeight: 700,
              }}
            >
              {zoom}%
            </div>
            <button
              onClick={() => setZoom((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP))}
              disabled={zoom <= ZOOM_MIN}
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                background: "rgba(13,10,7,.9)",
                border: "1px solid #2a2218",
                color: zoom <= ZOOM_MIN ? "#3a3228" : "#f0ebe3",
                fontSize: 16,
                cursor: zoom <= ZOOM_MIN ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
              }}
            >
              −
            </button>
          </div>

          {/* Canvas scrollabil */}
          <div
            ref={containerRef}
            style={{
              width: "100%",
              height: 420,
              background: "#0d0a07",
              borderRadius: 16,
              border: "1px solid #2a2218",
              overflow: "auto",
            }}
          >
            <div
              style={{
                width: 900,
                height: 700,
                position: "relative",
                transform: `scale(${zoom / 100})`,
                transformOrigin: "top left",
                backgroundImage:
                  "radial-gradient(circle, #2a2218 1px, transparent 1px)",
                backgroundSize: "30px 30px",
              }}
            >
              {/* Label etaj */}
              <div
                style={{
                  position: "absolute",
                  top: 10,
                  left: 12,
                  fontSize: 11,
                  color: "#3a3228",
                  fontWeight: 600,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  pointerEvents: "none",
                }}
              >
                {floor?.type === "terrace" ? "☀️" : "🏢"} {floor?.name}
              </div>

              {/* Elemente fixe (Bar, Bucătărie etc.) — doar decorative */}
              {elements.map((el) => (
                <div key={el.id} style={getElementStyle(el)}>
                  <span style={{ fontSize: 16, pointerEvents: "none" }}>
                    {el.icon}
                  </span>
                  <span
                    style={{
                      fontSize: 8,
                      color: el.color,
                      fontWeight: 700,
                      pointerEvents: "none",
                    }}
                  >
                    {el.label}
                  </span>
                </div>
              ))}

              {/* Mese — clickabile */}
              {tables.map((table) => {
                const status = getStatus(table.id);
                const cfg = TABLE_STATUS[status] || TABLE_STATUS.free;
                const isFree = status === "free";
                return (
                  <div
                    key={table.id}
                    style={getTableStyle(table)}
                    onClick={() => isFree && handleSelect(table)}
                  >
                    <span style={{ fontSize: 14, pointerEvents: "none" }}>
                      🪑
                    </span>
                    <span
                      style={{
                        fontFamily: "'Fraunces',serif",
                        fontSize: 12,
                        fontWeight: 700,
                        color: cfg.color,
                        pointerEvents: "none",
                      }}
                    >
                      {table.label}
                    </span>
                    <span
                      style={{
                        fontSize: 9,
                        color: cfg.color,
                        opacity: 0.7,
                        pointerEvents: "none",
                      }}
                    >
                      {table.seats}p
                    </span>
                  </div>
                );
              })}

              {tables.length === 0 && elements.length === 0 && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#6b6050",
                    gap: 8,
                    pointerEvents: "none",
                  }}
                >
                  <span style={{ fontSize: 36 }}>🏗️</span>
                  <span style={{ fontSize: 13 }}>
                    Planșeul nu a fost configurat încă
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal confirmare masă */}
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
                {loading ? "Se procesează..." : "✅ Confirmă"}
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
  const [displayReservations, setDisplayReservations] = useState([
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
  ]);
  const [activeMapFloor, setActiveMapFloor] = useState(0);

  const acceptOrder = (orderId) => {
    onOrderUpdate(orderId, "cooking", { waiterId, waiterName });
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

  const confirmReservation = (resId) => {
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
        ];

  const allTables = DEMO_FLOORS.flatMap((f) => f.tables || []);
  const freeCount = allTables.filter(
    (t) => !tableStates[t.id] || tableStates[t.id] === "free",
  ).length;
  const occCount = allTables.filter(
    (t) => tableStates[t.id] === "occupied",
  ).length;
  const now = new Date();

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
          padding: "40px 20px 16px",
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
                fontSize: 20,
                fontWeight: 900,
              }}
            >
              🤵 {waiterName || "Ospătar"}
            </div>
            <div style={{ fontSize: 11, color: "#6b6050", marginTop: 2 }}>
              {restaurant?.name || "Restaurant"} •{" "}
              {now.toLocaleTimeString("ro-RO", {
                hour: "2-digit",
                minute: "2-digit",
              })}
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
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4,1fr)",
            gap: 8,
            marginTop: 12,
          }}
        >
          {[
            { label: "Libere", value: freeCount, color: "#4a6e4a" },
            { label: "Ocupate", value: occCount, color: "#c0622f" },
            {
              label: "Comenzi noi",
              value: pendingOrders.length,
              color: "#e07a47",
            },
            { label: "Rezervări", value: pendingRes.length, color: "#c8a97e" },
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
                  🆕 Comenzi noi
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
                        <div style={{ fontSize: 11, color: "#6b6050" }}>
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
                    {(o.items || []).map((item, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 13,
                          marginBottom: 4,
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
                    {o.observations && (
                      <div
                        style={{
                          background: "rgba(200,169,126,.08)",
                          border: "1px solid rgba(200,169,126,.2)",
                          borderRadius: 10,
                          padding: "8px 12px",
                          margin: "8px 0",
                          fontSize: 12,
                          color: "#c8a97e",
                        }}
                      >
                        💬 {o.observations}
                      </div>
                    )}
                    <button
                      onClick={() => acceptOrder(o.id)}
                      style={{
                        width: "100%",
                        marginTop: 8,
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
                  ⏳ În pregătire
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
                  ✅ Gata de servit
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
                </div>
              )}
          </div>
        )}

        {/* ── HARTA MESE ── */}
        {tab === "map" && (
          <div>
            {DEMO_FLOORS.length > 1 && (
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginBottom: 14,
                  flexWrap: "wrap",
                }}
              >
                {DEMO_FLOORS.map((fl, i) => (
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
                display: "grid",
                gridTemplateColumns: "repeat(3,1fr)",
                gap: 8,
              }}
            >
              {(DEMO_FLOORS[activeMapFloor]?.tables || []).map((table) => {
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
                  ⏳ Necesită confirmare
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
                        {r.table_label}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: 14,
                            marginBottom: 2,
                          }}
                        >
                          {r.customer_name}
                        </div>
                        <div style={{ fontSize: 11, color: "#6b6050" }}>
                          📅 {r.date} • 🕐 {r.time} • 👥 {r.persons} pers.
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
                  ✅ Confirmate
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
                      {r.table_label}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>
                        {r.customer_name}
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
                      ✅
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

      {/* Footer nav */}
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
          <div style={{ fontSize: 11, color: "#6b6050" }}>
            {order.time}
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
      {(order.items || []).map((item, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 13,
            marginBottom: 4,
          }}
        >
          <span style={{ color: "rgba(240,235,227,.7)" }}>
            {item.emoji} {item.name}
          </span>
          <span style={{ color: "#c8a97e", fontWeight: 700 }}>×{item.qty}</span>
        </div>
      ))}
      {order.observations && (
        <div
          style={{
            background: "rgba(200,169,126,.08)",
            border: "1px solid rgba(200,169,126,.2)",
            borderRadius: 10,
            padding: "8px 12px",
            margin: "8px 0",
            fontSize: 12,
            color: "#c8a97e",
          }}
        >
          💬 {order.observations}
        </div>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
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
