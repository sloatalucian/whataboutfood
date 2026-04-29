import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { supabase } from "../supabase";

export default function BottomNav({
  onWaiterClick,
  waiterLoggedIn,
  unreadCount: unreadProp,
}) {
  const { state, navigate } = useApp();
  const { screen, selectedRest, user } = state;
  const [localUnread, setLocalUnread] = useState(0);

  // Polling propriu pentru badge notificări
  useEffect(() => {
    const userId = user?.id;
    if (!userId) {
      setLocalUnread(0);
      return;
    }
    const load = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false);
      setLocalUnread(count || 0);
    };
    load();
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, [user?.id]);

  const unreadCount = localUnread;

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
          padding: "6px 0 calc(16px + env(safe-area-inset-bottom, 0px))",
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

  // ── CLIENT ──
  const clientItems = [
    { id: "home", icon: "🏠", label: "Acasă" },
    { id: "reserve", icon: "📅", label: "Rezervare", needsRest: true },
    { id: "menu", icon: "🍽️", label: "Meniu", needsRest: true },
    {
      id: "notifications",
      icon: "🔔",
      label: "Notificări",
      badge: state.unreadCount,
    },
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
        padding: "6px 0 calc(16px + env(safe-area-inset-bottom, 0px))",
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
            position: "relative",
          }}
        >
          <div style={{ position: "relative", display: "inline-block" }}>
            <span style={{ fontSize: 20, lineHeight: 1 }}>{item.icon}</span>
            {/* Badge notificări */}
            {item.badge > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: -4,
                  right: -8,
                  width: 16,
                  height: 16,
                  background: "#c0622f",
                  borderRadius: "50%",
                  fontSize: 9,
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                }}
              >
                {item.badge > 9 ? "9+" : item.badge}
              </span>
            )}
          </div>
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
