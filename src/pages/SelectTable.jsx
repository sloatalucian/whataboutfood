import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabase";
import { useTable, TABLE_STATUS } from "../context/TableContext";
import { useApp } from "../context/AppContext";
import { TableShape, FixedShape } from "../components/FloorShapes";

export function SelectTable({ restaurant, onSelected, onBack }) {
  const { getStatus, occupyTable } = useTable();
  const { state } = useApp();
  const { user } = state;
  const [selectedFloor, setSelectedFloor] = useState(0);
  const [confirming, setConfirming] = useState(null);
  const [loading, setLoading] = useState(false);
  const [zoom, setZoom] = useState(70);
  const containerRef = useRef(null);
  const [dbFloors, setDbFloors] = useState([]);
  const [floorsLoading, setFloorsLoading] = useState(true);
  const [myReservation, setMyReservation] = useState(null); // rezervare activa a clientului

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
      try {
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
      } catch {}
      setFloorsLoading(false);
    };
    load();
  }, [restaurant?.id]);

  // Verifica daca clientul are rezervare activa pentru azi la ora curenta
  useEffect(() => {
    if (!restaurant?.id || !user?.id) return;
    const checkReservation = async () => {
      const now = new Date();
      const todayStr = now.toISOString().split("T")[0];
      const { data } = await supabase
        .from("reservations")
        .select("id, table_label, time")
        .eq("restaurant_id", restaurant.id)
        .eq("user_id", user.id)
        .eq("date", todayStr)
        .in("status", ["pending", "confirmed"])
        .not("table_label", "is", null);

      if (data && data.length > 0) {
        // Filtreaza rezervarile in intervalul orar curent (+/- 120 min)
        const ch = now.getHours();
        const cm = now.getMinutes();
        const active = data.find((r) => {
          const [rh, rm] = r.time.split(":").map(Number);
          const diffMin = rh * 60 + rm - (ch * 60 + cm);
          return diffMin >= -30 && diffMin <= 120;
        });
        if (active) {
          // Aducem tableId corect - filtram dupa floor_id al restaurantului
          const { data: floorsData } = await supabase
            .from("floors")
            .select("id")
            .eq("restaurant_id", restaurant.id);
          const floorIds = (floorsData || []).map((f) => f.id);
          const { data: tableData } = await supabase
            .from("tables")
            .select("id")
            .eq("label", active.table_label)
            .in("floor_id", floorIds)
            .limit(1)
            .single();
          setMyReservation({ ...active, tableId: tableData?.id || null });
        }
      }
    };
    checkReservation();
  }, [restaurant?.id, user?.id]);

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

  // Popup rezervare activa
  if (myReservation) {
    const styleTag = `
      @keyframes waf-fadeIn { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
      @keyframes waf-popIn { 0%{transform:scale(0.5);opacity:0} 60%{transform:scale(1.15)} 100%{transform:scale(1);opacity:1} }
      @keyframes waf-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
      @keyframes waf-confetti1 { 0%{transform:translateY(0) rotate(0deg);opacity:1} 100%{transform:translateY(80px) rotate(360deg);opacity:0} }
      @keyframes waf-confetti2 { 0%{transform:translateY(0) rotate(0deg);opacity:1} 100%{transform:translateY(90px) rotate(-270deg);opacity:0} }
      @keyframes waf-tablePop { 0%{transform:scale(0.8);opacity:0} 70%{transform:scale(1.08)} 100%{transform:scale(1);opacity:1} }
      @keyframes waf-pulse { 0%,100%{box-shadow:0 0 0 0 rgba(192,98,47,0.4)} 50%{box-shadow:0 0 0 12px rgba(192,98,47,0)} }
      .waf-card { animation: waf-fadeIn 0.5s ease both; }
      .waf-emoji { animation: waf-popIn 0.6s cubic-bezier(.36,.07,.19,.97) 0.2s both, waf-float 3s ease-in-out 1s infinite; display:inline-block; }
      .waf-badge { animation: waf-tablePop 0.5s cubic-bezier(.36,.07,.19,.97) 0.5s both; }
      .waf-btn-main { animation: waf-pulse 2s ease-in-out 1s infinite; }
      .waf-dot1 { position:absolute; animation: waf-confetti1 1.2s ease-out 0.3s both; }
      .waf-dot2 { position:absolute; animation: waf-confetti2 1.4s ease-out 0.4s both; }
      .waf-dot3 { position:absolute; animation: waf-confetti1 1.0s ease-out 0.5s both; }
      .waf-dot4 { position:absolute; animation: waf-confetti2 1.3s ease-out 0.6s both; }
      .waf-dot5 { position:absolute; animation: waf-confetti1 1.1s ease-out 0.35s both; }
      .waf-welcome { animation: waf-fadeIn 0.4s ease 0.4s both; }
      .waf-sub { animation: waf-fadeIn 0.4s ease 0.6s both; }
      .waf-tagline { animation: waf-fadeIn 0.4s ease 0.8s both; }
      .waf-btns { animation: waf-fadeIn 0.4s ease 1s both; }
    `;
    const now = new Date();
    const dateStr = now.toLocaleDateString("ro-RO", {
      day: "2-digit",
      month: "long",
    });
    return (
      <>
        <style>{styleTag}</style>
        <div
          style={{
            minHeight: "100vh",
            background: "#0d0a07",
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "32px 24px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Confetti */}
          <div
            style={{
              position: "absolute",
              top: 40,
              left: "50%",
              transform: "translateX(-50%)",
              width: 280,
              height: 100,
              pointerEvents: "none",
            }}
          >
            <div
              className="waf-dot1"
              style={{
                left: 40,
                top: 0,
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "#c0622f",
              }}
            />
            <div
              className="waf-dot2"
              style={{
                left: 90,
                top: 10,
                width: 8,
                height: 8,
                borderRadius: 2,
                background: "#c8a97e",
              }}
            />
            <div
              className="waf-dot3"
              style={{
                left: 160,
                top: 5,
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "#6b9e6b",
              }}
            />
            <div
              className="waf-dot4"
              style={{
                left: 210,
                top: 0,
                width: 8,
                height: 8,
                borderRadius: 2,
                background: "#c0622f",
              }}
            />
            <div
              className="waf-dot5"
              style={{
                left: 130,
                top: 0,
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#c8a97e",
              }}
            />
          </div>

          <div
            className="waf-card"
            style={{
              background: "#1a1510",
              border: "1px solid rgba(200,169,126,.3)",
              borderRadius: 24,
              padding: "36px 28px",
              maxWidth: 340,
              width: "100%",
              textAlign: "center",
              position: "relative",
            }}
          >
            {/* Linie gradient top */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 3,
                borderRadius: "24px 24px 0 0",
                background: "linear-gradient(90deg,#c0622f,#c8a97e,#c0622f)",
              }}
            />

            <div
              className="waf-emoji"
              style={{ fontSize: 52, marginBottom: 16 }}
            >
              🎉
            </div>

            <div
              className="waf-welcome"
              style={{
                fontFamily: "'Fraunces',serif",
                fontSize: 24,
                fontWeight: 700,
                color: "#f0ebe3",
                marginBottom: 12,
              }}
            >
              Bun venit!
            </div>

            <div
              className="waf-sub"
              style={{ fontSize: 14, color: "#6b6050", marginBottom: 12 }}
            >
              Masa rezervată pentru tine
            </div>

            {/* Badge masa */}
            <div
              className="waf-badge"
              style={{
                background: "rgba(192,98,47,.15)",
                border: "1px solid rgba(192,98,47,.4)",
                borderRadius: 16,
                padding: "12px 24px",
                marginBottom: 16,
                display: "inline-block",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: "#c0622f",
                  textTransform: "uppercase",
                  letterSpacing: 1.5,
                  marginBottom: 4,
                  fontWeight: 600,
                }}
              >
                Masa ta
              </div>
              <div
                style={{
                  fontFamily: "'Fraunces',serif",
                  fontSize: 32,
                  fontWeight: 700,
                  color: "#f0ebe3",
                }}
              >
                {myReservation.table_label}
              </div>
            </div>

            <div
              className="waf-tagline"
              style={{
                fontSize: 13,
                color: "#6b6050",
                marginBottom: 28,
                lineHeight: 1.6,
              }}
            >
              Ne bucurăm că ai ajuns! 🍽️
              <br />
              <span style={{ color: "#c8a97e", fontSize: 12 }}>
                {restaurant?.name} · {dateStr}, {myReservation.time}
              </span>
            </div>

            <div className="waf-btns">
              <button
                className="waf-btn-main"
                onClick={async () => {
                  let sessionId = null;
                  if (myReservation.tableId) {
                    sessionId = await occupyTable(
                      myReservation.tableId,
                      myReservation.table_label,
                    );
                  }
                  if (onSelected)
                    onSelected({
                      table: {
                        label: myReservation.table_label,
                        id: myReservation.tableId,
                      },
                      sessionId,
                    });
                }}
                style={{
                  width: "100%",
                  padding: 15,
                  background: "linear-gradient(135deg,#c0622f,#8b3a18)",
                  border: "none",
                  borderRadius: 16,
                  color: "#fff",
                  fontFamily: "'Fraunces',serif",
                  fontSize: 17,
                  fontWeight: 700,
                  cursor: "pointer",
                  marginBottom: 12,
                  letterSpacing: 0.3,
                }}
              >
                🍽️ Vezi Meniu
              </button>
              <button
                onClick={onBack}
                style={{
                  width: "100%",
                  padding: 11,
                  background: "none",
                  border: "1px solid #2a2218",
                  borderRadius: 12,
                  color: "#6b6050",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Înapoi
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

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
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 2,
                    pointerEvents: "none",
                  }}
                >
                  <div style={{ width: "100%", flex: 1, minHeight: 0 }}>
                    <FixedShape type={el.type} color={el.color} />
                  </div>
                  <span
                    style={{
                      fontSize: 8,
                      color: el.color,
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                    }}
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
                const w = table.seats <= 2 ? 56 : table.seats <= 4 ? 70 : 90;
                const h = table.seats <= 2 ? 56 : table.seats <= 4 ? 70 : 64;
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
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: isFree ? "pointer" : "not-allowed",
                      transform: isSel ? "scale(1.1)" : "scale(1)",
                      transition: "transform .15s",
                      filter: isSel
                        ? "drop-shadow(0 0 6px rgba(255,255,255,.7))"
                        : "none",
                    }}
                  >
                    {/* Forma mesei (blat lemn + scaune). Voalul de status coloreaza
                        blatul cand masa nu e libera; pentru free ramane lemn natural. */}
                    <div
                      style={{
                        width: "100%",
                        flex: 1,
                        minHeight: 0,
                        pointerEvents: "none",
                      }}
                    >
                      <TableShape
                        seats={table.seats}
                        statusColor={isFree ? null : cfg.border}
                      />
                    </div>
                    {/* Eticheta + capacitatea, sub forma */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: 4,
                        pointerEvents: "none",
                        lineHeight: 1,
                        marginTop: 1,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "'Fraunces',serif",
                          fontSize: 12,
                          fontWeight: 700,
                          color: cfg.color,
                        }}
                      >
                        {table.label}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: cfg.color,
                          opacity: 0.8,
                        }}
                      >
                        {table.seats}p
                      </span>
                    </div>
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
