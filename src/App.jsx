import { useState, useEffect } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { TableProvider } from "./context/TableContext";
import BottomNav from "./components/BottomNav";
import Home from "./pages/Home";
import Restaurant from "./pages/Restaurant";
import { Rezervare } from "./pages/Rezervare";
import { Meniu } from "./pages/Meniu";
import { Auth } from "./pages/Auth";
import { SelectTable, WaiterTablet } from "./pages/SelectTable";
import DashboardLive from "./pages/DashboardLive";
import { WaiterLogin, WaiterManagement } from "./pages/WaiterManagement";
import HartaPage from "./pages/HartaPage";
import StatisticiProprietar from "./pages/StatisticiProprietar";
import SplashScreen from "./pages/SplashScreen";
import MenuEditor from "./pages/MenuEditor";
import NewRestaurant from "./pages/NewRestaurant";
import Notifications from "./pages/Notifications";
import FloorEditor from "./pages/FloorEditor";
import SuperAdmin from "./pages/SuperAdmin";
import { supabase } from "./supabase";
import "./styles/global.css";

const ADMIN_EMAIL = "sloatalucian@yahoo.com";

function Router() {
  const { state, dispatch, navigate, showToast } = useApp();
  const {
    screen,
    selectedRest,
    orders,
    toast,
    user,
    paid,
    payMethod,
    tableSessionId,
    reviewRestId: stateReviewRestId,
    reviewSessionId: stateReviewSessionId,
  } = state;

  const [splashDone, setSplashDone] = useState(false);
  const [waiterUser, setWaiterUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    // Timeout de siguranta - daca dureaza mai mult de 5 secunde, resetam
    const safetyTimeout = setTimeout(() => {
      setCheckingSession(false);
    }, 5000);

    const checkSession = async () => {
      try {
        // Incercam sa reinnnoim sesiunea daca exista
        let session = null;
        const { data: sessionData } = await supabase.auth.getSession();
        session = sessionData?.session;

        // Daca sesiunea e expirata, o reinnnoim automat
        if (session && session.expires_at * 1000 < Date.now()) {
          const { data: refreshData } = await supabase.auth.refreshSession();
          session = refreshData?.session;
        }

        if (session?.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single();
          if (
            profile?.role === "owner" &&
            profile?.status === "pending" &&
            profile?.role !== "superadmin"
          ) {
            await supabase.auth.signOut();
            setCheckingSession(false);
            return;
          }
          dispatch({
            type: "SET_USER",
            payload: {
              id: session.user.id,
              name: profile?.full_name || session.user.email.split("@")[0],
              email: session.user.email,
              plan: profile?.plan || "free",
              restName: profile?.restaurant_name || "Restaurantul meu",
              role: profile?.role || "client",
            },
          });
          setSplashDone(true);
        }
      } catch (err) {}
      setCheckingSession(false);
    };
    checkSession().finally(() => {
      clearTimeout(safetyTimeout);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        dispatch({ type: "SET_USER", payload: null });
        setSplashDone(false);
        setWaiterUser(null);
      } else if (event === "TOKEN_REFRESHED" && session?.user) {
        // Token reinnoit automat - pastram userul logat
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();
        dispatch({
          type: "SET_USER",
          payload: {
            id: session.user.id,
            name: profile?.full_name || session.user.email.split("@")[0],
            email: session.user.email,
            plan: profile?.plan || "free",
            restName: profile?.restaurant_name || "Restaurantul meu",
            role: profile?.role || "client",
          },
        });
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Notificări polling ──
  useEffect(() => {
    const userId = state.user?.id;
    if (!userId) return;

    const loadUnread = async () => {
      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false);
      const unread = parseInt(count) || 0;
      dispatch({ type: "SET_UNREAD", payload: unread });
    };

    loadUnread();
    const interval = setInterval(loadUnread, 8000);
    return () => clearInterval(interval);
  }, [state.user?.id]);

  const noNav = [
    "auth",
    "selectTable",
    "newRestaurant",
    "waiterLogin",
    "superAdmin",
  ];

  const handleOrderUpdate = (id, status, extra = {}) =>
    dispatch({ type: "ORDER_UPDATE", payload: { id, status, ...extra } });
  const handleOrderClose = (id) =>
    dispatch({ type: "ORDER_REMOVE", payload: id });
  const handleTableSelected = ({ table, sessionId }) => {
    dispatch({ type: "SET_ORDER_TABLE", payload: table.label });
    dispatch({ type: "SET_TABLE_SESSION", payload: sessionId });
    dispatch({ type: "SET_MENU_CAT", payload: null });
    navigate("menu");
    showToast(`✅ Masa ${table.label} selectată!`);
  };
  const handleWaiterLogin = async (waiter) => {
    setWaiterUser(waiter);
    if (waiter.restaurantId) {
      const { data: rest } = await supabase
        .from("restaurants")
        .select("*")
        .eq("id", waiter.restaurantId)
        .single();
      if (rest) dispatch({ type: "SET_REST", payload: rest });
    }
    setSplashDone(true);
    navigate("waiter");
    showToast(`👋 Bun venit, ${waiter.name}!`);
  };
  const handleWaiterLogout = () => {
    setWaiterUser(null);
    navigate("home");
    showToast("👋 Ai ieșit din tabletă.");
  };
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSent, setReviewSent] = useState(false);

  const handleSendReview = async () => {
    if (!reviewRating || !user?.id) return;
    const restId =
      state.reviewRestId || state.selectedRest?.id || selectedRest?.id;
    const sessId = state.reviewSessionId;
    if (!restId) {
      setReviewSent(true);
      return;
    }
    try {
      const { error } = await supabase.from("restaurant_reviews").insert({
        restaurant_id: restId,
        user_id: user.id,
        table_session_id: sessId || null,
        rating: reviewRating,
        comment: reviewComment.trim() || null,
      });
      if (!error) {
        await supabase.rpc("update_restaurant_rating", {
          p_restaurant_id: restId,
        });
        // Reincarcam rating-ul restaurantului in state
        const { data: updatedRest } = await supabase
          .from("restaurants")
          .select("rating")
          .eq("id", restId)
          .single();
        if (updatedRest) {
          dispatch({ type: "UPDATE_REST_RATING", payload: updatedRest.rating });
        }
      }
    } catch {}
    setReviewSent(true);
  };

  // Reset review state cand paid devine false
  useEffect(() => {
    if (!paid) {
      setReviewRating(0);
      setReviewComment("");
      setReviewSent(false);
    }
  }, [paid]);

  // Polling global - detecteaza cand ospatarul confirma plata indiferent de ecran
  useEffect(() => {
    if (!user?.id || !selectedRest?.id || !tableSessionId) return;
    // Evitam dublu polling cu Meniu - rulam doar cand nu suntem pe ecranul menu
    if (screen === "menu") return;

    const checkPayment = async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, status, payment_method")
        .eq("user_id", user.id)
        .eq("restaurant_id", selectedRest.id)
        .eq("table_session_id", tableSessionId)
        .in("status", ["paying"])
        .limit(1);

      if (!data || data.length === 0) {
        // Verificam daca exista comenzi paid (ospatarul a confirmat)
        const { data: paidOrders } = await supabase
          .from("orders")
          .select("id, status, payment_method")
          .eq("user_id", user.id)
          .eq("restaurant_id", selectedRest.id)
          .eq("table_session_id", tableSessionId)
          .eq("status", "paid")
          .limit(1);

        if (paidOrders && paidOrders.length > 0 && !paid) {
          dispatch({
            type: "SET_PAID",
            payload: {
              paid: true,
              method: paidOrders[0].payment_method,
              restaurantId: selectedRest?.id || null,
              sessionId: tableSessionId || null,
            },
          });
          dispatch({ type: "RESET_TABLE_SESSION" });
        }
      }
    };

    const interval = setInterval(checkPayment, 5000);
    checkPayment();
    return () => clearInterval(interval);
  }, [user?.id, selectedRest?.id, tableSessionId, screen, paid]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    dispatch({ type: "SET_USER", payload: null });
    setSplashDone(false);
    showToast("👋 Ai ieșit din cont.");
  };

  if (checkingSession) {
    return (
      <div
        className="app"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "#0d0a07",
          flexDirection: "column",
        }}
      >
        <BurgerLoader />
      </div>
    );
  }

  if (!splashDone) {
    return (
      <div className="app">
        {toast && <div className="toast">{toast}</div>}
        <SplashScreen
          onComplete={(role) => setSplashDone(true)}
          onWaiterLogin={handleWaiterLogin}
        />
      </div>
    );
  }

  if (screen === "waiter") {
    return (
      <TableProvider restaurantId={selectedRest?.id}>
        <div className="app">
          {toast && <div className="toast">{toast}</div>}
          <WaiterTablet
            restaurant={
              selectedRest || {
                name: waiterUser?.restaurantName || "Restaurant",
                floors: [],
              }
            }
            restaurantId={waiterUser?.restaurantId || selectedRest?.id}
            orders={orders}
            onOrderUpdate={handleOrderUpdate}
            onOrderClose={handleOrderClose}
            onBack={handleWaiterLogout}
            waiterName={waiterUser?.name || "Ospătar"}
            waiterId={waiterUser?.id}
          />
        </div>
      </TableProvider>
    );
  }

  const pages = {
    home: <Home onLogout={handleLogout} />,
    restaurant: <Restaurant />,
    reserve: <Rezervare />,
    menu: <Meniu />,
    auth: <Auth />,
    map: <HartaPage />,
    admin: (
      <WaiterManagement
        onBack={() => navigate("home")}
        onLogout={handleLogout}
      />
    ),
    adminFloor: <FloorEditor />,
    statistici: <StatisticiProprietar />,
    dashboardLive: <DashboardLive />,
    menuEditor: <MenuEditor />,
    newRestaurant: <NewRestaurant />,
    notifications: <Notifications />,
    superAdmin: <SuperAdmin />,
    waiterLogin: (
      <WaiterLogin
        onLogin={handleWaiterLogin}
        onBack={() => navigate("home")}
      />
    ),
    selectTable: (
      <SelectTable
        restaurant={selectedRest}
        onSelected={handleTableSelected}
        onBack={() => navigate("restaurant")}
      />
    ),
  };

  return (
    <TableProvider restaurantId={selectedRest?.id}>
      <div className="app">
        {toast && <div className="toast">{toast}</div>}
        {/* Overlay global Grazie mille + Review */}
        {paid && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 8888,
              background: "rgba(0,0,0,.75)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
            }}
          >
            <div
              className="fade-in"
              style={{
                background: "#1a1510",
                border: "1px solid #2a2218",
                borderRadius: 24,
                padding: "32px 24px",
                width: "100%",
                maxWidth: 380,
                maxHeight: "85vh",
                overflowY: "auto",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 68, marginBottom: 16 }}>
                {payMethod === "cash" ? "💵" : "💳"}
              </div>
              <div
                style={{
                  fontFamily: "'Fraunces',serif",
                  fontSize: 28,
                  fontWeight: 900,
                  marginBottom: 8,
                }}
              >
                Grazie mille!
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: "var(--muted)",
                  lineHeight: 1.6,
                  marginBottom: 24,
                }}
              >
                Plata confirmată. Vă așteptăm din nou! 🍝
              </div>
              {!reviewSent ? (
                <div
                  style={{
                    background: "var(--card)",
                    borderRadius: 16,
                    padding: 20,
                    marginBottom: 20,
                    textAlign: "left",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'Fraunces',serif",
                      fontSize: 16,
                      fontWeight: 700,
                      marginBottom: 12,
                      textAlign: "center",
                    }}
                  >
                    Cum a fost experiența la {selectedRest?.name}?
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      gap: 4,
                      marginBottom: 16,
                    }}
                  >
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setReviewRating(star)}
                        style={{
                          fontSize: 40,
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: star <= reviewRating ? "#f5c518" : "#3a2e22",
                          transition: "color .15s, transform .15s",
                          transform:
                            star <= reviewRating ? "scale(1.15)" : "scale(1)",
                          lineHeight: 1,
                          padding: "4px 2px",
                        }}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  <textarea
                    maxLength={500}
                    placeholder="Comentariu opțional..."
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    style={{
                      width: "100%",
                      background: "var(--card2)",
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      padding: 12,
                      color: "var(--cream)",
                      fontSize: 13,
                      minHeight: 80,
                      resize: "none",
                      boxSizing: "border-box",
                      marginBottom: 12,
                    }}
                  />
                  <button
                    onClick={handleSendReview}
                    disabled={!reviewRating}
                    style={{
                      width: "100%",
                      padding: 12,
                      borderRadius: 12,
                      background: reviewRating
                        ? "linear-gradient(135deg,#c0622f,#8b3a18)"
                        : "#2a2218",
                      border: "none",
                      color: reviewRating ? "#fff" : "#6b6050",
                      fontWeight: 700,
                      cursor: reviewRating ? "pointer" : "not-allowed",
                      fontSize: 14,
                    }}
                  >
                    Trimite recenzia
                  </button>
                </div>
              ) : (
                <div
                  style={{ color: "#6b9e6b", fontSize: 14, marginBottom: 20 }}
                >
                  ✅ Recenzie trimisă! Mulțumim!
                </div>
              )}
              <button
                className="btn-primary"
                onClick={() => {
                  dispatch({
                    type: "SET_PAID",
                    payload: { paid: false, method: null },
                  });
                  dispatch({ type: "SET_PAYMENT", payload: false });
                  navigate("home");
                }}
              >
                Înapoi acasă
              </button>
            </div>
          </div>
        )}
        <div key={screen} className="page-transition">
          {pages[screen] || <Home />}
        </div>
        {screen !== "waiter" && !noNav.includes(screen) && (
          <BottomNav
            waiterLoggedIn={!!waiterUser}
            unreadCount={state.unreadCount}
          />
        )}
      </div>
    </TableProvider>
  );
}

