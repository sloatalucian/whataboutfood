import { useState } from "react";
import { supabase } from "../../supabase";

export default function EvenimenteTab({ showToast }) {
  const [evRestaurants, setEvRestaurants] = useState([]);
  const [evSearch, setEvSearch] = useState("");
  const [evSelectedRest, setEvSelectedRest] = useState(null);
  const [evEvents, setEvEvents] = useState([]);
  const [evLoading, setEvLoading] = useState(false);
  const [evNewEvent, setEvNewEvent] = useState({
    title: "",
    date: "",
    type: "festival",
    description: "",
  });
  const [evAddLoading, setEvAddLoading] = useState(false);

  const handleSearch = async (val) => {
    setEvSearch(val);
    setEvSelectedRest(null);
    setEvEvents([]);
    if (val.length < 2) {
      setEvRestaurants([]);
      return;
    }
    const { data } = await supabase
      .from("restaurants")
      .select("id, name, city, owner_id")
      .ilike("name", `%${val}%`)
      .limit(8);
    setEvRestaurants(data || []);
  };

  const handleSelectRest = async (r) => {
    setEvSelectedRest(r);
    setEvSearch(r.name);
    setEvRestaurants([]);
    setEvLoading(true);
    const { data } = await supabase
      .from("events")
      .select("*")
      .eq("restaurant_id", r.id)
      .order("date", { ascending: true });
    setEvEvents(data || []);
    setEvLoading(false);
  };

  const handleAddEvent = async () => {
    if (!evNewEvent.title || !evNewEvent.date) return;
    setEvAddLoading(true);
    const { data, error } = await supabase
      .from("events")
      .insert({
        restaurant_id: evSelectedRest.id,
        title: evNewEvent.title,
        date: evNewEvent.date,
        type: evNewEvent.type,
        description: evNewEvent.description,
        created_by: "superadmin",
      })
      .select()
      .single();
    if (!error && data) {
      setEvEvents((prev) =>
        [...prev, data].sort((a, b) => a.date.localeCompare(b.date)),
      );
      setEvNewEvent({ title: "", date: "", type: "festival", description: "" });
      showToast("✅ Eveniment adăugat!");
    }
    setEvAddLoading(false);
  };

  const handleDeleteEvent = async (id) => {
    await supabase.from("events").delete().eq("id", id);
    setEvEvents((prev) => prev.filter((e) => e.id !== id));
    showToast("🗑️ Eveniment șters.");
  };

  return (
    <div style={{ padding: "0 0 40px" }}>
      <div
        style={{
          fontSize: 11,
          letterSpacing: 2,
          textTransform: "uppercase",
          color: "#c8a97e",
          marginBottom: 14,
        }}
      >
        📅 Gestionare Evenimente
      </div>

      {/* Search restaurant */}
      <div style={{ marginBottom: 14 }}>
        <input
          value={evSearch}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="🔍 Caută restaurant..."
          style={{
            width: "100%",
            boxSizing: "border-box",
            background: "#1e1a14",
            border: "1px solid #2a2218",
            borderRadius: 10,
            padding: "10px 14px",
            color: "#f0ebe3",
            fontFamily: "inherit",
            fontSize: 13,
            outline: "none",
          }}
        />
        {evRestaurants.length > 0 && !evSelectedRest && (
          <div
            style={{
              background: "#161210",
              border: "1px solid #2a2218",
              borderRadius: 10,
              marginTop: 6,
              overflow: "hidden",
            }}
          >
            {evRestaurants.map((r) => (
              <div
                key={r.id}
                onClick={() => handleSelectRest(r)}
                style={{
                  padding: "10px 14px",
                  cursor: "pointer",
                  borderBottom: "1px solid #2a2218",
                  fontSize: 13,
                  color: "#f0ebe3",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#1e1a14")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                🏪 {r.name}{" "}
                <span style={{ color: "#6b6050", fontSize: 11 }}>
                  • {r.city || "—"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {evSelectedRest && (
        <div>
          <div
            style={{
              background: "#161210",
              border: "1px solid rgba(192,98,47,0.3)",
              borderRadius: 12,
              padding: "12px 14px",
              marginBottom: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#f0ebe3" }}>
                🏪 {evSelectedRest.name}
              </div>
              <div style={{ fontSize: 11, color: "#6b6050", marginTop: 2 }}>
                {evSelectedRest.city}
              </div>
            </div>
            <button
              onClick={() => {
                setEvSelectedRest(null);
                setEvSearch("");
                setEvEvents([]);
              }}
              style={{
                background: "none",
                border: "none",
                color: "#6b6050",
                cursor: "pointer",
                fontSize: 16,
              }}
            >
              ✕
            </button>
          </div>

          {/* Adauga eveniment */}
          <div
            style={{
              background: "#161210",
              border: "1px solid #2a2218",
              borderRadius: 12,
              padding: 14,
              marginBottom: 14,
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#c8a97e",
                marginBottom: 12,
              }}
            >
              + Adaugă eveniment nou
            </div>
            <input
              value={evNewEvent.title}
              onChange={(e) =>
                setEvNewEvent((p) => ({ ...p, title: e.target.value }))
              }
              placeholder="Titlu eveniment *"
              style={{
                width: "100%",
                boxSizing: "border-box",
                background: "#1e1a14",
                border: "1px solid #2a2218",
                borderRadius: 8,
                padding: "8px 12px",
                color: "#f0ebe3",
                fontFamily: "inherit",
                fontSize: 12,
                outline: "none",
                marginBottom: 8,
              }}
            />
            <input
              type="date"
              value={evNewEvent.date}
              onChange={(e) =>
                setEvNewEvent((p) => ({ ...p, date: e.target.value }))
              }
              style={{
                width: "100%",
                boxSizing: "border-box",
                background: "#1e1a14",
                border: "1px solid #2a2218",
                borderRadius: 8,
                padding: "8px 12px",
                color: "#f0ebe3",
                fontFamily: "inherit",
                fontSize: 12,
                outline: "none",
                marginBottom: 8,
              }}
            />
            <select
              value={evNewEvent.type}
              onChange={(e) =>
                setEvNewEvent((p) => ({ ...p, type: e.target.value }))
              }
              style={{
                width: "100%",
                boxSizing: "border-box",
                background: "#1e1a14",
                border: "1px solid #2a2218",
                borderRadius: 8,
                padding: "8px 12px",
                color: "#f0ebe3",
                fontFamily: "inherit",
                fontSize: 12,
                outline: "none",
                marginBottom: 10,
              }}
            >
              <option value="festival">🎪 Festival</option>
              <option value="concert">🎵 Concert</option>
              <option value="meci">⚽ Meci sportiv</option>
              <option value="targ">🛍️ Târg</option>
              <option value="altele">📌 Altele</option>
            </select>
            <button
              disabled={evAddLoading || !evNewEvent.title || !evNewEvent.date}
              onClick={handleAddEvent}
              style={{
                width: "100%",
                padding: "9px",
                borderRadius: 8,
                border: "none",
                background:
                  evNewEvent.title && evNewEvent.date
                    ? "linear-gradient(135deg,#c0622f,#8b3a18)"
                    : "#2a2218",
                color: evNewEvent.title && evNewEvent.date ? "#fff" : "#6b6050",
                fontSize: 12,
                fontWeight: 700,
                cursor:
                  evNewEvent.title && evNewEvent.date
                    ? "pointer"
                    : "not-allowed",
                fontFamily: "inherit",
              }}
            >
              {evAddLoading ? "Se salvează..." : "✅ Salvează eveniment"}
            </button>
          </div>

          {/* Lista evenimente */}
          <div
            style={{
              fontSize: 11,
              letterSpacing: 1,
              textTransform: "uppercase",
              color: "#6b6050",
              marginBottom: 10,
            }}
          >
            Evenimente existente ({evEvents.length})
          </div>
          {evLoading ? (
            <div
              style={{
                textAlign: "center",
                color: "#6b6050",
                fontSize: 13,
                padding: 16,
              }}
            >
              Se încarcă...
            </div>
          ) : evEvents.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                color: "#6b6050",
                fontSize: 13,
                padding: 16,
              }}
            >
              Niciun eveniment adăugat
            </div>
          ) : (
            evEvents.map((ev) => (
              <div
                key={ev.id}
                style={{
                  background: "#161210",
                  border: "1px solid #2a2218",
                  borderRadius: 10,
                  padding: "10px 14px",
                  marginBottom: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  borderLeft: `3px solid ${ev.created_by === "superadmin" ? "#6b9e6b" : "#c0622f"}`,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div
                    style={{ fontSize: 13, color: "#f0ebe3", fontWeight: 500 }}
                  >
                    {ev.title}
                  </div>
                  <div style={{ fontSize: 10, color: "#6b6050", marginTop: 2 }}>
                    📅 {ev.date} • 🏷️ {ev.type} •{" "}
                    {ev.created_by === "superadmin"
                      ? "🟢 SuperAdmin"
                      : "🟠 Proprietar"}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteEvent(ev.id)}
                  style={{
                    background: "rgba(224,80,80,0.1)",
                    border: "1px solid rgba(224,80,80,0.3)",
                    color: "#e05050",
                    borderRadius: 8,
                    padding: "5px 10px",
                    fontSize: 11,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  🗑️
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {!evSelectedRest && evSearch.length < 2 && (
        <div
          style={{
            textAlign: "center",
            color: "#6b6050",
            fontSize: 13,
            padding: "32px 0",
          }}
        >
          Caută un restaurant pentru a gestiona evenimentele lui
        </div>
      )}
    </div>
  );
}
