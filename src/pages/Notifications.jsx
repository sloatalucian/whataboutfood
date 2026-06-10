import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import { supabase } from "../supabase";

export default function Notifications() {
  const { state, navigate } = useApp();
  const { user } = state;
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    // Fetch initial - independent de Realtime
    const load = async () => {
      try {
        const { data } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50);
        if (data) setNotifications(data);
      } catch {}
      setLoading(false);
    };
    load();
  }, [user?.id]);

  // Realtime - separat de fetch initial
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`notifications_${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new, ...prev]);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Marchează ca citite când utilizatorul vede notificările
  useEffect(() => {
    if (!user?.id || loading || notifications.length === 0) return;
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    supabase
      .from("notifications")
      .update({ is_read: true })
      .in("id", unreadIds)
      .then(() => {});
  }, [loading, user?.id]);

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
      case "reservation_rejected":
        return { icon: "❌", color: "#e05050", bg: "rgba(192,57,43,.15)" };
      default:
        return { icon: "🔔", color: "#c8a97e", bg: "rgba(200,169,126,.15)" };
    }
  };

  const formatTime = (date) => {
    if (!date) return "";
    const now = new Date();
    // Asigurăm că e tratat ca UTC adăugând Z dacă lipsește
    const dateStr =
      date.endsWith("Z") || date.includes("+") ? date : date + "Z";
    const then = new Date(dateStr);
    const diff = Math.floor((now - then) / 1000);
    if (diff < 60) return "acum";
    if (diff < 3600) return `${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    if (diff < 86400 * 2) return "ieri";
    return then.toLocaleDateString("ro-RO", {
      day: "numeric",
      month: "short",
      timeZone: "Europe/Bucharest",
    });
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
        {loading ? (
          <div
            style={{
              textAlign: "center",
              padding: "60px 0",
              color: "#6b6050",
              fontSize: 13,
            }}
          >
            Se încarcă...
          </div>
        ) : notifications.length === 0 ? (
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
                    background: notif.is_read
                      ? "#161210"
                      : "rgba(192,98,47,.06)",
                    border: `1px solid ${notif.is_read ? "#2a2218" : "rgba(192,98,47,.2)"}`,
                    borderRadius: 16,
                    padding: "14px 16px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                  }}
                >
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
                    <div style={{ fontSize: 11, color: "#6b6050" }}>
                      {formatTime(notif.created_at)}
                    </div>
                  </div>
                  {!notif.is_read && (
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
