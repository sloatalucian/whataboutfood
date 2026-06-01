import { useState, useEffect, useRef } from "react";
import { useApp } from "../context/AppContext";
import { supabase } from "../supabase";

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const Icons = {
  home: (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  ),
  reserve: (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  ),
  menu: (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="M9 12h6M9 16h4" />
    </svg>
  ),
  notifications: (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  ),
  auth: (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  ),
  adminFloor: (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="8" height="8" rx="1" />
      <rect x="13" y="3" width="8" height="8" rx="1" />
      <rect x="3" y="13" width="8" height="8" rx="1" />
      <rect x="13" y="13" width="8" height="8" rx="1" />
    </svg>
  ),
  menuEditor: (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="M9 12h6M9 16h4" />
    </svg>
  ),
  statistici: (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 20V10M12 20V4M6 20v-6" />
    </svg>
  ),
  admin: (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="8" cy="8" r="3" />
      <circle cx="16" cy="8" r="3" />
      <path d="M2 20c0-3.3 2.7-6 6-6h8c3.3 0 6 2.7 6 6" />
    </svg>
  ),
};

const CLIENT_ITEMS = [
  { id: "home", label: "Acasă" },
  { id: "reserve", label: "Rezervare", needsRest: true },
  { id: "menu", label: "Meniu", needsRest: true },
  { id: "notifications", label: "Notificări" },
  { id: "auth", label: "Cont" },
];

const OWNER_ITEMS = [
  { id: "home", label: "Acasă" },
  { id: "adminFloor", label: "Planșeu" },
  { id: "menuEditor", label: "Meniu" },
  { id: "statistici", label: "Statistici" },
  { id: "admin", label: "Ospătari" },
];

const ACTIVE_COLOR = "#c0622f";
const INACTIVE_COLOR = "#8a7a6a";

