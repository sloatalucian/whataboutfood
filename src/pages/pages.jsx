import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { useApp } from "../context/AppContext";
import { useTable, TABLE_STATUS } from "../context/TableContext";
import { PLANS } from "../data/constants";

// ─── DATE IMPLICITE PROGRAM ───────────────────────────────────────────────────
const ZILE = [
  "Luni",
  "Marți",
  "Miercuri",
  "Joi",
  "Vineri",
  "Sâmbătă",
  "Duminică",
];

const DEFAULT_PROGRAM = {
  Luni: { deschis: true, start: "10:00", end: "22:00" },
  Marți: { deschis: true, start: "10:00", end: "22:00" },
  Miercuri: { deschis: true, start: "10:00", end: "22:00" },
  Joi: { deschis: true, start: "10:00", end: "22:00" },
  Vineri: { deschis: true, start: "10:00", end: "23:00" },
  Sâmbătă: { deschis: true, start: "10:00", end: "24:00" },
  Duminică: { deschis: true, start: "12:00", end: "22:00" },
};

// Formatează programul pentru afișare
function formatProgram(program) {
  if (!program) return "12:00 — 23:00";
  const azi = new Date().toLocaleDateString("ro-RO", { weekday: "long" });
  const ziCapitalizata = azi.charAt(0).toUpperCase() + azi.slice(1);
  const ziProgram = program[ziCapitalizata];
  if (!ziProgram || !ziProgram.deschis) return "Închis azi";
  return `${ziProgram.start} — ${ziProgram.end}`;
}

// ─── MODAL PROGRAM EDITOR ─────────────────────────────────────────────────────
function ProgramEditor({ program, onSave, onClose }) {
  const [prog, setProg] = useState(program || DEFAULT_PROGRAM);

  const update = (zi, key, value) => {
    setProg((prev) => ({ ...prev, [zi]: { ...prev[zi], [key]: value } }));
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        background: "rgba(0,0,0,.8)",
        backdropFilter: "blur(8px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
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
          width: "100%",
          maxWidth: 430,
          maxHeight: "85vh",
          overflowY: "auto",
          padding: "24px 20px 40px",
          animation: "slideUp .3s ease",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <div
            style={{
              fontFamily: "'Fraunces',serif",
              fontSize: 20,
              fontWeight: 700,
            }}
          >
            🕐 Program restaurant
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "#1e1a14",
              border: "1px solid #2a2218",
              color: "#6b6050",
              fontSize: 16,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {ZILE.map((zi) => (
          <div
            key={zi}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 0",
              borderBottom: "1px solid #1e1a14",
            }}
          >
            {/* Toggle deschis/închis */}
            <div
              onClick={() => update(zi, "deschis", !prog[zi]?.deschis)}
              style={{
                width: 36,
                height: 20,
                borderRadius: 10,
                cursor: "pointer",
                background: prog[zi]?.deschis ? "#c0622f" : "#2a2218",
                position: "relative",
                transition: "background .2s",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 2,
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: "#fff",
                  transition: "left .2s",
                  left: prog[zi]?.deschis ? 18 : 2,
                }}
              />
            </div>

            {/* Zi */}
            <div
              style={{
                width: 72,
                fontSize: 13,
                fontWeight: 600,
                color: prog[zi]?.deschis ? "#f0ebe3" : "#6b6050",
              }}
            >
              {zi}
            </div>

            {prog[zi]?.deschis ? (
              /* Ore deschis */
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  flex: 1,
                }}
              >
                <input
                  type="time"
                  value={prog[zi]?.start || "10:00"}
                  onChange={(e) => update(zi, "start", e.target.value)}
                  style={{
                    flex: 1,
                    background: "#1e1a14",
                    border: "1px solid #2a2218",
                    borderRadius: 8,
                    padding: "6px 8px",
                    color: "#f0ebe3",
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                    fontSize: 12,
                    outline: "none",
                  }}
                />
                <span style={{ fontSize: 12, color: "#6b6050" }}>—</span>
                <input
                  type="time"
                  value={prog[zi]?.end || "22:00"}
                  onChange={(e) => update(zi, "end", e.target.value)}
                  style={{
                    flex: 1,
                    background: "#1e1a14",
                    border: "1px solid #2a2218",
                    borderRadius: 8,
                    padding: "6px 8px",
                    color: "#f0ebe3",
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                    fontSize: 12,
                    outline: "none",
                  }}
                />
              </div>
            ) : (
              <div
                style={{
                  flex: 1,
                  fontSize: 12,
                  color: "#6b6050",
                  fontStyle: "italic",
                }}
              >
                Închis
              </div>
            )}
          </div>
        ))}

        <button
          onClick={() => onSave(prog)}
          style={{
            width: "100%",
            marginTop: 20,
            padding: 14,
            background: "linear-gradient(135deg,#c0622f,#8b3a18)",
            border: "none",
            borderRadius: 14,
            color: "#fff",
            fontFamily: "'Fraunces',serif",
            fontSize: 16,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          ✅ Salvează programul
        </button>
      </div>
      <style>{`@keyframes slideUp{from{transform:translateY(100%);}to{transform:translateY(0);}}`}</style>
    </div>
  );
}

