import { useState, useRef, useEffect, useCallback } from "react";
import ActiveOrderCard from "../components/ActiveOrderCard";
import imageCompression from "browser-image-compression";
import { ProgramEditorModal } from "./Restaurant";
import { useApp } from "../context/AppContext";
import RestaurantCard from "../components/RestaurantCard";
import { RestaurantLocationPicker } from "./NewRestaurant";
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
function HomeClient() {
  const {
    state,
    dispatch,
    navigate,
    showToast,
    requestBillRef,
    setPayNoteShow,
    setPayNoteActiveOrder,
    waiterCalled,
    waiterCooldown,
    callWaiter: callWaiterGlobal,
    setPaidTotal,
  } = useApp();
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
    setPaidTotal(activeOrder.total || null);
    setPayNoteLoading(true);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: "paying", payment_method: method })
        .eq("id", activeOrder.id);
      if (error) throw error;

      // Actualizează statusul mesei la "paid" (albastru)
      if (activeOrder.table_label && activeOrder.restaurant_id) {
        await supabase
          .from("table_sessions")
          .update({ status: "paid", paid_at: new Date().toISOString() })
          .eq("restaurant_id", activeOrder.restaurant_id)
          .eq("table_label", activeOrder.table_label)
          .eq("status", "occupied");
      }

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
  requestBillRef.current = requestBill;

  // Polling - detecteaza cand ospatarul confirma plata din Home
  useEffect(() => {
    if (!activeOrder?.id || !user?.id) return;
    if (activeOrder.status !== "paying") return;

    const check = async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, status, payment_method, total")
        .eq("id", activeOrder.id)
        .eq("status", "paid")
        .limit(1);

      if (data && data.length > 0) {
        dispatch({
          type: "SET_PAID",
          payload: {
            paid: true,
            method: data[0].payment_method,
            restaurantId: activeOrder.restaurant_id || null,
            sessionId: null,
            total: data[0].total || null,
          },
        });
      }
    };

    const interval = setInterval(check, 5000);
    check();
    return () => clearInterval(interval);
  }, [activeOrder?.id, activeOrder?.status, user?.id]);

  // Sync payNote state to global context
  useEffect(() => {
    setPayNoteShow(showPayNote);
  }, [showPayNote]);

  useEffect(() => {
    setPayNoteActiveOrder(activeOrder);
  }, [activeOrder]);

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
          onMapClick={() => navigate("map")}
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
        <ActiveOrderCard
          activeOrder={activeOrder}
          waiterCalled={waiterCalled}
          waiterCooldown={waiterCooldown}
          callWaiter={() => callWaiterGlobal(activeOrder)}
          onCereNota={() => setShowPayNote(true)}
        />

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
  const [photoModal, setPhotoModal] = useState(null); // restaurantul pentru care uploadam poza
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const photoInputRef = useRef(null);
  const [locationEditRest, setLocationEditRest] = useState(null);
  const [todayStats, setTodayStats] = useState({
    orders: "—",
    reservations: "—",
    revenue: "—",
  });
  const [showProgramModal, setShowProgramModal] = useState(false);
  const [programRestId, setProgramRestId] = useState(null);
  const [currentProgram, setCurrentProgram] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

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
        .eq("is_deleted", false)
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

  // Realtime + polling: reîncarcă restaurantele când SuperAdmin aprobă locația
  useEffect(() => {
    if (!user?.id) return;

    // Realtime fără filtru — mai fiabil decât filtrul pe coloană
    const channel = supabase
      .channel(`owner-restaurants-${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "restaurants" },
        () => {
          loadRestaurants();
        },
      )
      .subscribe();

    // Polling fallback la fiecare 10 secunde (prinde și cazurile când Realtime nu e activat)
    const interval = setInterval(() => {
      loadRestaurants();
    }, 10000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [user?.id, loadRestaurants]);

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
  // ── Upload poza restaurant ──
  const handlePhotoSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.8,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
      });
      setPhotoFile(compressed);
      setPhotoPreview(URL.createObjectURL(compressed));
    } catch (err) {
      showToast("❌ Eroare la procesarea imaginii.");
    }
  };

  const handlePhotoSave = async () => {
    if (!photoFile || !photoModal) return;
    setPhotoLoading(true);
    try {
      const ext = photoFile.name?.split(".").pop() || "jpg";
      const path = `${photoModal.id}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("restaurant-covers")
        .upload(path, photoFile, { upsert: true, contentType: photoFile.type });
      if (uploadError) throw uploadError;
      const {
        data: { publicUrl },
      } = supabase.storage.from("restaurant-covers").getPublicUrl(path);
      const { error: updateError } = await supabase
        .from("restaurants")
        .update({ cover_image: publicUrl })
        .eq("id", photoModal.id);
      if (updateError) throw updateError;
      setMyRestaurants((prev) =>
        prev.map((r) =>
          r.id === photoModal.id ? { ...r, cover_image: publicUrl } : r,
        ),
      );
      setPhotoModal(null);
      setPhotoPreview(null);
      setPhotoFile(null);
      showToast("✅ Fotografia a fost salvată!");
    } catch (err) {
      showToast("❌ Eroare la salvarea fotografiei.");
    }
    setPhotoLoading(false);
  };

  const handleDeleteRestaurant = async (restaurantId) => {
    try {
      const { error } = await supabase
        .from("restaurants")
        .update({
          is_deleted: true,
          is_active: false,
          deleted_at: new Date().toISOString(),
        })
        .eq("id", restaurantId);
      if (error) throw error;
      setMyRestaurants((prev) => prev.filter((r) => r.id !== restaurantId));
      setDeleteModal(null);
      showToast("🗑️ Restaurantul a fost șters. Datele sunt păstrate 90 zile.");
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

      {/* Modal upload fotografie */}
      {photoModal && (
        <div
          onClick={() => {
            setPhotoModal(null);
            setPhotoPreview(null);
            setPhotoFile(null);
          }}
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
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#161210",
              border: "1px solid #2a2218",
              borderRadius: 24,
              padding: 24,
              width: "100%",
              maxWidth: 400,
              animation: "fadeInUp .3s ease",
            }}
          >
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "#f0ebe3",
                marginBottom: 16,
              }}
            >
              📷 Fotografie restaurant
            </div>

            {/* Preview */}
            <div
              onClick={() => photoInputRef.current?.click()}
              style={{
                width: "100%",
                height: 200,
                borderRadius: 16,
                marginBottom: 16,
                background: photoPreview
                  ? "transparent"
                  : "rgba(255,255,255,.05)",
                border: `2px dashed ${photoPreview ? "#c0622f" : "#2a2218"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                overflow: "hidden",
                position: "relative",
              }}
            >
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="preview"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <div style={{ textAlign: "center", color: "#6b6050" }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🖼️</div>
                  <div style={{ fontSize: 13 }}>
                    Apasă pentru a alege o fotografie
                  </div>
                  <div style={{ fontSize: 11, marginTop: 4, color: "#4a3a28" }}>
                    JPG, PNG, WebP • Max 10MB
                  </div>
                </div>
              )}
            </div>

            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handlePhotoSelect}
            />

            {photoPreview && (
              <button
                onClick={() => photoInputRef.current?.click()}
                style={{
                  width: "100%",
                  padding: 10,
                  borderRadius: 12,
                  marginBottom: 10,
                  background: "rgba(255,255,255,.05)",
                  border: "1px solid #2a2218",
                  color: "#c8a97e",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Alege altă fotografie
              </button>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
              <button
                onClick={() => {
                  setPhotoModal(null);
                  setPhotoPreview(null);
                  setPhotoFile(null);
                }}
                style={{
                  padding: 13,
                  borderRadius: 12,
                  background: "none",
                  border: "1px solid #2a2218",
                  color: "#6b6050",
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Anulează
              </button>
              <button
                onClick={handlePhotoSave}
                disabled={!photoFile || photoLoading}
                style={{
                  padding: 13,
                  borderRadius: 12,
                  cursor: photoFile ? "pointer" : "not-allowed",
                  background: photoFile
                    ? "linear-gradient(135deg,#c0622f,#8b3a18)"
                    : "#2a2218",
                  border: "none",
                  color: photoFile ? "#fff" : "#6b6050",
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                {photoLoading ? "Se salvează..." : "✅ Salvează"}
              </button>
            </div>
          </div>
        </div>
      )}

      {locationEditRest && (
        <RestaurantLocationPicker
          city={locationEditRest.city}
          restaurantId={locationEditRest.id}
          showToast={showToast}
          onSelect={async (loc) => {
            try {
              const {
                data: { session },
              } = await supabase.auth.getSession();
              await supabase.from("location_requests").insert({
                owner_id: session?.user?.id,
                restaurant_id: locationEditRest.id,
                restaurant_name: locationEditRest.name,
                lat: loc.lat,
                lon: loc.lon,
                city: locationEditRest.city,
                type: "update",
                status: "pending",
              });
              showToast(
                "✅ Cerere de modificare locație trimisă! Vei fi notificat după aprobare.",
              );
            } catch (e) {
              showToast("❌ Eroare la trimitere.");
            }
            setLocationEditRest(null);
          }}
          onClose={() => setLocationEditRest(null)}
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
                icon: "🕐",
                label: "Program",
                desc: "Ore funcționare",
                screen: "programEditor",
                color: "rgba(91,141,217,.2)",
                border: "rgba(91,141,217,.3)",
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
                onClick={() => {
                  if (btn.screen === "programEditor") {
                    // Dacă are un singur restaurant, îl selectăm automat
                    if (myRestaurants.length === 1) {
                      setProgramRestId(myRestaurants[0].id);
                      supabase
                        .from("restaurants")
                        .select("program")
                        .eq("id", myRestaurants[0].id)
                        .single()
                        .then(({ data }) => {
                          setCurrentProgram(data?.program || null);
                          setShowProgramModal(true);
                        });
                    } else {
                      setShowProgramModal(true);
                    }
                    return;
                  }
                  navigate(btn.screen);
                }}
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
          {user?.role === "superadmin" && (
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
                    background: r.is_active
                      ? "#161210"
                      : "rgba(224,122,71,.04)",
                    border: `1px solid ${r.is_active ? "#2a2218" : "rgba(224,122,71,.3)"}`,
                    borderRadius: 16,
                    padding: "14px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                  }}
                >
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 13,
                      background: r.cover_image
                        ? `url(${r.cover_image}) center/cover no-repeat`
                        : "linear-gradient(135deg,#2d1507,#1a0e05)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 26,
                      flexShrink: 0,
                    }}
                  >
                    {!r.cover_image && (r.emoji || "🍽️")}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>
                      {r.name}
                    </div>
                    <div
                      style={{ fontSize: 11, color: "#6b6050", marginTop: 2 }}
                    >
                      {r.city} • Plan {r.plan?.toUpperCase() || "FREE"} •{" "}
                      <span
                        style={{
                          color: r.is_active ? "#6b9e6b" : "#e07a47",
                          fontWeight: 600,
                        }}
                      >
                        {r.is_active ? "✅ Activ" : "⏳ În așteptare"}
                      </span>
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
                      onClick={() => {
                        setPhotoModal(r);
                        setPhotoPreview(r.cover_image || null);
                        setPhotoFile(null);
                      }}
                      title="Adaugă fotografie"
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: "rgba(74,110,74,.1)",
                        border: "1px solid rgba(74,110,74,.25)",
                        color: "#6b9e6b",
                        fontSize: 14,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      📷
                    </button>
                    <button
                      onClick={() => setLocationEditRest(r)}
                      title="Modifică locația pe hartă"
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: "rgba(200,169,126,.1)",
                        border: "1px solid rgba(200,169,126,.25)",
                        color: "#c8a97e",
                        fontSize: 14,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      📍
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
          {(() => {
            const plan = user?.plan || "free";
            const maxAllowed = plan === "business" ? 5 : 1;
            const atLimit = myRestaurants.length >= maxAllowed;
            return (
              <div
                onClick={() => {
                  if (atLimit) {
                    setShowUpgradeModal(true);
                  } else {
                    navigate("newRestaurant");
                  }
                }}
                style={{
                  border: `1px dashed ${atLimit ? "#3a2a1a" : "#2a2218"}`,
                  borderRadius: 16,
                  padding: 16,
                  cursor: "pointer",
                  textAlign: "center",
                  color: atLimit ? "#4a3828" : "#6b6050",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  position: "relative",
                }}
              >
                <span style={{ fontSize: 20 }}>{atLimit ? "🔒" : "+"}</span>
                <span style={{ fontSize: 13 }}>Adaugă restaurant nou</span>
                {atLimit && (
                  <span
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 10,
                      fontSize: 10,
                      color: "#c0622f",
                      fontWeight: 700,
                      letterSpacing: 0.3,
                      textTransform: "uppercase",
                    }}
                  >
                    {plan === "free" ? "Free" : "Pro"}
                  </span>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Modal Upgrade Plan */}
      {showUpgradeModal && (
        <div
          onClick={() => setShowUpgradeModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(8,5,3,0.88)",
            backdropFilter: "blur(8px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 24px",
          }}
        >
          <style>{`
            @keyframes wafSlideUp {
              from { opacity: 0; transform: translateY(32px) scale(0.96); }
              to   { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes wafFadeUp {
              from { opacity: 0; transform: translateY(10px); }
              to   { opacity: 1; transform: translateY(0); }
            }
            @keyframes wafSpin {
              from { transform: rotate(0deg); }
              to   { transform: rotate(360deg); }
            }
            @keyframes wafPulse {
              0%, 100% { opacity: 0.7; transform: translateX(-50%) scale(1); }
              50%       { opacity: 1;   transform: translateX(-50%) scale(1.15); }
            }
            @keyframes wafShimmer {
              0%   { left: -100%; }
              100% { left: 160%; }
            }
            @keyframes wafDotPulse {
              0%, 100% { opacity: 0.3; transform: scale(1); }
              50%       { opacity: 1;   transform: scale(1.4); }
            }
            .waf-modal-box {
              background: #120d09;
              border: 1px solid #2a1e14;
              border-radius: 28px;
              max-width: 340px;
              width: 100%;
              overflow: hidden;
              animation: wafSlideUp 0.45s cubic-bezier(0.16,1,0.3,1) both;
              position: relative;
            }
            .waf-glow-top {
              position: absolute;
              top: -60px; left: 50%;
              transform: translateX(-50%);
              width: 200px; height: 120px;
              background: radial-gradient(ellipse, rgba(192,98,47,0.35) 0%, transparent 70%);
              pointer-events: none;
              animation: wafPulse 3s ease-in-out infinite;
            }
            .waf-ring-svg {
              position: absolute; inset: 0;
              animation: wafSpin 8s linear infinite;
            }
            .waf-plan-card { transition: border-color 0.2s, transform 0.15s; }
            .waf-plan-card:hover { transform: translateY(-1px); }
            .waf-cta-btn {
              position: relative; overflow: hidden;
              transition: transform 0.15s;
            }
            .waf-cta-btn::before {
              content: '';
              position: absolute; top: 0; left: -100%;
              width: 50%; height: 100%;
              background: rgba(192,98,47,0.12);
              transform: skewX(-20deg);
              animation: wafShimmer 2.5s 1s infinite;
            }
            .waf-cta-btn:hover { transform: translateY(-1px); }
            .waf-cta-btn:active { transform: scale(0.98); }
          `}</style>

          <div className="waf-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="waf-glow-top" />

            {/* Header */}
            <div
              style={{
                padding: "36px 28px 24px",
                textAlign: "center",
                position: "relative",
              }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  margin: "0 auto 20px",
                  position: "relative",
                }}
              >
                <svg className="waf-ring-svg" viewBox="0 0 72 72" fill="none">
                  <circle
                    cx="36"
                    cy="36"
                    r="34"
                    stroke="#2a1e14"
                    strokeWidth="1"
                    strokeDasharray="4 6"
                    strokeLinecap="round"
                  />
                  <circle cx="36" cy="2" r="3" fill="#c0622f" opacity="0.7" />
                  <circle cx="70" cy="36" r="2" fill="#8a4a2a" opacity="0.5" />
                  <circle
                    cx="36"
                    cy="70"
                    r="2.5"
                    fill="#c0622f"
                    opacity="0.6"
                  />
                  <circle cx="2" cy="36" r="2" fill="#8a4a2a" opacity="0.4" />
                </svg>
                <div
                  style={{
                    position: "absolute",
                    inset: 10,
                    background: "#1e130a",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 24,
                    border: "1px solid #2e1e10",
                  }}
                >
                  🏪
                </div>
              </div>

              <div
                style={{
                  fontFamily: "'Fraunces', serif",
                  fontSize: 24,
                  fontWeight: 900,
                  color: "#f5ede3",
                  lineHeight: 1.2,
                  marginBottom: 10,
                  animation: "wafFadeUp 0.5s 0.15s both",
                }}
              >
                Vrei mai multe
                <br />
                restaurante?
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: "#7a6a58",
                  lineHeight: 1.65,
                  animation: "wafFadeUp 0.5s 0.22s both",
                }}
              >
                Planul tău actual permite un singur restaurant.
                <br />
                Fă upgrade și extinde-ți afacerea.
              </div>
            </div>

            {/* Divider */}
            <div
              style={{
                height: 1,
                background:
                  "linear-gradient(90deg,transparent,#2a1e14 30%,#2a1e14 70%,transparent)",
                margin: "0 28px",
              }}
            />

            {/* Plan cards */}
            <div
              style={{
                padding: "20px 20px 0",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                animation: "wafFadeUp 0.5s 0.3s both",
              }}
            >
              {/* Pro */}
              <div
                className="waf-plan-card"
                style={{
                  background: "#171109",
                  border: "1px solid #251a10",
                  borderRadius: 16,
                  padding: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: "'Fraunces', serif",
                      fontSize: 16,
                      fontWeight: 700,
                      color: "#c8a97e",
                      marginBottom: 3,
                    }}
                  >
                    Pro
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 6,
                      marginTop: 6,
                    }}
                  >
                    {["1 restaurant", "Statistici avansate", "Export CSV"].map(
                      (f) => (
                        <span
                          key={f}
                          style={{
                            fontSize: 11,
                            color: "#5a4a38",
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid #1e1510",
                            borderRadius: 5,
                            padding: "2px 7px",
                          }}
                        >
                          {f}
                        </span>
                      ),
                    )}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: "#e8ddd0",
                    whiteSpace: "nowrap",
                    textAlign: "right",
                  }}
                >
                  250 lei
                  <span
                    style={{ fontSize: 11, color: "#4a3828", fontWeight: 400 }}
                  >
                    /lună
                  </span>
                </div>
              </div>

              {/* Business */}
              <div
                className="waf-plan-card"
                style={{
                  background: "#1a1008",
                  border: "1px solid rgba(192,98,47,0.35)",
                  borderRadius: 16,
                  padding: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      marginBottom: 3,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'Fraunces', serif",
                        fontSize: 16,
                        fontWeight: 700,
                        color: "#d97a45",
                      }}
                    >
                      Business
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#c0622f",
                        background: "rgba(192,98,47,0.15)",
                        border: "1px solid rgba(192,98,47,0.3)",
                        borderRadius: 5,
                        padding: "1px 6px",
                        letterSpacing: "0.8px",
                        textTransform: "uppercase",
                      }}
                    >
                      Recomandat
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 6,
                      marginTop: 6,
                    }}
                  >
                    {[
                      "5 restaurante",
                      "Rapoarte comparative",
                      "Email automat",
                    ].map((f) => (
                      <span
                        key={f}
                        style={{
                          fontSize: 11,
                          color: "#7a5a40",
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(192,98,47,0.15)",
                          borderRadius: 5,
                          padding: "2px 7px",
                        }}
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: "#d97a45",
                    whiteSpace: "nowrap",
                    textAlign: "right",
                  }}
                >
                  800 lei
                  <span
                    style={{ fontSize: 11, color: "#4a3828", fontWeight: 400 }}
                  >
                    /lună
                  </span>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div
              style={{
                padding: "20px 20px 12px",
                animation: "wafFadeUp 0.5s 0.4s both",
              }}
            >
              <div
                className="waf-cta-btn"
                onClick={() => setShowUpgradeModal(false)}
                style={{
                  background: "#ffffff",
                  borderRadius: 16,
                  padding: 17,
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#1a0e06",
                  cursor: "pointer",
                  letterSpacing: 0.4,
                  textAlign: "center",
                  boxSizing: "border-box",
                }}
              >
                Contactează-ne pentru upgrade →
              </div>
            </div>

            {/* Back */}
            <div
              onClick={() => setShowUpgradeModal(false)}
              style={{
                textAlign: "center",
                fontSize: 13,
                color: "#8a7060",
                cursor: "pointer",
                padding: "0 20px 22px",
                animation: "wafFadeUp 0.5s 0.45s both",
              }}
            >
              ← Înapoi
            </div>

            {/* Dots */}
            <div
              style={{
                position: "absolute",
                bottom: 12,
                right: 16,
                display: "flex",
                gap: 4,
              }}
            >
              {[0, 0.3, 0.6].map((d, i) => (
                <div
                  key={i}
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: "50%",
                    background: "#2a1a10",
                    animation: `wafDotPulse 2s ${d}s infinite`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal Editor Program */}
      {showProgramModal && (
        <ProgramEditorModal
          restaurants={myRestaurants}
          initialRestId={programRestId}
          initialProgram={currentProgram}
          onClose={() => setShowProgramModal(false)}
          onSave={async (restId, newProgram) => {
            const { error } = await supabase
              .from("restaurants")
              .update({ program: newProgram })
              .eq("id", restId);
            if (!error) {
              showToast("✅ Programul a fost salvat!");
              setShowProgramModal(false);
            } else {
              showToast("❌ Eroare la salvare.");
            }
          }}
        />
      )}
    </>
  );
}

// ─── EXPORT ───────────────────────────────────────────────────────────────────
export default function Home({ onLogout }) {
  const { state } = useApp();
  const { user } = state;
  if (user?.role === "owner" || user?.role === "superadmin")
    return <HomeOwner onLogout={onLogout} />;
  return <HomeClient />;
}
