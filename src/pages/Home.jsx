import { useState, useRef, useEffect, useCallback } from "react";
import { useApp } from "../context/AppContext";
import RestaurantCard from "../components/RestaurantCard";
import { RESTAURANTS } from "../data/restaurants";
import { supabase } from "../supabase";

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

function SearchBar({ onSelect, selectedCity, onCityChange, restaurants = [] }) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [showCities, setShowCities] = useState(false);
  const inputRef = useRef(null);
  const wrapRef = useRef(null);

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
                {oras === selectedCity && <span>✓</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Input căutare */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "#1e1a14",
          border: `1px solid ${focused ? "#c0622f" : "#2a2218"}`,
          borderRadius: 16,
          padding: "13px 16px",
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

// ─── MODAL ȘTERGERE RESTAURANT (2 confirmări) ─────────────────────────────────
function DeleteRestaurantModal({ restaurant, onConfirm, onClose }) {
  const [step, setStep] = useState(1);
  const [typedName, setTypedName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    await onConfirm(restaurant.id);
    setLoading(false);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        background: "rgba(0,0,0,.85)",
        backdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#161210",
          border: "1px solid rgba(192,57,43,.3)",
          borderRadius: 24,
          padding: 28,
          width: "100%",
          maxWidth: 400,
          animation: "fadeInUp .3s ease",
        }}
      >
        {step === 1 ? (
          <>
            <div
              style={{ fontSize: 48, textAlign: "center", marginBottom: 16 }}
            >
              ⚠️
            </div>
            <div
              style={{
                fontFamily: "'Fraunces',serif",
                fontSize: 22,
                fontWeight: 900,
                textAlign: "center",
                marginBottom: 10,
              }}
            >
              Ești sigur?
            </div>
            <div
              style={{
                fontSize: 14,
                color: "#6b6050",
                textAlign: "center",
                lineHeight: 1.6,
                marginBottom: 24,
              }}
            >
              Vrei să ștergi restaurantul
              <br />
              <b style={{ color: "#f0ebe3" }}>„{restaurant.name}"</b>?<br />
              Această acțiune nu poate fi anulată.
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
              <button
                onClick={onClose}
                style={{
                  padding: 13,
                  borderRadius: 12,
                  background: "none",
                  border: "1px solid #2a2218",
                  color: "#6b6050",
                  fontSize: 14,
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Anulează
              </button>
              <button
                onClick={() => setStep(2)}
                style={{
                  padding: 13,
                  borderRadius: 12,
                  background: "rgba(192,57,43,.2)",
                  border: "1px solid rgba(192,57,43,.4)",
                  color: "#e05050",
                  fontSize: 14,
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                Da, șterge
              </button>
            </div>
          </>
        ) : (
          <>
            <div
              style={{ fontSize: 48, textAlign: "center", marginBottom: 16 }}
            >
              🚨
            </div>
            <div
              style={{
                fontFamily: "'Fraunces',serif",
                fontSize: 20,
                fontWeight: 900,
                textAlign: "center",
                marginBottom: 10,
              }}
            >
              Ultima avertizare!
            </div>
            <div
              style={{
                fontSize: 13,
                color: "#6b6050",
                textAlign: "center",
                lineHeight: 1.6,
                marginBottom: 16,
              }}
            >
              Toate datele vor fi șterse permanent:
              <br />
              mese, meniu, rezervări, comenzi, ospătari.
            </div>
            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  fontSize: 11,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                  color: "#e05050",
                  marginBottom: 8,
                  display: "block",
                }}
              >
                Scrie „{restaurant.name}" pentru a confirma
              </label>
              <input
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                placeholder={restaurant.name}
                style={{
                  width: "100%",
                  background: "#1e1a14",
                  border: `1px solid ${typedName === restaurant.name ? "#e05050" : "#2a2218"}`,
                  borderRadius: 12,
                  padding: "12px 14px",
                  color: "#f0ebe3",
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  fontSize: 14,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
              <button
                onClick={onClose}
                style={{
                  padding: 13,
                  borderRadius: 12,
                  background: "none",
                  border: "1px solid #2a2218",
                  color: "#6b6050",
                  fontSize: 14,
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Anulează
              </button>
              <button
                onClick={handleDelete}
                disabled={typedName !== restaurant.name || loading}
                style={{
                  padding: 13,
                  borderRadius: 12,
                  background:
                    typedName === restaurant.name
                      ? "rgba(192,57,43,.3)"
                      : "rgba(255,255,255,.05)",
                  border: `1px solid ${typedName === restaurant.name ? "rgba(192,57,43,.5)" : "#2a2218"}`,
                  color: typedName === restaurant.name ? "#e05050" : "#3a3228",
                  fontSize: 14,
                  cursor:
                    typedName === restaurant.name ? "pointer" : "not-allowed",
                  fontWeight: 700,
                }}
              >
                {loading ? "Se șterge..." : "🗑️ Șterge definitiv"}
              </button>
            </div>
          </>
        )}
      </div>
      <style>{`@keyframes fadeInUp{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}}`}</style>
    </div>
  );
}

// ─── HOME CLIENT ──────────────────────────────────────────────────────────────
function HomeClient() {
  const { state, dispatch, navigate, showToast } = useApp();
  const { user, savedCart } = state;
  const [selectedCity, setSelectedCity] = useState("Toate orașele");
  const [allRestaurants, setAllRestaurants] = useState([]);
  const [loadingRests, setLoadingRests] = useState(true);
  const [activeOrder, setActiveOrder] = useState(null);
  const [showPayNote, setShowPayNote] = useState(false);
  const [payNoteLoading, setPayNoteLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("restaurants")
        .select("*")
        .eq("is_active", true)
        .order("created_at");
      if (data) setAllRestaurants(data);
      setLoadingRests(false);
    };
    load();
  }, []);

  // Urmărește comanda activă în timp real
  useEffect(() => {
    if (!user?.id) return;
    const loadActiveOrder = async () => {
      const { data } = await supabase
        .from("orders")
        .select("*, restaurants(name, emoji)")
        .eq("user_id", user.id)
        .in("status", ["pending", "cooking", "ready", "paying"])
        .order("created_at", { ascending: false })
        .limit(1);
      if (data && data.length > 0) setActiveOrder(data[0]);
      else setActiveOrder(null);
    };
    loadActiveOrder();

    // Polling la fiecare 5 secunde pentru a urmări statusul comenzii
    const interval = setInterval(loadActiveOrder, 5000);
    return () => clearInterval(interval);
  }, [user?.id]);

  const requestBill = async (method) => {
    if (!activeOrder) return;
    setPayNoteLoading(true);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: "paying", payment_method: method })
        .eq("id", activeOrder.id);
      if (error) throw error;
      setActiveOrder((prev) => ({
        ...prev,
        status: "paying",
        payment_method: method,
      }));
      setShowPayNote(false);
      showToast("🧾 Nota cerută! Ospătarul vine în curând.");
    } catch (err) {
      showToast("❌ Eroare. Încearcă din nou.");
    }
    setPayNoteLoading(false);
  };

  const filteredRestaurants = allRestaurants.filter(
    (r) =>
      selectedCity === "Toate orașele" ||
      (r.city || r.address || "")
        .toLowerCase()
        .includes(selectedCity.toLowerCase()),
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
          restaurants={allRestaurants}
        />
      </div>

      <div className="inner" style={{ paddingTop: 16, paddingBottom: 100 }}>
        {/* ── Coș Salvat ── */}
        {savedCart && savedCart.items?.length > 0 && !activeOrder && (
          <div
            style={{
              background: "rgba(192,98,47,.1)",
              border: "1px solid rgba(192,98,47,.3)",
              borderRadius: 16,
              padding: "14px 16px",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 10,
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>
                  🛒 Coș salvat — {savedCart.restaurant_name}
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>
                  {savedCart.items.length} produse
                  {savedCart.table_label
                    ? ` • Masa ${savedCart.table_label}`
                    : ""}
                  {" • "}
                  {savedCart.items
                    .reduce((s, i) => s + i.price * (i.qty || 1), 0)
                    .toFixed(2)}{" "}
                  lei
                </div>
              </div>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
              }}
            >
              <button
                onClick={async () => {
                  // Încarcă restaurantul și coșul
                  const { data: rest } = await supabase
                    .from("restaurants")
                    .select("*")
                    .eq("id", savedCart.restaurant_id)
                    .single();
                  if (rest) {
                    dispatch({ type: "SET_REST", payload: rest });
                    dispatch({ type: "CART_CLEAR" });
                    savedCart.items.forEach((item) => {
                      for (let i = 0; i < (item.qty || 1); i++) {
                        dispatch({ type: "CART_ADD", payload: item });
                      }
                    });
                    if (savedCart.table_label) {
                      dispatch({
                        type: "SET_ORDER_TABLE",
                        payload: savedCart.table_label,
                      });
                    }
                    navigate("menu");
                  }
                }}
                style={{
                  padding: "10px",
                  borderRadius: 12,
                  background: "var(--terra)",
                  border: "none",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                ✅ Continuă comanda
              </button>
              <button
                onClick={async () => {
                  await supabase
                    .from("cart_sessions")
                    .delete()
                    .eq("user_id", user.id);
                  dispatch({ type: "SET_SAVED_CART", payload: null });
                  dispatch({ type: "CART_CLEAR" });
                  showToast("🗑️ Coș anulat.");
                }}
                style={{
                  padding: "10px",
                  borderRadius: 12,
                  background: "rgba(192,57,43,.15)",
                  border: "1px solid rgba(192,57,43,.3)",
                  color: "#e05050",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                ❌ Anulează
              </button>
            </div>
          </div>
        )}

        {/* ── Comandă Activă ── */}
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
              borderRadius: 18,
              padding: "16px",
              marginBottom: 20,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 12,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--muted)",
                    marginBottom: 4,
                  }}
                >
                  {activeOrder.restaurants?.emoji || "🍽️"}{" "}
                  {activeOrder.restaurants?.name || "Restaurant"}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>
                  {activeOrder.status === "pending" &&
                    "⏳ Comanda ta a fost trimisă"}
                  {activeOrder.status === "cooking" && "👨‍🍳 Comanda se prepară"}
                  {activeOrder.status === "ready" && "✅ Comanda e gata!"}
                  {activeOrder.status === "paying" && "🧾 Nota cerută"}
                </div>
              </div>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>
                Masa {activeOrder.table_label}
              </span>
            </div>
            {/* Progress bar */}
            <div style={{ display: "flex", gap: 4 }}>
              {[
                { s: "pending", label: "Trimisă" },
                { s: "cooking", label: "Preparare" },
                { s: "ready", label: "Gata" },
                { s: "paying", label: "Plată" },
              ].map((step) => {
                const statuses = ["pending", "cooking", "ready", "paying"];
                const isDone =
                  statuses.indexOf(step.s) <=
                  statuses.indexOf(activeOrder.status);
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
            {/* Buton cere nota */}
            {activeOrder?.status === "ready" && (
              <button
                onClick={() => setShowPayNote(true)}
                style={{
                  marginTop: 10,
                  width: "100%",
                  padding: "11px",
                  borderRadius: 14,
                  background: "linear-gradient(135deg,#c0622f,#8b3a18)",
                  border: "none",
                  color: "#fff",
                  fontFamily: "'Fraunces',serif",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                🧾 Cere nota de plată
              </button>
            )}
            {activeOrder?.status === "paying" && (
              <div
                style={{
                  fontSize: 12,
                  color: "#5b8dd9",
                  textAlign: "center",
                  marginTop: 8,
                  fontWeight: 600,
                }}
              >
                ✓ Ai ales:{" "}
                {activeOrder.payment_method === "cash" ? "💵 Cash" : "💳 Card"}{" "}
                — ospătarul vine
              </div>
            )}
          </div>
        )}

        {/* Modal Cere Nota din Home */}
        {showPayNote && activeOrder && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,.7)",
              zIndex: 9999,
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
                Masa {activeOrder.table_label} • Total: {activeOrder.total} lei
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
        {loadingRests ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px 0",
              color: "var(--muted)",
              fontSize: 13,
            }}
          >
            Se încarcă restaurantele...
          </div>
        ) : filteredRestaurants.length === 0 ? (
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
              {selectedCity !== "Toate orașele"
                ? `Niciun restaurant în ${selectedCity}`
                : "Niciun restaurant disponibil"}
            </div>
            {selectedCity !== "Toate orașele" && (
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
                Vezi toate
              </button>
            )}
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
function HomeOwner({ onLogout }) {
  const { state, navigate, dispatch, showToast } = useApp();
  const { user } = state;

  const [myRestaurants, setMyRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState(null);
  const [todayStats, setTodayStats] = useState({
    orders: "—",
    reservations: "—",
    revenue: "—",
  });

  // Încarcă restaurantele proprietarului din Supabase
  const loadRestaurants = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("restaurants")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at");
      if (error) {
        console.error(
          "Supabase error:",
          error.message,
          error.details,
          error.hint,
        );
        console.error("user.id folosit:", user.id);
      }
      if (data) setMyRestaurants(data);
    } catch (err) {}
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    loadRestaurants();
  }, [loadRestaurants]);

  // Încarcă statisticile de azi
  useEffect(() => {
    if (!user?.id) return;
    const loadToday = async () => {
      const { data: rests } = await supabase
        .from("restaurants")
        .select("id")
        .eq("owner_id", user.id)
        .limit(1);
      if (!rests || rests.length === 0) return;
      const restId = rests[0].id;
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const { data: orders } = await supabase
        .from("orders")
        .select("total, status")
        .eq("restaurant_id", restId)
        .gte("created_at", startOfDay.toISOString());

      const todayStr = new Date().toISOString().split("T")[0];
      const { count: resCount } = await supabase
        .from("reservations")
        .select("id", { count: "exact", head: true })
        .eq("restaurant_id", restId)
        .eq("date", todayStr)
        .eq("status", "confirmed");

      const revenue = (orders || [])
        .filter((o) => o.status === "paid" || o.status === "completed")
        .reduce((s, o) => s + Number(o.total || 0), 0);

      setTodayStats({
        orders: (orders || []).length,
        reservations: resCount || 0,
        revenue: revenue.toFixed(0),
      });
    };
    loadToday();
  }, [user?.id]);

  // Șterge restaurant din Supabase
  const handleDeleteRestaurant = async (restaurantId) => {
    try {
      const { error } = await supabase
        .from("restaurants")
        .delete()
        .eq("id", restaurantId);
      if (error) throw error;
      setMyRestaurants((prev) => prev.filter((r) => r.id !== restaurantId));
      setDeleteModal(null);
      showToast("🗑️ Restaurantul a fost șters definitiv.");
    } catch (err) {
      showToast("❌ Eroare la ștergere. Încearcă din nou.");
      setDeleteModal(null);
    }
  };

  return (
    <>
      {deleteModal && (
        <DeleteRestaurantModal
          restaurant={deleteModal}
          onConfirm={handleDeleteRestaurant}
          onClose={() => setDeleteModal(null)}
        />
      )}

      <div className="page fade-in">
        {/* Hero */}
        <div
          style={{
            padding: "52px 20px 28px",
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
              justifyContent: "space-between",
              marginBottom: 20,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
            <button
              onClick={onLogout}
              style={{
                padding: "6px 12px",
                borderRadius: 10,
                background: "rgba(192,57,43,.15)",
                border: "1px solid rgba(192,57,43,.3)",
                color: "#e05050",
                fontSize: 11,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Ieși
            </button>
          </div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>
            Bun venit înapoi, 👑
          </div>
          <div
            style={{
              fontFamily: "'Fraunces',serif",
              fontSize: 26,
              fontWeight: 900,
              marginBottom: 4,
            }}
          >
            {user?.name}
          </div>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>
            Plan {user?.plan?.toUpperCase() || "FREE"}
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
              {
                icon: "🍽️",
                label: "Comenzi azi",
                value: "—",
                color: "#c0622f",
              },
              {
                icon: "📅",
                label: "Rezervări azi",
                value: "—",
                color: "#c8a97e",
              },
              {
                icon: "💰",
                label: "Venituri azi",
                value: "—",
                color: "#6b9e6b",
              },
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
                icon: "📡",
                label: "Dashboard Live",
                desc: "Activitate în timp real",
                screen: "dashboardLive",
                color: "rgba(107,158,107,.2)",
                border: "rgba(107,158,107,.3)",
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
          {user?.email === "sloatalucian@yahoo.com" && (
            <div
              onClick={() => navigate("superAdmin")}
              style={{
                background:
                  "linear-gradient(135deg,rgba(91,141,217,.2),rgba(60,100,180,.1))",
                border: "1px solid rgba(91,141,217,.3)",
                borderRadius: 16,
                padding: 16,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 14,
                marginBottom: 10,
              }}
            >
              <div style={{ fontSize: 26 }}>⚙️</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>
                  Super Admin
                </div>
                <div style={{ fontSize: 10, color: "var(--muted)" }}>
                  Gestionează platforma
                </div>
              </div>
            </div>
          )}
          {/* Restaurantele mele */}
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

          {loading ? (
            <div
              style={{
                textAlign: "center",
                padding: "20px 0",
                color: "#6b6050",
                fontSize: 13,
              }}
            >
              Se încarcă...
            </div>
          ) : myRestaurants.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "24px 0",
                color: "#6b6050",
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 8 }}>🏪</div>
              <div style={{ fontSize: 14, color: "#f0ebe3", marginBottom: 6 }}>
                Niciun restaurant creat
              </div>
              <div style={{ fontSize: 12, marginBottom: 16 }}>
                Adaugă primul tău restaurant pentru a începe.
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                marginBottom: 12,
              }}
            >
              {myRestaurants.map((r) => (
                <div
                  key={r.id}
                  style={{
                    background: "#161210",
                    border: "1px solid #2a2218",
                    borderRadius: 16,
                    padding: "14px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
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
                    {r.emoji || "🍽️"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>
                      {r.name}
                    </div>
                    <div
                      style={{ fontSize: 11, color: "#6b6050", marginTop: 2 }}
                    >
                      {r.city} • Plan {r.plan?.toUpperCase() || "FREE"} •{" "}
                      {r.is_active ? "✅ Activ" : "⏸️ Inactiv"}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={() => navigate("adminFloor")}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: "rgba(192,98,47,.15)",
                        border: "1px solid rgba(192,98,47,.3)",
                        color: "#e07a47",
                        fontSize: 14,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => setDeleteModal(r)}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: "rgba(192,57,43,.1)",
                        border: "1px solid rgba(192,57,43,.2)",
                        color: "#e05050",
                        fontSize: 14,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Adaugă restaurant */}
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
    </>
  );
}

// ─── EXPORT ───────────────────────────────────────────────────────────────────
export default function Home({ onLogout }) {
  const { state } = useApp();
  const { user } = state;
  if (user?.role === "owner") return <HomeOwner onLogout={onLogout} />;
  return <HomeClient />;
}