// ─── MODAL MESE LIVE ──────────────────────────────────────────────────────────
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
              {restaurant?.name} • timp real
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
              {Math.round((freeCount / Math.max(total, 1)) * 100)}%
              disponibilitate
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
                width: `${(freeCount / Math.max(total, 1)) * 100}%`,
                background: "linear-gradient(90deg,#4a6e4a,#6b9e6b)",
                transition: "width .3s",
              }}
            />
          </div>
        </div>

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

// ─── PAGINA RESTAURANT ────────────────────────────────────────────────────────
export default function Restaurant() {
  const { state, navigate, showToast, isLocked } = useApp();
  const { tableStates } = useTable();
  const { selectedRest, user } = state;

  const [showLive, setShowLive] = useState(false);
  const [showProgram, setShowProgram] = useState(false);
  const [program, setProgram] = useState(
    selectedRest?.program || DEFAULT_PROGRAM,
  );

  // Încarcă programul din Supabase
  useEffect(() => {
    if (!selectedRest?.id) return;
    supabase
      .from("restaurants")
      .select("program")
      .eq("id", selectedRest.id)
      .single()
      .then(({ data }) => {
        if (data?.program) setProgram(data.program);
      });
  }, [selectedRest?.id]);

  if (!selectedRest) {
    navigate("home");
    return null;
  }

  const allTables = (selectedRest.floors || []).flatMap((f) => f.tables || []);
  const freeCount = allTables.filter(
    (t) => !tableStates[t.id] || tableStates[t.id] === "free",
  ).length;
  const occCount = allTables.filter(
    (t) => tableStates[t.id] === "occupied" || tableStates[t.id] === "reserved",
  ).length;
  const isOwner = user?.role === "owner";

  const handleSaveProgram = async (newProg) => {
    setProgram(newProg);
    setShowProgram(false);
    if (selectedRest?.id) {
      const { error } = await supabase
        .from("restaurants")
        .update({ program: newProg })
        .eq("id", selectedRest.id);
      if (error) {
        showToast("❌ Eroare la salvarea programului.");
        return;
      }
    }
    showToast("✅ Programul a fost salvat!");
  };

  // Formatează programul pentru afișare pe pagina restaurantului
  const programZiCurenta = formatProgram(program);

  // Construiește string-ul cu programul complet
  const programComplet = ZILE.map((zi) => {
    const z = program[zi];
    if (!z || !z.deschis) return `${zi}: Închis`;
    return `${zi}: ${z.start} — ${z.end}`;
  });

  return (
    <>
      {showLive && (
        <LiveTablesModal
          restaurant={selectedRest}
          onClose={() => setShowLive(false)}
        />
      )}
      {showProgram && (
        <ProgramEditor
          program={program}
          onSave={handleSaveProgram}
          onClose={() => setShowProgram(false)}
        />
      )}

      <div className="page fade-in">
        {/* Hero */}
        <div
          style={{
            padding: "48px 20px 24px",
            position: "relative",
            background:
              selectedRest.cover || "linear-gradient(135deg,#2d1507,#1a0e05)",
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
              ★ {selectedRest.rating || "—"}{" "}
              {selectedRest.reviews ? `(${selectedRest.reviews} recenzii)` : ""}
            </span>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,.5)" }}>
              ⏰ {programZiCurenta}
            </span>
          </div>
          <div
            style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}
          >
            {(selectedRest.tags || []).map((t) => (
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

        {/* Butoane acțiuni */}
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
              onClick={() => navigate("selectTable")}
              style={{
                padding: "16px 14px",
                borderRadius: 16,
                textAlign: "center",
                cursor: "pointer",
                background: "linear-gradient(135deg,var(--sage),#2d4a2d)",
              }}
            >
              <div style={{ fontSize: 22, marginBottom: 4 }}>🪑</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>
                Selectează masa
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
          <div
            onClick={() => navigate("menu")}
            style={{
              padding: "14px",
              borderRadius: 16,
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

            {/* Program customizabil */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                marginBottom: 4,
              }}
            >
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                ⏰ Program
              </div>
              {/* Buton editare — doar pentru proprietar */}
              {isOwner && (
                <button
                  onClick={() => setShowProgram(true)}
                  style={{
                    padding: "3px 10px",
                    borderRadius: 8,
                    background: "rgba(192,98,47,.15)",
                    border: "1px solid rgba(192,98,47,.3)",
                    color: "#e07a47",
                    fontSize: 10,
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  ✏️ Editează
                </button>
              )}
            </div>

            {/* Afișare program pe zile */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                marginBottom: 12,
              }}
            >
              {ZILE.map((zi) => {
                const z = program[zi];
                const azi = new Date().toLocaleDateString("ro-RO", {
                  weekday: "long",
                });
                const eAzi = zi.toLowerCase() === azi.toLowerCase();
                return (
                  <div
                    key={zi}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 12,
                      padding: "3px 0",
                    }}
                  >
                    <span
                      style={{
                        color: eAzi ? "#c0622f" : "var(--muted)",
                        fontWeight: eAzi ? 700 : 400,
                      }}
                    >
                      {eAzi ? "• " : ""}
                      {zi}
                    </span>
                    <span
                      style={{
                        color: !z?.deschis
                          ? "#6b6050"
                          : eAzi
                            ? "#f0ebe3"
                            : "var(--muted)",
                        fontStyle: !z?.deschis ? "italic" : "normal",
                      }}
                    >
                      {!z || !z.deschis ? "Închis" : `${z.start} — ${z.end}`}
                    </span>
                  </div>
                );
              })}
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

          {/* Cum funcționează */}
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
