import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { supabase } from "../supabase";
import ActiveOrderCard from "../components/ActiveOrderCard";
import RestaurantCard from "../components/RestaurantCard";
import SearchBar from "./SearchBar";

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

export default HomeClient;
