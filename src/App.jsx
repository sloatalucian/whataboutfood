import { useState, useEffect } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { TableProvider } from "./context/TableContext";
import BottomNav from "./components/BottomNav";
import Home from "./pages/home/Home";
import Restaurant from "./pages/Restaurant";
import { Rezervare } from "./pages/Rezervare";
import { Meniu } from "./pages/Meniu";
import { Auth } from "./pages/Auth";
import { SelectTable } from "./pages/SelectTable";
import { WaiterTablet } from "./pages/WaiterTablet";
import DashboardLive from "./pages/DashboardLive";
import { WaiterLogin, WaiterManagement } from "./pages/WaiterManagement";
import HartaPage from "./pages/HartaPage";
import StatisticiProprietar from "./pages/statistici/StatisticiProprietar";
import SplashScreen from "./pages/SplashScreen";
import MenuEditor from "./pages/MenuEditor";
import NewRestaurant from "./pages/NewRestaurant";
import Notifications from "./pages/Notifications";
import FloorEditor from "./pages/FloorEditor";
import SuperAdmin from "./pages/superadmin/SuperAdmin";
import { supabase } from "./supabase";
import "./styles/global.css";

const ADMIN_EMAIL = "sloatalucian@yahoo.com";

function Router() {
  const {
    state,
    dispatch,
    navigate,
    showToast,
    cartTotal,
    cartCount,
    placeOrderRef,
    requestBillRef,
    payNoteShow,
    setPayNoteShow,
    payNoteActiveOrder,
    paidTotal,
  } = useApp();
  const [showCart, setShowCart] = useState(false);
  const [cartObs, setCartObs] = useState("");
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
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // ── QR Deep Link Handler ──
  // Detecteaza /r/:slug in URL si navigheaza la restaurantul respectiv
  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/^\/r\/(.+)$/);
    if (!match) return;
    const slug = match[1];

    const loadRestaurantBySlug = async () => {
      const { data: rest } = await supabase
        .from("restaurants")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .single();

      if (rest) {
        dispatch({ type: "SET_REST", payload: rest });
        // Curata URL-ul fara reload
        window.history.replaceState({}, "", "/");
      }
    };

    // Asteapta sa fie gata sesiunea
    const timer = setTimeout(loadRestaurantBySlug, 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

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
              rating: profile?.rating ?? 4,
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
            rating: profile?.rating ?? 4,
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
    // "auth" e exclus doar daca userul nu e logat
    ...(!user ? ["auth"] : []),
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
  const handleWaiterLogout = async () => {
    await supabase.auth.signOut();
    setWaiterUser(null);
    dispatch({ type: "SET_USER", payload: null });
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
          .select("id, status, payment_method, total")
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
              total: paidOrders[0].total || null,
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

  if (isOffline) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 32,
          gap: 16,
          textAlign: "center",
          background: "var(--bg)",
        }}
      >
        <div style={{ fontSize: 64 }}>📡</div>
        <div
          style={{
            fontFamily: "'Fraunces',serif",
            fontSize: 24,
            fontWeight: 700,
            color: "var(--cream)",
          }}
        >
          Fără conexiune
        </div>
        <div
          style={{
            fontSize: 14,
            color: "var(--muted)",
            maxWidth: 280,
            lineHeight: 1.6,
          }}
        >
          Verifică conexiunea la internet și încearcă din nou.
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: 8,
            padding: "12px 28px",
            borderRadius: "var(--radius-pill)",
            background: "linear-gradient(135deg,#c0622f,#8b3a18)",
            border: "none",
            color: "#fff",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Încearcă din nou
        </button>
      </div>
    );
  }

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
              background: "rgba(0,0,0,.82)",
              backdropFilter: "blur(8px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
            }}
          >
            <style>{`
              @keyframes grazieIn {
                0%   { opacity: 0; transform: translateY(28px) scale(0.96); }
                100% { opacity: 1; transform: translateY(0) scale(1); }
              }
              @keyframes checkRing {
                0%   { stroke-dashoffset: 220; opacity: 0; }
                20%  { opacity: 1; }
                100% { stroke-dashoffset: 0; }
              }
              @keyframes checkTick {
                0%, 40% { stroke-dashoffset: 50; opacity: 0; }
                50%  { opacity: 1; }
                100% { stroke-dashoffset: 0; opacity: 1; }
              }
              @keyframes starBounce {
                0%   { transform: scale(1); }
                40%  { transform: scale(1.35); }
                70%  { transform: scale(0.9); }
                100% { transform: scale(1.1); }
              }
            `}</style>

            <div
              style={{
                background: "#120e07",
                border: "1px solid rgba(192,98,47,0.2)",
                borderRadius: 28,
                padding: "32px 24px 28px",
                width: "100%",
                maxWidth: 380,
                maxHeight: "88vh",
                overflowY: "auto",
                textAlign: "center",
                animation: "grazieIn 0.5s cubic-bezier(.23,1,.32,1) both",
                position: "relative",
              }}
            >
              {/* Shimmer line top */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: "15%",
                  right: "15%",
                  height: 1,
                  background:
                    "linear-gradient(90deg,transparent,rgba(192,98,47,0.5),transparent)",
                  borderRadius: 1,
                }}
              />

              {/* Check animat */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginBottom: 20,
                }}
              >
                <svg width="72" height="72" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="36" fill="rgba(192,98,47,0.08)" />
                  <circle
                    cx="40"
                    cy="40"
                    r="34"
                    fill="none"
                    stroke="#c0622f"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray="220"
                    strokeDashoffset="220"
                    transform="rotate(-90 40 40)"
                    style={{
                      animation:
                        "checkRing 0.8s cubic-bezier(.23,1,.32,1) 0.2s both",
                    }}
                  />
                  <polyline
                    points="24,41 35,53 57,28"
                    fill="none"
                    stroke="#c0622f"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="50"
                    strokeDashoffset="50"
                    style={{
                      animation:
                        "checkTick 0.5s cubic-bezier(.23,1,.32,1) 0.9s both",
                    }}
                  />
                </svg>
              </div>

              {/* Titlu */}
              <div
                style={{
                  fontFamily: "'Fraunces',serif",
                  fontSize: 28,
                  fontWeight: 900,
                  color: "#f0ebe3",
                  marginBottom: 6,
                  animation: "grazieIn 0.4s ease 1.1s both",
                  opacity: 0,
                }}
              >
                Grazie mille!
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "#8a7a6a",
                  marginBottom: 22,
                  animation: "grazieIn 0.4s ease 1.2s both",
                  opacity: 0,
                }}
              >
                Plata a fost confirmată cu succes
              </div>

              {/* Rezumat plată */}
              <div
                style={{
                  background: "#161210",
                  border: "1px solid #2a2218",
                  borderRadius: 16,
                  padding: "14px 16px",
                  marginBottom: 16,
                  textAlign: "left",
                  animation: "grazieIn 0.4s ease 1.3s both",
                  opacity: 0,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 10,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      color: "#8a7a6a",
                      letterSpacing: "1px",
                      textTransform: "uppercase",
                    }}
                  >
                    Rezumat
                  </span>
                  <span
                    style={{
                      background: "rgba(74,110,74,0.15)",
                      border: "1px solid rgba(74,110,74,0.3)",
                      borderRadius: 20,
                      padding: "3px 10px",
                      fontSize: 11,
                      color: "#6b9e6b",
                      fontWeight: 600,
                    }}
                  >
                    {payMethod === "cash" ? "💵 Cash" : "💳 Card"}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 13,
                    color: "#8a7a6a",
                    marginBottom: 6,
                  }}
                >
                  <span>Restaurant</span>
                  <span style={{ color: "#f0ebe3" }}>{selectedRest?.name}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 13,
                    color: "#8a7a6a",
                    borderTop: "1px solid #2a2218",
                    marginTop: 8,
                    paddingTop: 8,
                  }}
                >
                  <span>Total achitat</span>
                  <span
                    style={{ color: "#c0622f", fontWeight: 700, fontSize: 15 }}
                  >
                    {paidTotal || "—"} lei
                  </span>
                </div>
              </div>

              {/* Review */}
              {!reviewSent ? (
                <div
                  style={{
                    background: "#161210",
                    border: "1px solid #2a2218",
                    borderRadius: 16,
                    padding: "16px",
                    marginBottom: 16,
                    animation: "grazieIn 0.4s ease 1.4s both",
                    opacity: 0,
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#f0ebe3",
                      marginBottom: 14,
                    }}
                  >
                    Cum a fost experiența la {selectedRest?.name}?
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      gap: 6,
                      marginBottom: 14,
                    }}
                  >
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setReviewRating(star)}
                        style={{
                          fontSize: 36,
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: star <= reviewRating ? "#f5c518" : "#2a2218",
                          transition: "color .15s",
                          animation:
                            star <= reviewRating
                              ? "starBounce 0.35s ease"
                              : "none",
                          lineHeight: 1,
                          padding: "2px",
                          WebkitTapHighlightColor: "transparent",
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
                      background: "#0d0a07",
                      border: "1px solid #2a2218",
                      borderRadius: 12,
                      padding: "10px 12px",
                      color: "#f0ebe3",
                      fontSize: 13,
                      minHeight: 72,
                      resize: "none",
                      boxSizing: "border-box",
                      marginBottom: 12,
                      fontFamily: "inherit",
                      outline: "none",
                    }}
                  />
                  <button
                    onClick={handleSendReview}
                    disabled={!reviewRating}
                    style={{
                      width: "100%",
                      padding: 12,
                      borderRadius: 12,
                      background: reviewRating ? "#2a1a0e" : "#1e1a14",
                      border: `1px solid ${reviewRating ? "rgba(192,98,47,0.3)" : "#2a2218"}`,
                      color: reviewRating ? "#c8a97e" : "#6b6050",
                      fontWeight: 600,
                      cursor: reviewRating ? "pointer" : "not-allowed",
                      fontSize: 14,
                      transition: "all 0.2s",
                    }}
                  >
                    Trimite recenzia
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    background: "rgba(74,110,74,0.1)",
                    border: "1px solid rgba(74,110,74,0.25)",
                    borderRadius: 14,
                    padding: "12px 16px",
                    color: "#6b9e6b",
                    fontSize: 14,
                    marginBottom: 16,
                    fontWeight: 600,
                  }}
                >
                  ✓ Recenzie trimisă! Mulțumim!
                </div>
              )}

              {/* Buton acasa */}
              <button
                onClick={() => {
                  dispatch({
                    type: "SET_PAID",
                    payload: { paid: false, method: null },
                  });
                  dispatch({ type: "SET_PAYMENT", payload: false });
                  navigate("home");
                }}
                style={{
                  width: "100%",
                  padding: "14px",
                  background: "linear-gradient(135deg,#c0622f,#8b3a18)",
                  border: "none",
                  borderRadius: 16,
                  color: "#fff",
                  fontFamily: "'Fraunces',serif",
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: "pointer",
                  animation: "grazieIn 0.4s ease 1.5s both",
                  opacity: 0,
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

        {/* ── FAB Cos ── */}
        {state.cart.length > 0 && screen === "menu" && (
          <>
            <style>{`
              @keyframes fabAppear {
                0%   { transform: scale(0); opacity: 0; }
                60%  { transform: scale(1.15); }
                100% { transform: scale(1); opacity: 1; }
              }
              @keyframes badgePop {
                0%   { transform: scale(0); }
                60%  { transform: scale(1.35); }
                100% { transform: scale(1); }
              }
              @keyframes cosSheetUp {
                from { transform: translateY(100%); opacity: 0; }
                to   { transform: translateY(0); opacity: 1; }
              }
            `}</style>

            {showCart && (
              <div
                onClick={() => setShowCart(false)}
                style={{
                  position: "fixed",
                  inset: 0,
                  background: "rgba(0,0,0,0.55)",
                  zIndex: 188,
                  backdropFilter: "blur(4px)",
                }}
              />
            )}

            {showCart && (
              <div
                style={{
                  position: "fixed",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  width: "min(100%, 430px)",
                  marginLeft: "auto",
                  marginRight: "auto",
                  background: "#111009",
                  borderRadius: "22px 22px 0 0",
                  borderTop: "1px solid #2a2218",
                  padding: "0 20px 100px",
                  zIndex: 189,
                  animation: "cosSheetUp 0.38s cubic-bezier(.23,1,.32,1) both",
                  maxHeight: "75vh",
                  overflowY: "auto",
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 3,
                    borderRadius: 2,
                    background: "#2a2218",
                    margin: "12px auto 18px",
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'Fraunces',serif",
                      fontSize: 19,
                      fontWeight: 700,
                      color: "#f0ebe3",
                    }}
                  >
                    Cosul tau
                  </div>
                  <button
                    onClick={() => setShowCart(false)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#6b6050",
                      fontSize: 22,
                      cursor: "pointer",
                      lineHeight: 1,
                      padding: 0,
                    }}
                  >
                    ✕
                  </button>
                </div>
                <div
                  style={{
                    background: "#161210",
                    border: "1px solid #2a2218",
                    borderRadius: 14,
                    padding: "10px 14px",
                    marginBottom: 16,
                  }}
                >
                  {state.cart.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontSize: 13,
                        paddingBottom: 8,
                        marginBottom: 8,
                        borderBottom: "1px solid #1e1a14",
                      }}
                    >
                      <span
                        style={{ color: "#f0ebe3", fontWeight: 500, flex: 1 }}
                      >
                        {item.emoji} {item.name}
                        <span style={{ color: "#6b6050", marginLeft: 6 }}>
                          ×{item.qty}
                        </span>
                      </span>
                      <span
                        style={{
                          color: "#c8a97e",
                          fontWeight: 700,
                          marginRight: 12,
                        }}
                      >
                        {item.price * item.qty} lei
                      </span>
                      <button
                        onClick={() =>
                          dispatch({ type: "CART_REMOVE", payload: item.id })
                        }
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          background: "rgba(192,57,43,.15)",
                          border: "1px solid rgba(192,57,43,.3)",
                          color: "#e05050",
                          fontSize: 14,
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          padding: 0,
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontFamily: "'Fraunces',serif",
                      fontSize: 16,
                      fontWeight: 700,
                      paddingTop: 4,
                    }}
                  >
                    <span style={{ color: "#f0ebe3" }}>Total</span>
                    <span style={{ color: "#c0622f" }}>{cartTotal} lei</span>
                  </div>
                </div>
                <textarea
                  maxLength={300}
                  value={cartObs}
                  onChange={(e) => setCartObs(e.target.value)}
                  placeholder="Observatii pentru ospatar (optional)..."
                  rows={2}
                  style={{
                    width: "100%",
                    background: "#161210",
                    border: "1px solid #2a2218",
                    borderRadius: 12,
                    padding: "10px 12px",
                    color: "#f0ebe3",
                    fontSize: 13,
                    resize: "none",
                    marginBottom: 12,
                    fontFamily: "inherit",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                <button
                  onClick={() => {
                    if (placeOrderRef.current) {
                      placeOrderRef.current(cartObs);
                      setCartObs("");
                      setShowCart(false);
                    }
                  }}
                  style={{
                    width: "100%",
                    padding: 15,
                    background: "linear-gradient(135deg,#c0622f,#8b3a18)",
                    border: "none",
                    borderRadius: 14,
                    color: "#fff",
                    fontFamily: "'Fraunces',serif",
                    fontSize: 16,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Trimite comanda la bucatarie
                </button>
              </div>
            )}

            <button
              onClick={() => setShowCart(true)}
              style={{
                position: "fixed",
                bottom: 86,
                left: "max(20px, calc(50% - 195px))",
                width: 54,
                height: 54,
                borderRadius: "50%",
                background: "linear-gradient(135deg,#c0622f,#8b3a18)",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 187,
                boxShadow: "0 4px 20px rgba(192,98,47,0.45)",
                animation: "fabAppear 0.4s cubic-bezier(.23,1,.32,1) both",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 01-8 0" />
              </svg>
              <div
                key={cartCount}
                style={{
                  position: "absolute",
                  top: -4,
                  right: -4,
                  background: "#f0ebe3",
                  color: "#0d0a07",
                  borderRadius: "50%",
                  width: 20,
                  height: 20,
                  fontSize: 11,
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "2px solid #0d0a07",
                  animation: "badgePop 0.3s cubic-bezier(.23,1,.32,1) both",
                }}
              >
                {cartCount}
              </div>
            </button>
          </>
        )}

        {/* ── Nota de plata Modal (global) ── */}
        {(screen === "menu" || screen === "home") &&
          payNoteShow &&
          payNoteActiveOrder && (
            <>
              <style>{`
              @keyframes payNoteUp {
                from { transform: translateY(100%); opacity: 0; }
                to   { transform: translateY(0); opacity: 1; }
              }
            `}</style>
              <div
                onClick={() => setPayNoteShow(false)}
                style={{
                  position: "fixed",
                  inset: 0,
                  background: "rgba(0,0,0,0.6)",
                  zIndex: 288,
                  backdropFilter: "blur(6px)",
                }}
              />
              <div
                style={{
                  position: "fixed",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  width: "min(100%, 430px)",
                  marginLeft: "auto",
                  marginRight: "auto",
                  background: "#111009",
                  borderRadius: "24px 24px 0 0",
                  borderTop: "1px solid #2a2218",
                  padding: "0 20px 32px",
                  zIndex: 289,
                  animation: "payNoteUp 0.4s cubic-bezier(.23,1,.32,1) both",
                  maxHeight: "85vh",
                  overflowY: "auto",
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 3,
                    borderRadius: 2,
                    background: "#2a2218",
                    margin: "12px auto 20px",
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    marginBottom: 18,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontFamily: "'Fraunces',serif",
                        fontSize: 20,
                        fontWeight: 700,
                        color: "#f0ebe3",
                      }}
                    >
                      Nota de plată
                    </div>
                    <div
                      style={{ fontSize: 12, color: "#8a7a6a", marginTop: 3 }}
                    >
                      Masa {payNoteActiveOrder.table_label}
                    </div>
                  </div>
                  <div
                    style={{
                      fontFamily: "'Fraunces',serif",
                      fontSize: 26,
                      fontWeight: 700,
                      color: "#c0622f",
                    }}
                  >
                    {payNoteActiveOrder.total} lei
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "#8a7a6a",
                    letterSpacing: "1px",
                    textTransform: "uppercase",
                    marginBottom: 12,
                  }}
                >
                  Metoda de plată
                </div>
                <div style={{ display: "flex", gap: 12, marginBottom: 18 }}>
                  {[
                    {
                      method: "cash",
                      icon: "💵",
                      label: "Cash",
                      sub: "La casă",
                    },
                    {
                      method: "card",
                      icon: "💳",
                      label: "Card",
                      sub: "La POS",
                    },
                  ].map((p) => (
                    <button
                      key={p.method}
                      onClick={() =>
                        requestBillRef.current &&
                        requestBillRef.current(p.method)
                      }
                      style={{
                        flex: 1,
                        background: "#1a1510",
                        border: "1px solid #2a2218",
                        borderRadius: 16,
                        padding: "14px 12px",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        cursor: "pointer",
                        WebkitTapHighlightColor: "transparent",
                      }}
                    >
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          background: "#221a10",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 24,
                          flexShrink: 0,
                        }}
                      >
                        {p.icon}
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: 15,
                            fontWeight: 700,
                            color: "#f0ebe3",
                          }}
                        >
                          {p.label}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "#8a7a6a",
                            marginTop: 2,
                          }}
                        >
                          {p.sub}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                <div style={{ textAlign: "center" }}>
                  <button
                    onClick={() => setPayNoteShow(false)}
                    style={{
                      background: "none",
                      border: "none",
                      fontSize: 13,
                      color: "#6b6050",
                      cursor: "pointer",
                      textDecoration: "underline",
                      textUnderlineOffset: 3,
                    }}
                  >
                    Anulează
                  </button>
                </div>
              </div>
            </>
          )}
      </div>
    </TableProvider>
  );
}

