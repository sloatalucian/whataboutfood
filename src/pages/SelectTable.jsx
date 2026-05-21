import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabase";
import { useTable, TABLE_STATUS } from "../context/TableContext";

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
      const sessionId = await occupyTable(confirming.id, confirming.label);
      if (onSelected) onSelected({ table: confirming, sessionId });
    } catch {
      if (onSelected) onSelected({ table: confirming, sessionId: null });
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
                const status = getStatus(table.label);
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
