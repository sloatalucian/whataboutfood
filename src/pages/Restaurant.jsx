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
                  lang="ro"
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
                    WebkitAppearance: "none",
                  }}
                />
                <span style={{ fontSize: 12, color: "#6b6050" }}>—</span>
                <input
                  type="time"
                  value={prog[zi]?.end || "22:00"}
                  onChange={(e) => update(zi, "end", e.target.value)}
                  lang="ro"
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
                    WebkitAppearance: "none",
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
  const { tableStates, reload } = useTable();
  const [activeFloor, setActiveFloor] = useState(0);
  const [dbFloors, setDbFloors] = useState([]);
  const [zoom, setZoom] = useState(60);
  const [loadingFloors, setLoadingFloors] = useState(true);

  // Refresh tableStates la montare modal
  useEffect(() => {
    reload();
  }, []);

  useEffect(() => {
    if (!restaurant?.id) return;
    const load = async () => {
      setLoadingFloors(true);
      const { data: floorsData } = await supabase
        .from("floors")
        .select("*")
        .eq("restaurant_id", restaurant.id)
        .order("floor_order");
      if (!floorsData || floorsData.length === 0) {
        setLoadingFloors(false);
        return;
      }
      const floorsWithData = await Promise.all(
        floorsData.map(async (fl) => {
          const { data: tables } = await supabase
            .from("tables")
            .select("*")
            .eq("floor_id", fl.id);
          const { data: elements } = await supabase
            .from("floor_elements")
            .select("*")
            .eq("floor_id", fl.id);
          return { ...fl, tables: tables || [], elements: elements || [] };
        }),
      );
      setDbFloors(floorsWithData);
      setLoadingFloors(false);
    };
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [restaurant?.id]);

  // Folosim DOAR dbFloors (date reale din DB) pentru statistici
  // Nu facem fallback pe restaurant?.floors care poate avea date incorecte
  const floors = dbFloors.length > 0 ? dbFloors : [];
  const floor = floors[activeFloor];
  const tables = floor?.tables || [];
  const allTables = floors.flatMap((f) => f.tables || []);
  const freeCount = allTables.filter(
    (t) => !tableStates[t.label] || tableStates[t.label] === "free",
  ).length;
  const occCount = allTables.filter(
    (t) => tableStates[t.label] === "occupied",
  ).length;
  const resCount = allTables.filter(
    (t) => tableStates[t.label] === "reserved",
  ).length;
  const paidCount = allTables.filter(
    (t) => tableStates[t.label] === "paid",
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
                {loadingFloors ? "..." : s.value}
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

        {/* Selector etaj */}
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

        {/* Planșeu vizual */}
        <div style={{ padding: "0 20px 32px" }}>
          {floors.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "30px 0",
                color: "#6b6050",
                fontSize: 13,
              }}
            >
              Se încarcă planșeul...
            </div>
          ) : (
            <>
              {/* Zoom controls */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 6,
                  marginBottom: 8,
                }}
              >
                <button
                  onClick={() => setZoom((z) => Math.min(z + 10, 130))}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: "#1e1a14",
                    border: "1px solid #2a2218",
                    color: "#c8a97e",
                    fontSize: 16,
                    cursor: "pointer",
                  }}
                >
                  +
                </button>
                <span
                  style={{
                    fontSize: 11,
                    color: "#6b6050",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {zoom}%
                </span>
                <button
                  onClick={() => setZoom((z) => Math.max(z - 10, 40))}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: "#1e1a14",
                    border: "1px solid #2a2218",
                    color: "#c8a97e",
                    fontSize: 16,
                    cursor: "pointer",
                  }}
                >
                  −
                </button>
              </div>
              {/* Canvas planșeu */}
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  overflowX: "auto",
                  background: "#0d0a07",
                  borderRadius: 14,
                  border: "1px solid #2a2218",
                }}
              >
                <div
                  style={{
                    position: "relative",
                    height: Math.max(300, (700 * zoom) / 100),
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      transform: `scale(${zoom / 100})`,
                      transformOrigin: "top left",
                      width: `${100 / (zoom / 100)}%`,
                    }}
                  >
                    {/* Eticheta etaj */}
                    <div
                      style={{
                        position: "absolute",
                        top: 6,
                        left: 8,
                        fontSize: 9,
                        color: "#6b6050",
                        letterSpacing: 1,
                        textTransform: "uppercase",
                      }}
                    >
                      {floor?.name}
                    </div>
                    {/* Elemente decorative */}
                    {(floor?.elements || []).map((el) => (
                      <div
                        key={el.id}
                        style={{
                          position: "absolute",
                          left: el.x,
                          top: el.y,
                          width: el.w || 60,
                          height: el.h || 60,
                          borderRadius: 10,
                          background: `${el.color || "#2a2218"}22`,
                          border: `1px solid ${el.color || "#2a2218"}55`,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          pointerEvents: "none",
                        }}
                      >
                        <span style={{ fontSize: 18 }}>{el.icon}</span>
                        <span
                          style={{
                            fontSize: 8,
                            color: el.color || "#6b6050",
                            fontWeight: 700,
                          }}
                        >
                          {el.label}
                        </span>
                      </div>
                    ))}
                    {/* Mese */}
                    {tables.map((table) => {
                      const status = tableStates[table.label] || "free";
                      const colors = {
                        free: "#4a6e4a",
                        occupied: "#c0622f",
                        reserved: "#c8a97e",
                        paid: "#5b8dd9",
                      };
                      const bgs = {
                        free: "rgba(74,110,74,.15)",
                        occupied: "rgba(192,98,47,.2)",
                        reserved: "rgba(200,169,126,.15)",
                        paid: "rgba(91,141,217,.15)",
                      };
                      const icons = {
                        free: "",
                        occupied: "🍽️",
                        reserved: "📅",
                        paid: "💳",
                      };
                      const w =
                        table.seats <= 2 ? 52 : table.seats <= 4 ? 64 : 80;
                      return (
                        <div
                          key={table.id}
                          style={{
                            position: "absolute",
                            left: table.x,
                            top: table.y,
                            width: w,
                            height: w * 0.85,
                            borderRadius: 12,
                            background: bgs[status],
                            border: `2px solid ${colors[status]}`,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 1,
                          }}
                        >
                          <div
                            style={{
                              fontFamily: "'Fraunces',serif",
                              fontSize: 13,
                              fontWeight: 700,
                              color: colors[status],
                            }}
                          >
                            {table.label}
                          </div>
                          <div
                            style={{
                              fontSize: 8,
                              color: colors[status],
                              opacity: 0.7,
                            }}
                          >
                            {table.seats}p
                          </div>
                          {icons[status] && (
                            <div style={{ fontSize: 10 }}>{icons[status]}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── PAGINA RESTAURANT ────────────────────────────────────────────────────────
export default function Restaurant() {
  const { state, navigate, showToast, isLocked, dispatch } = useApp();
  const { tableStates } = useTable();
  const { selectedRest, user } = state;

  const [showLive, setShowLive] = useState(false);
  const [showProgram, setShowProgram] = useState(false);
  const [showReviews, setShowReviews] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewFilter, setReviewFilter] = useState(0); // 0 = toate
  const [program, setProgram] = useState(
    selectedRest?.program || DEFAULT_PROGRAM,
  );

  // ── Favorite ──────────────────────────────────────────────────────────────
  const [isFav, setIsFav] = useState(false);
  const [favLoading, setFavLoading] = useState(false);
  const [heartAnim, setHeartAnim] = useState(false);
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (!user?.id || !selectedRest?.id) return;
    supabase
      .from("favorites")
      .select("id")
      .eq("user_id", user.id)
      .eq("restaurant_id", selectedRest.id)
      .maybeSingle()
      .then(({ data }) => setIsFav(!!data));
  }, [user?.id, selectedRest?.id]);

  const toggleFavorite = async () => {
    if (favLoading || !user?.id) return;
    setFavLoading(true);

    // Animație inimă
    setHeartAnim(true);
    setTimeout(() => setHeartAnim(false), 500);

    // Particles burst doar la adăugare
    if (!isFav) {
      const newParticles = Array.from({ length: 8 }, (_, i) => ({
        id: Date.now() + i,
        angle: (i / 8) * 360,
      }));
      setParticles(newParticles);
      setTimeout(() => setParticles([]), 700);
    }

    if (isFav) {
      await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("restaurant_id", selectedRest.id);
      setIsFav(false);
      showToast("Scos din favorite");
    } else {
      await supabase
        .from("favorites")
        .insert({ user_id: user.id, restaurant_id: selectedRest.id });
      setIsFav(true);
      showToast("Adăugat la favorite ❤️");
    }
    setFavLoading(false);
  };

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

  const loadReviews = async () => {
    if (!selectedRest?.id) return;
    setReviewsLoading(true);
    // Reincarcam rating-ul din DB (poate fi actualizat dupa review-uri noi)
    const { data: restData } = await supabase
      .from("restaurants")
      .select("rating")
      .eq("id", selectedRest.id)
      .single();
    if (restData) {
      dispatch({ type: "UPDATE_REST_RATING", payload: restData.rating });
    }
    const { data } = await supabase
      .from("restaurant_reviews")
      .select("*")
      .eq("restaurant_id", selectedRest.id)
      .order("created_at", { ascending: false });
    if (data && data.length > 0) {
      // Incarcam numele clientilor separat
      const userIds = [...new Set(data.map((r) => r.user_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);
      const profileMap = {};
      (profiles || []).forEach((p) => {
        profileMap[p.id] = p.full_name;
      });
      setReviews(
        data.map((r) => ({
          ...r,
          reviewer_name: profileMap[r.user_id] || "Client",
        })),
      );
    } else {
      setReviews([]);
    }
    setReviewsLoading(false);
  };

  const allTables = (selectedRest.floors || []).flatMap((f) => f.tables || []);
  // Numaram direct din tableStates (cheie = table_label)
  const occCount = Object.values(tableStates).filter(
    (s) => s === "occupied" || s === "reserved" || s === "paid",
  ).length;
  const freeCount =
    allTables.length > 0
      ? allTables.filter(
          (t) => !tableStates[t.label] || tableStates[t.label] === "free",
        ).length
      : 0;
  const isOwner = user?.role === "owner" || user?.role === "superadmin";

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
      {/* Modal Review-uri */}
      {showReviews && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.75)",
            zIndex: 9999,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            fontFamily: "'Plus Jakarta Sans',sans-serif",
          }}
        >
          <div
            style={{
              background: "#1a1510",
              border: "1px solid #2a2218",
              borderRadius: "24px 24px 0 0",
              width: "100%",
              maxWidth: 480,
              maxHeight: "80vh",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "20px 20px 0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  fontFamily: "'Fraunces',serif",
                  fontSize: 18,
                  fontWeight: 900,
                }}
              >
                Recenzii {selectedRest.name}
              </div>
              <button
                onClick={() => setShowReviews(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#f0ebe3",
                  fontSize: 22,
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>
            {/* Media stele */}
            <div
              style={{
                padding: "10px 20px",
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: 28, fontWeight: 900, color: "#c8a97e" }}>
                {selectedRest.rating
                  ? Number(selectedRest.rating).toFixed(1)
                  : "—"}
              </span>
              <div>
                <div style={{ color: "#c8a97e", fontSize: 16 }}>
                  {"★".repeat(Math.round(selectedRest.rating || 0))}
                  {"☆".repeat(5 - Math.round(selectedRest.rating || 0))}
                </div>
                <div style={{ fontSize: 11, color: "#6b6050" }}>
                  {reviewsLoading ? "..." : reviews.length} recenzii
                </div>
              </div>
            </div>
            {/* Filtre */}
            <div
              style={{
                display: "flex",
                gap: 6,
                padding: "0 20px 10px",
                overflowX: "auto",
                flexShrink: 0,
              }}
            >
              {[0, 5, 4, 3, 2, 1].map((f) => (
                <button
                  key={f}
                  onClick={() => setReviewFilter(f)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 20,
                    border: "1px solid",
                    borderColor: reviewFilter === f ? "#c8a97e" : "#2a2218",
                    background:
                      reviewFilter === f
                        ? "rgba(200,169,126,.15)"
                        : "transparent",
                    color: reviewFilter === f ? "#c8a97e" : "#6b6050",
                    fontSize: 11,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {f === 0 ? "Toate" : `${"★".repeat(f)} ${f}`}
                </button>
              ))}
            </div>
            {/* Lista recenzii */}
            <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 20px" }}>
              {reviewsLoading ? (
                <div
                  style={{ textAlign: "center", color: "#6b6050", padding: 30 }}
                >
                  Se încarcă...
                </div>
              ) : reviews.filter(
                  (r) =>
                    reviewFilter === 0 || Number(r.rating) === reviewFilter,
                ).length === 0 ? (
                <div
                  style={{ textAlign: "center", color: "#6b6050", padding: 30 }}
                >
                  Nicio recenzie.
                </div>
              ) : (
                reviews
                  .filter(
                    (r) =>
                      reviewFilter === 0 || Number(r.rating) === reviewFilter,
                  )
                  .map((r) => (
                    <div
                      key={r.id}
                      style={{
                        background: "#0d0a07",
                        border: "1px solid #2a2218",
                        borderRadius: 12,
                        padding: 14,
                        marginBottom: 8,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: 4,
                        }}
                      >
                        <div style={{ fontWeight: 600, fontSize: 13 }}>
                          {r.reviewer_name || "Client"}
                        </div>
                        <div style={{ color: "#f5c518", fontSize: 12 }}>
                          {"★".repeat(r.rating)}
                          {"☆".repeat(5 - r.rating)}
                        </div>
                      </div>
                      {r.comment && (
                        <div
                          style={{
                            fontSize: 12,
                            color: "#a09070",
                            lineHeight: 1.5,
                          }}
                        >
                          {r.comment}
                        </div>
                      )}
                      <div
                        style={{ fontSize: 10, color: "#6b6050", marginTop: 4 }}
                      >
                        {new Date(r.created_at).toLocaleDateString("ro-RO")}
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}
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
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className={`plan-badge plan-${selectedRest.plan}`}>
                {PLANS[selectedRest.plan]?.label}
              </span>
              {/* ── Buton Favorite ── */}
              <div style={{ position: "relative" }}>
                {particles.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "#c0622f",
                      transform: `translate(-50%, -50%) rotate(${p.angle}deg) translateY(-18px)`,
                      animation: "particleFly 0.6s ease-out forwards",
                      pointerEvents: "none",
                    }}
                  />
                ))}
                <button
                  onClick={toggleFavorite}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    background: isFav
                      ? "rgba(192,98,47,0.2)"
                      : "rgba(13,10,7,0.6)",
                    border: `1px solid ${isFav ? "rgba(192,98,47,0.5)" : "rgba(255,255,255,.15)"}`,
                    color: isFav ? "#c0622f" : "#fff",
                    fontSize: 18,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "background 0.2s, border 0.2s, color 0.2s",
                    animation: heartAnim ? "heartPop 0.5s ease" : "none",
                  }}
                >
                  {isFav ? (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="#c0622f"
                    >
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                  ) : (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
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
              onClick={() => {
                setShowReviews(true);
                loadReviews();
              }}
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "var(--gold)",
                cursor: "pointer",
              }}
            >
              ★ {selectedRest.rating || "—"}{" "}
              {selectedRest.reviews
                ? `(${selectedRest.reviews} recenzii)`
                : "(recenzii)"}
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
            <span style={{ fontSize: 14, color: "#6b6050" }}>›</span>
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

// ─── PROGRAM EDITOR MODAL (exportat pentru Home.jsx) ──────────────────────────
export function ProgramEditorModal({
  restaurants,
  initialRestId,
  initialProgram,
  onClose,
  onSave,
}) {
  const ZILE = [
    "Luni",
    "Marți",
    "Miercuri",
    "Joi",
    "Vineri",
    "Sâmbătă",
    "Duminică",
  ];
  const DEFAULT = Object.fromEntries(
    ZILE.map((z) => [z, { deschis: true, start: "10:00", end: "22:00" }]),
  );

  const [selectedRestId, setSelectedRestId] = useState(
    initialRestId || restaurants[0]?.id || null,
  );
  const [prog, setProg] = useState(initialProgram || DEFAULT);
  const [loading, setLoading] = useState(false);

  // Când schimbă restaurantul, încarcă programul lui
  useEffect(() => {
    if (!selectedRestId) return;
    setLoading(true);
    supabase
      .from("restaurants")
      .select("program")
      .eq("id", selectedRestId)
      .single()
      .then(({ data }) => {
        setProg(data?.program || DEFAULT);
        setLoading(false);
      });
  }, [selectedRestId]);

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
          maxHeight: "90vh",
          overflowY: "auto",
          padding: "24px 20px 40px",
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

        {/* Selector restaurant dacă are mai multe */}
        {restaurants.length > 1 && (
          <div style={{ marginBottom: 16 }}>
            <select
              value={selectedRestId || ""}
              onChange={(e) => setSelectedRestId(e.target.value)}
              style={{
                width: "100%",
                background: "#1e1a14",
                border: "1px solid #2a2218",
                borderRadius: 10,
                color: "#f0ebe3",
                padding: "10px 12px",
                fontSize: 13,
                fontFamily: "inherit",
              }}
            >
              {restaurants.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {loading ? (
          <div
            style={{ textAlign: "center", padding: "20px 0", color: "#6b6050" }}
          >
            Se încarcă...
          </div>
        ) : (
          ZILE.map((zi) => (
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
              {/* Toggle */}
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
                    lang="ro"
                    style={{
                      flex: 1,
                      background: "#1e1a14",
                      border: "1px solid #2a2218",
                      borderRadius: 8,
                      padding: "6px 8px",
                      color: "#f0ebe3",
                      fontFamily: "inherit",
                      fontSize: 12,
                      outline: "none",
                      WebkitAppearance: "none",
                    }}
                  />
                  <span style={{ fontSize: 12, color: "#6b6050" }}>—</span>
                  <input
                    type="time"
                    value={prog[zi]?.end || "22:00"}
                    onChange={(e) => update(zi, "end", e.target.value)}
                    lang="ro"
                    style={{
                      flex: 1,
                      background: "#1e1a14",
                      border: "1px solid #2a2218",
                      borderRadius: 8,
                      padding: "6px 8px",
                      color: "#f0ebe3",
                      fontFamily: "inherit",
                      fontSize: 12,
                      outline: "none",
                      WebkitAppearance: "none",
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
          ))
        )}

        <button
          onClick={() => onSave(selectedRestId, prog)}
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
    </div>
  );
}
