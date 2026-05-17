import { useState, useRef, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { useTable } from "../context/TableContext";
import { TIME_SLOTS, tableClass, PLANS } from "../data/constants";
import { MENUS } from "../data/menu";
import CartBar from "../components/CartBar";
import { supabase } from "../supabase";
// ─── REZERVARE ────────────────────────────────────────────────────────────────
export function Rezervare() {
  const { state, dispatch, navigate, showToast } = useApp();
  const { selectedRest, resForm, reservations, user } = state;
  const [dbFloors, setDbFloors] = useState([]);
  const [reservedTables, setReservedTables] = useState([]);
  const [restProgram, setRestProgram] = useState(null);
  const [lockedTables, setLockedTables] = useState({}); // { tableId: locked_until }
  const [lockCountdown, setLockCountdown] = useState(null); // secunde ramase
  const [myLockedTableId, setMyLockedTableId] = useState(null); // masa pe care am blocat-o eu
  const countdownRef = useRef(null);
  const LOCK_SECONDS = 120; // 2 minute

  // Încarcă programul restaurantului din Supabase
  useEffect(() => {
    if (!selectedRest?.id) return;
    supabase
      .from("restaurants")
      .select("program")
      .eq("id", selectedRest.id)
      .single()
      .then(({ data }) => {
        // Daca are program setat il folosim, altfel setam un obiect gol
        // ca sa nu ramana blocat pe "Se incarca programul..."
        setRestProgram(data?.program || {});
      });
  }, [selectedRest?.id]);

  // ── Incarca mesele locked din Supabase + Realtime ──
  useEffect(() => {
    if (!selectedRest?.id) return;

    const loadLocked = async () => {
      try {
        const { data, error } = await supabase
          .from("tables")
          .select("id, locked_until, locked_by, floors!inner(restaurant_id)")
          .eq("floors.restaurant_id", selectedRest.id)
          .not("locked_until", "is", null);
        if (error || !data) return;
        const map = {};
        data.forEach((t) => {
          if (t.locked_until && new Date(t.locked_until) > new Date()) {
            map[t.id] = t.locked_until;
          }
        });
        setLockedTables(map);
      } catch (e) {
        // Nu blocam UI-ul daca lock-urile nu se pot incarca
        console.warn("Lock tables load error:", e);
      }
    };

    loadLocked();

    // Realtime — propagam lock/unlock instant
    const channel = supabase
      .channel(`tables-lock-${selectedRest.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tables",
        },
        (payload) => {
          const t = payload.new;
          setLockedTables((prev) => {
            const next = { ...prev };
            if (t.locked_until && new Date(t.locked_until) > new Date()) {
              next[t.id] = t.locked_until;
            } else {
              delete next[t.id];
            }
            return next;
          });
        },
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [selectedRest?.id]);

  // ── Functii lock/unlock ──
  const lockTable = async (tableId) => {
    const lockedUntil = new Date(
      Date.now() + LOCK_SECONDS * 1000,
    ).toISOString();
    const sessionId = user?.id || "anon-" + Math.random().toString(36).slice(2);

    // Pornim countdown imediat, indiferent de raspunsul Supabase
    setMyLockedTableId(tableId);
    setLockCountdown(LOCK_SECONDS);
    clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setLockCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          unlockTable(tableId);
          set({ tableId: null });
          showToast("⏱️ Timpul a expirat. Selectează din nou masa.");
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    // Update Supabase in paralel (nu blocam UI-ul)
    supabase
      .from("tables")
      .update({
        locked_until: lockedUntil,
        locked_by: sessionId,
      })
      .eq("id", tableId)
      .then(({ error }) => {
        if (error) console.warn("Lock table error:", error.message);
      });
  };

  const unlockTable = async (tableId) => {
    if (!tableId) return;
    await supabase
      .from("tables")
      .update({
        locked_until: null,
        locked_by: null,
      })
      .eq("id", tableId);
    clearInterval(countdownRef.current);
    setMyLockedTableId(null);
    setLockCountdown(null);
  };

  // Cleanup la unmount
  useEffect(() => {
    return () => {
      if (myLockedTableId) unlockTable(myLockedTableId);
      clearInterval(countdownRef.current);
    };
  }, [myLockedTableId]);

  // Generează orele disponibile bazat pe ziua selectată și program
  const getAvailableSlots = () => {
    if (!resForm.date || restProgram === null) return [];

    const date = new Date(resForm.date);
    const dayIndex = date.getDay(); // 0=Duminică, 1=Luni...
    const ZILE_MAP = [
      "Duminică",
      "Luni",
      "Marți",
      "Miercuri",
      "Joi",
      "Vineri",
      "Sâmbătă",
    ];
    const zi = ZILE_MAP[dayIndex];
    const dayProg = restProgram[zi];

    if (!dayProg || !dayProg.deschis) return [];

    const start = dayProg.start || "10:00";
    const end = dayProg.end || "22:00";

    const [startH, startM] = start.split(":").map(Number);
    const [endH, endM] = end.split(":").map(Number);

    // Ultima rezervare cu 1 oră înainte de închidere
    let lastH = endH - 1;
    let lastM = endM;
    if (lastM < 0) {
      lastH--;
      lastM += 60;
    }

    const slots = [];
    let h = startH;
    let m = startM;

    while (h < lastH || (h === lastH && m <= lastM)) {
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
      h++;
    }

    return slots;
  };

  const isDayClosed = () => {
    if (!resForm.date || !restProgram) return false;
    const date = new Date(resForm.date);
    const dayIndex = date.getDay();
    const ZILE_MAP = [
      "Duminică",
      "Luni",
      "Marți",
      "Miercuri",
      "Joi",
      "Vineri",
      "Sâmbătă",
    ];
    const zi = ZILE_MAP[dayIndex];
    const dayProg = restProgram[zi];
    return !dayProg || !dayProg.deschis;
  };

  // Încarcă rezervările confirmate pentru data+ora selectată
  useEffect(() => {
    if (!selectedRest?.id || !resForm.date || !resForm.time) {
      setReservedTables([]);
      return;
    }
    const loadReserved = async () => {
      const { data } = await supabase
        .from("reservations")
        .select("table_label")
        .eq("restaurant_id", selectedRest.id)
        .eq("date", resForm.date)
        .eq("time", resForm.time)
        .eq("status", "confirmed");
      if (data)
        setReservedTables(data.map((r) => r.table_label).filter(Boolean));
    };
    loadReserved();
  }, [selectedRest?.id, resForm.date, resForm.time]);

  // Încarcă floors + tables din Supabase
  useEffect(() => {
    if (!selectedRest?.id) return;
    const load = async () => {
      const { data: floorsData } = await supabase
        .from("floors")
        .select("*")
        .eq("restaurant_id", selectedRest.id)
        .order("floor_order");
      if (!floorsData || floorsData.length === 0) return;
      const floorsWithTables = await Promise.all(
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
      setDbFloors(floorsWithTables);
    };
    load();
  }, [selectedRest?.id]);

  if (!selectedRest) {
    navigate("home");
    return null;
  }
  const floors = dbFloors.length > 0 ? dbFloors : selectedRest.floors || [];
  const rsvp = reservations[selectedRest.id] || {};
  const taken = resForm.time ? rsvp[resForm.time] || [] : [];
  const floor = floors[resForm.floorIdx] || floors[0];
  const set = (patch) => dispatch({ type: "RES_FORM", payload: patch });

  const handleReserve = async () => {
    // Găsim label-ul mesei din ID
    const selectedTable = (floor?.tables || []).find(
      (t) => t.id === resForm.tableId,
    );
    try {
      await supabase.from("reservations").insert({
        user_id: user?.id || null,
        restaurant_id: selectedRest.id,
        customer_name: user?.name || "Client",
        date: resForm.date || new Date().toISOString().split("T")[0],
        time: resForm.time || "",
        persons: resForm.persons || 1,
        table_label: selectedTable?.label || resForm.tableId || null,
        observations: resForm.observations || null,
        status: "pending",
      });
    } catch (err) {
      // Continuăm chiar dacă Supabase pică
    }
    dispatch({
      type: "RES_CONFIRM",
      payload: {
        restId: selectedRest.id,
        slot: resForm.time,
        tableId: resForm.tableId,
      },
    });
    // Unlock masa dupa finalizare rezervare
    await unlockTable(myLockedTableId);
    showToast("📅 Rezervare trimisă! Ospătarul va confirma în scurt timp.");
  };

  if (resForm.done)
    return (
      <div className="page fade-in">
        <div style={{ padding: "60px 20px" }}>
          <div
            style={{
              background: "linear-gradient(135deg,#1a2010,#243020)",
              border: "1px solid rgba(200,169,126,.3)",
              borderRadius: 24,
              padding: "32px 24px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 56, marginBottom: 14 }}>⏳</div>
            <div
              style={{
                fontFamily: "'Fraunces',serif",
                fontSize: 24,
                fontWeight: 900,
                marginBottom: 10,
              }}
            >
              Rezervare trimisă!
            </div>
            <div
              style={{
                fontSize: 14,
                lineHeight: 1.8,
                color: "rgba(240,235,227,.75)",
                marginBottom: 16,
              }}
            >
              {selectedRest.emoji} {selectedRest.name}
              <br />
              📅 {resForm.date} • 🕐 {resForm.time}
              <br />
              {floor?.name}
              <br />
              👥 {resForm.persons} persoane
            </div>
            <button
              className="btn-primary"
              onClick={() => dispatch({ type: "RES_RESET" })}
            >
              Altă rezervare
            </button>
          </div>
        </div>
      </div>
    );

  return (
    <div className="page fade-in">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "20px 20px 0",
        }}
      >
        <button
          onClick={() => navigate("restaurant")}
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            background: "var(--card2)",
            border: "1px solid var(--border)",
            color: "var(--cream)",
            fontSize: 17,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ←
        </button>
        <span
          style={{
            fontFamily: "'Fraunces',serif",
            fontSize: 20,
            fontWeight: 700,
          }}
        >
          Rezervare — {selectedRest.name}
        </span>
      </div>
      <div className="inner" style={{ paddingBottom: 120 }}>
        <div className="form-group">
          <label className="form-label">Data</label>
          <input
            className="form-input"
            type="date"
            value={resForm.date}
            min={new Date().toISOString().split("T")[0]}
            onChange={(e) => set({ date: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Număr persoane</label>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => set({ persons: Math.max(1, resForm.persons - 1) })}
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "var(--card2)",
                border: "1px solid var(--border)",
                color: "var(--cream)",
                fontSize: 18,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              −
            </button>
            <div
              style={{
                flex: 1,
                background: "var(--card2)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "'Fraunces',serif",
                fontSize: 20,
                fontWeight: 700,
              }}
            >
              {resForm.persons} pers.
            </div>
            <button
              onClick={() =>
                set({ persons: Math.min(20, resForm.persons + 1) })
              }
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "var(--card2)",
                border: "1px solid var(--border)",
                color: "var(--cream)",
                fontSize: 18,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              +
            </button>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Interval orar</label>
          {!resForm.date ? (
            <div
              style={{
                fontSize: 13,
                color: "var(--muted)",
                fontStyle: "italic",
                padding: "8px 0",
              }}
            >
              Selectează mai întâi o dată
            </div>
          ) : isDayClosed() ? (
            <div
              style={{
                background: "rgba(192,57,43,.1)",
                border: "1px solid rgba(192,57,43,.2)",
                borderRadius: 12,
                padding: "14px 16px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 20, marginBottom: 6 }}>🚫</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#e05050" }}>
                Restaurant închis
              </div>
              <div
                style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}
              >
                Restaurantul nu funcționează în această zi. Alege altă dată.
              </div>
            </div>
          ) : getAvailableSlots().length === 0 ? (
            <div
              style={{
                fontSize: 13,
                color: "var(--muted)",
                fontStyle: "italic",
                padding: "8px 0",
              }}
            >
              {restProgram
                ? "Nicio oră disponibilă pentru această zi."
                : "Se încarcă programul..."}
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3,1fr)",
                gap: 8,
              }}
            >
              {getAvailableSlots().map((t) => (
                <div
                  key={t}
                  onClick={() => set({ time: t, tableId: null })}
                  style={{
                    background:
                      resForm.time === t ? "var(--terra)" : "var(--card2)",
                    border: `1px solid ${resForm.time === t ? "var(--terra)" : "var(--border)"}`,
                    borderRadius: 12,
                    padding: "11px 4px",
                    textAlign: "center",
                    fontSize: 13,
                    cursor: "pointer",
                    color: resForm.time === t ? "#fff" : "var(--muted)",
                    fontWeight: resForm.time === t ? 700 : 400,
                  }}
                >
                  {t}
                </div>
              ))}
            </div>
          )}
        </div>
        {resForm.time && (
          <div className="form-group">
            <label className="form-label">Etaj / Zonă</label>
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                marginBottom: 12,
              }}
            >
              {floors.map((fl, i) => (
                <button
                  key={fl.id}
                  onClick={() => set({ floorIdx: i, tableId: null })}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 20,
                    background:
                      resForm.floorIdx === i ? "var(--terra)" : "var(--card2)",
                    border: `1px solid ${resForm.floorIdx === i ? "var(--terra)" : "var(--border)"}`,
                    color: resForm.floorIdx === i ? "#fff" : "var(--muted)",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  {fl.name}
                </button>
              ))}
            </div>
            <label className="form-label">Selectează masa</label>
            {(() => {
              const allTables = floor?.tables || [];
              const allElements = floor?.elements || [];
              const allItems = [
                ...allTables.map((t) => ({ x: t.x + 80, y: t.y + 80 })),
                ...allElements.map((e) => ({
                  x: e.x + (e.w || 60),
                  y: e.y + (e.h || 60),
                })),
              ];
              const maxX = Math.max(300, ...allItems.map((i) => i.x));
              const maxY = Math.max(200, ...allItems.map((i) => i.y));
              const containerW = 340;
              const containerH = 320;
              const autoZoom =
                Math.min(containerW / maxX, containerH / maxY, 1) * 0.92;
              return (
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    height: containerH,
                    background: "#0d0a07",
                    borderRadius: 16,
                    border: "1px solid #2a2218",
                    overflow: "hidden",
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      fontSize: 9,
                      top: 6,
                      left: 8,
                      color: "#6b6050",
                      letterSpacing: 1,
                      textTransform: "uppercase",
                    }}
                  >
                    {floor?.name}
                  </div>
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      transform: `scale(${autoZoom})`,
                      transformOrigin: "top left",
                      width: maxX / autoZoom,
                      height: maxY / autoZoom,
                    }}
                  >
                    {/* Elemente decorative */}
                    {allElements.map((el) => (
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
                    {allTables.map((t) => {
                      const isTaken = reservedTables.includes(t.label);
                      const isSel = resForm.tableId === t.id;
                      const isLocked =
                        !isSel &&
                        lockedTables[t.id] &&
                        new Date(lockedTables[t.id]) > new Date();
                      const isDisabled = isTaken || isLocked;
                      const w = t.seats <= 2 ? 52 : t.seats <= 4 ? 64 : 80;
                      return (
                        <div
                          key={t.id}
                          onClick={async () => {
                            if (isDisabled) return;
                            // Daca aveam alta masa locked, o eliberam
                            if (myLockedTableId && myLockedTableId !== t.id) {
                              await unlockTable(myLockedTableId);
                            }
                            set({ tableId: t.id });
                            await lockTable(t.id);
                          }}
                          style={{
                            position: "absolute",
                            left: t.x,
                            top: t.y,
                            width: w,
                            height: w * 0.85,
                            borderRadius: 12,
                            background: isSel
                              ? "rgba(192,98,47,.35)"
                              : isTaken
                                ? "rgba(192,57,43,.15)"
                                : isLocked
                                  ? "rgba(160,120,90,.15)"
                                  : "rgba(74,110,74,.15)",
                            border: `2px solid ${isSel ? "#c0622f" : isTaken ? "#e05050" : isLocked ? "#a0785a" : "#4a6e4a"}`,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: isDisabled ? "not-allowed" : "pointer",
                            gap: 1,
                          }}
                        >
                          <span style={{ fontSize: 14 }}>🪑</span>
                          <span
                            style={{
                              fontFamily: "'Fraunces',serif",
                              fontSize: 12,
                              fontWeight: 700,
                              color: isSel
                                ? "#c0622f"
                                : isTaken
                                  ? "#e05050"
                                  : "#4a6e4a",
                            }}
                          >
                            {t.label}
                          </span>
                          <span style={{ fontSize: 9, color: "#6b6050" }}>
                            {t.seats}p
                          </span>
                          {isLocked && (
                            <span
                              style={{
                                fontSize: 8,
                                color: "#a0785a",
                                marginTop: 1,
                              }}
                            >
                              🔒
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
        {/* Countdown lock */}
        {lockCountdown !== null && resForm.tableId && (
          <div
            style={{
              background: "rgba(160,120,90,.15)",
              border: "1px solid #a0785a",
              borderRadius: 12,
              padding: "10px 16px",
              marginBottom: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 13, color: "#a0785a" }}>
              🔒 Masa rezervată pentru tine
            </span>
            <span
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: lockCountdown <= 30 ? "#e05050" : "#a0785a",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {Math.floor(lockCountdown / 60)}:
              {String(lockCountdown % 60).padStart(2, "0")}
            </span>
          </div>
        )}
        <button
          className="btn-primary"
          disabled={!resForm.date || !resForm.time || !resForm.tableId}
          onClick={handleReserve}
          style={{ marginBottom: 20 }}
        >
          Trimite rezervarea
          {(!resForm.date || !resForm.time || !resForm.tableId) && (
            <span style={{ fontSize: 10, display: "block", opacity: 0.7 }}>
              {!resForm.date
                ? "• Alege data"
                : !resForm.time
                  ? "• Alege ora"
                  : "• Alege masa"}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── MENIU ────────────────────────────────────────────────────────────────────
export function Meniu() {
  const { state, dispatch, navigate, showToast } = useApp();
  const { reload: reloadTables } = useTable();
  const {
    selectedRest,
    cart,
    orderTableNum,
    tableSessionId,
    activeMenuCat,
    showPayment,
    paid,
    payMethod,
    orders,
    user,
  } = state;

  const [dbCategories, setDbCategories] = useState([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [activeOrder, setActiveOrder] = useState(null);
  const [showPayNote, setShowPayNote] = useState(false);
  const [waiterCalled, setWaiterCalled] = useState(false);
  const [waiterCooldown, setWaiterCooldown] = useState(0);
  const waiterTimerRef = useRef(null);
  const [showReview, setShowReview] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSent, setReviewSent] = useState(false);
  const [payNoteLoading, setPayNoteLoading] = useState(false);

  useEffect(() => {
    if (!selectedRest?.id) return;
    const loadMenu = async () => {
      setMenuLoading(true);
      try {
        const { data: cats, error: catsError } = await supabase
          .from("menu_categories")
          .select("*")
          .eq("restaurant_id", selectedRest.id)
          .order("category_order");
        if (!cats || cats.length === 0) {
          setDbCategories([]);
          setMenuLoading(false);
          return;
        }
        const catsWithItems = await Promise.all(
          cats.map(async (cat) => {
            const { data: items } = await supabase
              .from("menu_items")
              .select("*")
              .eq("category_id", cat.id)
              .eq("is_available", true)
              .order("item_order");
            return { ...cat, items: items || [] };
          }),
        );
        setDbCategories(catsWithItems);
        if (catsWithItems.length > 0) {
          dispatch({ type: "SET_MENU_CAT", payload: catsWithItems[0].id });
        }
      } catch (err) {}
      setMenuLoading(false);
    };
    loadMenu();
  }, [selectedRest?.id]);

  // Urmărește comanda activă a clientului în timp real
  useEffect(() => {
    if (!user?.id || !selectedRest?.id) return;
    const loadActiveOrder = async () => {
      // Filtrăm strict după tableSessionId - doar comenzile sesiunii curente
      let query = supabase
        .from("orders")
        .select("*")
        .eq("user_id", user.id)
        .eq("restaurant_id", selectedRest.id)
        .in("status", ["pending", "cooking", "ready", "paying"])
        .order("created_at", { ascending: false });

      if (tableSessionId) {
        query = query.eq("table_session_id", tableSessionId);
      }

      const { data } = await query;

      if (data && data.length > 0) {
        const statusPriority = { paying: 4, ready: 3, cooking: 2, pending: 1 };
        const latestOrder = data.reduce(
          (best, o) =>
            (statusPriority[o.status] || 0) > (statusPriority[best.status] || 0)
              ? o
              : best,
          data[0],
        );
        setActiveOrder(latestOrder);
      } else {
        // Comanda a disparut (ospatar a confirmat plata) -> resetam sesiunea
        setActiveOrder((prev) => {
          if (prev?.status === "paying") {
            // Plata confirmata - dispatch in setTimeout ca sa avem acces la prev
            const method = prev.payment_method;
            const restId = selectedRest?.id || null;
            const sessId = tableSessionId || null;
            setTimeout(() => {
              dispatch({
                type: "SET_PAID",
                payload: {
                  paid: true,
                  method,
                  restaurantId: restId,
                  sessionId: sessId,
                },
              });
              dispatch({ type: "RESET_TABLE_SESSION" });
            }, 0);
          }
          return null;
        });
      }
    };
    loadActiveOrder();

    // Polling la fiecare 5 secunde
    const interval = setInterval(loadActiveOrder, 5000);
    return () => clearInterval(interval);
  }, [user?.id, selectedRest?.id, tableSessionId]);

  const callWaiter = async () => {
    if (!activeOrder || waiterCooldown > 0) return;
    try {
      await supabase.from("notifications").insert({
        restaurant_id: activeOrder.restaurant_id,
        type: "waiter_call",
        message: `🔔 Masa ${activeOrder.table_label} cheamă ospătarul`,
        is_read: false,
      });
      setWaiterCalled(true);
      setWaiterCooldown(300);
      if (waiterTimerRef.current) clearInterval(waiterTimerRef.current);
      waiterTimerRef.current = setInterval(() => {
        setWaiterCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(waiterTimerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (e) {}
  };

  const requestBill = async (method) => {
    if (!activeOrder) return;
    setPayNoteLoading(true);
    try {
      // Actualizează TOATE comenzile sesiunii curente la "paying"
      // Folosim table_session_id dacă există, altfel table_label
      let orderQuery = supabase
        .from("orders")
        .update({ status: "paying", payment_method: method })
        .eq("restaurant_id", selectedRest.id)
        .in("status", ["pending", "cooking", "ready"]);
      if (tableSessionId) {
        orderQuery = orderQuery.eq("table_session_id", tableSessionId);
      } else {
        orderQuery = orderQuery.eq("table_label", activeOrder.table_label);
      }
      const { error } = await orderQuery;
      if (error) throw error;

      // Actualizează statusul mesei la "paid" (albastru) — după table_session_id
      if (tableSessionId && selectedRest?.id) {
        await supabase
          .from("table_sessions")
          .update({ status: "paid", paid_at: new Date().toISOString() })
          .eq("restaurant_id", selectedRest.id)
          .eq("table_session_id", tableSessionId)
          .eq("status", "occupied");
      }

      setActiveOrder((prev) => ({
        ...prev,
        status: "paying",
        payment_method: method,
      }));
      setShowPayNote(false);
      reloadTables(); // Reîncarcă statusurile meselor
      showToast("🧾 Nota cerută! Ospătarul vine în curând.");
    } catch (err) {
      showToast("❌ Eroare. Încearcă din nou.");
    }
    setPayNoteLoading(false);
  };

  if (!selectedRest) {
    navigate("home");
    return null;
  }

  const activeCatObj =
    dbCategories.find((c) => c.id === activeMenuCat) || dbCategories[0];
  const cartQty = (id) => cart.find((i) => i.id === id)?.qty || 0;
  const hasTable = orderTableNum && orderTableNum !== 1;

  const [orderLoading, setOrderLoading] = useState(false);
  const [menuSearch, setMenuSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const searchInputRef = useRef(null);

  const allMenuItems = dbCategories.flatMap((cat) =>
    (cat.items || []).map((item) => ({
      ...item,
      catName: cat.name,
      catEmoji: cat.emoji,
    })),
  );
  const searchResults =
    menuSearch.trim().length > 0
      ? allMenuItems.filter(
          (item) =>
            item.name.toLowerCase().includes(menuSearch.toLowerCase()) ||
            (item.description || "")
              .toLowerCase()
              .includes(menuSearch.toLowerCase()),
        )
      : [];

  const placeOrder = async (observations = "") => {
    if (!cart.length) return;
    if (!hasTable) {
      showToast("⚠️ Selectează mai întâi masa!");
      navigate("selectTable");
      return;
    }
    if (orderLoading) return;
    setOrderLoading(true);

    const newTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);

    try {
      // Dacă există comandă activă pe aceeași sesiune — adaugăm produsele la ea
      if (activeOrder?.id && tableSessionId) {
        const existingItems = (activeOrder.items || []).map((i) => ({
          ...i,
          is_new: false,
        }));
        const isConfirmed = ["cooking", "ready"].includes(activeOrder.status);
        // Produsele noi apar DISTINCT cu is_new: true - ospatarul vede clar ce e nou
        const newItems = cart.map((i) => ({ ...i, is_new: isConfirmed }));
        const mergedItems = [...existingItems, ...newItems];
        const mergedTotal = Number(activeOrder.total || 0) + newTotal;
        const updatePayload = {
          items: mergedItems,
          total: mergedTotal,
          observations: observations || activeOrder.observations || null,
        };
        if (isConfirmed) updatePayload.has_new_items = true;
        const { error } = await supabase
          .from("orders")
          .update(updatePayload)
          .eq("id", activeOrder.id);
        if (error) throw error;
        dispatch({ type: "CART_CLEAR" });
        showToast(
          isConfirmed ? "🆕 Produse noi trimise!" : "✅ Produse adaugate!",
        );
      } else {
        // Prima comandă a sesiunii — INSERT
        const { data, error } = await supabase
          .from("orders")
          .insert({
            restaurant_id: selectedRest.id,
            user_id: user?.id || null,
            table_label: orderTableNum,
            table_session_id: tableSessionId || null,
            items: cart,
            observations: observations || null,
            status: "pending",
            total: newTotal,
            payment_method: null,
          })
          .select()
          .single();
        if (error) throw error;
        dispatch({ type: "CART_CLEAR" });
        showToast("✅ Comanda trimisă!");
      }
    } catch (err) {
      showToast("❌ Eroare la trimiterea comenzii. Încearcă din nou.");
    } finally {
      setOrderLoading(false);
    }
  };

  if (paid) {
    navigate("home");
    return null;
  }

  if (showPayment) {
    const pastOrders = orders.filter(
      (o) => o.table === orderTableNum || o.tableLabel === orderTableNum,
    );
    const allItems = pastOrders
      .flatMap((o) => o.items)
      .reduce((acc, item) => {
        const ex = acc.find((i) => i.id === item.id);
        if (ex) ex.qty += item.qty;
        else acc.push({ ...item });
        return acc;
      }, []);
    const total = allItems.reduce((s, i) => s + i.price * i.qty, 0);
    return (
      <div className="page fade-in">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "20px 20px 0",
          }}
        >
          <button
            onClick={() => dispatch({ type: "SET_PAYMENT", payload: false })}
            style={{
              background: "none",
              border: "none",
              color: "var(--muted)",
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            ← Înapoi la meniu
          </button>
        </div>
        <div className="inner">
          <div
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 20,
              padding: 20,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                fontFamily: "'Fraunces',serif",
                fontSize: 18,
                marginBottom: 14,
                paddingBottom: 12,
                borderBottom: "1px solid var(--border)",
              }}
            >
              🧾 Nota de plată — Masa {orderTableNum}
            </div>
            {allItems.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 14,
                  marginBottom: 8,
                  color: "var(--muted)",
                }}
              >
                <span>
                  {item.emoji} {item.name} ×{item.qty}
                </span>
                <span>{item.price * item.qty} lei</span>
              </div>
            ))}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 17,
                fontWeight: 700,
                borderTop: "1px solid var(--border)",
                marginTop: 10,
                paddingTop: 10,
              }}
            >
              <span>Total</span>
              <span>{total} lei</span>
            </div>
          </div>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            {[
              { method: "cash", icon: "💵", label: "Cash" },
              { method: "card", icon: "💳", label: "Card" },
            ].map((p) => (
              <button
                key={p.method}
                onClick={() =>
                  dispatch({
                    type: "SET_PAID",
                    payload: {
                      paid: true,
                      method: p.method,
                      restaurantId: selectedRest?.id || null,
                      sessionId: tableSessionId || null,
                    },
                  })
                }
                style={{
                  padding: "20px 14px",
                  borderRadius: 18,
                  border: "2px solid var(--border)",
                  background: "var(--card)",
                  color: "var(--cream)",
                  fontFamily: "'Fraunces',serif",
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: "pointer",
                  textAlign: "center",
                }}
              >
                <span
                  style={{ fontSize: 28, display: "block", marginBottom: 6 }}
                >
                  {p.icon}
                </span>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page fade-in">
      <div
        style={{ padding: "44px 20px 20px", background: selectedRest.cover }}
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
            onClick={() => navigate("restaurant")}
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
          {hasTable ? (
            <div
              style={{
                background: "rgba(255,255,255,.1)",
                padding: "7px 16px",
                borderRadius: 50,
                fontSize: 13,
                color: "#fff",
              }}
            >
              🪑 Masa <strong>{orderTableNum}</strong>
            </div>
          ) : (
            <button
              onClick={() => navigate("selectTable")}
              style={{
                background: "rgba(192,98,47,.3)",
                border: "1px solid rgba(192,98,47,.5)",
                padding: "7px 14px",
                borderRadius: 50,
                fontSize: 12,
                color: "#fff",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              ⚠️ Selectează masa
            </button>
          )}
        </div>
        <div
          style={{
            fontFamily: "'Fraunces',serif",
            fontSize: 26,
            fontWeight: 900,
          }}
        >
          {selectedRest.emoji} {selectedRest.name}
        </div>
      </div>
      <div
        className="inner"
        style={{ paddingBottom: cart.length > 0 ? 160 : 90 }}
      >
        {/* ── Status Bar Comandă Activă ── */}
        {activeOrder && (
          <div
            style={{
              background:
                activeOrder.status === "paying"
                  ? "rgba(91,141,217,.1)"
                  : activeOrder.status === "ready"
                    ? "rgba(107,158,107,.1)"
                    : activeOrder.status === "cooking"
                      ? "rgba(224,122,71,.1)"
                      : "rgba(200,169,126,.1)",
              border: `1px solid ${
                activeOrder.status === "paying"
                  ? "rgba(91,141,217,.4)"
                  : activeOrder.status === "ready"
                    ? "rgba(107,158,107,.4)"
                    : activeOrder.status === "cooking"
                      ? "rgba(224,122,71,.4)"
                      : "rgba(200,169,126,.4)"
              }`,
              borderRadius: 16,
              padding: "14px 16px",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700 }}>
                {activeOrder.status === "pending" &&
                  "⏳ Comanda ta a fost trimisă"}
                {activeOrder.status === "cooking" && "👨‍🍳 Comanda ta se prepară"}
                {activeOrder.status === "ready" &&
                  "✅ Comanda e gata! Ospătarul vine"}
                {activeOrder.status === "paying" &&
                  "🧾 Nota cerută — ospătarul vine"}
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  padding: "3px 8px",
                  borderRadius: 10,
                  background:
                    activeOrder.status === "paying"
                      ? "rgba(91,141,217,.2)"
                      : activeOrder.status === "ready"
                        ? "rgba(107,158,107,.2)"
                        : activeOrder.status === "cooking"
                          ? "rgba(224,122,71,.2)"
                          : "rgba(200,169,126,.2)",
                  color:
                    activeOrder.status === "paying"
                      ? "#5b8dd9"
                      : activeOrder.status === "ready"
                        ? "#6b9e6b"
                        : activeOrder.status === "cooking"
                          ? "#e07a47"
                          : "#c8a97e",
                }}
              >
                Masa {activeOrder.table_label}
              </span>
            </div>
            {/* Pași status */}
            <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
              {[
                { s: "pending", label: "Trimisă" },
                { s: "cooking", label: "Preparare" },
                { s: "ready", label: "Gata" },
                { s: "paying", label: "Plată" },
              ].map((step, idx) => {
                const statuses = ["pending", "cooking", "ready", "paying"];
                const currentIdx = statuses.indexOf(activeOrder.status);
                const stepIdx = statuses.indexOf(step.s);
                const isDone = stepIdx <= currentIdx;
                return (
                  <div key={step.s} style={{ flex: 1 }}>
                    <div
                      style={{
                        height: 4,
                        borderRadius: 4,
                        background: isDone ? "#c0622f" : "rgba(255,255,255,.1)",
                        marginBottom: 4,
                      }}
                    />
                    <div
                      style={{
                        fontSize: 9,
                        color: isDone ? "#c0622f" : "#6b6050",
                        textAlign: "center",
                      }}
                    >
                      {step.label}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Buton Cheamă ospătarul */}
            {activeOrder.status !== "pending" &&
              activeOrder.status !== "paying" && (
                <div style={{ marginBottom: 8 }}>
                  {waiterCalled && waiterCooldown > 0 ? (
                    <div
                      style={{
                        background: "rgba(200,169,126,.08)",
                        border: "1px solid rgba(200,169,126,.2)",
                        borderRadius: 12,
                        padding: "10px 14px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <span style={{ fontSize: 13, color: "#c8a97e" }}>
                        🔔 Ospătarul a fost chemat
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          color: "#6b6050",
                          fontWeight: 600,
                        }}
                      >
                        {Math.floor(waiterCooldown / 60)}:
                        {String(waiterCooldown % 60).padStart(2, "0")}
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={callWaiter}
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: 12,
                        background: "rgba(200,169,126,.1)",
                        border: "1px solid rgba(200,169,126,.3)",
                        color: "#c8a97e",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      🔔 Cheamă ospătarul
                    </button>
                  )}
                </div>
              )}
            {/* Buton Cere Nota - doar cand e ready si nu are produse noi neconfirmate */}
            {activeOrder.status === "ready" && !activeOrder.has_new_items && (
              <button
                onClick={() => setShowPayNote(true)}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: 14,
                  background: "linear-gradient(135deg,#c0622f,#8b3a18)",
                  border: "none",
                  color: "#fff",
                  fontFamily: "'Fraunces',serif",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                🧾 Cere nota de plată
              </button>
            )}
            {/* Mesaj cand are produse noi neconfirmate */}
            {activeOrder.has_new_items && (
              <div
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: 14,
                  background: "#1e1a14",
                  border: "1px solid #c8a97e44",
                  color: "#c8a97e",
                  fontFamily: "'Fraunces',serif",
                  fontSize: 13,
                  fontWeight: 600,
                  textAlign: "center",
                }}
              >
                🆕 Produse noi in asteptare...
              </div>
            )}
            {activeOrder.status === "paying" && (
              <div
                style={{
                  fontSize: 12,
                  color: "var(--muted)",
                  textAlign: "center",
                }}
              >
                Ai ales:{" "}
                {activeOrder.payment_method === "cash" ? "💵 Cash" : "💳 Card"}
              </div>
            )}
          </div>
        )}

        {/* ── Modal Cere Nota ── */}
        {showPayNote && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,.7)",
              zIndex: 100,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
            }}
            onClick={() => setShowPayNote(false)}
          >
            <div
              style={{
                background: "#161210",
                borderRadius: 20,
                border: "1px solid #2a2218",
                width: "100%",
                maxWidth: 390,
                padding: "24px 20px 28px",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  fontFamily: "'Fraunces',serif",
                  fontSize: 20,
                  fontWeight: 900,
                  marginBottom: 6,
                }}
              >
                🧾 Nota de plată
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--muted)",
                  marginBottom: 20,
                }}
              >
                Masa {activeOrder?.table_label} • Total: {activeOrder?.total}{" "}
                lei
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>
                Cum dorești să plătești?
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                {[
                  { method: "cash", icon: "💵", label: "Cash" },
                  { method: "card", icon: "💳", label: "Card" },
                ].map((p) => (
                  <button
                    key={p.method}
                    onClick={() => !payNoteLoading && requestBill(p.method)}
                    style={{
                      padding: "20px 14px",
                      borderRadius: 16,
                      border: "2px solid #2a2218",
                      background: "#1e1a14",
                      color: "#f0ebe3",
                      fontFamily: "'Fraunces',serif",
                      fontSize: 16,
                      fontWeight: 700,
                      cursor: "pointer",
                      textAlign: "center",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 28,
                        display: "block",
                        marginBottom: 6,
                      }}
                    >
                      {p.icon}
                    </span>
                    {p.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowPayNote(false)}
                style={{
                  marginTop: 16,
                  width: "100%",
                  padding: 10,
                  background: "none",
                  border: "none",
                  color: "var(--muted)",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                Anulează
              </button>
            </div>
          </div>
        )}

        {/* Loading */}
        {menuLoading ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px 0",
              color: "var(--muted)",
              fontSize: 13,
            }}
          >
            Se încarcă meniul...
          </div>
        ) : dbCategories.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🍽️</div>
            <div style={{ fontSize: 14, color: "var(--muted)" }}>
              Meniul nu este disponibil momentan.
            </div>
          </div>
        ) : (
          <>
            {/* Search bar */}
            <div style={{ position: "relative", marginBottom: 14 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: "var(--card2)",
                  border: `1px solid ${searchFocused ? "var(--terra)" : "var(--border)"}`,
                  borderRadius: 50,
                  padding: "10px 16px",
                  transition: "border-color .2s",
                }}
              >
                {searchFocused || menuSearch ? (
                  <button
                    onClick={() => {
                      setMenuSearch("");
                      setSearchFocused(false);
                      searchInputRef.current?.blur();
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--terra)",
                      fontSize: 18,
                      padding: 0,
                      display: "flex",
                      alignItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    ←
                  </button>
                ) : (
                  <span
                    style={{
                      color: "var(--muted)",
                      fontSize: 15,
                      flexShrink: 0,
                    }}
                  >
                    🔍
                  </span>
                )}
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Caută în meniu..."
                  value={menuSearch}
                  onChange={(e) => setMenuSearch(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => {
                    if (!menuSearch) setSearchFocused(false);
                  }}
                  maxLength={60}
                  style={{
                    flex: 1,
                    background: "none",
                    border: "none",
                    outline: "none",
                    color: "var(--cream)",
                    fontSize: 14,
                    fontFamily: "inherit",
                  }}
                />
                {menuSearch.length > 0 && (
                  <button
                    onClick={() => setMenuSearch("")}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--muted)",
                      fontSize: 16,
                      padding: 0,
                      display: "flex",
                      alignItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Sugestii search */}
              {searchResults.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 6px)",
                    left: 0,
                    right: 0,
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 16,
                    zIndex: 50,
                    overflow: "hidden",
                    boxShadow: "0 8px 24px rgba(0,0,0,.3)",
                  }}
                >
                  {searchResults.slice(0, 6).map((item) => {
                    const qty = cartQty(item.id);
                    return (
                      <div
                        key={item.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "12px 16px",
                          borderBottom: "1px solid var(--border)",
                          cursor: "pointer",
                        }}
                        onClick={() => {
                          const cat = dbCategories.find(
                            (c) => c.id === item.category_id,
                          );
                          if (cat)
                            dispatch({ type: "SET_MENU_CAT", payload: cat.id });
                          setMenuSearch("");
                          setSearchFocused(false);
                          searchInputRef.current?.blur();
                        }}
                      >
                        <span style={{ fontSize: 22 }}>
                          {item.emoji || "🍽️"}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: "var(--cream)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {item.name}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--muted)" }}>
                            {item.catEmoji} {item.catName} ·{" "}
                            {Number(item.price).toFixed(2)} lei
                          </div>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          {qty > 0 && (
                            <span
                              style={{
                                background: "var(--terra)",
                                color: "#fff",
                                borderRadius: 20,
                                padding: "2px 8px",
                                fontSize: 11,
                                fontWeight: 700,
                              }}
                            >
                              ×{qty}
                            </span>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              dispatch({
                                type: "CART_ADD",
                                payload: {
                                  id: item.id,
                                  name: item.name,
                                  price: item.price,
                                  emoji: item.emoji,
                                },
                              });
                            }}
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: 10,
                              background: "var(--terra)",
                              border: "none",
                              color: "#fff",
                              fontSize: 18,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {searchResults.length > 6 && (
                    <div
                      style={{
                        padding: "10px 16px",
                        fontSize: 12,
                        color: "var(--muted)",
                        textAlign: "center",
                      }}
                    >
                      + {searchResults.length - 6} rezultate — scrie mai
                      specific
                    </div>
                  )}
                </div>
              )}

              {/* Niciun rezultat */}
              {menuSearch.trim().length > 0 && searchResults.length === 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 6px)",
                    left: 0,
                    right: 0,
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 16,
                    padding: "16px",
                    textAlign: "center",
                    boxShadow: "0 8px 24px rgba(0,0,0,.3)",
                  }}
                >
                  <div style={{ fontSize: 24, marginBottom: 6 }}>🔍</div>
                  <div style={{ fontSize: 13, color: "var(--muted)" }}>
                    Niciun produs găsit pentru „{menuSearch}"
                  </div>
                </div>
              )}
            </div>

            {/* Tabs categorii */}
            <div
              style={{
                display: "flex",
                gap: 8,
                overflowX: "auto",
                margin: "0 -20px 16px",
                paddingLeft: 20,
                paddingRight: 20,
                scrollbarWidth: "none",
              }}
            >
              {dbCategories.map((cat) => (
                <div
                  key={cat.id}
                  onClick={() =>
                    dispatch({ type: "SET_MENU_CAT", payload: cat.id })
                  }
                  style={{
                    padding: "8px 16px",
                    borderRadius: 20,
                    whiteSpace: "nowrap",
                    background:
                      activeCatObj?.id === cat.id
                        ? "var(--terra)"
                        : "var(--card2)",
                    border: `1px solid ${activeCatObj?.id === cat.id ? "var(--terra)" : "var(--border)"}`,
                    fontSize: 13,
                    cursor: "pointer",
                    flexShrink: 0,
                    color:
                      activeCatObj?.id === cat.id ? "#fff" : "var(--muted)",
                    fontWeight: activeCatObj?.id === cat.id ? 600 : 400,
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <span>{cat.emoji}</span>
                  <span>{cat.name}</span>
                </div>
              ))}
            </div>

            {/* Produse */}
            {(activeCatObj?.items || []).map((item) => {
              const qty = cartQty(item.id);
              return (
                <div
                  key={item.id}
                  style={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 18,
                    padding: 14,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    marginBottom: 10,
                  }}
                >
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      background: "var(--card2)",
                      borderRadius: 13,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 24,
                      flexShrink: 0,
                    }}
                  >
                    {item.emoji}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}
                    >
                      {item.name}
                      {item.is_vegetarian && (
                        <span
                          style={{
                            fontSize: 9,
                            padding: "2px 6px",
                            borderRadius: 8,
                            background: "rgba(74,110,74,.2)",
                            color: "#6b9e6b",
                            marginLeft: 6,
                          }}
                        >
                          🌿 Veg
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--muted)",
                          lineHeight: 1.4,
                          marginBottom: 6,
                        }}
                      >
                        {item.description}
                      </div>
                    )}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div
                        style={{
                          fontFamily: "'Fraunces',serif",
                          fontSize: 18,
                          fontWeight: 700,
                          color: "var(--warm)",
                        }}
                      >
                        {item.price} lei
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 7,
                        }}
                      >
                        {qty > 0 ? (
                          <>
                            <button
                              onClick={() =>
                                dispatch({
                                  type: "CART_REMOVE",
                                  payload: item.id,
                                })
                              }
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: 8,
                                background: "var(--card2)",
                                border: "1px solid var(--border)",
                                color: "var(--cream)",
                                fontSize: 15,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              −
                            </button>
                            <span
                              style={{
                                fontSize: 14,
                                fontWeight: 700,
                                minWidth: 18,
                                textAlign: "center",
                              }}
                            >
                              {qty}
                            </span>
                            <button
                              onClick={() =>
                                dispatch({ type: "CART_ADD", payload: item })
                              }
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: 8,
                                background: "var(--card2)",
                                border: "1px solid var(--border)",
                                color: "var(--cream)",
                                fontSize: 15,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              +
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() =>
                              dispatch({ type: "CART_ADD", payload: item })
                            }
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 9,
                              background: "var(--terra)",
                              border: "none",
                              color: "#fff",
                              fontSize: 20,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            +
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {(activeCatObj?.items || []).length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  padding: "30px 0",
                  color: "var(--muted)",
                  fontSize: 13,
                }}
              >
                Niciun produs în această categorie.
              </div>
            )}
          </>
        )}
        {orders.filter(
          (o) => o.table === orderTableNum || o.tableLabel === orderTableNum,
        ).length > 0 && (
          <button
            className="btn-sage"
            style={{ marginTop: 16 }}
            onClick={() => dispatch({ type: "SET_PAYMENT", payload: true })}
          >
            💳 Solicită nota de plată
          </button>
        )}
      </div>
      <CartBar
        onOrder={placeOrder}
        loading={orderLoading}
        hasActiveOrder={!!activeOrder?.id}
      />
    </div>
  );
}

// ─── ADMIN — EDITOR PLANȘEU cu ZOOM ──────────────────────────────────────────
export function Admin() {
  const { state, dispatch, navigate, showToast, isLocked } = useApp();
  const { user, adminFloors, adminFloorIdx, selectedNode } = state;
  const canvasRef = useRef(null);
  const dragRef = useRef(null);

  // ── ZOOM STATE ──
  const [zoom, setZoom] = useState(100); // procente: 50-200
  const ZOOM_STEP = 10;
  const ZOOM_MIN = 50;
  const ZOOM_MAX = 200;
  const zoomIn = () => setZoom((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP));
  const zoomOut = () => setZoom((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP));
  const zoomScale = zoom / 100;

  // ── Elemente fixe ──
  const FIXED_ELEMENTS = [
    {
      type: "entrance",
      icon: "🚪",
      label: "Intrare",
      w: 80,
      h: 40,
      color: "#c8a97e",
    },
    { type: "bar", icon: "🍺", label: "Bar", w: 100, h: 50, color: "#c0622f" },
    {
      type: "kitchen",
      icon: "👨‍🍳",
      label: "Bucătărie",
      w: 120,
      h: 60,
      color: "#e07a47",
    },
    {
      type: "wc_f",
      icon: "🚺",
      label: "Toaletă Femei",
      w: 70,
      h: 40,
      color: "#5b8dd9",
    },
    {
      type: "wc_m",
      icon: "🚹",
      label: "Toaletă Bărbați",
      w: 70,
      h: 40,
      color: "#4a6e4a",
    },
    {
      type: "stairs",
      icon: "🪜",
      label: "Scări",
      w: 70,
      h: 40,
      color: "#6b6050",
    },
    {
      type: "reception",
      icon: "💁",
      label: "Recepție",
      w: 90,
      h: 40,
      color: "#8b6a8a",
    },
  ];

  const onNodeDown = (e, nodeId) => {
    e.preventDefault();
    e.stopPropagation();
    dispatch({ type: "ADMIN_SET_NODE", payload: nodeId });
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    const floor = adminFloors[adminFloorIdx];
    const node = [...(floor?.tables || []), ...(floor?.elements || [])].find(
      (n) => n.id === nodeId,
    );
    if (!node) return;
    // Ajustăm offsetul cu zoom
    dragRef.current = {
      nodeId,
      ox: (cx - rect.left) / zoomScale - node.x,
      oy: (cy - rect.top) / zoomScale - node.y,
    };
    const move = (ev) => {
      if (!dragRef.current || !canvasRef.current) return;
      const cr = canvasRef.current.getBoundingClientRect();
      const mx = ev.touches ? ev.touches[0].clientX : ev.clientX;
      const my = ev.touches ? ev.touches[0].clientY : ev.clientY;
      const nx = Math.max(0, (mx - cr.left) / zoomScale - dragRef.current.ox);
      const ny = Math.max(0, (my - cr.top) / zoomScale - dragRef.current.oy);
      dispatch({
        type: "ADMIN_MOVE_NODE",
        payload: { nodeId: dragRef.current.nodeId, x: nx, y: ny },
      });
    };
    const up = () => {
      dragRef.current = null;
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", up);
  };

  const addElement = (el) => {
    const newEl = {
      id: `el_${Date.now()}`,
      type: el.type,
      icon: el.icon,
      label: el.label,
      w: el.w,
      h: el.h,
      color: el.color,
      x: 40,
      y: 40,
    };
    dispatch({ type: "ADMIN_ADD_ELEMENT", payload: newEl });
  };

  const deleteFloor = (idx) => {
    if (adminFloors.length <= 1) {
      showToast("❌ Trebuie să ai cel puțin un etaj!");
      return;
    }
    const newFloors = adminFloors.filter((_, i) => i !== idx);
    dispatch({ type: "ADMIN_SET_FLOORS", payload: newFloors });
    dispatch({
      type: "ADMIN_SET_FLOOR_IDX",
      payload: Math.min(adminFloorIdx, newFloors.length - 1),
    });
  };

  const addFloor = () => {
    dispatch({ type: "ADMIN_ADD_FLOOR" });
  };
  const addTerrace = () => {
    const newId = Math.max(...adminFloors.map((f) => f.id), 0) + 1;
    const n = adminFloors.filter((f) => f.type === "terrace").length + 1;
    dispatch({
      type: "ADMIN_SET_FLOORS",
      payload: [
        ...adminFloors,
        {
          id: newId,
          name: n === 1 ? "Terasă" : `Terasă ${n}`,
          tables: [],
          elements: [],
          type: "terrace",
        },
      ],
    });
    dispatch({ type: "ADMIN_SET_FLOOR_IDX", payload: adminFloors.length });
  };

  const currentFloor = adminFloors[adminFloorIdx];
  const allNodes = [
    ...(currentFloor?.tables || []),
    ...(currentFloor?.elements || []),
  ];
  const selectedItem = allNodes.find((n) => n.id === selectedNode);
  const floorIcon = (fl) => (fl?.type === "terrace" ? "☀️" : "🏢");

  return (
    <div className="page fade-in">
      {/* Header */}
      <div
        style={{
          padding: "44px 20px 20px",
          background: "linear-gradient(135deg,#100a05,#0d0a07)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 14,
          }}
        >
          <button
            onClick={() => navigate("home")}
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: "rgba(255,255,255,.05)",
              border: "1px solid var(--border)",
              color: "var(--cream)",
              fontSize: 17,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ←
          </button>
          <div>
            <div
              style={{
                fontFamily: "'Fraunces',serif",
                fontSize: 24,
                fontWeight: 900,
              }}
            >
              🏗️ Editor Planșeu
            </div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>
              {user?.restName || "Restaurantul meu"} • Plan{" "}
              {PLANS[user?.plan || "free"]?.label}
            </div>
          </div>
        </div>
      </div>

      <div className="inner">
        {/* Etaje */}
        <label className="form-label">Etaje & Terase</label>
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 14,
          }}
        >
          {adminFloors.map((fl, i) => (
            <div
              key={fl.id}
              style={{ display: "flex", alignItems: "center", gap: 4 }}
            >
              <div
                onClick={() =>
                  dispatch({ type: "ADMIN_SET_FLOOR_IDX", payload: i })
                }
                style={{
                  padding: "7px 14px",
                  borderRadius: 20,
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                  background:
                    adminFloorIdx === i
                      ? fl.type === "terrace"
                        ? "#4a6e4a"
                        : "var(--terra)"
                      : "var(--card2)",
                  border: `1px solid ${adminFloorIdx === i ? (fl.type === "terrace" ? "#4a6e4a" : "var(--terra)") : "var(--border)"}`,
                  color: adminFloorIdx === i ? "#fff" : "var(--muted)",
                  fontSize: 13,
                  fontWeight: adminFloorIdx === i ? 600 : 400,
                }}
              >
                {floorIcon(fl)} {fl.name}
              </div>
              <button
                onClick={() => deleteFloor(i)}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: "rgba(192,57,43,.2)",
                  border: "1px solid rgba(192,57,43,.3)",
                  color: "#e05050",
                  fontSize: 11,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>
          ))}
          <button
            onClick={addFloor}
            style={{
              padding: "7px 13px",
              borderRadius: 20,
              background: "none",
              border: "1px dashed var(--border)",
              color: "var(--muted)",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            🏢 + Etaj
          </button>
          <button
            onClick={addTerrace}
            style={{
              padding: "7px 13px",
              borderRadius: 20,
              background: "none",
              border: "1px dashed rgba(74,110,74,.5)",
              color: "var(--sage2)",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            ☀️ + Terasă
          </button>
        </div>

        {/* Mese */}
        <label className="form-label">Adaugă mese</label>
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 14,
          }}
        >
          {[
            { seats: 2, label: "⭕ 2p" },
            { seats: 4, label: "⬛ 4p" },
            { seats: 8, label: "▬ 8p" },
          ].map((b) => (
            <button
              key={b.seats}
              onClick={() =>
                dispatch({
                  type: "ADMIN_ADD_TABLE",
                  payload: { seats: b.seats },
                })
              }
              style={{
                padding: "8px 14px",
                borderRadius: 12,
                background: "var(--card2)",
                border: "1px solid var(--border)",
                color: "var(--cream)",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              + {b.label}
            </button>
          ))}
          {selectedNode && (
            <button
              onClick={() =>
                dispatch({ type: "ADMIN_DELETE_NODE", payload: selectedNode })
              }
              style={{
                padding: "8px 14px",
                borderRadius: 12,
                background: "none",
                border: "1px solid rgba(192,57,43,.25)",
                color: "var(--red)",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              🗑️ Șterge
            </button>
          )}
        </div>

        {/* Elemente fixe */}
        <label className="form-label">Adaugă elemente</label>
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 14,
          }}
        >
          {FIXED_ELEMENTS.map((el) => (
            <button
              key={el.type}
              onClick={() => addElement(el)}
              style={{
                padding: "7px 12px",
                borderRadius: 12,
                fontSize: 11,
                cursor: "pointer",
                background: `${el.color}22`,
                border: `1px solid ${el.color}55`,
                color: el.color,
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontWeight: 600,
              }}
            >
              {el.icon} {el.label}
            </button>
          ))}
        </div>

        {/* Canvas cu zoom */}
        <div style={{ position: "relative", marginBottom: 12 }}>
          {/* Butoane zoom */}
          <div
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              zIndex: 10,
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <button
              onClick={zoomIn}
              disabled={zoom >= ZOOM_MAX}
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: "rgba(22,18,16,.9)",
                border: "1px solid #2a2218",
                color: zoom >= ZOOM_MAX ? "#3a3228" : "#f0ebe3",
                fontSize: 18,
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
                width: 34,
                height: 24,
                borderRadius: 8,
                background: "rgba(22,18,16,.9)",
                border: "1px solid #2a2218",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 9,
                color: "#c8a97e",
                fontWeight: 700,
                letterSpacing: 0.5,
              }}
            >
              {zoom}%
            </div>
            <button
              onClick={zoomOut}
              disabled={zoom <= ZOOM_MIN}
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: "rgba(22,18,16,.9)",
                border: "1px solid #2a2218",
                color: zoom <= ZOOM_MIN ? "#3a3228" : "#f0ebe3",
                fontSize: 18,
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

          {/* Canvas wrapper scrollabil */}
          <div
            style={{
              width: "100%",
              height: 440,
              background: "#0d0a07",
              borderRadius: 16,
              border: "1px solid var(--border)",
              overflow: "auto",
              position: "relative",
            }}
          >
            {/* Canvas intern scalat */}
            <div
              ref={canvasRef}
              style={{
                width: 900,
                height: 700,
                position: "relative",
                transform: `scale(${zoomScale})`,
                transformOrigin: "top left",
                backgroundImage:
                  "radial-gradient(circle, #2a2218 1px, transparent 1px)",
                backgroundSize: "30px 30px",
                cursor: "default",
                flexShrink: 0,
              }}
              onClick={() =>
                dispatch({ type: "ADMIN_SET_NODE", payload: null })
              }
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
                {floorIcon(currentFloor)} {currentFloor?.name} —{" "}
                {currentFloor?.tables?.length || 0} mese,{" "}
                {currentFloor?.elements?.length || 0} elemente
              </div>

              {/* Elemente fixe */}
              {(currentFloor?.elements || []).map((el) => (
                <div
                  key={el.id}
                  style={{
                    position: "absolute",
                    left: el.x,
                    top: el.y,
                    width: el.w,
                    height: el.h,
                    background: `${el.color}22`,
                    border: `2px solid ${el.color}88`,
                    borderRadius: 10,
                    cursor: "grab",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 2,
                    outline:
                      selectedNode === el.id ? `3px solid ${el.color}` : "none",
                    userSelect: "none",
                    touchAction: "none",
                  }}
                  onMouseDown={(e) => onNodeDown(e, el.id)}
                  onTouchStart={(e) => onNodeDown(e, el.id)}
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch({ type: "ADMIN_SET_NODE", payload: el.id });
                  }}
                >
                  <span style={{ fontSize: 18, pointerEvents: "none" }}>
                    {el.icon}
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      color: el.color,
                      fontWeight: 700,
                      letterSpacing: 0.5,
                      pointerEvents: "none",
                    }}
                  >
                    {el.label}
                  </span>
                </div>
              ))}

              {/* Mese */}
              {(currentFloor?.tables || []).map((t) => (
                <div
                  key={t.id}
                  className={`tnode ${tableClass(t.seats)} draggable ${selectedNode === t.id ? "sel-node" : ""}`}
                  style={{
                    left: t.x,
                    top: t.y,
                    cursor: "grab",
                    touchAction: "none",
                    userSelect: "none",
                  }}
                  onMouseDown={(e) => onNodeDown(e, t.id)}
                  onTouchStart={(e) => onNodeDown(e, t.id)}
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch({ type: "ADMIN_SET_NODE", payload: t.id });
                  }}
                >
                  🪑<span>{t.label}</span>
                  <span className="tnode-seats">{t.seats}p</span>
                </div>
              ))}

              {allNodes.length === 0 && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--muted)",
                    gap: 8,
                    pointerEvents: "none",
                  }}
                >
                  <span style={{ fontSize: 40 }}>
                    {currentFloor?.type === "terrace" ? "☀️" : "🏗️"}
                  </span>
                  <span style={{ fontSize: 13 }}>
                    Adaugă mese și elemente din butoanele de sus
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Info element selectat */}
        {selectedItem && (
          <div
            style={{
              background: "var(--card2)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: "12px 16px",
              marginBottom: 12,
              fontSize: 13,
              color: "var(--muted)",
            }}
          >
            Selectat:{" "}
            <b style={{ color: "var(--cream)" }}>{selectedItem.label}</b>
            {selectedItem.seats && ` • ${selectedItem.seats} persoane`}
            {` • x=${Math.round(selectedItem.x)}, y=${Math.round(selectedItem.y)}`}
            {` • zoom ${zoom}%`}
          </div>
        )}

        <button
          className="btn-primary"
          onClick={() => showToast("✅ Configurație salvată!")}
        >
          ✅ Salvează configurația
        </button>
      </div>
    </div>
  );
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
export function Auth() {
  const { state, dispatch, navigate, showToast } = useApp();
  const { user } = state;
  const [tab, setTab] = useState("rezervari"); // "rezervari" | "comenzi"
  const [rezervari, setRezervari] = useState([]);
  const [comenzi, getComenzi] = useState([]);
  const [loading, setLoading] = useState(true);

  // Încarcă datele din Supabase
  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    const load = async () => {
      setLoading(true);
      // Rezervări ale clientului
      const { data: rez } = await supabase
        .from("reservations")
        .select("*, restaurants(name, emoji)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (rez) setRezervari(rez);

      // Comenzi ale clientului - grupate după table_session_id
      const { data: ord } = await supabase
        .from("orders")
        .select("*, restaurants(name, emoji)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (ord) getComenzi(ord);

      setLoading(false);
    };
    load();
  }, [user?.id]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    dispatch({ type: "SET_USER", payload: null });
    navigate("home");
    showToast("La revedere! 👋");
  };

  const formatData = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString("ro-RO", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "Europe/Bucharest",
    });
  };

  const formatOra = (iso) => {
    if (!iso) return "";
    return new Date(iso).toLocaleTimeString("ro-RO", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Bucharest",
    });
  };

  const statusColor = (s) => {
    if (!s) return "#6b6050";
    if (s === "confirmed" || s === "approved") return "#6b9e6b";
    if (s === "pending") return "#c8a97e";
    if (s === "cancelled" || s === "rejected") return "#e05050";
    if (s === "completed" || s === "paid") return "#5b8dd9";
    return "#6b6050";
  };

  const statusLabel = (s) => {
    const map = {
      confirmed: "Confirmată",
      approved: "Aprobată",
      pending: "În așteptare",
      cancelled: "Anulată",
      rejected: "Respinsă",
      completed: "Finalizată",
      paid: "Plătită",
      delivered: "Livrată",
    };
    return map[s] || s || "—";
  };

  return (
    <div className="page fade-in">
      {/* Header */}
      <div
        style={{
          padding: "52px 20px 24px",
          background: "linear-gradient(160deg,#1a0e05 0%,#0d0a07 60%)",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background:
              "radial-gradient(ellipse 100% 60% at 50% 0%,rgba(192,98,47,.1),transparent 70%)",
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => navigate("home")}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "rgba(255,255,255,.08)",
                border: "1px solid rgba(255,255,255,.12)",
                color: "#f0ebe3",
                fontSize: 16,
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
                width: 44,
                height: 44,
                borderRadius: 13,
                background: "linear-gradient(135deg,var(--terra),#8b3a18)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
              }}
            >
              {user?.name?.[0]?.toUpperCase() || "👤"}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>
                {user?.name || "Contul meu"}
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>
                {user?.email}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: "6px 14px",
              borderRadius: 10,
              background: "rgba(192,57,43,.15)",
              border: "1px solid rgba(192,57,43,.3)",
              color: "#e05050",
              fontSize: 12,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Ieși
          </button>
        </div>

        {/* Tab-uri */}
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
        >
          {[
            { id: "rezervari", icon: "📅", label: "Rezervări" },
            { id: "comenzi", icon: "🧾", label: "Note de plată" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: "10px 0",
                borderRadius: 12,
                border: "none",
                cursor: "pointer",
                background:
                  tab === t.id ? "var(--terra)" : "rgba(255,255,255,.05)",
                color: tab === t.id ? "#fff" : "var(--muted)",
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                fontSize: 13,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="inner" style={{ paddingTop: 20, paddingBottom: 100 }}>
        {loading ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px 0",
              color: "var(--muted)",
              fontSize: 13,
            }}
          >
            Se încarcă...
          </div>
        ) : tab === "rezervari" ? (
          <>
            <div
              style={{
                fontSize: 10,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: "#6b6050",
                marginBottom: 14,
              }}
            >
              Istoric rezervări
            </div>
            {rezervari.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
                <div
                  style={{
                    fontSize: 15,
                    color: "var(--cream)",
                    marginBottom: 6,
                  }}
                >
                  Nicio rezervare încă
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  Rezervările tale vor apărea aici.
                </div>
              </div>
            ) : (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {rezervari.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      background: "#161210",
                      border: "1px solid #2a2218",
                      borderRadius: 16,
                      padding: "16px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        marginBottom: 10,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <div
                          style={{
                            width: 42,
                            height: 42,
                            borderRadius: 12,
                            fontSize: 22,
                            background: "#1e1a14",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {r.restaurants?.emoji || "🍽️"}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>
                            {r.restaurants?.name || "Restaurant"}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: "var(--muted)",
                              marginTop: 2,
                            }}
                          >
                            {formatData(r.date || r.created_at)}{" "}
                            {r.time ? `• ${r.time}` : ""}
                          </div>
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "4px 10px",
                          borderRadius: 20,
                          background: `${statusColor(r.status)}22`,
                          color: statusColor(r.status),
                          border: `1px solid ${statusColor(r.status)}44`,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {statusLabel(r.status)}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                      {r.guests && (
                        <div style={{ fontSize: 11, color: "var(--muted)" }}>
                          👥{" "}
                          <span style={{ color: "var(--cream)" }}>
                            {r.guests} persoane
                          </span>
                        </div>
                      )}
                      {r.table_label && (
                        <div style={{ fontSize: 11, color: "var(--muted)" }}>
                          🪑 Masa{" "}
                          <span style={{ color: "var(--cream)" }}>
                            {r.table_label}
                          </span>
                        </div>
                      )}
                      {r.observations && (
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--muted)",
                            width: "100%",
                            marginTop: 4,
                          }}
                        >
                          💬{" "}
                          <span style={{ color: "var(--cream)" }}>
                            {r.observations}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div
              style={{
                fontSize: 10,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: "#6b6050",
                marginBottom: 14,
              }}
            >
              Note de plată
            </div>
            {comenzi.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🧾</div>
                <div
                  style={{
                    fontSize: 15,
                    color: "var(--cream)",
                    marginBottom: 6,
                  }}
                >
                  Nicio comandă încă
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  Comenzile tale vor apărea aici.
                </div>
              </div>
            ) : (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {comenzi.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      background: "#161210",
                      border: "1px solid #2a2218",
                      borderRadius: 16,
                      overflow: "hidden",
                    }}
                  >
                    {/* Header comandă */}
                    <div
                      style={{
                        padding: "14px 16px",
                        borderBottom: "1px solid #2a2218",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 10,
                            fontSize: 20,
                            background: "#1e1a14",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {c.restaurants?.emoji || "🍽️"}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>
                            {c.restaurants?.name || "Restaurant"}
                          </div>
                          <div style={{ fontSize: 10, color: "var(--muted)" }}>
                            {formatData(c.created_at)} •{" "}
                            {formatOra(c.created_at)}
                            {c.table_label ? ` • Masa ${c.table_label}` : ""}
                          </div>
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "4px 10px",
                          borderRadius: 20,
                          background: `${statusColor(c.status)}22`,
                          color: statusColor(c.status),
                          border: `1px solid ${statusColor(c.status)}44`,
                        }}
                      >
                        {statusLabel(c.status)}
                      </span>
                    </div>

                    {/* Produse comandate */}
                    <div style={{ padding: "10px 16px" }}>
                      {Array.isArray(c.items) &&
                        c.items.map((item, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: "6px 0",
                              borderBottom:
                                idx < c.items.length - 1
                                  ? "1px solid rgba(255,255,255,.04)"
                                  : "none",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                              }}
                            >
                              <span style={{ fontSize: 16 }}>
                                {item.emoji || "🍴"}
                              </span>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 600 }}>
                                  {item.name}
                                </div>
                                {item.qty > 1 && (
                                  <div
                                    style={{
                                      fontSize: 10,
                                      color: "var(--muted)",
                                    }}
                                  >
                                    x{item.qty} × {item.price} lei
                                  </div>
                                )}
                              </div>
                            </div>
                            <div
                              style={{
                                fontSize: 13,
                                fontWeight: 700,
                                color: "var(--terra)",
                              }}
                            >
                              {(item.price * (item.qty || 1)).toFixed(2)} lei
                            </div>
                          </div>
                        ))}
                    </div>

                    {/* Total */}
                    <div
                      style={{
                        padding: "12px 16px",
                        borderTop: "1px solid #2a2218",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        background: "rgba(255,255,255,.02)",
                      }}
                    >
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>
                        {Array.isArray(c.items)
                          ? c.items.reduce((s, i) => s + (i.qty || 1), 0)
                          : 0}{" "}
                        produse
                      </div>
                      <div
                        style={{
                          fontFamily: "'Fraunces',serif",
                          fontSize: 18,
                          fontWeight: 900,
                          color: "var(--terra)",
                        }}
                      >
                        {Number(c.total).toFixed(2)} lei
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