// ── NavBar ────────────────────────────────────────────────────────────────────
function GlowNav({ items, activeId, onNavigate, badge }) {
  const activeIdx = items.findIndex((i) => i.id === activeId);
  const current = activeIdx >= 0 ? activeIdx : 0;
  const [animIdx, setAnimIdx] = useState(current);
  const [collapsed, setCollapsed] = useState(false);
  const prevIdx = useRef(current);
  const lastScrollY = useRef(0);
  const scrollTimeout = useRef(null);

  // Detectam scroll pe .page (elementul care scrolleaza in app)
  useEffect(() => {
    const handleScroll = (e) => {
      const el = e.target;
      // Ignoram scroll din elemente mici (modals, dropdowns)
      // Acceptam doar de pe .page sau body/html
      const isPageScroll =
        el.classList?.contains("page") ||
        el === document.documentElement ||
        el === document.body;
      if (!isPageScroll) return;

      const currentY = el.scrollTop || window.scrollY || 0;
      const delta = currentY - lastScrollY.current;

      if (delta > 8) {
        setCollapsed(true);
      } else if (delta < -8) {
        setCollapsed(false);
      }
      lastScrollY.current = currentY;
    };

    // Ascultam pe document in capture phase - prinde scroll din orice div intern
    document.addEventListener("scroll", handleScroll, {
      passive: true,
      capture: true,
    });
    return () => {
      document.removeEventListener("scroll", handleScroll, { capture: true });
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    };
  }, []);

  const handleClick = (item, idx) => {
    if (collapsed && idx === 0) {
      // Tap pe Home cand e collapsed -> expand
      setCollapsed(false);
      return;
    }
    prevIdx.current = idx;
    setAnimIdx(idx);
    onNavigate(item);
  };

  return (
    <nav
      className="waf-bottom-nav"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 80,
        paddingBottom: "env(safe-area-inset-bottom, 8px)",
        paddingLeft: 12,
        paddingRight: 12,
        paddingTop: 8,
        display: "flex",
        justifyContent: collapsed ? "flex-start" : "center",
        background: "transparent",
        transition: "justify-content 0s",
        pointerEvents: "none",
      }}
    >
      <style>{`
        @keyframes wafGlowPop {
          0%   { box-shadow: 0 0 0px 0px rgba(192,98,47,0); transform: scale(0.82); }
          50%  { box-shadow: 0 0 18px 6px rgba(192,98,47,0.42); transform: scale(1.13); }
          100% { box-shadow: 0 0 12px 3px rgba(192,98,47,0.28); transform: scale(1); }
        }
        @keyframes wafBounce {
          0%   { transform: translateY(0); }
          35%  { transform: translateY(-5px); }
          65%  { transform: translateY(1px); }
          100% { transform: translateY(0); }
        }
        @keyframes wafLabelIn {
          0%   { opacity: 0; transform: translateY(4px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes wafRipple {
          0%   { transform: scale(0); opacity: 0.45; }
          100% { transform: scale(3); opacity: 0; }
        }
        .waf-ripple {
          position: absolute;
          width: 42px; height: 42px;
          border-radius: 50%;
          background: rgba(192,98,47,0.22);
          pointer-events: none;
          animation: wafRipple 0.55s ease-out forwards;
        }
        .waf-wrap-active {
          animation: wafGlowPop 0.45s cubic-bezier(.23,1,.32,1) forwards;
        }
        .waf-icon-active {
          animation: wafBounce 0.4s cubic-bezier(.23,1,.32,1) forwards;
        }
        .waf-label-active {
          animation: wafLabelIn 0.3s ease forwards;
        }
        .waf-pill {
          display: flex;
          align-items: center;
          background: rgba(13,10,7,0.6);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(192,98,47,0.2);
          border-radius: 28px;
          padding: 6px;
          pointer-events: all;
          transition: all 0.4s cubic-bezier(0.34,1.56,0.64,1);
          overflow: hidden;
          margin-bottom: 8px;
        }
        .waf-nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border: none;
          background: transparent;
          cursor: pointer;
          border-radius: 22px;
          padding: 8px 14px;
          transition: all 0.35s cubic-bezier(0.34,1.2,0.64,1);
          max-width: 100px;
          overflow: hidden;
          white-space: nowrap;
          WebkitTapHighlightColor: transparent;
          gap: 0;
        }
        .waf-nav-item.waf-hidden {
          max-width: 0;
          padding: 8px 0;
          opacity: 0;
          pointer-events: none;
        }
      `}</style>

      <div className="waf-pill">
        {items.map((item, idx) => {
          const isActive = idx === current;
          const wasJustActivated = idx === animIdx && isActive;
          const isHidden = collapsed && idx !== 0;

          return (
            <button
              key={item.id}
              className={`waf-nav-item${isHidden ? " waf-hidden" : ""}`}
              onClick={() => {
                if (!isActive && !isHidden) {
                  const wrap = document.getElementById(`waf-wrap-${idx}`);
                  if (wrap) {
                    const r = document.createElement("div");
                    r.className = "waf-ripple";
                    wrap.appendChild(r);
                    setTimeout(() => r.remove(), 600);
                  }
                }
                handleClick(item, idx);
              }}
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              {/* Icon wrapper */}
              <div
                id={`waf-wrap-${idx}`}
                className={wasJustActivated ? "waf-wrap-active" : ""}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  color: isActive ? ACTIVE_COLOR : INACTIVE_COLOR,
                  boxShadow: isActive
                    ? "0 0 12px 3px rgba(192,98,47,0.28)"
                    : "none",
                  transition: "color 0.25s ease, box-shadow 0.25s ease",
                }}
              >
                <div className={wasJustActivated ? "waf-icon-active" : ""}>
                  {Icons[item.id]}
                </div>

                {/* Badge notificări */}
                {item.id === "notifications" && badge > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 4,
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
                      border: "1.5px solid #0d0a07",
                    }}
                  >
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </div>

              {/* Label */}
              <span
                className={wasJustActivated ? "waf-label-active" : ""}
                style={{
                  fontSize: 10,
                  marginTop: 4,
                  letterSpacing: 0.2,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? ACTIVE_COLOR : INACTIVE_COLOR,
                  transition: "color 0.25s ease",
                }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
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
          color: "#c0622f",
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#f0ebe3" }}>
          Ai o notificare nouă
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
        <GlowNav
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
      <GlowNav
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