function BurgerLoader() {
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState("building");
  const [dotIdx, setDotIdx] = useState(0);
  const layers = ["l0", "l1", "l2", "l3", "l4", "l5"];

  useEffect(() => {
    if (phase === "building") {
      if (step < layers.length) {
        const t = setTimeout(() => setStep((s) => s + 1), 420);
        return () => clearTimeout(t);
      } else {
        const t = setTimeout(() => setPhase("waiting"), 1000);
        return () => clearTimeout(t);
      }
    } else if (phase === "waiting") {
      const t = setTimeout(() => setPhase("hiding"), 100);
      return () => clearTimeout(t);
    } else if (phase === "hiding") {
      const t = setTimeout(() => {
        setStep(0);
        setPhase("building");
      }, 600);
      return () => clearTimeout(t);
    }
  }, [step, phase]);

  useEffect(() => {
    const t = setInterval(() => setDotIdx((i) => i + 1), 400);
    return () => clearInterval(t);
  }, []);

  const ls = (idx) => ({
    position: "absolute",
    left: 0,
    right: 0,
    opacity: phase === "hiding" ? 0 : step > idx ? 1 : 0,
    transform:
      phase === "hiding"
        ? "scale(0.94) translateY(6px)"
        : step > idx
          ? "translateY(0)"
          : "translateY(-14px)",
    transition:
      phase === "hiding"
        ? "opacity 0.4s ease, transform 0.4s ease"
        : step > idx
          ? "opacity 0.35s cubic-bezier(.22,.68,0,1.2), transform 0.35s cubic-bezier(.22,.68,0,1.2)"
          : "none",
  });

  const dot = (i) => ({
    color: "#c0622f",
    opacity: i === dotIdx % 3 ? 1 : 0.15,
  });

  return (
    <div
      style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      <div style={{ position: "relative", width: 180, height: 160 }}>
        <div style={{ ...ls(0), bottom: 0, height: 36 }}>
          <svg width="180" height="36" viewBox="0 0 180 36" fill="none">
            <path
              d="M10 10 Q90 2 170 10 L172 36 Q90 38 8 36 Z"
              fill="#d4751e"
            />
            <path
              d="M10 10 Q90 3 170 10 L170 18 Q90 12 10 18 Z"
              fill="#e8852a"
            />
          </svg>
        </div>
        <div style={{ ...ls(1), bottom: 28, height: 28 }}>
          <svg width="180" height="28" viewBox="0 0 180 28" fill="none">
            <path d="M8 4 Q90 0 172 4 L174 28 Q90 30 6 28 Z" fill="#6b3318" />
            <path d="M8 4 Q90 1 172 4 L172 14 Q90 8 8 14 Z" fill="#8b4426" />
            <ellipse
              cx="45"
              cy="12"
              rx="18"
              ry="5"
              fill="#5a2a12"
              opacity="0.4"
            />
            <ellipse
              cx="120"
              cy="13"
              rx="16"
              ry="4"
              fill="#5a2a12"
              opacity="0.4"
            />
          </svg>
        </div>
        <div style={{ ...ls(2), bottom: 48, height: 18 }}>
          <svg width="180" height="18" viewBox="0 0 180 18" fill="none">
            <path d="M10 2 Q90 0 170 2 L172 18 Q90 20 8 18 Z" fill="#f5c518" />
            <path d="M10 2 Q90 0 170 2 L170 8 Q90 5 10 8 Z" fill="#fad84a" />
            <path d="M155 4 L178 10 L168 20 L148 13 Z" fill="#f5c518" />
          </svg>
        </div>
        <div style={{ ...ls(3), bottom: 60, height: 18 }}>
          <svg width="180" height="18" viewBox="0 0 180 18" fill="none">
            <path d="M12 2 Q90 0 168 2 L170 18 Q90 20 10 18 Z" fill="#c0392b" />
            <path
              d="M12 2 Q90 0 168 2 L168 8 Q90 5 12 8 Z"
              fill="#e74c3c"
              opacity="0.7"
            />
            <ellipse
              cx="48"
              cy="10"
              rx="7"
              ry="2.5"
              fill="#922b21"
              opacity="0.6"
            />
            <ellipse
              cx="90"
              cy="8"
              rx="7"
              ry="2.5"
              fill="#922b21"
              opacity="0.6"
            />
            <ellipse
              cx="132"
              cy="10"
              rx="7"
              ry="2.5"
              fill="#922b21"
              opacity="0.6"
            />
          </svg>
        </div>
        <div style={{ ...ls(4), bottom: 72, height: 20 }}>
          <svg width="180" height="20" viewBox="0 0 180 20" fill="none">
            <path
              d="M2 10 Q20 2 38 8 Q56 1 74 9 Q90 1 106 8 Q124 1 142 8 Q160 2 178 10 L176 20 Q90 22 4 20 Z"
              fill="#3a8a4c"
            />
            <path
              d="M2 10 Q20 3 38 9 Q56 2 74 10 Q90 2 106 9 Q124 2 142 9 Q160 3 178 10 L178 16 Q90 18 2 16 Z"
              fill="#4aa85e"
              opacity="0.5"
            />
          </svg>
        </div>
        <div style={{ ...ls(5), bottom: 84, height: 72 }}>
          <svg width="180" height="72" viewBox="0 0 180 72" fill="none">
            <ellipse cx="90" cy="70" rx="72" ry="5" fill="#000" opacity="0.2" />
            <path d="M18 52 Q16 16 90 4 Q164 16 162 52 Z" fill="#e8852a" />
            <rect x="16" y="50" width="148" height="14" rx="4" fill="#c8691a" />
            <path
              d="M36 22 Q90 8 144 22 Q118 12 90 10 Q62 12 36 22Z"
              fill="white"
              opacity="0.07"
            />
            <ellipse
              cx="62"
              cy="28"
              rx="6"
              ry="2.2"
              fill="#b05e14"
              opacity="0.75"
              transform="rotate(-18 62 28)"
            />
            <ellipse
              cx="90"
              cy="20"
              rx="6"
              ry="2.2"
              fill="#b05e14"
              opacity="0.75"
              transform="rotate(4 90 20)"
            />
            <ellipse
              cx="118"
              cy="28"
              rx="6"
              ry="2.2"
              fill="#b05e14"
              opacity="0.75"
              transform="rotate(18 118 28)"
            />
            <ellipse
              cx="74"
              cy="38"
              rx="5"
              ry="2"
              fill="#b05e14"
              opacity="0.65"
              transform="rotate(-10 74 38)"
            />
            <ellipse
              cx="106"
              cy="38"
              rx="5"
              ry="2"
              fill="#b05e14"
              opacity="0.65"
              transform="rotate(10 106 38)"
            />
          </svg>
        </div>
      </div>
      <div
        style={{
          marginTop: 32,
          color: "#6b4e2a",
          fontFamily: "Georgia, serif",
          fontSize: 18,
          letterSpacing: 5,
          textTransform: "uppercase",
          width: 210,
          textAlign: "center",
        }}
      >
        Se încarcă<span style={dot(0)}>.</span>
        <span style={dot(1)}>.</span>
        <span style={dot(2)}>.</span>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Router />
    </AppProvider>
  );
}
