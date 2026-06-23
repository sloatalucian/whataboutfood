import { useState, useRef, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { supabase } from "../supabase";
import FloorPicker from "../components/FloorPicker";
import TimeWheelPicker from "../components/TimeWheelPicker";
import { getAvailableHours } from "../utils/timeSlots";

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
  // Pastram sessionId-ul folosit la lock, ca sa-l putem trimite la unlock
  // (RPC-ul de unlock verifica locked_by = sessionId pentru securitate).
  const sessionIdRef = useRef(null);
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
        .rpc("unlock_table", {
          p_table_id: prevId,
          p_locked_by: sessionIdRef.current,
        })
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
    // sessionId stabil: daca userul e logat, mereu user.id. Daca e anonim,
    // generam un ID o singura data si il refolosim pe toata sesiunea (ca sa
    // ramana acelasi intre lock/unlock).
    if (user?.id) {
      sessionIdRef.current = user.id;
    } else if (!sessionIdRef.current) {
      sessionIdRef.current = "anon-" + Math.random().toString(36).slice(2);
    }
    const sessionId = sessionIdRef.current;
    supabase
      .rpc("lock_table", {
        p_table_id: tableId,
        p_locked_until: lockedUntil,
        p_locked_by: sessionId,
      })
      .then(() => {});

    // 5. Pornim countdown nou de la 0
    setLockCountdown(LOCK_SECONDS);
    const id = setInterval(() => {
      setLockCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          // Expirat — eliberam in DB si resetam
          supabase
            .rpc("unlock_table", {
              p_table_id: tableId,
              p_locked_by: sessionIdRef.current,
            })
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
      .rpc("unlock_table", {
        p_table_id: tableId,
        p_locked_by: sessionIdRef.current,
      })
      .then(() => {});
  };

  // Cleanup la unmount - doar la parasirea paginii
  useEffect(() => {
    return () => {
      if (myLockedTableIdRef.current) {
        supabase
          .rpc("unlock_table", {
            p_table_id: myLockedTableIdRef.current,
            p_locked_by: sessionIdRef.current,
          })
          .then(() => {});
      }
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []); // array gol - ruleaza DOAR la unmount

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
      const { data } = await supabase.rpc("get_reserved_tables", {
        p_restaurant_id: selectedRest.id,
        p_date: resForm.date,
        p_time: resForm.time,
      });
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
    // ── Validare rezervări duble ──
    if (user?.id && resForm.date && resForm.time) {
      const { data: existing } = await supabase
        .from("reservations")
        .select("id, restaurant_id, date, time, status")
        .eq("user_id", user.id)
        .in("status", ["pending", "confirmed"])
        .eq("date", resForm.date);

      if (existing && existing.length > 0) {
        // Scenariul 1: același restaurant, aceeași dată
        const sameRest = existing.find(
          (r) => r.restaurant_id === selectedRest.id,
        );
        if (sameRest) {
          showToast(
            "❌ Ai deja o rezervare la acest restaurant în această zi.",
          );
          return;
        }

        // Scenariul 2: alt restaurant, interval < 2 ore
        const newTime = parseInt(resForm.time.replace(":", ""), 10);
        const conflict = existing.find((r) => {
          if (!r.time) return false;
          const existTime = parseInt(r.time.replace(":", ""), 10);
          const diffMin = Math.abs(
            Math.floor(newTime / 100) * 60 +
              (newTime % 100) -
              (Math.floor(existTime / 100) * 60 + (existTime % 100)),
          );
          return diffMin < 120;
        });
        if (conflict) {
          showToast(
            `❌ Ai o rezervare la ${conflict.time} în aceeași perioadă. Rezervările trebuie să fie la minim 2 ore distanță.`,
          );
          return;
        }
      }
    }

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
      <div
        className="page"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100dvh",
          padding: "0 24px",
          background: "var(--bg)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Particule confetti */}
        {[...Array(18)].map((_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              width: i % 3 === 0 ? 8 : i % 3 === 1 ? 5 : 10,
              height: i % 3 === 0 ? 8 : i % 3 === 1 ? 5 : 4,
              borderRadius: i % 3 === 2 ? 2 : "50%",
              background: [
                "#c0622f",
                "#e8a87c",
                "#f0ebe3",
                "#8b3a18",
                "#d4845a",
              ][i % 5],
              left: `${10 + ((i * 73) % 80)}%`,
              top: `${-10}%`,
              animation: `confettiFall ${1.2 + ((i * 0.15) % 1.2)}s cubic-bezier(.23,1,.32,1) ${i * 0.08}s both`,
              opacity: 0,
            }}
          />
        ))}

        <style>{`
          @keyframes confettiFall {
            0%   { opacity: 0; transform: translateY(0) rotate(0deg) scale(0); }
            15%  { opacity: 1; transform: translateY(20px) rotate(45deg) scale(1); }
            100% { opacity: 0; transform: translateY(60vh) rotate(${Math.random() > 0.5 ? "" : "-"}720deg) scale(0.5); }
          }
          @keyframes checkCircle {
            0%   { stroke-dashoffset: 220; opacity: 0; }
            30%  { opacity: 1; }
            100% { stroke-dashoffset: 0; }
          }
          @keyframes checkMark {
            0%   { stroke-dashoffset: 60; opacity: 0; }
            40%  { opacity: 0; }
            100% { stroke-dashoffset: 0; opacity: 1; }
          }
          @keyframes cardReveal {
            0%   { opacity: 0; transform: translateY(40px) scale(0.95); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
          }
          @keyframes titleReveal {
            0%   { opacity: 0; transform: translateY(16px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          @keyframes rowReveal {
            0%   { opacity: 0; transform: translateX(-12px); }
            100% { opacity: 1; transform: translateX(0); }
          }
          @keyframes btnReveal {
            0%   { opacity: 0; transform: translateY(12px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          @keyframes glowPulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(192,98,47,0); }
            50% { box-shadow: 0 0 40px 12px rgba(192,98,47,0.18); }
          }
        `}</style>

        {/* Card principal */}
        <div
          style={{
            width: "100%",
            maxWidth: 400,
            background: "linear-gradient(160deg, #1c1409 0%, #120e07 100%)",
            border: "1px solid rgba(192,98,47,0.25)",
            borderRadius: 28,
            padding: "40px 28px 32px",
            textAlign: "center",
            animation:
              "cardReveal 0.6s cubic-bezier(.23,1,.32,1) 0.1s both, glowPulse 2.5s ease 0.7s 2",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Shimmer top line */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: "10%",
              right: "10%",
              height: 1,
              background:
                "linear-gradient(90deg, transparent, rgba(192,98,47,0.6), transparent)",
            }}
          />

          {/* Check SVG animat */}
          <div
            style={{
              marginBottom: 24,
              display: "flex",
              justifyContent: "center",
            }}
          >
            <svg width="80" height="80" viewBox="0 0 80 80">
              {/* Cerc de fundal */}
              <circle cx="40" cy="40" r="36" fill="rgba(192,98,47,0.08)" />
              {/* Cerc animat */}
              <circle
                cx="40"
                cy="40"
                r="34"
                fill="none"
                stroke="#c0622f"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="220"
                strokeDashoffset="220"
                transform="rotate(-90 40 40)"
                style={{
                  animation:
                    "checkCircle 0.8s cubic-bezier(.23,1,.32,1) 0.3s both",
                }}
              />
              {/* Bifă animată */}
              <polyline
                points="24,41 35,53 57,28"
                fill="none"
                stroke="#c0622f"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="60"
                strokeDashoffset="60"
                style={{
                  animation:
                    "checkMark 0.5s cubic-bezier(.23,1,.32,1) 0.9s both",
                }}
              />
            </svg>
          </div>

          {/* Titlu */}
          <div
            style={{
              fontFamily: "'Fraunces', serif",
              fontSize: 26,
              fontWeight: 900,
              color: "#f0ebe3",
              letterSpacing: "-0.5px",
              marginBottom: 6,
              animation: "titleReveal 0.5s ease 1.1s both",
            }}
          >
            Rezervare trimisă!
          </div>
          <div
            style={{
              fontSize: 13,
              color: "rgba(192,98,47,0.8)",
              marginBottom: 28,
              animation: "titleReveal 0.5s ease 1.2s both",
            }}
          >
            Ospătarul va confirma în scurt timp
          </div>

          {/* Detalii rezervare */}
          <div
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 16,
              padding: "16px 20px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              marginBottom: 28,
              textAlign: "left",
            }}
          >
            {[
              {
                icon: "🍽️",
                label: `${selectedRest.emoji} ${selectedRest.name}`,
                delay: "1.3s",
              },
              {
                icon: "📅",
                label: `${resForm.date}  •  ${resForm.time}`,
                delay: "1.4s",
              },
              { icon: "🏠", label: floor?.name || "—", delay: "1.5s" },
              {
                icon: "👥",
                label: `${resForm.persons} persoane`,
                delay: "1.6s",
              },
            ].map((row, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  animation: `rowReveal 0.4s ease ${row.delay} both`,
                  opacity: 0,
                }}
              >
                <span
                  style={{
                    fontSize: 16,
                    width: 22,
                    textAlign: "center",
                    flexShrink: 0,
                  }}
                >
                  {row.icon}
                </span>
                <span
                  style={{
                    fontSize: 14,
                    color: "rgba(240,235,227,0.8)",
                    fontWeight: 500,
                  }}
                >
                  {row.label}
                </span>
              </div>
            ))}
          </div>

          {/* Buton */}
          <button
            className="btn-primary"
            onClick={() => {
              dispatch({ type: "RES_RESET" });
              navigate("home");
            }}
            style={{
              width: "100%",
              animation: "btnReveal 0.4s ease 1.7s both",
              opacity: 0,
            }}
          >
            Explorează restaurante
          </button>
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
          ) : getAvailableHours(resForm.date, restProgram).length === 0 ? (
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
            <TimeWheelPicker
              hours={getAvailableHours(resForm.date, restProgram)}
              value={resForm.time}
              onChange={(t) => set({ time: t, tableId: null })}
            />
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
            <FloorPicker
              floor={floor}
              reservedTables={reservedTables}
              lockedTables={lockedTables}
              selectedTableId={resForm.tableId}
              onSelectTable={(tableId) => {
                set({ tableId });
                selectTable(tableId);
              }}
            />
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
