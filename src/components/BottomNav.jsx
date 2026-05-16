import { useState, useEffect, useRef } from "react";
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

  const [popup, setPopup] = useState(null); // { message, type }
  const lastSeenId = useRef(null);

  // Polling pentru notificări noi - arată popup când vine ceva nou
  useEffect(() => {
    let interval;
    const startPolling = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      const userId = authUser?.id;
      if (!userId) return;

      const load = async () => {
        const { data } = await supabase
          .from("notifications")
          .select("id, message, type, is_read")
          .eq("user_id", userId)
          .eq("is_read", false)
          .order("created_at", { ascending: false })
          .limit(5);

        if (!data) return;
        setLocalUnread(data.length);

        // Arată popup pentru cea mai nouă notificare necitită
        if (data.length > 0 && data[0].id !== lastSeenId.current) {
          lastSeenId.current = data[0].id;
          setPopup({ message: data[0].message, type: data[0].type });
          // Dispare după 5 secunde
          setTimeout(() => setPopup(null), 5000);
        }
      };
      load();
      interval = setInterval(load, 8000);
    };
    startPolling();
    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  const unreadCount = localUnread;

  // ── POPUP NOTIFICARE ──
  const popupUI = popup ? (
    <div
      onClick={() => {
        setPopup(null);
        navigate("notifications");
      }}
      style={{
        position: "fixed",
        top: 16,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        background: "#1e1a14",
        border: "1px solid rgba(192,98,47,.4)",
        borderRadius: 16,
        padding: "12px 18px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        cursor: "pointer",
        boxShadow: "0 8px 32px rgba(0,0,0,.5)",
        maxWidth: 340,
        width: "calc(100% - 40px)",
        animation: "slideDown .3s ease",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          flexShrink: 0,
          background: "rgba(192,98,47,.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
        }}
      >
        🔔
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#f0ebe3" }}>
          🔔 Ai o notificare nouă
        </div>
        <div style={{ fontSize: 11, color: "#c8a97e", marginTop: 2 }}>
          Apasă pentru a vedea detaliile
        </div>
      </div>
      <div style={{ fontSize: 16, color: "#6b6050" }}>×</div>
    </div>
  ) : null;

  // ── PROPRIETAR ──
  if (user?.role === "owner" || user?.role === "superadmin") {
    const ownerItems = [
      { id: "home", icon: "🏠", label: "Acasă" },
      { id: "adminFloor", icon: "🏗️", label: "Planșeu" },
      { id: "menuEditor", icon: "🍽️", label: "Meniu" },
      { id: "statistici", icon: "📊", label: "Statistici" },
      { id: "admin", icon: "🤵", label: "Ospătari" },
    ];
    return (
      <>
        {popupUI}
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
      </>
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
      badge: localUnread,
    },
    { id: "auth", icon: "👤", label: "Cont" },
  ];

  return (
    <>
      {popupUI}
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
    </>
  );
}
