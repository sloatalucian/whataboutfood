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
  const [zoom, setZoom] = useState(70);
  const containerRef = useRef(null);
  const [dbFloors, setDbFloors] = useState([]);
  const [floorsLoading, setFloorsLoading] = useState(true);

  const ZOOM_MIN = 40;
  const ZOOM_MAX = 150;
  const ZOOM_STEP = 10;

  // Încarcă floors + tables + elements din Supabase
  useEffect(() => {
    if (!restaurant?.id) {
      setFloorsLoading(false);
      return;
    }
    const load = async () => {
      setFloorsLoading(true);
      const { data: floorsData } = await supabase
        .from("floors")
        .select("*")
        .eq("restaurant_id", restaurant.id)
        .order("floor_order");
      if (!floorsData || floorsData.length === 0) {
        setDbFloors([]);
        setFloorsLoading(false);
        return;
      }
      const floorsWithData = await Promise.all(
        floorsData.map(async (fl) => {
          const { data: tablesData } = await supabase
            .from("tables")
            .select("*")
            .eq("floor_id", fl.id);
          const { data: elementsData } = await supabase
            .from("floor_elements")
            .select("*")
            .eq("floor_id", fl.id);
          return {
            ...fl,
            tables: tablesData || [],
            elements: elementsData || [],
          };
        }),
      );
      setDbFloors(floorsWithData);
      setFloorsLoading(false);
    };
    load();
  }, [restaurant?.id]);

  useEffect(() => {
    const calcAutoZoom = () => {
      if (!containerRef.current) return;
      const containerW = containerRef.current.offsetWidth;
      const containerH = 420;
      const zoomW = Math.floor((containerW / 900) * 100);
      const zoomH = Math.floor((containerH / 700) * 100);
      setZoom(Math.max(ZOOM_MIN, Math.min(zoomW, zoomH, 90)));
    };
    const timer = setTimeout(calcAutoZoom, 100);
    return () => clearTimeout(timer);
  }, []);

  const floors = dbFloors.length > 0 ? dbFloors : restaurant?.floors || [];
  const floor = floors[selectedFloor];
  const tables = floor?.tables || [];
  const elements = floor?.elements || [];

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

        {/* Canvas */}
        <div style={{ position: "relative", marginBottom: 16 }}>
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
              {elements.map((el) => (
                <div
                  key={el.id}
                  style={{
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
                    pointerEvents: "none",
                  }}
                >
                  <span style={{ fontSize: 16 }}>{el.icon}</span>
                  <span
                    style={{ fontSize: 8, color: el.color, fontWeight: 700 }}
                  >
                    {el.label}
                  </span>
                </div>
              ))}
              {tables.map((table) => {
                const status = getStatus(table.id);
                const cfg = TABLE_STATUS[status] || TABLE_STATUS.free;
                const isFree = status === "free";
                const isSel = confirming?.id === table.id;
                const w = table.seats <= 2 ? 52 : table.seats <= 4 ? 64 : 80;
                const h = table.seats <= 2 ? 52 : table.seats <= 4 ? 64 : 52;
                return (
                  <div
                    key={table.id}
                    onClick={() => isFree && setConfirming(table)}
                    style={{
                      position: "absolute",
                      left: table.x,
                      top: table.y,
                      width: w,
                      height: h,
                      background: cfg.bg,
                      border: `2px solid ${isSel ? "#fff" : cfg.border}`,
                      borderRadius: 10,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 1,
                      cursor: isFree ? "pointer" : "not-allowed",
                      outline: isSel ? "3px solid #fff" : "none",
                      transform: isSel ? "scale(1.1)" : "scale(1)",
                      transition: "transform .15s",
                    }}
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
              {tables.length === 0 &&
                elements.length === 0 &&
                !floorsLoading && (
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
// TABLETA OSPĂTARULUI — cu Realtime Supabase
// ═══════════════════════════════════════════════════════════════════════════
export function WaiterTablet({ restaurant, onBack, waiterName, waiterId }) {
  const { tableStates, markPaid, freeTable, reload } = useTable();
  const { dispatch, showToast } = useApp();
  const [tab, setTab] = useState("orders");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeMapFloor, setActiveMapFloor] = useState(0);
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
  ]);

  const restaurantId = restaurant?.id;
  const [istoricDate, setIstoricDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const [istoricOrders, setIstoricOrders] = useState([]);
  const [istoricLoading, setIstoricLoading] = useState(false);

  // ── Încarcă comenzile din Supabase ──
  const loadOrders = async () => {
    if (!restaurantId) {
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .in("status", ["pending", "cooking", "ready"])
        .order("created_at", { ascending: true });
      console.log(
        "loadOrders restaurantId:",
        restaurantId,
        "data:",
        data,
        "error:",
        error,
      );
      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.log("Load orders error:", err);
    }
    setLoading(false);
  };

  // ── Încarcă istoricul comenzilor ──
  const loadIstoric = async (date) => {
    if (!restaurantId) return;
    setIstoricLoading(true);
    try {
      const startOfDay = `${date}T00:00:00`;
      const endOfDay = `${date}T23:59:59`;
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", startOfDay)
        .lte("created_at", endOfDay)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setIstoricOrders(data || []);
    } catch (err) {
      console.log("Load istoric error:", err);
    }
    setIstoricLoading(false);
  };

  useEffect(() => {
    if (tab === "istoric") loadIstoric(istoricDate);
  }, [tab, istoricDate, restaurantId]);

  // ── Realtime — ascultă comenzi noi ──
  useEffect(() => {
    loadOrders();
    if (!restaurantId) return;

    const channel = supabase
      .channel(`orders_${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setOrders((prev) => {
              const exists = prev.find((o) => o.id === payload.new.id);
              if (exists) return prev;
              return [...prev, payload.new];
            });
            showToast("🆕 Comandă nouă!");
          }
          if (payload.eventType === "UPDATE") {
            setOrders((prev) =>
              prev
                .map((o) => (o.id === payload.new.id ? payload.new : o))
                .filter((o) =>
                  ["pending", "cooking", "ready"].includes(o.status),
                ),
            );
          }
          if (payload.eventType === "DELETE") {
            setOrders((prev) => prev.filter((o) => o.id !== payload.old.id));
          }
        },
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [restaurantId]);

  // ── Acceptă comanda ──
  const acceptOrder = async (orderId) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({
          status: "cooking",
          waiter_id: waiterId || null,
          accepted_at: new Date().toISOString(),
        })
        .eq("id", orderId);
      if (error) throw error;

      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, status: "cooking", waiter_name: waiterName }
            : o,
        ),
      );

      // Notificare client
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
    } catch (err) {
      showToast("❌ Eroare la acceptare.");
    }
  };

  // ── Marchează gata ──
  const markReady = async (orderId) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({
          status: "ready",
          completed_at: new Date().toISOString(),
        })
        .eq("id", orderId);
      if (error) throw error;

      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: "ready" } : o)),
      );

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
      showToast("🍽️ Comandă gata!");
    } catch (err) {
      showToast("❌ Eroare.");
    }
  };

  // ── Închide comandă ──
  const closeOrder = async (orderId) => {
    try {
      await supabase
        .from("orders")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", orderId);
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    } catch (err) {
      showToast("❌ Eroare.");
    }
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

  const FLOORS =
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
            ],
          },
        ];
  const allTables = FLOORS.flatMap((f) => f.tables || []);
  const freeCount = allTables.filter(
    (t) => !tableStates[t.id] || tableStates[t.id] === "free",
  ).length;
  const occCount = allTables.filter(
    (t) => tableStates[t.id] === "occupied",
  ).length;

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
            alignItems: "center",
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
              {new Date().toLocaleTimeString("ro-RO", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => {
                reload();
                loadOrders();
              }}
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
          { id: "istoric", icon: "🕐", label: "Istoric" },
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
            {loading && (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px 0",
                  color: "#6b6050",
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 10 }}>🍽️</div>
                <div>Se încarcă comenzile...</div>
              </div>
            )}

            {/* Comenzi noi */}
            {!loading && pendingOrders.length > 0 && (
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
                          🪑 Masa {o.table_label || o.table}
                        </div>
                        <div style={{ fontSize: 11, color: "#6b6050" }}>
                          {new Date(o.created_at).toLocaleTimeString("ro-RO", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
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
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginTop: 8,
                        paddingTop: 8,
                        borderTop: "1px solid rgba(255,255,255,.06)",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "'Fraunces',serif",
                          fontSize: 16,
                          fontWeight: 700,
                          color: "#c8a97e",
                        }}
                      >
                        Total: {o.total} lei
                      </span>
                      <button
                        onClick={() => acceptOrder(o.id)}
                        style={{
                          padding: "10px 18px",
                          borderRadius: 12,
                          background: "linear-gradient(135deg,#4a6e4a,#2d4a2d)",
                          border: "none",
                          color: "#fff",
                          fontFamily: "'Fraunces',serif",
                          fontSize: 14,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        ✅ Acceptă
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* În pregătire */}
            {!loading && cookingOrders.length > 0 && (
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
                    onClose={closeOrder}
                  />
                ))}
              </div>
            )}

            {/* Gata */}
            {!loading && readyOrders.length > 0 && (
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
                    onClose={closeOrder}
                  />
                ))}
              </div>
            )}

            {!loading &&
              pendingOrders.length === 0 &&
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
            {FLOORS.length > 1 && (
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginBottom: 14,
                  flexWrap: "wrap",
                }}
              >
                {FLOORS.map((fl, i) => (
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
              {(FLOORS[activeMapFloor]?.tables || []).map((table) => {
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

      {tab === "istoric" && (
        <div>
          {/* Selector de dată */}
          <div
            style={{
              display: "flex",
              gap: 10,
              marginBottom: 20,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <button
              onClick={() => {
                const today = new Date().toISOString().split("T")[0];
                setIstoricDate(today);
              }}
              style={{
                padding: "8px 16px",
                borderRadius: 20,
                border: "none",
                cursor: "pointer",
                background:
                  istoricDate === new Date().toISOString().split("T")[0]
                    ? "var(--terra)"
                    : "#1e1a14",
                color: "#fff",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              Astăzi
            </button>
            <button
              onClick={() => {
                const yesterday = new Date(Date.now() - 86400000)
                  .toISOString()
                  .split("T")[0];
                setIstoricDate(yesterday);
              }}
              style={{
                padding: "8px 16px",
                borderRadius: 20,
                border: "none",
                cursor: "pointer",
                background:
                  istoricDate ===
                  new Date(Date.now() - 86400000).toISOString().split("T")[0]
                    ? "var(--terra)"
                    : "#1e1a14",
                color: "#fff",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              Ieri
            </button>
            <div
              style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}
            >
              <span style={{ fontSize: 11, color: "var(--muted)" }}>
                Altă zi:
              </span>
              <input
                type="date"
                value={istoricDate}
                max={new Date().toISOString().split("T")[0]}
                onChange={(e) => setIstoricDate(e.target.value)}
                style={{
                  background: "#1e1a14",
                  border: "1px solid #2a2218",
                  borderRadius: 10,
                  color: "#f0ebe3",
                  padding: "6px 10px",
                  fontSize: 12,
                  fontFamily: "inherit",
                  flex: 1,
                }}
              />
            </div>
          </div>

          {/* Statistici ziua */}
          {!istoricLoading && istoricOrders.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  background: "#161210",
                  border: "1px solid #2a2218",
                  borderRadius: 14,
                  padding: "12px 16px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 900,
                    color: "var(--terra)",
                    fontFamily: "'Fraunces',serif",
                  }}
                >
                  {istoricOrders.length}
                </div>
                <div
                  style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}
                >
                  Comenzi totale
                </div>
              </div>
              <div
                style={{
                  background: "#161210",
                  border: "1px solid #2a2218",
                  borderRadius: 14,
                  padding: "12px 16px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 900,
                    color: "#6b9e6b",
                    fontFamily: "'Fraunces',serif",
                  }}
                >
                  {istoricOrders
                    .reduce((s, o) => s + Number(o.total || 0), 0)
                    .toFixed(0)}{" "}
                  lei
                </div>
                <div
                  style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}
                >
                  Total vânzări
                </div>
              </div>
            </div>
          )}

          {/* Lista comenzi */}
          {istoricLoading ? (
            <div
              style={{
                textAlign: "center",
                padding: "30px 0",
                color: "var(--muted)",
                fontSize: 13,
              }}
            >
              Se încarcă...
            </div>
          ) : istoricOrders.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px 0",
                color: "var(--muted)",
              }}
            >
              <div style={{ fontSize: 36, marginBottom: 10 }}>🕐</div>
              <div>Nicio comandă în această zi</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {istoricOrders.map((o) => {
                const ora = new Date(o.created_at).toLocaleTimeString("ro-RO", {
                  hour: "2-digit",
                  minute: "2-digit",
                });
                const statusColors = {
                  completed: "#6b9e6b",
                  paid: "#5b8dd9",
                  cancelled: "#e05050",
                  pending: "#c8a97e",
                  cooking: "#e07a47",
                  ready: "#6b9e6b",
                };
                const statusLabel = {
                  completed: "Finalizată",
                  paid: "Plătită",
                  cancelled: "Anulată",
                  pending: "În așteptare",
                  cooking: "Se prepară",
                  ready: "Gata",
                };
                return (
                  <div
                    key={o.id}
                    style={{
                      background: "#161210",
                      border: "1px solid #2a2218",
                      borderRadius: 14,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        padding: "10px 14px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        borderBottom: "1px solid #2a2218",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          gap: 10,
                          alignItems: "center",
                        }}
                      >
                        <span style={{ fontSize: 13, fontWeight: 700 }}>
                          {o.table_label ? `Masa ${o.table_label}` : "—"}
                        </span>
                        <span style={{ fontSize: 11, color: "var(--muted)" }}>
                          {ora}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "3px 8px",
                            borderRadius: 10,
                            background: `${statusColors[o.status] || "#6b6050"}22`,
                            color: statusColors[o.status] || "#6b6050",
                            border: `1px solid ${statusColors[o.status] || "#6b6050"}44`,
                          }}
                        >
                          {statusLabel[o.status] || o.status}
                        </span>
                        <span
                          style={{
                            fontSize: 14,
                            fontWeight: 900,
                            color: "var(--terra)",
                          }}
                        >
                          {Number(o.total || 0).toFixed(2)} lei
                        </span>
                      </div>
                    </div>
                    <div style={{ padding: "8px 14px" }}>
                      {(Array.isArray(o.items) ? o.items : []).map(
                        (item, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: 12,
                              color: "var(--muted)",
                              padding: "3px 0",
                            }}
                          >
                            <span>
                              {item.emoji || "🍴"} {item.name}{" "}
                              {item.qty > 1 ? `x${item.qty}` : ""}
                            </span>
                            <span style={{ color: "var(--cream)" }}>
                              {(item.price * (item.qty || 1)).toFixed(2)} lei
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
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
          { id: "istoric", icon: "🕐", label: "Istoric" },
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
            🪑 Masa {order.table_label || order.table}
          </div>
          <div style={{ fontSize: 11, color: "#6b6050" }}>
            {new Date(order.created_at).toLocaleTimeString("ro-RO", {
              hour: "2-digit",
              minute: "2-digit",
            })}
            {order.waiter_name && (
              <span style={{ marginLeft: 8, color: "#c8a97e" }}>
                • {order.waiter_name}
              </span>
            )}
          </div>
        </div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 800,
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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 8,
        }}
      >
        <span
          style={{
            fontFamily: "'Fraunces',serif",
            fontSize: 15,
            fontWeight: 700,
            color: "#c8a97e",
          }}
        >
          {order.total} lei
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          {order.status === "cooking" && (
            <button
              onClick={() => onMarkReady(order.id)}
              style={{
                padding: "8px 14px",
                borderRadius: 10,
                background: "rgba(74,110,74,.2)",
                border: "1px solid rgba(74,110,74,.4)",
                color: "#6b9e6b",
                fontSize: 12,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              ✅ Gata
            </button>
          )}
          <button
            onClick={() => onClose(order.id)}
            style={{
              padding: "8px 14px",
              borderRadius: 10,
              background: "#1e1a14",
              border: "1px solid #2a2218",
              color: "#f0ebe3",
              fontSize: 12,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
}
