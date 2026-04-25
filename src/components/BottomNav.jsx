import { useApp } from "../context/AppContext";

export default function BottomNav({ onWaiterClick, waiterLoggedIn }) {
  const { state, navigate } = useApp();
  const { screen, selectedRest, user } = state;

  // ── PROPRIETAR ──
  if (user?.role === "owner") {
    const ownerItems = [
      { id: "home", icon: "🏠", label: "Acasă" },
      { id: "adminFloor", icon: "🏗️", label: "Planșeu" },
      { id: "menuEditor", icon: "🍽️", label: "Meniu" },
      { id: "statistici", icon: "📊", label: "Statistici" },
      { id: "admin", icon: "🤵", label: "Ospătari" },
    ];
    return (
      <nav
        style={{
          position: "fixed",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: 430,
          zIndex: 80,
          background: "rgba(22,18,16,.97)",
          borderTop: "1px solid var(--border)",
          backdropFilter: "blur(20px)",
          display: "flex",
          padding: "6px 0 16px",
        }}
      >
        {ownerItems.map((item) => (
          <div
            key={item.id}
            onClick={() => navigate(item.id)}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              cursor: "pointer",
              padding: "8px 4px",
            }}
          >
            <span style={{ fontSize: 20, lineHeight: 1 }}>{item.icon}</span>
            <span
              style={{
                fontSize: 9,
                letterSpacing: 0.5,
                textTransform: "uppercase",
                color: screen === item.id ? "var(--terra)" : "var(--muted)",
              }}
            >
              {item.label}
            </span>
          </div>
        ))}
      </nav>
    );
  }

  // ── CLIENT (logat sau nelogat) ──
  const clientItems = [
    { id: "home", icon: "🏠", label: "Acasă" },
    { id: "reserve", icon: "📅", label: "Rezervare", needsRest: true },
    { id: "menu", icon: "🍽️", label: "Meniu", needsRest: true },
    { id: "auth", icon: "👤", label: "Cont" },
  ];

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: 430,
        zIndex: 80,
        background: "rgba(22,18,16,.97)",
        borderTop: "1px solid var(--border)",
        backdropFilter: "blur(20px)",
        display: "flex",
        padding: "6px 0 16px",
      }}
    >
      {clientItems.map((item) => (
        <div
          key={item.id}
          onClick={() => {
            if (item.needsRest && !selectedRest) {
              navigate("home");
              return;
            }
            navigate(item.id);
          }}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 3,
            cursor: "pointer",
            padding: "8px 4px",
          }}
        >
          <span style={{ fontSize: 20, lineHeight: 1 }}>{item.icon}</span>
          <span
            style={{
              fontSize: 9,
              letterSpacing: 0.5,
              textTransform: "uppercase",
              color: screen === item.id ? "var(--terra)" : "var(--muted)",
            }}
          >
            {item.label}
          </span>
        </div>
      ))}
    </nav>
  );
}
