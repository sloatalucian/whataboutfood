import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { supabase } from "../supabase";

export function Auth() {
  const { state, dispatch, navigate, showToast } = useApp();
  const { user } = state;
  const [tab, setTab] = useState("rezervari"); // "rezervari" | "comenzi"
  const [rezervari, setRezervari] = useState([]);
  const [comenzi, getComenzi] = useState([]);
  const [loading, setLoading] = useState(true);

  // Încarcă datele din Supabase
  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    const load = async () => {
      setLoading(true);
      // Rezervări ale clientului
      const { data: rez } = await supabase
        .from("reservations")
        .select("*, restaurants(name, emoji)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (rez) setRezervari(rez);

      // Comenzi ale clientului - grupate după table_session_id
      const { data: ord } = await supabase
        .from("orders")
        .select("*, restaurants(name, emoji)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (ord) getComenzi(ord);

      setLoading(false);
    };
    load();
  }, [user?.id]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    dispatch({ type: "SET_USER", payload: null });
    navigate("home");
    showToast("La revedere! 👋");
  };

  const formatData = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString("ro-RO", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "Europe/Bucharest",
    });
  };

  const formatOra = (iso) => {
    if (!iso) return "";
    return new Date(iso).toLocaleTimeString("ro-RO", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Bucharest",
    });
  };

  const statusColor = (s) => {
    if (!s) return "#6b6050";
    if (s === "confirmed" || s === "approved") return "#6b9e6b";
    if (s === "pending") return "#c8a97e";
    if (s === "cancelled" || s === "rejected") return "#e05050";
    if (s === "completed" || s === "paid") return "#5b8dd9";
    return "#6b6050";
  };

  const statusLabel = (s) => {
    const map = {
      confirmed: "Confirmată",
      approved: "Aprobată",
      pending: "În așteptare",
      cancelled: "Anulată",
      rejected: "Respinsă",
      completed: "Finalizată",
      paid: "Plătită",
      delivered: "Livrată",
    };
    return map[s] || s || "—";
  };

  return (
    <div className="page fade-in">
      {/* Header */}
      <div
        style={{
          padding: "52px 20px 24px",
          background: "linear-gradient(160deg,#1a0e05 0%,#0d0a07 60%)",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background:
              "radial-gradient(ellipse 100% 60% at 50% 0%,rgba(192,98,47,.1),transparent 70%)",
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => navigate("home")}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "rgba(255,255,255,.08)",
                border: "1px solid rgba(255,255,255,.12)",
                color: "#f0ebe3",
                fontSize: 16,
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
                width: 44,
                height: 44,
                borderRadius: 13,
                background: "linear-gradient(135deg,var(--terra),#8b3a18)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
              }}
            >
              {user?.name?.[0]?.toUpperCase() || "👤"}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>
                {user?.name || "Contul meu"}
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>
                {user?.email}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: "6px 14px",
              borderRadius: 10,
              background: "rgba(192,57,43,.15)",
              border: "1px solid rgba(192,57,43,.3)",
              color: "#e05050",
              fontSize: 12,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Ieși
          </button>
        </div>

        {/* Tab-uri */}
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
        >
          {[
            { id: "rezervari", icon: "📅", label: "Rezervări" },
            { id: "comenzi", icon: "🧾", label: "Note de plată" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: "10px 0",
                borderRadius: 12,
                border: "none",
                cursor: "pointer",
                background:
                  tab === t.id ? "var(--terra)" : "rgba(255,255,255,.05)",
                color: tab === t.id ? "#fff" : "var(--muted)",
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                fontSize: 13,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="inner" style={{ paddingTop: 20, paddingBottom: 100 }}>
        {loading ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px 0",
              color: "var(--muted)",
              fontSize: 13,
            }}
          >
            Se încarcă...
          </div>
        ) : tab === "rezervari" ? (
          <>
            <div
              style={{
                fontSize: 10,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: "#6b6050",
                marginBottom: 14,
              }}
            >
              Istoric rezervări
            </div>
            {rezervari.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
                <div
                  style={{
                    fontSize: 15,
                    color: "var(--cream)",
                    marginBottom: 6,
                  }}
                >
                  Nicio rezervare încă
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  Rezervările tale vor apărea aici.
                </div>
              </div>
            ) : (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {rezervari.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      background: "#161210",
                      border: "1px solid #2a2218",
                      borderRadius: 16,
                      padding: "16px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        marginBottom: 10,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <div
                          style={{
                            width: 42,
                            height: 42,
                            borderRadius: 12,
                            fontSize: 22,
                            background: "#1e1a14",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {r.restaurants?.emoji || "🍽️"}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>
                            {r.restaurants?.name || "Restaurant"}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: "var(--muted)",
                              marginTop: 2,
                            }}
                          >
                            {formatData(r.date || r.created_at)}{" "}
                            {r.time ? `• ${r.time}` : ""}
                          </div>
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "4px 10px",
                          borderRadius: 20,
                          background: `${statusColor(r.status)}22`,
                          color: statusColor(r.status),
                          border: `1px solid ${statusColor(r.status)}44`,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {statusLabel(r.status)}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                      {r.guests && (
                        <div style={{ fontSize: 11, color: "var(--muted)" }}>
                          👥{" "}
                          <span style={{ color: "var(--cream)" }}>
                            {r.guests} persoane
                          </span>
                        </div>
                      )}
                      {r.table_label && (
                        <div style={{ fontSize: 11, color: "var(--muted)" }}>
                          🪑 Masa{" "}
                          <span style={{ color: "var(--cream)" }}>
                            {r.table_label}
                          </span>
                        </div>
                      )}
                      {r.observations && (
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--muted)",
                            width: "100%",
                            marginTop: 4,
                          }}
                        >
                          💬{" "}
                          <span style={{ color: "var(--cream)" }}>
                            {r.observations}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div
              style={{
                fontSize: 10,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: "#6b6050",
                marginBottom: 14,
              }}
            >
              Note de plată
            </div>
            {comenzi.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🧾</div>
                <div
                  style={{
                    fontSize: 15,
                    color: "var(--cream)",
                    marginBottom: 6,
                  }}
                >
                  Nicio comandă încă
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  Comenzile tale vor apărea aici.
                </div>
              </div>
            ) : (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {comenzi.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      background: "#161210",
                      border: "1px solid #2a2218",
                      borderRadius: 16,
                      overflow: "hidden",
                    }}
                  >
                    {/* Header comandă */}
                    <div
                      style={{
                        padding: "14px 16px",
                        borderBottom: "1px solid #2a2218",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 10,
                            fontSize: 20,
                            background: "#1e1a14",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {c.restaurants?.emoji || "🍽️"}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>
                            {c.restaurants?.name || "Restaurant"}
                          </div>
                          <div style={{ fontSize: 10, color: "var(--muted)" }}>
                            {formatData(c.created_at)} •{" "}
                            {formatOra(c.created_at)}
                            {c.table_label ? ` • Masa ${c.table_label}` : ""}
                          </div>
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "4px 10px",
                          borderRadius: 20,
                          background: `${statusColor(c.status)}22`,
                          color: statusColor(c.status),
                          border: `1px solid ${statusColor(c.status)}44`,
                        }}
                      >
                        {statusLabel(c.status)}
                      </span>
                    </div>

                    {/* Produse comandate */}
                    <div style={{ padding: "10px 16px" }}>
                      {Array.isArray(c.items) &&
                        c.items.map((item, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: "6px 0",
                              borderBottom:
                                idx < c.items.length - 1
                                  ? "1px solid rgba(255,255,255,.04)"
                                  : "none",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                              }}
                            >
                              <span style={{ fontSize: 16 }}>
                                {item.emoji || "🍴"}
                              </span>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 600 }}>
                                  {item.name}
                                </div>
                                {item.qty > 1 && (
                                  <div
                                    style={{
                                      fontSize: 10,
                                      color: "var(--muted)",
                                    }}
                                  >
                                    x{item.qty} × {item.price} lei
                                  </div>
                                )}
                              </div>
                            </div>
                            <div
                              style={{
                                fontSize: 13,
                                fontWeight: 700,
                                color: "var(--terra)",
                              }}
                            >
                              {(item.price * (item.qty || 1)).toFixed(2)} lei
                            </div>
                          </div>
                        ))}
                    </div>

                    {/* Total */}
                    <div
                      style={{
                        padding: "12px 16px",
                        borderTop: "1px solid #2a2218",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        background: "rgba(255,255,255,.02)",
                      }}
                    >
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>
                        {Array.isArray(c.items)
                          ? c.items.reduce((s, i) => s + (i.qty || 1), 0)
                          : 0}{" "}
                        produse
                      </div>
                      <div
                        style={{
                          fontFamily: "'Fraunces',serif",
                          fontSize: 18,
                          fontWeight: 900,
                          color: "var(--terra)",
                        }}
                      >
                        {Number(c.total).toFixed(2)} lei
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
