import { useState, useRef, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { supabase } from "../supabase";

export function Rezervare() {
  const { state, dispatch, navigate, showToast } = useApp();
  const { selectedRest, resForm, reservations, user } = state;
  const [dbFloors, setDbFloors] = useState([]);
  const [reservedTables, setReservedTables] = useState([]);
  const [restProgram, setRestProgram] = useState(null);
  const [lockedTables, setLockedTables] = useState({}); // { tableId: locked_until }
  const [lockCountdown, setLockCountdown] = useState(null); // secunde ramase
  const [myLockedTableId, setMyLockedTableId] = useState(null); // masa pe care am blocat-o eu
  const myLockedTableIdRef = useRef(null); // ref pentru acces in closures
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

  // ── Incarca mesele locked via RPC + polling ──
  const pollRef = useRef(null);

  useEffect(() => {
    if (!selectedRest?.id) return;

    const loadLocked = async () => {
      const { data, error } = await supabase.rpc("get_locked_tables", {
        p_restaurant_id: selectedRest.id,
      });
      if (error || !data) return;
      const map = {};
      data.forEach((t) => {
        map[t.id] = t.locked_until;
      });
      setLockedTables(map);
    };

    // Incarcare imediata + polling la 2 secunde
    loadLocked();
    pollRef.current = setInterval(loadLocked, 2000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [selectedRest?.id]);

  // ── Selecteaza masa: deblocheaza vechea, blocheaza noua ──
  const selectTable = (tableId) => {
    const prevId = myLockedTableIdRef.current;

    // 1. Oprim intervalul existent indiferent de ce
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }

    // 2. Daca aveam o masa blocata, o eliberam in DB si in state
    if (prevId && prevId !== tableId) {
      supabase
        .from("tables")
        .update({ locked_until: null, locked_by: null })
        .eq("id", prevId)
        .then(() => {});
      setLockedTables((prev) => {
        const n = { ...prev };
        delete n[prevId];
        return n;
      });
    }

    // 3. Actualizam referinta curenta
    myLockedTableIdRef.current = tableId;
    setMyLockedTableId(tableId);

    // 4. Blocam noua masa in DB
    const lockedUntil = new Date(
      Date.now() + LOCK_SECONDS * 1000,
    ).toISOString();
    const sessionId = user?.id || "anon-" + Math.random().toString(36).slice(2);
    supabase
      .from("tables")
      .update({ locked_until: lockedUntil, locked_by: sessionId })
      .eq("id", tableId)
      .then(() => {});

    // 5. Pornim countdown nou de la 0
    setLockCountdown(LOCK_SECONDS);
    const id = setInterval(() => {
      setLockCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          // Expirat — eliberam in DB si resetam
          supabase
            .from("tables")
            .update({ locked_until: null, locked_by: null })
            .eq("id", tableId)
            .then(() => {});
          myLockedTableIdRef.current = null;
          setMyLockedTableId(null);
          set({ tableId: null });
          showToast("⏱️ Timpul a expirat. Selectează din nou masa.");
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    countdownRef.current = id;
  };

  // Unlock simplu folosit la finalizare rezervare si cleanup
  const unlockTable = (tableId) => {
    if (!tableId) return;
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    myLockedTableIdRef.current = null;
    setMyLockedTableId(null);
    setLockCountdown(null);
    supabase
      .from("tables")
      .update({ locked_until: null, locked_by: null })
      .eq("id", tableId)
      .then(() => {});
  };

  // Cleanup la unmount - doar la parasirea paginii
  useEffect(() => {
    return () => {
      if (myLockedTableIdRef.current) {
        supabase
          .from("tables")
          .update({
            locked_until: null,
            locked_by: null,
          })
          .eq("id", myLockedTableIdRef.current)
          .then(() => {});
      }
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []); // array gol - ruleaza DOAR la unmount

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
                      const isLocked = !isSel && !!lockedTables[t.id];
                      const isDisabled = isTaken || isLocked;
                      const w = t.seats <= 2 ? 52 : t.seats <= 4 ? 64 : 80;
                      return (
                        <div
                          key={t.id}
                          onClick={() => {
                            if (isDisabled) return;
                            set({ tableId: t.id });
                            selectTable(t.id);
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
        {lockCountdown !== null && lockCountdown > 0 && (
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