function BurgerLoader() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 28,
      }}
    >
      <style>{`
        @keyframes blRingRotate { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes blRingRev    { from{transform:rotate(0deg)} to{transform:rotate(-360deg)} }
        @keyframes blGlowPulse  { 0%,100%{box-shadow:0 0 0 0 rgba(192,98,47,0)} 50%{box-shadow:0 0 20px 6px rgba(192,98,47,0.15)} }
        @keyframes blOrbit0 { from{transform:rotate(0deg)   translateX(52px) rotate(0deg)}   to{transform:rotate(360deg)  translateX(52px) rotate(-360deg)} }
        @keyframes blOrbit1 { from{transform:rotate(60deg)  translateX(52px) rotate(-60deg)} to{transform:rotate(420deg)  translateX(52px) rotate(-420deg)} }
        @keyframes blOrbit2 { from{transform:rotate(120deg) translateX(52px) rotate(-120deg)}to{transform:rotate(480deg)  translateX(52px) rotate(-480deg)} }
        @keyframes blOrbit3 { from{transform:rotate(180deg) translateX(52px) rotate(-180deg)}to{transform:rotate(540deg)  translateX(52px) rotate(-540deg)} }
        @keyframes blOrbit4 { from{transform:rotate(240deg) translateX(52px) rotate(-240deg)}to{transform:rotate(600deg)  translateX(52px) rotate(-600deg)} }
        @keyframes blOrbit5 { from{transform:rotate(300deg) translateX(52px) rotate(-300deg)}to{transform:rotate(660deg)  translateX(52px) rotate(-660deg)} }
        @keyframes blShimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes blDotP { 0%,80%,100%{opacity:0.2;transform:translateY(0)} 40%{opacity:1;transform:translateY(-4px)} }
      `}</style>

      {/* Spinner */}
      <div
        style={{
          position: "relative",
          width: 140,
          height: 140,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Inel exterior */}
        <div
          style={{
            position: "absolute",
            width: 120,
            height: 120,
            borderRadius: "50%",
            border: "1.5px solid #1e1a14",
            borderTopColor: "#c0622f",
            borderRightColor: "rgba(192,98,47,0.25)",
            animation: "blRingRotate 2.4s linear infinite",
          }}
        />
        {/* Inel interior */}
        <div
          style={{
            position: "absolute",
            width: 88,
            height: 88,
            borderRadius: "50%",
            border: "1px dashed rgba(192,98,47,0.1)",
            animation: "blRingRev 4s linear infinite",
          }}
        />
        {/* Farfurie centru */}
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: "50%",
            background: "linear-gradient(145deg,#1e1a14,#141009)",
            border: "1.5px solid #2a2218",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2,
            animation: "blGlowPulse 2s ease infinite",
          }}
        >
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <circle
              cx="18"
              cy="18"
              r="14"
              stroke="#c0622f"
              strokeWidth="1.3"
              fill="none"
            />
            <circle
              cx="18"
              cy="18"
              r="8"
              stroke="#c0622f"
              strokeWidth="0.7"
              fill="none"
              opacity="0.35"
            />
          </svg>
        </div>
        {/* Elemente in orbita */}
        {["🍴", "🍷", "🍔", "🔪", "🥗", "🍰"].map((emoji, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: 0,
              height: 0,
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                transformOrigin: "0 0",
                fontSize: 20,
                lineHeight: 1,
                marginTop: -10,
                marginLeft: -10,
                filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))",
                animation: `blOrbit${i} 2.4s linear infinite`,
              }}
            >
              {emoji}
            </div>
          </div>
        ))}
      </div>

      {/* Text */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 6,
        }}
      >
        <div
          style={{
            fontFamily: "'Fraunces', serif",
            fontSize: 20,
            fontWeight: 700,
            fontStyle: "italic",
            background:
              "linear-gradient(90deg,#f0ebe3 0%,#c0622f 40%,#f0ebe3 60%,#c8a97e 100%)",
            backgroundSize: "200% auto",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            animation: "blShimmer 2.5s linear infinite",
            letterSpacing: "-0.3px",
          }}
        >
          Se încarcă
        </div>
        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
          {[0, 0.2, 0.4].map((delay, i) => (
            <div
              key={i}
              style={{
                width: 4,
                height: 4,
                borderRadius: "50%",
                background: "#c0622f",
                animation: `blDotP 1.2s ease ${delay}s infinite`,
              }}
            />
          ))}
        </div>
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
