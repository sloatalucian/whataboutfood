import { useState } from "react";
import { useApp } from "../context/AppContext";
import { useTable, TABLE_STATUS } from "../context/TableContext";
import { PLANS } from "../data/constants";

// ── Componenta "Mese Ocupate Live" ────────────────────────────────────────────
function LiveTablesModal({ restaurant, onClose }) {
  const { tableStates } = useTable();
  const [activeFloor, setActiveFloor] = useState(0);

  const floors = restaurant?.floors || [];
  const floor = floors[activeFloor];
  const tables = floor?.tables || [];

  const allTables = floors.flatMap((f) => f.tables || []);
  const freeCount = allTables.filter(
    (t) => !tableStates[t.id] || tableStates[t.id] === "free",
  ).length;
  const occCount = allTables.filter(
    (t) => tableStates[t.id] === "occupied",
  ).length;
  const resCount = allTables.filter(
    (t) => tableStates[t.id] === "reserved",
  ).length;
  const paidCount = allTables.filter(
    (t) => tableStates[t.id] === "paid",
  ).length;
  const total = allTables.length;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(0,0,0,.75)",
        backdropFilter: "blur(8px)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#161210",
          borderRadius: "24px 24px 0 0",
          border: "1px solid #2a2218",
          maxHeight: "85vh",
          overflow: "auto",
          maxWidth: 430,
          width: "100%",
          margin: "0 auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 20px 0",
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
              🔴 Mese Ocupate Live
            </div>
            <div style={{ fontSize: 12, color: "#6b6050", marginTop: 2 }}>
              {restaurant?.name} • actualizat în timp real
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "#1e1a14",
              border: "1px solid #2a2218",
              color: "#6b6050",
              fontSize: 18,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {/* Stats overview */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4,1fr)",
            gap: 8,
            padding: "16px 20px",
          }}
        >
          {[
            {
              label: "Libere",
              value: freeCount,
              color: "#4a6e4a",
              bg: "rgba(74,110,74,.15)",
            },
            {
              label: "Ocupate",
              value: occCount,
              color: "#c0622f",
              bg: "rgba(192,98,47,.15)",
            },
            {
              label: "Rezervate",
              value: resCount,
              color: "#c8a97e",
              bg: "rgba(200,169,126,.15)",
            },
            {
              label: "Achitate",
              value: paidCount,
              color: "#5b8dd9",
              bg: "rgba(91,141,217,.15)",
            },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                background: s.bg,
                borderRadius: 12,
                padding: "10px 6px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontFamily: "'Fraunces',serif",
                  fontSize: 22,
                  fontWeight: 900,
                  color: s.color,
                }}
              >
                {s.value}
              </div>
              <div
                style={{
                  fontSize: 9,
                  color: s.color,
                  opacity: 0.8,
                  marginTop: 2,
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div style={{ padding: "0 20px 16px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 11,
              color: "#6b6050",
              marginBottom: 6,
            }}
          >
            <span>
              {freeCount} mese libere din {total}
            </span>
            <span>
              {Math.round((freeCount / total) * 100)}% disponibilitate
            </span>
          </div>
          <div
            style={{
              height: 8,
              background: "#2a2218",
              borderRadius: 20,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                borderRadius: 20,
                width: `${(freeCount / total) * 100}%`,
                background: "linear-gradient(90deg,#4a6e4a,#6b9e6b)",
                transition: "width .3s",
              }}
            />
          </div>
        </div>

        {/* Floor tabs */}
        {floors.length > 1 && (
          <div
            style={{
              display: "flex",
              gap: 8,
              padding: "0 20px 12px",
              flexWrap: "wrap",
            }}
          >
            {floors.map((fl, i) => (
              <button
                key={fl.id}
                onClick={() => setActiveFloor(i)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 20,
                  fontSize: 12,
                  cursor: "pointer",
                  background: activeFloor === i ? "#c0622f" : "#1e1a14",
                  border: `1px solid ${activeFloor === i ? "#c0622f" : "#2a2218"}`,
                  color: activeFloor === i ? "#fff" : "#6b6050",
                  fontWeight: activeFloor === i ? 700 : 400,
                }}
              >
                {fl.name}
              </button>
            ))}
          </div>
        )}

        {/* Tables grid */}
        <div style={{ padding: "0 20px 32px" }}>
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
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4,1fr)",
              gap: 8,
            }}
          >
            {tables.map((table) => {
              const status = tableStates[table.id] || "free";
              const cfg = TABLE_STATUS[status];
              return (
                <div
                  key={table.id}
                  style={{
                    background: cfg.bg,
                    border: `2px solid ${cfg.border}`,
                    borderRadius: 12,
                    padding: "10px 4px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 14, marginBottom: 2 }}>🪑</div>
                  <div
                    style={{
                      fontFamily: "'Fraunces',serif",
                      fontSize: 13,
                      fontWeight: 700,
                      color: cfg.color,
                    }}
                  >
                    {table.label}
                  </div>
                  <div
                    style={{
                      fontSize: 8,
                      color: cfg.color,
                      opacity: 0.7,
                      marginTop: 1,
                    }}
                  >
                    {table.seats}p
                  </div>
                  <div style={{ fontSize: 8, color: cfg.color, marginTop: 2 }}>
                    {cfg.icon}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Pagina principală restaurant ─────────────────────────────────────────────
export default function Restaurant() {
  const { state, navigate, showToast, isLocked } = useApp();
  const { tableStates } = useTable();
  const { selectedRest } = state;
  const [showLive, setShowLive] = useState(false);

  if (!selectedRest) {
    navigate("home");
    return null;
  }

  // Calculează mese libere pentru butonul live
  const allTables = (selectedRest.floors || []).flatMap((f) => f.tables || []);
  const freeCount = allTables.filter(
    (t) => !tableStates[t.id] || tableStates[t.id] === "free",
  ).length;
  const occCount = allTables.filter(
    (t) => tableStates[t.id] === "occupied" || tableStates[t.id] === "reserved",
  ).length;

  const handleOrder = () => {
    if (isLocked("orders")) {
      showToast("🔒 Comenzile necesită plan Pro!");
      return;
    }
    navigate("selectTable");
  };

  // "Vezi meniu" — merge la meniu dar fără masă selectată
  // Comanda va fi blocată până selectează masa
  const handleViewMenu = () => {
    navigate("menu");
  };

  return (
    <>
      {showLive && (
        <LiveTablesModal
          restaurant={selectedRest}
          onClose={() => setShowLive(false)}
        />
      )}

      <div className="page fade-in">
        {/* Hero */}
        <div
          style={{
            padding: "48px 20px 24px",
            position: "relative",
            minHeight: 200,
            background: selectedRest.cover,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
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
              onClick={() => navigate("home")}
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
            <span className={`plan-badge plan-${selectedRest.plan}`}>
              {PLANS[selectedRest.plan]?.label}
            </span>
          </div>

          <div style={{ fontSize: 48, marginBottom: 10 }}>
            {selectedRest.emoji}
          </div>
          <div
            style={{
              fontFamily: "'Fraunces',serif",
              fontSize: 28,
              fontWeight: 900,
              marginBottom: 4,
            }}
          >
            {selectedRest.name}
          </div>
          <div
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,.6)",
              marginBottom: 8,
            }}
          >
            {selectedRest.type}
          </div>
          <div
            style={{
              display: "flex",
              gap: 16,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{ fontSize: 14, fontWeight: 700, color: "var(--gold)" }}
            >
              ★ {selectedRest.rating} ({selectedRest.reviews} recenzii)
            </span>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,.5)" }}>
              ⏰ {selectedRest.hours}
            </span>
          </div>
          <div
            style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}
          >
            {selectedRest.tags.map((t) => (
              <span
                key={t}
                style={{
                  fontSize: 11,
                  padding: "4px 12px",
                  borderRadius: 20,
                  background: "rgba(255,255,255,.1)",
                  color: "rgba(255,255,255,.7)",
                }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Buton Mese Ocupate Live */}
        <div style={{ padding: "12px 20px 0" }}>
          <button
            onClick={() => setShowLive(true)}
            style={{
              width: "100%",
              padding: "12px 16px",
              background: "rgba(192,98,47,.12)",
              border: "1px solid rgba(192,98,47,.35)",
              borderRadius: 16,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 10,
                  height: 10,
                  background: "#c0622f",
                  borderRadius: "50%",
                  animation: "pulse 1.5s infinite",
                }}
              />
              <span style={{ fontSize: 14, fontWeight: 700, color: "#e07a47" }}>
                Mese ocupate live
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 12, color: "#6b9e6b", fontWeight: 600 }}>
                {freeCount} libere
              </span>
              <span style={{ fontSize: 12, color: "#c0622f", fontWeight: 600 }}>
                {occCount} ocupate
              </span>
              <span style={{ fontSize: 14, color: "#6b6050" }}>›</span>
            </div>
          </button>
        </div>

        {/* Action buttons */}
        <div style={{ padding: "12px 20px 0" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              marginBottom: 10,
            }}
          >
            <div
              onClick={() => navigate("reserve")}
              style={{
                padding: "16px 14px",
                borderRadius: 16,
                textAlign: "center",
                cursor: "pointer",
                background: "linear-gradient(135deg,var(--terra),#8b3a18)",
              }}
            >
              <div style={{ fontSize: 22, marginBottom: 4 }}>📅</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>
                Rezervare
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "rgba(255,255,255,.6)",
                  marginTop: 2,
                }}
              >
                Rezervă o masă
              </div>
            </div>

            <div
              onClick={handleOrder}
              style={{
                padding: "16px 14px",
                borderRadius: 16,
                textAlign: "center",
                cursor: "pointer",
                background: "linear-gradient(135deg,var(--sage),#2d4a2d)",
                opacity: isLocked("orders") ? 0.6 : 1,
              }}
            >
              <div style={{ fontSize: 22, marginBottom: 4 }}>🪑</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>
                Selectează masa {isLocked("orders") ? "🔒" : ""}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "rgba(255,255,255,.6)",
                  marginTop: 2,
                }}
              >
                Stai la masă acum
              </div>
            </div>
          </div>

          {/* Vezi meniu */}
          <div
            onClick={handleViewMenu}
            style={{
              padding: "14px",
              borderRadius: 16,
              textAlign: "center",
              cursor: "pointer",
              background: "var(--card)",
              border: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
            }}
          >
            <span style={{ fontSize: 20 }}>🍽️</span>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Vezi meniul</div>
              <div style={{ fontSize: 10, color: "var(--muted)" }}>
                Explorează preparatele
              </div>
            </div>
          </div>
        </div>

        {/* Info card */}
        <div className="inner" style={{ paddingTop: 16 }}>
          <div
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: 16,
            }}
          >
            <div
              style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}
            >
              📍 Adresă
            </div>
            <div style={{ fontSize: 14, marginBottom: 12 }}>
              {selectedRest.address}
            </div>
            <div
              style={{
                height: 1,
                background: "var(--border)",
                marginBottom: 12,
              }}
            />
            <div
              style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}
            >
              ⏰ Program
            </div>
            <div style={{ fontSize: 14, marginBottom: 12 }}>
              {selectedRest.hours}
            </div>
            <div
              style={{
                height: 1,
                background: "var(--border)",
                marginBottom: 12,
              }}
            />
            <div
              style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}
            >
              🏢 Etaje & Terase
            </div>
            <div style={{ fontSize: 14 }}>
              {selectedRest.floors?.map((f) => f.name).join(" · ") || "—"}
            </div>
          </div>

          {/* Cum functioneaza */}
          <div
            style={{
              background: "rgba(192,98,47,.08)",
              border: "1px solid rgba(192,98,47,.2)",
              borderRadius: 16,
              padding: 16,
              marginTop: 12,
            }}
          >
            <div
              style={{
                fontFamily: "'Fraunces',serif",
                fontSize: 15,
                fontWeight: 700,
                marginBottom: 10,
              }}
            >
              Cum funcționează?
            </div>
            {[
              { icon: "🪑", text: "Selectezi masa la care stai" },
              { icon: "🍽️", text: "Comanzi direct din meniu" },
              { icon: "🧑‍🍳", text: "Ospătarul primește comanda instant" },
              { icon: "💳", text: "Plătești cash sau card la final" },
            ].map((step, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 8,
                }}
              >
                <span style={{ fontSize: 18, width: 28, textAlign: "center" }}>
                  {step.icon}
                </span>
                <span style={{ fontSize: 13, color: "rgba(240,235,227,.7)" }}>
                  {step.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1);}50%{opacity:.5;transform:scale(.8);}}`}</style>
    </>
  );
}
