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
  const { screen, selectedRest, orders, toast, user } = state;

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
      } catch (err) {
        console.log("Session check:", err);
      }
      setCheckingSession(false);
    };
    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "SIGNED_OUT") {
        dispatch({ type: "SET_USER", payload: null });
        setSplashDone(false);
        setWaiterUser(null);
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
      console.log("loadUnread:", { userId, count, unread, error });
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
  const handleTableSelected = ({ table }) => {
    dispatch({ type: "SET_ORDER_TABLE", payload: table.label });
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

  const AdminDashboard = () => (
    <div className="page fade-in">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 20px 0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => navigate("home")}
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: "var(--card2)",
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
          <span
            style={{
              fontFamily: "'Fraunces',serif",
              fontSize: 21,
              fontWeight: 700,
            }}
          >
            🤵 Ospătari
          </span>
        </div>
        <button
          onClick={handleLogout}
          style={{
            padding: "7px 14px",
            borderRadius: 10,
            background: "rgba(192,57,43,.15)",
            border: "1px solid rgba(192,57,43,.3)",
            color: "#e05050",
            fontSize: 12,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Ieși din cont
        </button>
      </div>
      <div style={{ padding: 20 }}>
        <WaiterManagement />
      </div>
    </div>
  );

  const pages = {
    home: <Home onLogout={handleLogout} />,
    restaurant: <Restaurant />,
    reserve: <Rezervare />,
    menu: <Meniu />,
    auth: <Auth />,
    admin: <AdminDashboard />,
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
