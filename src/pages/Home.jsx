import { useState, useRef, useEffect } from "react";
import { useApp } from "../context/AppContext";
import RestaurantCard from "../components/RestaurantCard";
import { RESTAURANTS } from "../data/restaurants";

const ORASE = [
  "Toate orașele",
  "București",
  "Cluj-Napoca",
  "Timișoara",
  "Iași",
  "Constanța",
  "Brașov",
  "Galați",
  "Craiova",
  "Ploiești",
  "Oradea",
  "Brăila",
  "Arad",
  "Pitești",
  "Sibiu",
  "Bacău",
  "Târgu Mureș",
  "Baia Mare",
  "Buzău",
  "Botoșani",
  "Satu Mare",
  "Râmnicu Vâlcea",
  "Suceava",
  "Piatra Neamț",
  "Deva",
];

function HighlightText({ text, query }) {
  if (!query) return <span>{text}</span>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <span>{text}</span>;
  return (
    <span>
      {text.slice(0, idx)}
      <span style={{ color: "#e07a47", fontWeight: 800 }}>
        {text.slice(idx, idx + query.length)}
      </span>
      {text.slice(idx + query.length)}
    </span>
  );
}

function SearchBar({ onSelect, selectedCity, onCityChange }) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [showCities, setShowCities] = useState(false);
  const inputRef = useRef(null);
  const wrapRef = useRef(null);

  const results =
    query.trim().length === 0
      ? []
      : RESTAURANTS.filter((r) => {
          const matchName = r.name.toLowerCase().includes(query.toLowerCase());
          const matchType = r.type.toLowerCase().includes(query.toLowerCase());
          const matchTag = r.tags?.some((t) =>
            t.toLowerCase().includes(query.toLowerCase()),
          );
          const matchCity =
            selectedCity === "Toate orașele" ||
            r.address.toLowerCase().includes(selectedCity.toLowerCase());
          return (matchName || matchType || matchTag) && matchCity;
        });

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setFocused(false);
        setShowCities(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={wrapRef} style={{ position: "relative", zIndex: 150 }}>
      {/* Selector oraș */}
      <div style={{ marginBottom: 8, position: "relative" }}>
        <button
          onClick={() => {
            setShowCities(!showCities);
            setFocused(false);
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px 6px 10px",
            background:
              selectedCity !== "Toate orașele"
                ? "rgba(192,98,47,.15)"
                : "rgba(255,255,255,.05)",
            border: `1px solid ${selectedCity !== "Toate orașele" ? "rgba(192,98,47,.4)" : "#2a2218"}`,
            borderRadius: 20,
            cursor: "pointer",
            color: selectedCity !== "Toate orașele" ? "#e07a47" : "#6b6050",
            fontSize: 12,
            fontWeight: 600,
            transition: "all .2s",
          }}
        >
          <span>📍</span>
          <span>{selectedCity}</span>
          <span
            style={{
              fontSize: 10,
              transform: showCities ? "rotate(180deg)" : "rotate(0)",
              transition: "transform .2s",
              display: "inline-block",
            }}
          >
            ▾
          </span>
        </button>

        {showCities && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              left: 0,
              background: "#1e1a14",
              border: "1px solid #2a2218",
              borderRadius: 16,
              boxShadow: "0 8px 32px rgba(0,0,0,.5)",
              width: 220,
              maxHeight: 396,
              overflowY: "auto",
              scrollbarWidth: "thin",
              zIndex: 200,
              animation: "fadeDown .2s ease",
            }}
          >
            {ORASE.map((oras) => (
              <div
                key={oras}
                onClick={() => {
                  onCityChange(oras);
                  setShowCities(false);
                }}
                style={{
                  padding: "10px 16px",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: oras === selectedCity ? 700 : 400,
                  color:
                    oras === selectedCity
                      ? "#e07a47"
                      : oras === "Toate orașele"
                        ? "#f0ebe3"
                        : "#c8a97e",
                  background:
                    oras === selectedCity
                      ? "rgba(192,98,47,.12)"
                      : "transparent",
                  borderBottom: "1px solid rgba(255,255,255,.04)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span>{oras}</span>
                {oras === selectedCity && (
                  <span style={{ fontSize: 12 }}>✓</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "#1e1a14",
          border: `1px solid ${focused ? "#c0622f" : "#2a2218"}`,
          borderRadius: 16,
          padding: "13px 16px",
          transition: "border-color .2s",
          boxShadow: focused ? "0 0 0 3px rgba(192,98,47,.12)" : "none",
        }}
      >
        <span style={{ fontSize: 16, flexShrink: 0 }}>🔍</span>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            setFocused(true);
            setShowCities(false);
          }}
          placeholder={`Caută restaurant${selectedCity !== "Toate orașele" ? ` în ${selectedCity}` : ", bucătărie, zonă"}...`}
          style={{
            flex: 1,
            background: "none",
            border: "none",
            outline: "none",
            color: "#f0ebe3",
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 14,
          }}
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            style={{
              background: "none",
              border: "none",
              color: "#6b6050",
              fontSize: 18,
              cursor: "pointer",
              padding: 0,
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Rezultate */}
      {focused && query.trim().length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            background: "#1e1a14",
            border: "1px solid #2a2218",
            borderRadius: 16,
            boxShadow: "0 8px 32px rgba(0,0,0,.5)",
            zIndex: 200,
            animation: "fadeDown .2s ease",
          }}
        >
          {results.length === 0 ? (
            <div style={{ padding: "20px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
              <div
                style={{
                  fontSize: 14,
                  color: "#f0ebe3",
                  fontWeight: 600,
                  marginBottom: 4,
                }}
              >
                Niciun rezultat pentru „{query}"
              </div>
              <div style={{ fontSize: 12, color: "#6b6050" }}>
                Verifică ortografia sau încearcă alt termen
              </div>
            </div>
          ) : (
            <>
              <div
                style={{
                  padding: "8px 16px 6px",
                  fontSize: 10,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  color: "#6b6050",
                }}
              >
                {results.length}{" "}
                {results.length === 1 ? "rezultat" : "rezultate"}
              </div>
              {results.map((r, i) => (
                <div
                  key={r.id}
                  onClick={() => {
                    onSelect(r);
                    setQuery("");
                    setFocused(false);
                  }}
                  style={{
                    padding: "12px 16px",
                    cursor: "pointer",
                    borderTop:
                      i > 0 ? "1px solid rgba(255,255,255,.04)" : "none",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    transition: "background .15s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "rgba(255,255,255,.05)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 12,
                      flexShrink: 0,
                      background:
                        r.cover || "linear-gradient(135deg,#2d1507,#1a0e05)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 22,
                    }}
                  >
                    {r.emoji}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#f0ebe3",
                        marginBottom: 2,
                      }}
                    >
                      <HighlightText text={r.name} query={query} />
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#6b6050",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      📍 {r.address}
                    </div>
                    <div style={{ display: "flex", gap: 4, marginTop: 3 }}>
                      {r.tags?.slice(0, 2).map((t) => (
                        <span
                          key={t}
                          style={{
                            fontSize: 9,
                            padding: "2px 6px",
                            borderRadius: 10,
                            background: "rgba(255,255,255,.06)",
                            color: "#6b6050",
                          }}
                        >
                          {t}
                        </span>
                      ))}
                      <span
                        style={{
                          fontSize: 9,
                          padding: "2px 6px",
                          borderRadius: 10,
                          background: "rgba(200,169,126,.1)",
                          color: "#c8a97e",
                        }}
                      >
                        ★ {r.rating}
                      </span>
                    </div>
                  </div>
                  <span style={{ fontSize: 14, color: "#6b6050" }}>›</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}
      <style>{`@keyframes fadeDown{from{opacity:0;transform:translateY(-8px);}to{opacity:1;transform:translateY(0);}}`}</style>
    </div>
  );
}

// ─── HOME CLIENT ──────────────────────────────────────────────────────────────
function HomeClient() {
  const { state, dispatch, navigate } = useApp();
  const { user } = state;
  const [selectedCity, setSelectedCity] = useState("Toate orașele");

  const filteredRestaurants = RESTAURANTS.filter(
    (r) =>
      selectedCity === "Toate orașele" ||
      r.address.toLowerCase().includes(selectedCity.toLowerCase()),
  );

  const handleSearchSelect = (restaurant) => {
    dispatch({ type: "SET_REST", payload: restaurant });
    navigate("restaurant");
  };

  return (
    <div className="page fade-in">
      <div
        style={{
          padding: "52px 20px 24px",
          position: "relative",
          background: "linear-gradient(160deg,#1a0e05 0%,#0d0a07 60%)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background:
              "radial-gradient(ellipse 100% 60% at 50% 0%,rgba(192,98,47,.12),transparent 70%)",
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              background: "linear-gradient(135deg,var(--terra),#8b3a18)",
              borderRadius: 11,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
            }}
          >
            🍽️
          </div>
          <div
            style={{
              fontFamily: "'Fraunces',serif",
              fontSize: 22,
              fontWeight: 900,
            }}
          >
            Whatabout<span style={{ color: "var(--terra)" }}>Food</span>
          </div>
        </div>
        <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 6 }}>
          Bună ziua{user?.name ? `, ${user.name}` : ""}! 👋
        </div>
        <h1
          style={{
            fontFamily: "'Fraunces',serif",
            fontSize: 34,
            fontWeight: 900,
            lineHeight: 1.1,
            marginBottom: 20,
          }}
        >
          Găsește masa
          <br />
          <em style={{ fontStyle: "italic", color: "var(--terra)" }}>
            perfectă.
          </em>
        </h1>
        <SearchBar
          selectedCity={selectedCity}
          onCityChange={setSelectedCity}
          onSelect={handleSearchSelect}
        />
      </div>

      <div className="inner" style={{ paddingTop: 16 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 14,
          }}
        >
          <div className="section-label" style={{ marginBottom: 0 }}>
            Restaurante partenere
          </div>
          {selectedCity !== "Toate orașele" && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, color: "#e07a47" }}>
                📍 {selectedCity}
              </span>
              <button
                onClick={() => setSelectedCity("Toate orașele")}
                style={{
                  background: "none",
                  border: "none",
                  color: "#6b6050",
                  fontSize: 11,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {filteredRestaurants.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px 0",
              color: "var(--muted)",
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 10 }}>🏙️</div>
            <div
              style={{ fontSize: 15, marginBottom: 6, color: "var(--cream)" }}
            >
              Niciun restaurant în {selectedCity}
            </div>
            <button
              onClick={() => setSelectedCity("Toate orașele")}
              style={{
                padding: "9px 20px",
                borderRadius: 20,
                background: "var(--terra)",
                border: "none",
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Vezi toate orașele
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filteredRestaurants.map((r) => (
              <RestaurantCard key={r.id} restaurant={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── HOME PROPRIETAR ──────────────────────────────────────────────────────────
function HomeOwner() {
  const { state, navigate } = useApp();
  const { user } = state;

  return (
    <div className="page fade-in">
      <div
        style={{
          padding: "52px 20px 32px",
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
              "radial-gradient(ellipse 100% 60% at 50% 0%,rgba(192,98,47,.08),transparent 70%)",
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              background: "linear-gradient(135deg,var(--terra),#8b3a18)",
              borderRadius: 11,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
            }}
          >
            🍽️
          </div>
          <div
            style={{
              fontFamily: "'Fraunces',serif",
              fontSize: 22,
              fontWeight: 900,
            }}
          >
            Whatabout<span style={{ color: "var(--terra)" }}>Food</span>
          </div>
        </div>
        <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>
          Bun venit înapoi, 👑
        </div>
        <div
          style={{
            fontFamily: "'Fraunces',serif",
            fontSize: 28,
            fontWeight: 900,
            marginBottom: 4,
          }}
        >
          {user?.name}
        </div>
        <div style={{ fontSize: 13, color: "var(--muted)" }}>
          {user?.restName} • Plan {user?.plan?.toUpperCase()}
        </div>
      </div>

      <div className="inner" style={{ paddingTop: 20 }}>
        {/* Quick stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: 10,
            marginBottom: 24,
          }}
        >
          {[
            { icon: "🍽️", label: "Comenzi azi", value: "—", color: "#c0622f" },
            {
              icon: "📅",
              label: "Rezervări azi",
              value: "—",
              color: "#c8a97e",
            },
            { icon: "💰", label: "Venituri azi", value: "—", color: "#6b9e6b" },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                background: "#161210",
                border: "1px solid #2a2218",
                borderRadius: 14,
                padding: "14px 10px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
              <div
                style={{
                  fontFamily: "'Fraunces',serif",
                  fontSize: 20,
                  fontWeight: 900,
                  color: s.color,
                }}
              >
                {s.value}
              </div>
              <div style={{ fontSize: 9, color: "#6b6050", marginTop: 2 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Acțiuni rapide */}
        <div
          style={{
            fontSize: 10,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: "#6b6050",
            marginBottom: 12,
          }}
        >
          Acțiuni rapide
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            marginBottom: 24,
          }}
        >
          {[
            {
              icon: "🏗️",
              label: "Editor Planșeu",
              desc: "Configurează mesele",
              screen: "adminFloor",
              color: "rgba(192,98,47,.2)",
              border: "rgba(192,98,47,.3)",
            },
            {
              icon: "📊",
              label: "Statistici",
              desc: "Venituri și rapoarte",
              screen: "statistici",
              color: "rgba(91,141,217,.2)",
              border: "rgba(91,141,217,.3)",
            },
            {
              icon: "🍽️",
              label: "Editor Meniu",
              desc: "Adaugă produse",
              screen: "menuEditor",
              color: "rgba(74,110,74,.2)",
              border: "rgba(74,110,74,.3)",
            },
            {
              icon: "🤵",
              label: "Gestionare Ospătari",
              desc: "Adaugă / modifică",
              screen: "admin",
              color: "rgba(200,169,126,.2)",
              border: "rgba(200,169,126,.3)",
            },
          ].map((btn) => (
            <div
              key={btn.screen}
              onClick={() => navigate(btn.screen)}
              style={{
                background: `linear-gradient(135deg,${btn.color},transparent)`,
                border: `1px solid ${btn.border}`,
                borderRadius: 16,
                padding: 16,
                cursor: "pointer",
              }}
            >
              <div style={{ fontSize: 26, marginBottom: 8 }}>{btn.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>
                {btn.label}
              </div>
              <div style={{ fontSize: 10, color: "var(--muted)" }}>
                {btn.desc}
              </div>
            </div>
          ))}
        </div>

        {/* Restaurante proprii */}
        <div
          style={{
            fontSize: 10,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: "#6b6050",
            marginBottom: 12,
          }}
        >
          Restaurantele mele
        </div>
        <div
          onClick={() => navigate("admin")}
          style={{
            background: "#161210",
            border: "1px solid #2a2218",
            borderRadius: 16,
            padding: "16px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginBottom: 10,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 13,
              background: "linear-gradient(135deg,#2d1507,#1a0e05)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
            }}
          >
            🍝
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>
              {user?.restName || "Restaurantul meu"}
            </div>
            <div style={{ fontSize: 11, color: "#6b6050", marginTop: 2 }}>
              Plan {user?.plan?.toUpperCase()} • Activ
            </div>
          </div>
          <span style={{ fontSize: 18, color: "#6b6050" }}>›</span>
        </div>

        <div
          onClick={() => navigate("newRestaurant")}
          style={{
            border: "1px dashed #2a2218",
            borderRadius: 16,
            padding: 16,
            cursor: "pointer",
            textAlign: "center",
            color: "#6b6050",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 20 }}>+</span>
          <span style={{ fontSize: 13 }}>Adaugă restaurant nou</span>
        </div>
      </div>
    </div>
  );
}

// ─── EXPORT ───────────────────────────────────────────────────────────────────
export default function Home() {
  const { state } = useApp();
  const { user } = state;

  if (user?.role === "owner") return <HomeOwner />;
  return <HomeClient />;
}
