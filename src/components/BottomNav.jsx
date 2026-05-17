import { useState, useEffect, useRef } from "react";
import { useApp } from "../context/AppContext";
import { supabase } from "../supabase";

const CLIENT_ITEMS = [
  { id: "home", icon: "🏠", label: "Acasă" },
  { id: "reserve", icon: "📅", label: "Rezervare", needsRest: true },
  { id: "menu", icon: "🍽️", label: "Meniu", needsRest: true },
  { id: "notifications", icon: "🔔", label: "Notificări" },
  { id: "auth", icon: "👤", label: "Cont" },
];

const OWNER_ITEMS = [
  { id: "home", icon: "🏠", label: "Acasă" },
  { id: "adminFloor", icon: "🏗️", label: "Planșeu" },
  { id: "menuEditor", icon: "🍽️", label: "Meniu" },
  { id: "statistici", icon: "📊", label: "Statistici" },
  { id: "admin", icon: "🤵", label: "Ospătari" },
];

// ── Bula animata ──────────────────────────────────────────────────────────────
function BubbleNav({ items, activeId, onNavigate, badge }) {
  const activeIdx = items.findIndex((i) => i.id === activeId);
  const current = activeIdx >= 0 ? activeIdx : 0;
  const navRef = useRef(null);
  const [bubbleStyle, setBubbleStyle] = useState({
    left: 0,
    width: 0,
    opacity: 0,
  });

  useEffect(() => {
    if (!navRef.current) return;
    const nav = navRef.current;
    const tabs = nav.querySelectorAll("[data-tab]");
    const tab = tabs[current];
    if (!tab) return;
    const navRect = nav.getBoundingClientRect();
    const tabRect = tab.getBoundingClientRect();
    setBubbleStyle({
      left: tabRect.left - navRect.left,
      width: tabRect.width,
      opacity: 1,
    });
  }, [current]);

  return (
    <nav
      ref={navRef}
      style={{
        position: "fixed",
        bottom: 12,
        left: "50%",
        transform: "translateX(-50%)",
        width: "calc(100% - 32px)",
        maxWidth: 398,
        zIndex: 80,
        background: "rgba(22,18,16,.97)",
        borderRadius: 999,
        backdropFilter: "blur(20px)",
        display: "flex",
        padding: "6px",
        paddingBottom: "calc(6px + env(safe-area-inset-bottom, 0px))",
        boxShadow: "0 4px 24px rgba(0,0,0,.4)",
        border: "1px solid rgba(255,255,255,0.06)",
        overflow: "hidden",
        position: "fixed",
      }}
    >
      {/* Bula alunecatoare */}
      <div
        style={{
          position: "absolute",
          top: 6,
          left: bubbleStyle.left,
          width: bubbleStyle.width,
          height: "calc(100% - 12px)",
          background: "#2a2218",
          borderRadius: 999,
          transition:
            "left 0.35s cubic-bezier(.34,1.56,.64,1), width 0.35s cubic-bezier(.34,1.56,.64,1)",
          opacity: bubbleStyle.opacity,
          zIndex: 0,
        }}
      />

      {items.map((item, idx) => {
        const isActive = idx === current;
        return (
          <div
            key={item.id}
            data-tab={item.id}
            onClick={() => onNavigate(item)}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              cursor: "pointer",
              padding: "8px 4px",
              position: "relative",
              zIndex: 1,
              borderRadius: 999,
              transition: "transform 0.2s ease",
            }}
          >
            <div style={{ position: "relative" }}>
              <span
                style={{
                  fontSize: 20,
                  lineHeight: 1,
                  display: "block",
                  transition: "transform 0.35s cubic-bezier(.34,1.56,.64,1)",
                  transform: isActive
                    ? "scale(1.18) translateY(-1px)"
                    : "scale(1)",
                }}
              >
                {item.icon}
              </span>
              {/* Badge notificari */}
              {item.id === "notifications" && badge > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: -4,
                    right: -8,
                    minWidth: 16,
                    height: 16,
                    background: "#c0622f",
                    borderRadius: 999,
                    fontSize: 9,
                    fontWeight: 800,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    padding: "0 3px",
                  }}
                >
                  {badge > 9 ? "9+" : badge}
                </span>
              )}
            </div>
            <span
              style={{
                fontSize: 9,
                letterSpacing: 0.5,
                textTransform: "uppercase",
                fontWeight: isActive ? 700 : 400,
                color: isActive ? "#f0ebe3" : "#6b6050",
                transition: "color 0.2s ease, font-weight 0.2s ease",
              }}
            >
              {item.label}
            </span>
          </div>
        );
      })}
    </nav>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function BottomNav({
  onWaiterClick,
  waiterLoggedIn,
  unreadCount: unreadProp,
}) {
  const { state, navigate } = useApp();
  const { screen, selectedRest, user } = state;
  const [localUnread, setLocalUnread] = useState(0);
  const [popup, setPopup] = useState(null);
  const lastSeenId = useRef(null);

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
        if (data.length > 0 && data[0].id !== lastSeenId.current) {
          lastSeenId.current = data[0].id;
          setPopup({ message: data[0].message, type: data[0].type });
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

  // ── Popup notificare ──
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

  // ── Proprietar / Superadmin ──
  if (user?.role === "owner" || user?.role === "superadmin") {
    return (
      <>
        {popupUI}
        <BubbleNav
          items={OWNER_ITEMS}
          activeId={screen}
          onNavigate={(item) => navigate(item.id)}
          badge={0}
        />
      </>
    );
  }

  // ── Client ──
  return (
    <>
      {popupUI}
      <BubbleNav
        items={CLIENT_ITEMS}
        activeId={screen}
        onNavigate={(item) => {
          if (item.needsRest && !selectedRest) {
            navigate("home");
            return;
          }
          navigate(item.id);
        }}
        badge={localUnread}
      />
    </>
  );
}
