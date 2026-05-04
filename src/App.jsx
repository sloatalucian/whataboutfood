import { useState, useEffect } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { TableProvider } from "./context/TableContext";
import BottomNav from "./components/BottomNav";
import Home from "./pages/Home";
import Restaurant from "./pages/Restaurant";
import { Rezervare, Meniu, Auth } from "./pages/pages";
import { SelectTable, WaiterTablet } from "./pages/SelectTable";
import DashboardLive from "./pages/DashboardLive";
import { WaiterLogin, WaiterManagement } from "./pages/WaiterManagement";
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
    const checkSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single();
          if (profile?.role === "owner" && profile?.status === "pending") {
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
    checkSession();

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
    const restId = state.reviewRestId || selectedRest?.id;
    const sessId = state.reviewSessionId;
    if (!reviewRating || !restId || !user?.id) return;
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
          restaurant_id_input: restId,
        });
        setReviewSent(true);
      }
    } catch {}
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
        }}
      >
        <div style={{ textAlign: "center", color: "#6b6050" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🍽️</div>
          <div style={{ fontSize: 14 }}>Se încarcă...</div>
        </div>
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
        {pages[screen] || <Home />}
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

export default function App() {
  return (
    <AppProvider>
      <Router />
    </AppProvider>
  );
}
