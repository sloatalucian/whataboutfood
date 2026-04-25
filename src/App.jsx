import { useState } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { TableProvider } from "./context/TableContext";
import BottomNav from "./components/BottomNav";
import Home from "./pages/Home";
import Restaurant from "./pages/Restaurant";
import { Rezervare, Meniu, Admin, Auth } from "./pages/pages";
import { SelectTable, WaiterTablet } from "./pages/SelectTable";
import { WaiterLogin, WaiterManagement } from "./pages/WaiterManagement";
import StatisticiProprietar from "./pages/StatisticiProprietar";
import SplashScreen from "./pages/SplashScreen";
import "./styles/global.css";

// ─── CONTURI DEMO PREDEFINITE ─────────────────────────────────────────────────
// Ospătar Mama Mia: andrei@mamamia.ro / 1234
// Proprietar:       proprietar@mamamia.ro / 1234

function Router() {
  const { state, dispatch, navigate, showToast } = useApp();
  const { screen, selectedRest, orders, toast, user } = state;

  const [splashDone, setSplashDone] = useState(false);
  const [waiterUser, setWaiterUser] = useState(null);

  const noNav = ["auth", "selectTable", "newRestaurant", "waiterLogin"];

  const handleOrderUpdate = (id, status) =>
    dispatch({ type: "ORDER_UPDATE", payload: { id, status } });
  const handleOrderClose = (id) =>
    dispatch({ type: "ORDER_REMOVE", payload: id });

  const handleTableSelected = ({ table }) => {
    dispatch({ type: "SET_ORDER_TABLE", payload: table.label });
    dispatch({ type: "SET_MENU_CAT", payload: null });
    navigate("menu");
    showToast(`✅ Masa ${table.label} selectată!`);
  };

  const handleWaiterLogin = (waiter) => {
    setWaiterUser(waiter);
    setSplashDone(true);
    navigate("waiter");
    showToast(`👋 Bun venit, ${waiter.name}!`);
  };

  const handleWaiterLogout = () => {
    setWaiterUser(null);
    navigate("home");
    showToast("👋 Ai ieșit din tabletă.");
  };

  // ── Splash ──
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

  // ── Dashboard Admin ──
  const AdminDashboard = () => (
    <div className="page fade-in">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "20px 20px 0",
        }}
      >
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
          🤵 Gestionare Ospătari
        </span>
      </div>
      <div style={{ padding: 20 }}>
        <WaiterManagement
          restaurantId={selectedRest?.id}
          restaurantName={selectedRest?.name || user?.restName}
        />
      </div>
    </div>
  );

  // ── Placeholder meniu editor ──
  const MenuEditorPage = () => (
    <div className="page fade-in">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "20px 20px 0",
        }}
      >
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
          🍽️ Editor Meniu
        </span>
      </div>
      <div
        style={{
          textAlign: "center",
          padding: "60px 24px",
          color: "var(--muted)",
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>🍽️</div>
        <div
          style={{
            fontFamily: "'Fraunces',serif",
            fontSize: 22,
            fontWeight: 700,
            color: "var(--cream)",
            marginBottom: 8,
          }}
        >
          Editor Meniu
        </div>
        <div style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
          Această secțiune este în construcție.
          <br />
          Va fi disponibilă în curând!
        </div>
        <button
          onClick={() => navigate("home")}
          style={{
            padding: "12px 28px",
            borderRadius: 14,
            background: "var(--terra)",
            border: "none",
            color: "#fff",
            fontFamily: "'Fraunces',serif",
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Înapoi
        </button>
      </div>
    </div>
  );

  // ── Placeholder restaurant nou ──
  const NewRestaurantPage = () => (
    <div className="page fade-in">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "20px 20px 0",
        }}
      >
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
          🏪 Restaurant Nou
        </span>
      </div>
      <div
        style={{
          textAlign: "center",
          padding: "60px 24px",
          color: "var(--muted)",
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>🏪</div>
        <div
          style={{
            fontFamily: "'Fraunces',serif",
            fontSize: 22,
            fontWeight: 700,
            color: "var(--cream)",
            marginBottom: 8,
          }}
        >
          Adaugă Restaurant
        </div>
        <div style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
          Completează datele restaurantului tău
          <br />
          și configurează planșeul.
        </div>
        <button
          onClick={() => navigate("adminFloor")}
          style={{
            padding: "12px 28px",
            borderRadius: 14,
            background: "var(--terra)",
            border: "none",
            color: "#fff",
            fontFamily: "'Fraunces',serif",
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Mergi la Editor Planșeu
        </button>
      </div>
    </div>
  );

  // ── Toate paginile sunt învelite în TableProvider ──
  const pages = {
    home: <Home />,
    restaurant: <Restaurant />,
    reserve: <Rezervare />,
    menu: <Meniu />,
    auth: <Auth />,
    admin: <AdminDashboard />,
    adminFloor: <Admin />,
    statistici: <StatisticiProprietar />,
    menuEditor: <MenuEditorPage />,
    newRestaurant: <NewRestaurantPage />,
    waiterLogin: (
      <WaiterLogin
        onLogin={handleWaiterLogin}
        onBack={() => navigate("home")}
      />
    ),

    // ── IMPORTANT: WaiterTablet e ÎNĂUNTRUL TableProvider ──
    waiter: (
      <WaiterTablet
        restaurant={selectedRest || { name: "Mama Mia", floors: [] }}
        orders={orders}
        onOrderUpdate={handleOrderUpdate}
        onOrderClose={handleOrderClose}
        onBack={handleWaiterLogout}
        waiterName={waiterUser?.name || "Ospătar"}
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
    // TableProvider învelește TOT — inclusiv WaiterTablet
    <TableProvider restaurantId={selectedRest?.id}>
      <div className="app">
        {toast && <div className="toast">{toast}</div>}
        {pages[screen] || <Home />}
        {/* Footer nu apare la ospătar — are navigare proprie */}
        {screen !== "waiter" && !noNav.includes(screen) && (
          <BottomNav waiterLoggedIn={!!waiterUser} />
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
