import { useState, useRef, useEffect } from "react";
import HighlightText from "./HighlightText";

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

function SearchBar({
  onSelect,
  selectedCity,
  onCityChange,
  restaurants = [],
  onMapClick,
}) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [showCities, setShowCities] = useState(false);
  const inputRef = useRef(null);
  const wrapRef = useRef(null);

  // Placeholder rotativ
  const placeholders = [
    {
      prefix: "Ți-e poftă de un ",
      bold: "Sushi",
      suffix: " la ",
      brand: "Zen?",
    },
    { prefix: "Cauți o ", bold: "Pizza", suffix: " bună în ", brand: "oraș?" },
    {
      prefix: "Ce zici de un ",
      bold: "Burger",
      suffix: " la ",
      brand: "prânz?",
    },
    { prefix: "Poate o ", bold: "Salată", suffix: " la ", brand: "terasă?" },
  ];
  const [phIdx, setPhIdx] = useState(0);
  const [phVisible, setPhVisible] = useState(true);
  useEffect(() => {
    const t = setInterval(() => {
      setPhVisible(false);
      setTimeout(() => {
        setPhIdx((i) => (i + 1) % placeholders.length);
        setPhVisible(true);
      }, 400);
    }, 8000);
    return () => clearInterval(t);
  }, []);

  const results =
    query.trim().length === 0
      ? []
      : restaurants.filter((r) => {
          const matchName = r.name.toLowerCase().includes(query.toLowerCase());
          const matchType = (r.type || "")
            .toLowerCase()
            .includes(query.toLowerCase());
          const matchCity =
            selectedCity === "Toate orașele" ||
            (r.city || r.address || "")
              .toLowerCase()
              .includes(selectedCity.toLowerCase());
          return (matchName || matchType) && matchCity;
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

  const ph = placeholders[phIdx];

  return (
    <div ref={wrapRef} style={{ position: "relative", zIndex: 150 }}>
      {/* Bara principala */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#2a2218",
          padding: "12px 12px 12px 20px",
          borderRadius: 50,
          border: "1px solid rgba(200,169,126,0.15)",
          boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* Stanga: oras + placeholder */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            flex: 1,
            minWidth: 0,
            cursor: "text",
          }}
          onClick={() => {
            inputRef.current?.focus();
            setFocused(true);
          }}
        >
          {/* Selector oras */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              setShowCities(!showCities);
              setFocused(false);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: 14 }}>📍</span>
            <span style={{ fontSize: 13, color: "#f0ebe3", opacity: 0.8 }}>
              {selectedCity}
            </span>
            <span
              style={{
                fontSize: 9,
                color: "#c0622f",
                transform: showCities ? "rotate(180deg)" : "rotate(0)",
                transition: "transform .2s",
                display: "inline-block",
              }}
            >
              ▼
            </span>
          </div>

          {/* Search input / placeholder animat */}
          <div
            style={{
              height: 28,
              display: "flex",
              alignItems: "center",
              overflow: "hidden",
            }}
          >
            {focused ? (
              <input
                ref={inputRef}
                value={query}
                maxLength={100}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setFocused(true)}
                placeholder="Caută restaurant, bucătărie..."
                autoFocus
                style={{
                  background: "none",
                  border: "none",
                  outline: "none",
                  color: "#f0ebe3",
                  fontFamily: "'Fraunces',serif",
                  fontSize: 18,
                  fontWeight: 400,
                  padding: 0,
                  width: "100%",
                }}
              />
            ) : (
              <div
                style={{
                  fontFamily: "'Fraunces',serif",
                  fontSize: 15,
                  color: "#f0ebe3",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  opacity: phVisible ? 1 : 0,
                  transform: phVisible ? "translateY(0)" : "translateY(6px)",
                  transition: "opacity 0.4s ease, transform 0.4s ease",
                }}
              >
                {ph.prefix}
                <span style={{ fontWeight: 900 }}>{ph.bold}</span>
                {ph.suffix}
                <span style={{ color: "#c0622f", fontWeight: 900 }}>
                  {ph.brand}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Dreapta: butoane harta + filtre */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid #c8a97e",
            borderRadius: 30,
            padding: "6px 12px",
            flexShrink: 0,
            marginLeft: 12,
          }}
        >
          <button
            onClick={() => onMapClick && onMapClick()}
            style={{
              background: "none",
              border: "none",
              color: "#c8a97e",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              padding: 0,
            }}
          >
            <svg viewBox="0 0 24 24" width="22" height="22">
              <path
                fill="currentColor"
                d="M15,19L9,16.56V4.56L15,7V19M8.5,20L2,16.94V4.27L8.5,7.33V20M22,7.06V19.73L15.5,16.67V4L22,7.06Z"
              />
            </svg>
          </button>
          <div
            style={{
              width: 1,
              height: 24,
              background: "rgba(200,169,126,0.3)",
            }}
          />
          <button
            style={{
              background: "none",
              border: "none",
              color: "#c8a97e",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              padding: 0,
            }}
          >
            <svg viewBox="0 0 24 24" width="22" height="22">
              <path
                fill="currentColor"
                d="M3,17V19H9V17H3M3,5V7H13V5H3M13,19V21H15V19H21V17H15V15H13V19M7,9V11H3V13H7V15H9V9H7M21,13V11H11V13H21M15,9H17V7H21V5H17V3H15V9Z"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Dropdown orase */}
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
            zIndex: 200,
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
                  oras === selectedCity ? "rgba(192,98,47,.12)" : "transparent",
                borderBottom: "1px solid rgba(255,255,255,.04)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span>{oras}</span>
              {oras === selectedCity && <span>✓</span>}
            </div>
          ))}
        </div>
      )}

      {/* Rezultate cautare */}
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
          }}
        >
          {results.length === 0 ? (
            <div style={{ padding: "20px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
              <div style={{ fontSize: 14, color: "#f0ebe3", fontWeight: 600 }}>
                Niciun rezultat pentru „{query}"
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
                      background: "#1e1a14",
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
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default SearchBar;
