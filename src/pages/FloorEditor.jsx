import { useState, useRef, useEffect, useCallback } from "react";
import { useApp } from "../context/AppContext";
import { supabase } from "../supabase";
import { PLANS } from "../data/constants";
import { TableShape, FixedShape } from "../components/FloorShapes";

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

export default function FloorEditor() {
  const { state, navigate, showToast } = useApp();
  const { user } = state;

  // ── State restaurante ──
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestId, setSelectedRestId] = useState(null);
  const [loadingRests, setLoadingRests] = useState(true);

  // ── State planșeu ──
  const [floors, setFloors] = useState([
    { id: "local_1", name: "Parter", tables: [], elements: [], type: "indoor" },
  ]);
  const [floorIdx, setFloorIdx] = useState(0);
  const [selectedNode, setSelectedNode] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  // ── Zoom ──
  const [zoom, setZoom] = useState(100);
  const ZOOM_MIN = 50;
  const ZOOM_MAX = 200;
  const ZOOM_STEP = 10;
  const zoomScale = zoom / 100;

  const canvasRef = useRef(null);
  const dragRef = useRef(null);

  // ── Încarcă restaurantele proprietarului ──
  useEffect(() => {
    const loadRestaurants = async () => {
      if (!user?.id) {
        setLoadingRests(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from("restaurants")
          .select("id, name, emoji, plan")
          .eq("owner_id", user.id)
          .order("created_at");
        if (!error && data && data.length > 0) {
          setRestaurants(data);
          setSelectedRestId(data[0].id);
        }
      } catch (err) {}
      setLoadingRests(false);
    };
    loadRestaurants();
  }, [user?.id]);

  // ── Încarcă planșeul când se schimbă restaurantul ──
  useEffect(() => {
    if (!selectedRestId) return;
    loadFloors(selectedRestId);
  }, [selectedRestId]);

  const loadFloors = async (restId) => {
    setLoading(true);
    try {
      // Încarcă etajele
      const { data: floorsData, error: floorsError } = await supabase
        .from("floors")
        .select("*")
        .eq("restaurant_id", restId)
        .order("floor_order");
      if (floorsError) throw floorsError;

      if (!floorsData || floorsData.length === 0) {
        // Restaurant nou — etaj implicit
        setFloors([
          {
            id: "local_1",
            name: "Parter",
            tables: [],
            elements: [],
            type: "indoor",
          },
        ]);
        setFloorIdx(0);
        setLoading(false);
        return;
      }

      // Încarcă mesele și elementele pentru fiecare etaj
      const floorsWithData = await Promise.all(
        floorsData.map(async (floor) => {
          const [{ data: tables }, { data: elements }] = await Promise.all([
            supabase.from("tables").select("*").eq("floor_id", floor.id),
            supabase
              .from("floor_elements")
              .select("*")
              .eq("floor_id", floor.id),
          ]);
          return {
            ...floor,
            tables: tables || [],
            elements: elements || [],
          };
        }),
      );

      setFloors(floorsWithData);
      setFloorIdx(0);
      setSelectedNode(null);
    } catch (err) {
      showToast("❌ Eroare la încărcarea planșeului.");
    }
    setLoading(false);
  };

  // ── Salvează planșeul în Supabase ──
  const saveFloors = async () => {
    if (!selectedRestId) {
      showToast("⚠️ Selectează un restaurant!");
      return;
    }
    setSaving(true);
    try {
      for (const floor of floors) {
        let floorId = floor.id;

        // Dacă e etaj local (nou) — îl creăm în Supabase
        if (String(floorId).startsWith("local_")) {
          const { data: newFloor, error } = await supabase
            .from("floors")
            .insert({
              restaurant_id: selectedRestId,
              name: floor.name,
              floor_order: floors.indexOf(floor),
              type: floor.type || "indoor",
            })
            .select()
            .single();
          if (error) throw error;
          floorId = newFloor.id;
        } else {
          // Actualizăm etajul existent
          await supabase
            .from("floors")
            .update({
              name: floor.name,
              floor_order: floors.indexOf(floor),
              type: floor.type,
            })
            .eq("id", floorId);
        }

        // Șterge mesele și elementele vechi și reinserează
        await supabase.from("tables").delete().eq("floor_id", floorId);
        await supabase.from("floor_elements").delete().eq("floor_id", floorId);

        // Inserează mesele
        if (floor.tables && floor.tables.length > 0) {
          const tablesToInsert = floor.tables.map((t) => ({
            floor_id: floorId,
            label: t.label,
            seats: t.seats,
            x: Math.round(t.x),
            y: Math.round(t.y),
            rotation: t.rotation || 0,
          }));
          await supabase.from("tables").insert(tablesToInsert);
        }

        // Inserează elementele
        if (floor.elements && floor.elements.length > 0) {
          const elementsToInsert = floor.elements.map((e) => ({
            floor_id: floorId,
            type: e.type,
            icon: e.icon,
            label: e.label,
            x: Math.round(e.x),
            y: Math.round(e.y),
            w: e.w,
            h: e.h,
            color: e.color,
            rotation: e.rotation || 0,
          }));
          await supabase.from("floor_elements").insert(elementsToInsert);
        }
      }

      showToast("✅ Planșeu salvat cu succes!");
      // Reîncarcă pentru a avea ID-urile reale din Supabase
      await loadFloors(selectedRestId);
    } catch (err) {
      showToast("❌ Eroare la salvare. Încearcă din nou.");
    }
    setSaving(false);
  };

  // ── Drag & Drop ──
  const onNodeDown = (e, nodeId) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedNode(nodeId);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    const floor = floors[floorIdx];
    const node = [...(floor?.tables || []), ...(floor?.elements || [])].find(
      (n) => n.id === nodeId,
    );
    if (!node) return;

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
      moveNode(dragRef.current.nodeId, nx, ny);
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

  const moveNode = (nodeId, x, y) => {
    setFloors((prev) =>
      prev.map((f, i) => {
        if (i !== floorIdx) return f;
        return {
          ...f,
          tables: (f.tables || []).map((t) =>
            t.id === nodeId ? { ...t, x, y } : t,
          ),
          elements: (f.elements || []).map((e) =>
            e.id === nodeId ? { ...e, x, y } : e,
          ),
        };
      }),
    );
  };

  // ── Adaugă masă ──
  const addTable = (seats) => {
    const floor = floors[floorIdx];
    // Prefix: TP = Parter, TE1/TE2 = Etaj, TT = Terasa
    let prefix;
    if (floor.type === "terrace") {
      const terraceIdx =
        floors.filter((f) => f.type === "terrace").indexOf(floor) + 1;
      prefix = terraceIdx <= 1 ? "TT" : `TT${terraceIdx}`;
    } else {
      const indoorFloors = floors.filter((f) => f.type !== "terrace");
      const floorNum = indoorFloors.indexOf(floor);
      prefix = floorNum === 0 ? "TP" : `TE${floorNum}-`;
    }
    // Numarul mesei = cel mai mare numar existent (cu acest prefix) + 1.
    // NU folosim length, pentru ca daca stergi o masa din mijloc si adaugi
    // alta, length+1 ar putea genera o eticheta care exista deja -> duplicat.
    const existingNums = (floor.tables || [])
      .map((t) => {
        if (!t.label || !t.label.startsWith(prefix)) return 0;
        const n = parseInt(t.label.slice(prefix.length), 10);
        return Number.isNaN(n) ? 0 : n;
      })
      .filter((n) => n > 0);
    const tableNum =
      existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;
    const newTable = {
      id: `local_t_${Date.now()}`,
      label: `${prefix}${tableNum}`,
      seats,
      x: 20 + (tableNum % 5) * 65,
      y: 20 + Math.floor(tableNum / 5) * 75,
    };
    setFloors((prev) =>
      prev.map((f, i) =>
        i === floorIdx ? { ...f, tables: [...(f.tables || []), newTable] } : f,
      ),
    );
  };

  // ── Adaugă element fix ──
  const addElement = (el) => {
    const newEl = { id: `local_el_${Date.now()}`, ...el, x: 40, y: 40 };
    setFloors((prev) =>
      prev.map((f, i) =>
        i === floorIdx ? { ...f, elements: [...(f.elements || []), newEl] } : f,
      ),
    );
  };

  // ── Șterge nod selectat ──
  const deleteSelected = () => {
    if (!selectedNode) return;
    setFloors((prev) =>
      prev.map((f, i) => {
        if (i !== floorIdx) return f;
        return {
          ...f,
          tables: (f.tables || []).filter((t) => t.id !== selectedNode),
          elements: (f.elements || []).filter((e) => e.id !== selectedNode),
        };
      }),
    );
    setSelectedNode(null);
  };

  // ── Rotește nodul selectat cu 90° (mese + bar/kitchen) ──
  const rotateSelected = () => {
    if (!selectedNode) return;
    setFloors((prev) =>
      prev.map((f, i) => {
        if (i !== floorIdx) return f;
        return {
          ...f,
          tables: (f.tables || []).map((t) =>
            t.id === selectedNode
              ? { ...t, rotation: ((t.rotation || 0) + 90) % 360 }
              : t,
          ),
          elements: (f.elements || []).map((e) =>
            e.id === selectedNode
              ? { ...e, rotation: ((e.rotation || 0) + 90) % 360 }
              : e,
          ),
        };
      }),
    );
  };

  // ── Adaugă etaj ──
  const addFloor = () => {
    const newId = `local_${Date.now()}`;
    const num = floors.filter((f) => f.type !== "terrace").length;
    setFloors((prev) => [
      ...prev,
      {
        id: newId,
        name: `Etaj ${num}`,
        tables: [],
        elements: [],
        type: "indoor",
      },
    ]);
    setFloorIdx(floors.length);
  };

  // ── Adaugă terasă ──
  const addTerrace = () => {
    const newId = `local_${Date.now()}`;
    const n = floors.filter((f) => f.type === "terrace").length + 1;
    setFloors((prev) => [
      ...prev,
      {
        id: newId,
        name: n === 1 ? "Terasă" : `Terasă ${n}`,
        tables: [],
        elements: [],
        type: "terrace",
      },
    ]);
    setFloorIdx(floors.length);
  };

  // ── Șterge etaj ──
  const deleteFloor = async (idx) => {
    if (floors.length <= 1) {
      showToast("❌ Trebuie să ai cel puțin un etaj!");
      return;
    }
    const floor = floors[idx];

    // Dacă e salvat în Supabase, șterge și de acolo
    if (!String(floor.id).startsWith("local_")) {
      try {
        await supabase.from("floors").delete().eq("id", floor.id);
      } catch (err) {}
    }

    const newFloors = floors.filter((_, i) => i !== idx);
    setFloors(newFloors);
    setFloorIdx(Math.min(floorIdx, newFloors.length - 1));
    setSelectedNode(null);
  };

  const currentFloor = floors[floorIdx];
  const allNodes = [
    ...(currentFloor?.tables || []),
    ...(currentFloor?.elements || []),
  ];
  const selectedItem = allNodes.find((n) => n.id === selectedNode);
  const selectedRest = restaurants.find((r) => r.id === selectedRestId);
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
            marginBottom: 16,
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
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
              {selectedRest
                ? `${selectedRest.emoji} ${selectedRest.name}`
                : "Selectează un restaurant"}
            </div>
          </div>
        </div>

        {/* Selector restaurant */}
        {loadingRests ? (
          <div style={{ fontSize: 13, color: "#6b6050" }}>
            Se încarcă restaurantele...
          </div>
        ) : restaurants.length === 0 ? (
          <div
            style={{
              background: "rgba(192,98,47,.1)",
              border: "1px solid rgba(192,98,47,.3)",
              borderRadius: 12,
              padding: "12px 16px",
              fontSize: 13,
              color: "#e07a47",
            }}
          >
            ⚠️ Nu ai niciun restaurant creat.{" "}
            <span
              onClick={() => navigate("newRestaurant")}
              style={{ textDecoration: "underline", cursor: "pointer" }}
            >
              Creează unul →
            </span>
          </div>
        ) : (
          <div style={{ position: "relative" }}>
            <select
              value={selectedRestId || ""}
              onChange={(e) => setSelectedRestId(e.target.value)}
              style={{
                width: "100%",
                background: "#1e1a14",
                border: "1px solid #2a2218",
                borderRadius: 12,
                padding: "11px 16px",
                color: "#f0ebe3",
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                fontSize: 14,
                outline: "none",
                cursor: "pointer",
                appearance: "none",
              }}
            >
              {restaurants.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.emoji} {r.name}
                </option>
              ))}
            </select>
            <span
              style={{
                position: "absolute",
                right: 14,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#6b6050",
                pointerEvents: "none",
              }}
            >
              ▾
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <div
          style={{ textAlign: "center", padding: "60px 0", color: "#6b6050" }}
        >
          <div style={{ fontSize: 36, marginBottom: 10 }}>🏗️</div>
          <div>Se încarcă planșeul...</div>
        </div>
      ) : (
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
            {floors.map((fl, i) => (
              <div
                key={fl.id}
                style={{ display: "flex", alignItems: "center", gap: 4 }}
              >
                <div
                  onClick={() => {
                    setFloorIdx(i);
                    setSelectedNode(null);
                  }}
                  style={{
                    padding: "7px 14px",
                    borderRadius: 20,
                    cursor: "pointer",
                    fontSize: 13,
                    background:
                      floorIdx === i
                        ? fl.type === "terrace"
                          ? "#4a6e4a"
                          : "var(--terra)"
                        : "var(--card2)",
                    border: `1px solid ${floorIdx === i ? (fl.type === "terrace" ? "#4a6e4a" : "var(--terra)") : "var(--border)"}`,
                    color: floorIdx === i ? "#fff" : "var(--muted)",
                    fontWeight: floorIdx === i ? 600 : 400,
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
              { seats: 6, label: "▭ 6p" },
              { seats: 8, label: "▬ 8p" },
              { seats: 12, label: "▬ 12p" },
              { seats: 16, label: "▬ 16p" },
            ].map((b) => (
              <button
                key={b.seats}
                onClick={() => addTable(b.seats)}
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
            {selectedNode &&
              selectedItem &&
              (selectedItem.seats !== undefined ||
                selectedItem.type === "bar" ||
                selectedItem.type === "kitchen") && (
                <button
                  onClick={rotateSelected}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 12,
                    background: "none",
                    border: "1px solid rgba(200,169,126,.35)",
                    color: "var(--warm)",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  ↻ Rotește 90°
                </button>
              )}
            {selectedNode && (
              <button
                onClick={deleteSelected}
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
                onClick={() =>
                  setZoom((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP))
                }
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
                }}
              >
                {zoom}%
              </div>
              <button
                onClick={() =>
                  setZoom((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP))
                }
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

            {/* Canvas scrollabil */}
            <div
              style={{
                width: "100%",
                height: 440,
                background: "#0d0a07",
                borderRadius: 16,
                border: "1px solid var(--border)",
                overflow: "auto",
              }}
            >
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
                }}
                onClick={() => setSelectedNode(null)}
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
                  {currentFloor?.tables?.length || 0} mese
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
                        selectedNode === el.id
                          ? `3px solid ${el.color}`
                          : "none",
                      userSelect: "none",
                      touchAction: "none",
                      transform: el.rotation
                        ? `rotate(${el.rotation}deg)`
                        : "none",
                      transition: "transform .2s ease",
                    }}
                    onMouseDown={(e) => onNodeDown(e, el.id)}
                    onTouchStart={(e) => onNodeDown(e, el.id)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNode(el.id);
                    }}
                  >
                    <div
                      style={{
                        width: "100%",
                        flex: 1,
                        minHeight: 0,
                        pointerEvents: "none",
                      }}
                    >
                      <FixedShape type={el.type} color={el.color} />
                    </div>
                    <span
                      style={{
                        fontSize: 9,
                        color: el.color,
                        fontWeight: 700,
                        pointerEvents: "none",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {el.label}
                    </span>
                  </div>
                ))}

                {/* Mese */}
                {(currentFloor?.tables || []).map((t) => {
                  const w =
                    t.seats <= 2
                      ? 56
                      : t.seats <= 4
                        ? 70
                        : t.seats <= 6
                          ? 90
                          : t.seats <= 8
                            ? 108
                            : t.seats <= 12
                              ? 132
                              : 160;
                  const h = t.seats <= 2 ? 56 : t.seats <= 4 ? 70 : 72;
                  return (
                    <div
                      key={t.id}
                      style={{
                        position: "absolute",
                        left: t.x,
                        top: t.y,
                        width: w,
                        height: h,
                        cursor: "grab",
                        touchAction: "none",
                        userSelect: "none",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 10,
                        outline:
                          selectedNode === t.id ? "3px solid #c0622f" : "none",
                        outlineOffset: 2,
                        transform: t.rotation
                          ? `rotate(${t.rotation}deg)`
                          : "none",
                        transition: "transform .2s ease",
                      }}
                      onMouseDown={(e) => onNodeDown(e, t.id)}
                      onTouchStart={(e) => onNodeDown(e, t.id)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedNode(t.id);
                      }}
                    >
                      <div
                        style={{
                          width: "100%",
                          flex: 1,
                          minHeight: 0,
                          pointerEvents: "none",
                        }}
                      >
                        <TableShape seats={t.seats} statusColor={null} />
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "baseline",
                          gap: 4,
                          lineHeight: 1,
                          marginTop: 1,
                          pointerEvents: "none",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: "#c8a97e",
                          }}
                        >
                          {t.label}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: "#c8a97e",
                            opacity: 0.8,
                          }}
                        >
                          {t.seats}p
                        </span>
                      </div>
                    </div>
                  );
                })}

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

          {/* Info nod selectat */}
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
            </div>
          )}

          {/* Buton salvare */}
          <button
            onClick={saveFloors}
            disabled={saving || !selectedRestId}
            style={{
              width: "100%",
              padding: 15,
              background:
                saving || !selectedRestId
                  ? "#2a2218"
                  : "linear-gradient(135deg,#c0622f,#8b3a18)",
              border: "none",
              borderRadius: 16,
              color: saving || !selectedRestId ? "#6b6050" : "#fff",
              fontFamily: "'Fraunces',serif",
              fontSize: 17,
              fontWeight: 700,
              cursor: saving || !selectedRestId ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Se salvează..." : "✅ Salvează configurația"}
          </button>
        </div>
      )}
    </div>
  );
}
