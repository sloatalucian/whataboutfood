import { useEffect } from "react";
import { useApp } from "../context/AppContext";

export default function Notifications() {
  const { state, dispatch, navigate } = useApp();
  const { notifications } = state;

  // Marchează toate ca citite când intri pe pagină
  useEffect(() => {
    dispatch({ type: "MARK_NOTIFICATIONS_READ" });
  }, []);

  const getIcon = (type) => {
    switch (type) {
      case "order_accepted":
        return { icon: "✅", color: "#6b9e6b", bg: "rgba(74,110,74,.15)" };
      case "order_ready":
        return { icon: "🍽️", color: "#c8a97e", bg: "rgba(200,169,126,.15)" };
      case "order_paid":
        return { icon: "💳", color: "#5b8dd9", bg: "rgba(91,141,217,.15)" };
      case "reservation_confirmed":
        return { icon: "📅", color: "#c0622f", bg: "rgba(192,98,47,.15)" };
      case "reservation_refused":
        return { icon: "❌", color: "#e05050", bg: "rgba(192,57,43,.15)" };
      default:
        return { icon: "🔔", color: "#c8a97e", bg: "rgba(200,169,126,.15)" };
    }
  };

  const formatTime = (date) => {
    const now = new Date();
    const then = new Date(date);
    const diff = Math.floor((now - then) / 1000);
    if (diff < 60) return "acum";
    if (diff < 3600) return `${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return then.toLocaleDateString("ro-RO", { day: "numeric", month: "short" });
  };

  return (
    <div className="page fade-in" style={{ paddingBottom: 90 }}>
      {/* Header */}
      <div
        style={{
          padding: "44px 20px 20px",
          background: "linear-gradient(135deg,#100a05,#0d0a07)",
          borderBottom: "1px solid #2a2218",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => navigate("home")}
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: "rgba(255,255,255,.05)",
              border: "1px solid #2a2218",
              color: "#f0ebe3",
              fontSize: 17,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ←
          </button>
          <div
            style={{
              fontFamily: "'Fraunces',serif",
              fontSize: 22,
              fontWeight: 900,
            }}
          >
            🔔 Notificările mele
          </div>
        </div>
      </div>

      <div style={{ padding: 16 }}>
        {notifications.length === 0 ? (
          <div
            style={{ textAlign: "center", padding: "60px 0", color: "#6b6050" }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔔</div>
            <div style={{ fontSize: 16, color: "#f0ebe3", marginBottom: 8 }}>
              Nicio notificare
            </div>
            <div style={{ fontSize: 13 }}>
              Vei fi notificat când comanda ta e preluată sau gata.
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {notifications.map((notif) => {
              const { icon, color, bg } = getIcon(notif.type);
              return (
                <div
                  key={notif.id}
                  style={{
                    background: notif.isRead
                      ? "#161210"
                      : "rgba(192,98,47,.06)",
                    border: `1px solid ${notif.isRead ? "#2a2218" : "rgba(192,98,47,.2)"}`,
                    borderRadius: 16,
                    padding: "14px 16px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                  }}
                >
                  {/* Icon */}
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      flexShrink: 0,
                      background: bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 22,
                    }}
                  >
                    {icon}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "#f0ebe3",
                        marginBottom: 4,
                      }}
                    >
                      {notif.message}
                    </div>
                    {notif.details && (
                      <div
                        style={{
                          fontSize: 12,
                          color: "#6b6050",
                          marginBottom: 4,
                        }}
                      >
                        {notif.details}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: "#6b6050" }}>
                      {formatTime(notif.createdAt)}
                    </div>
                  </div>

                  {/* Dot necitit */}
                  {!notif.isRead && (
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "#c0622f",
                        flexShrink: 0,
                        marginTop: 4,
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
