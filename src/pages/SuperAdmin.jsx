import { useState, useEffect, useCallback } from "react";
import { useApp } from "../context/AppContext";
import { supabase } from "../supabase";

const ADMIN_EMAIL = "sloatalucian@yahoo.com";

// ─── EXPORT CSV/EXCEL ─────────────────────────────────────────────────────────
function exportToCSV(data, filename) {
  if (!data || data.length === 0) return;
  const headers = Object.keys(data[0]).join(",");
  const rows = data
    .map((row) =>
      Object.values(row)
        .map((val) =>
          typeof val === "string"
            ? `"${val.replace(/"/g, '""')}"`
            : (val ?? ""),
        )
        .join(","),
    )
    .join("\n");
  const csv = `${headers}\n${rows}`;
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const TABS = [
  { id: "cereri", icon: "📋", label: "Cereri" },
  { id: "proprietari", icon: "👥", label: "Proprietari" },
  { id: "restaurante", icon: "🏪", label: "Restaurante" },
  { id: "statistici", icon: "📊", label: "Statistici" },
  { id: "abonamente", icon: "💰", label: "Abonamente" },
];

const PLAN_COLOR = { free: "#6b6050", pro: "#c8a97e", business: "#4a6e4a" };
const PLAN_BG = {
  free: "rgba(107,96,80,.2)",
  pro: "rgba(200,169,126,.2)",
  business: "rgba(74,110,74,.2)",
};
const STATUS_COLOR = {
  approved: "#6b9e6b",
  pending: "#e07a47",
  rejected: "#e05050",
  suspended: "#5b8dd9",
};
const STATUS_BG = {
  approved: "rgba(74,110,74,.2)",
  pending: "rgba(224,122,71,.2)",
  rejected: "rgba(192,57,43,.2)",
  suspended: "rgba(91,141,217,.2)",
};

export default function SuperAdmin() {
  const { state, navigate, showToast } = useApp();
  const { user } = state;

  const [activeTab, setActiveTab] = useState("cereri");
  const [cereri, setCereri] = useState([]);
  const [proprietari, setProprietari] = useState([]);
  const [restaurante, setRestaurante] = useState([]);
  const [abonamente, setAbonamente] = useState([]);
  const [statistici, setStatistici] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewAsOwner, setViewAsOwner] = useState(null);

  // ── Verifică acces admin ──
  if (user?.email !== ADMIN_EMAIL) {
    return (
      <div
        className="page fade-in"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          padding: 24,
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>🚫</div>
        <div
          style={{
            fontFamily: "'Fraunces',serif",
            fontSize: 24,
            fontWeight: 900,
            marginBottom: 8,
          }}
        >
          Acces interzis
        </div>
        <div style={{ fontSize: 14, color: "#6b6050", marginBottom: 24 }}>
          Nu ai permisiuni pentru această pagină.
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
    );
  }

  // ── Încarcă date ──
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [
        { data: cereriData },
        { data: propData },
        { data: restData },
        { data: aboData },
        { count: totalProp },
        { count: totalRest },
        { count: totalOrders },
        { data: venituriData },
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .eq("status", "pending")
          .order("created_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("*")
          .eq("role", "owner")
          .order("created_at", { ascending: false }),
        supabase
          .from("restaurants")
          .select("*, profiles(full_name,email)")
          .order("created_at", { ascending: false }),
        supabase
          .from("subscriptions")
          .select("*, profiles(full_name,email), restaurants(name)")
          .order("created_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("role", "owner")
          .eq("status", "approved"),
        supabase
          .from("restaurants")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true),
        supabase.from("orders").select("*", { count: "exact", head: true }),
        supabase
          .from("subscriptions")
          .select("amount,plan")
          .eq("status", "paid"),
      ]);

      setCereri(cereriData || []);
      setProprietari(propData || []);
      setRestaurante(restData || []);
      setAbonamente(aboData || []);

      const totalVenituri = (venituriData || []).reduce(
        (s, a) => s + (a.amount || 0),
        0,
      );
      const planCounts = { free: 0, pro: 0, business: 0 };
      (restData || []).forEach((r) => {
        if (planCounts[r.plan] !== undefined) planCounts[r.plan]++;
      });

      setStatistici({
        totalProp: totalProp || 0,
        totalRest: totalRest || 0,
        totalOrders: totalOrders || 0,
        totalVenituri,
        planCounts,
        cereriPending: (cereriData || []).length,
      });
    } catch (err) {
      console.log("Admin load error:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ── Acțiuni ──
  const approveOwner = async (id, email, name) => {
    try {
      await supabase
        .from("profiles")
        .update({ status: "approved", approved_at: new Date().toISOString() })
        .eq("id", id);
      setCereri((prev) => prev.filter((c) => c.id !== id));
      showToast(`✅ ${name} aprobat!`);
      loadAll();
    } catch {
      showToast("❌ Eroare.");
    }
  };

  const rejectOwner = async (id, name) => {
    try {
      await supabase
        .from("profiles")
        .update({ status: "rejected" })
        .eq("id", id);
      setCereri((prev) => prev.filter((c) => c.id !== id));
      showToast(`❌ ${name} respins.`);
    } catch {
      showToast("❌ Eroare.");
    }
  };

  const toggleOwner = async (id, status) => {
    const newStatus = status === "approved" ? "suspended" : "approved";
    try {
      await supabase
        .from("profiles")
        .update({ status: newStatus })
        .eq("id", id);
      setProprietari((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p)),
      );
      showToast(
        newStatus === "approved" ? "✅ Cont activat" : "🔒 Cont suspendat",
      );
    } catch {
      showToast("❌ Eroare.");
    }
  };

  const changePlan = async (restaurantId, plan) => {
    try {
      await supabase
        .from("restaurants")
        .update({ plan, plan_updated_at: new Date().toISOString() })
        .eq("id", restaurantId);
      setRestaurante((prev) =>
        prev.map((r) => (r.id === restaurantId ? { ...r, plan } : r)),
      );
      showToast(`✅ Plan schimbat la ${plan.toUpperCase()}!`);
    } catch {
      showToast("❌ Eroare.");
    }
  };

  const toggleRestaurant = async (id, isActive) => {
    try {
      await supabase
        .from("restaurants")
        .update({ is_active: !isActive })
        .eq("id", id);
      setRestaurante((prev) =>
        prev.map((r) => (r.id === id ? { ...r, is_active: !isActive } : r)),
      );
      showToast(!isActive ? "✅ Activat" : "🔒 Dezactivat");
    } catch {
      showToast("❌ Eroare.");
    }
  };

  const addSubscription = async (ownerId, restaurantId, plan, amount) => {
    const now = new Date();
    const end = new Date(now);
    end.setMonth(end.getMonth() + 1);
    try {
      await supabase
        .from("subscriptions")
        .insert({
          owner_id: ownerId,
          restaurant_id: restaurantId,
          plan,
          amount,
          status: "paid",
          payment_method: "manual",
          period_start: now.toISOString(),
          period_end: end.toISOString(),
        });
      await supabase
        .from("restaurants")
        .update({ plan, plan_expires_at: end.toISOString() })
        .eq("id", restaurantId);
      showToast("✅ Abonament înregistrat!");
      loadAll();
    } catch {
      showToast("❌ Eroare.");
    }
  };

  // ── Vizualizare ca proprietar ──
  if (viewAsOwner) {
    return (
      <div className="page fade-in">
        <div
          style={{
            background: "rgba(192,98,47,.15)",
            border: "1px solid rgba(192,98,47,.3)",
            padding: "12px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontSize: 13, color: "#e07a47", fontWeight: 600 }}>
            👁️ Vizualizezi ca:{" "}
            <b>{viewAsOwner.profiles?.full_name || viewAsOwner.name}</b>
          </div>
          <button
            onClick={() => setViewAsOwner(null)}
            style={{
              padding: "6px 14px",
              borderRadius: 10,
              background: "rgba(192,98,47,.3)",
              border: "1px solid rgba(192,98,47,.5)",
              color: "#e07a47",
              fontSize: 12,
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            ✕ Ieși
          </button>
        </div>
        <div className="inner" style={{ paddingTop: 20 }}>
          <div
            style={{
              fontFamily: "'Fraunces',serif",
              fontSize: 20,
              fontWeight: 900,
              marginBottom: 6,
            }}
          >
            {viewAsOwner.emoji} {viewAsOwner.name}
          </div>
          <div style={{ fontSize: 12, color: "#6b6050", marginBottom: 20 }}>
            📍 {viewAsOwner.city} • Plan{" "}
            {(viewAsOwner.plan || "free").toUpperCase()} • 👤{" "}
            {viewAsOwner.profiles?.full_name}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3,1fr)",
              gap: 10,
              marginBottom: 20,
            }}
          >
            {[
              {
                icon: "🍽️",
                label: "Comenzi total",
                value: "—",
                color: "#c0622f",
              },
              {
                icon: "📅",
                label: "Rezervări total",
                value: "—",
                color: "#c8a97e",
              },
              {
                icon: "💰",
                label: "Venituri total",
                value: "—",
                color: "#6b9e6b",
              },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  background: "#161210",
                  border: "1px solid #2a2218",
                  borderRadius: 14,
                  padding: "14px 10px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
                <div
                  style={{
                    fontFamily: "'Fraunces',serif",
                    fontSize: 18,
                    fontWeight: 900,
                    color: s.color,
                  }}
                >
                  {s.value}
                </div>
                <div style={{ fontSize: 9, color: "#6b6050", marginTop: 2 }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              background: "rgba(200,169,126,.08)",
              border: "1px solid rgba(200,169,126,.2)",
              borderRadius: 14,
              padding: 16,
              fontSize: 13,
              color: "#c8a97e",
              lineHeight: 1.6,
            }}
          >
            💡 Aceasta e perspectiva proprietarului pentru{" "}
            <b>{viewAsOwner.name}</b>.<br />
            Datele reale apar când restaurantul are comenzi și rezervări active.
          </div>

          <button
            onClick={() => setViewAsOwner(null)}
            style={{
              width: "100%",
              marginTop: 20,
              padding: 13,
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
            ← Înapoi la Super Admin
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page fade-in" style={{ paddingBottom: 100 }}>
      {/* Header */}
      <div
        style={{
          padding: "44px 20px 16px",
          background: "linear-gradient(135deg,#100a05,#0d0a07)",
          borderBottom: "1px solid #2a2218",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 12,
          }}
        >
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
          <div>
            <div
              style={{
                fontFamily: "'Fraunces',serif",
                fontSize: 22,
                fontWeight: 900,
              }}
            >
              ⚙️ Super Admin
            </div>
            <div style={{ fontSize: 12, color: "#6b6050" }}>
              WhataboutFood Platform
            </div>
          </div>
        </div>

        {statistici && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3,1fr)",
              gap: 8,
            }}
          >
            {[
              {
                label: "Proprietari",
                value: statistici.totalProp,
                color: "#c0622f",
              },
              {
                label: "Restaurante",
                value: statistici.totalRest,
                color: "#c8a97e",
              },
              {
                label: "Cereri noi",
                value: statistici.cereriPending,
                color: "#e07a47",
              },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  background: "rgba(255,255,255,.04)",
                  borderRadius: 10,
                  padding: "10px 6px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontFamily: "'Fraunces',serif",
                    fontSize: 20,
                    fontWeight: 900,
                    color: s.color,
                  }}
                >
                  {s.value}
                </div>
                <div style={{ fontSize: 9, color: "#6b6050", marginTop: 2 }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          overflowX: "auto",
          scrollbarWidth: "none",
          background: "#161210",
          borderBottom: "1px solid #2a2218",
        }}
      >
        {TABS.map((t) => (
          <div
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: "12px 16px",
              cursor: "pointer",
              whiteSpace: "nowrap",
              borderBottom: `2px solid ${activeTab === t.id ? "#c0622f" : "transparent"}`,
              fontSize: 12,
              color: activeTab === t.id ? "#c0622f" : "#6b6050",
              fontWeight: activeTab === t.id ? 700 : 400,
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            {t.icon} {t.label}
            {t.id === "cereri" && cereri.length > 0 && (
              <span
                style={{
                  background: "#c0622f",
                  color: "#fff",
                  borderRadius: 20,
                  padding: "1px 6px",
                  fontSize: 10,
                  fontWeight: 800,
                  marginLeft: 2,
                }}
              >
                {cereri.length}
              </span>
            )}
          </div>
        ))}
      </div>

      <div style={{ padding: 16 }}>
        {loading && (
          <div
            style={{ textAlign: "center", padding: "40px 0", color: "#6b6050" }}
          >
            <div style={{ fontSize: 32, marginBottom: 10 }}>⚙️</div>
            <div>Se încarcă...</div>
          </div>
        )}

        {/* ── CERERI ── */}
        {!loading && activeTab === "cereri" && (
          <div>
            <div
              style={{
                fontSize: 11,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: "#6b6050",
                marginBottom: 14,
              }}
            >
              Cereri în așteptare ({cereri.length})
            </div>
            {cereri.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px 0",
                  color: "#6b6050",
                }}
              >
                <div style={{ fontSize: 36, marginBottom: 10 }}>✅</div>
                <div>Nicio cerere în așteptare</div>
              </div>
            ) : (
              cereri.map((c) => (
                <div
                  key={c.id}
                  style={{
                    background: "rgba(224,122,71,.08)",
                    border: "1px solid rgba(224,122,71,.25)",
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      marginBottom: 12,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 15,
                          marginBottom: 4,
                        }}
                      >
                        {c.full_name}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "#6b6050",
                          marginBottom: 2,
                        }}
                      >
                        📧 {c.email}
                      </div>
                      {c.phone && (
                        <div
                          style={{
                            fontSize: 12,
                            color: "#6b6050",
                            marginBottom: 2,
                          }}
                        >
                          📞 {c.phone}
                        </div>
                      )}
                      <div style={{ fontSize: 11, color: "#6b6050" }}>
                        📅{" "}
                        {new Date(c.created_at).toLocaleDateString("ro-RO", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 9,
                        fontWeight: 800,
                        padding: "3px 8px",
                        borderRadius: 20,
                        background: "rgba(224,122,71,.2)",
                        color: "#e07a47",
                      }}
                    >
                      ⏳ PENDING
                    </div>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 8,
                    }}
                  >
                    <button
                      onClick={() => rejectOwner(c.id, c.full_name)}
                      style={{
                        padding: 10,
                        borderRadius: 10,
                        background: "rgba(192,57,43,.15)",
                        border: "1px solid rgba(192,57,43,.3)",
                        color: "#e05050",
                        fontSize: 13,
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      ❌ Respinge
                    </button>
                    <button
                      onClick={() => approveOwner(c.id, c.email, c.full_name)}
                      style={{
                        padding: 10,
                        borderRadius: 10,
                        background: "rgba(74,110,74,.2)",
                        border: "1px solid rgba(74,110,74,.4)",
                        color: "#6b9e6b",
                        fontSize: 13,
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      ✅ Aprobă
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── PROPRIETARI ── */}
        {!loading && activeTab === "proprietari" && (
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  color: "#6b6050",
                }}
              >
                Proprietari ({proprietari.length})
              </div>
              <button
                onClick={() =>
                  exportToCSV(
                    proprietari.map((p) => ({
                      Nume: p.full_name,
                      Email: p.email,
                      Status: p.status || "approved",
                      "Data inregistrarii": new Date(
                        p.created_at,
                      ).toLocaleDateString("ro-RO"),
                    })),
                    "proprietari",
                  )
                }
                style={{
                  padding: "6px 12px",
                  borderRadius: 10,
                  background: "rgba(74,110,74,.2)",
                  border: "1px solid rgba(74,110,74,.4)",
                  color: "#6b9e6b",
                  fontSize: 12,
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                📥 Export
              </button>
            </div>
            {proprietari.map((p) => (
              <div
                key={p.id}
                style={{
                  background: "#161210",
                  border: "1px solid #2a2218",
                  borderRadius: 16,
                  padding: 14,
                  marginBottom: 10,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 12,
                      flexShrink: 0,
                      background: "rgba(192,98,47,.15)",
                      border: "1px solid rgba(192,98,47,.3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "'Fraunces',serif",
                      fontSize: 18,
                      fontWeight: 700,
                      color: "#c0622f",
                    }}
                  >
                    {(p.full_name || "?").charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}
                    >
                      {p.full_name}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#6b6050",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {p.email}
                    </div>
                    <div
                      style={{ fontSize: 10, color: "#6b6050", marginTop: 2 }}
                    >
                      {new Date(p.created_at).toLocaleDateString("ro-RO", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      gap: 6,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 9,
                        fontWeight: 800,
                        padding: "3px 8px",
                        borderRadius: 20,
                        background: STATUS_BG[p.status || "approved"],
                        color: STATUS_COLOR[p.status || "approved"],
                      }}
                    >
                      {(p.status || "APPROVED").toUpperCase()}
                    </div>
                    <button
                      onClick={() => toggleOwner(p.id, p.status || "approved")}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 8,
                        background:
                          p.status === "approved" || !p.status
                            ? "rgba(192,57,43,.15)"
                            : "rgba(74,110,74,.15)",
                        border: `1px solid ${p.status === "approved" || !p.status ? "rgba(192,57,43,.3)" : "rgba(74,110,74,.3)"}`,
                        color:
                          p.status === "approved" || !p.status
                            ? "#e05050"
                            : "#6b9e6b",
                        fontSize: 10,
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      {p.status === "approved" || !p.status
                        ? "🔒 Suspendă"
                        : "✅ Activează"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── RESTAURANTE ── */}
        {!loading && activeTab === "restaurante" && (
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  color: "#6b6050",
                }}
              >
                Restaurante ({restaurante.length})
              </div>
              <button
                onClick={() =>
                  exportToCSV(
                    restaurante.map((r) => ({
                      Nume: r.name,
                      Oras: r.city,
                      Tip: r.type,
                      Plan: r.plan,
                      Status: r.is_active ? "Activ" : "Inactiv",
                      Proprietar: r.profiles?.full_name || "",
                      "Data crearii": new Date(r.created_at).toLocaleDateString(
                        "ro-RO",
                      ),
                    })),
                    "restaurante",
                  )
                }
                style={{
                  padding: "6px 12px",
                  borderRadius: 10,
                  background: "rgba(74,110,74,.2)",
                  border: "1px solid rgba(74,110,74,.4)",
                  color: "#6b9e6b",
                  fontSize: 12,
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                📥 Export
              </button>
            </div>
            {restaurante.map((r) => (
              <div
                key={r.id}
                style={{
                  background: "#161210",
                  border: "1px solid #2a2218",
                  borderRadius: 16,
                  padding: 14,
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 8,
                  }}
                >
                  <div style={{ fontSize: 28, flexShrink: 0 }}>
                    {r.emoji || "🍽️"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}
                    >
                      {r.name}
                    </div>
                    <div style={{ fontSize: 11, color: "#6b6050" }}>
                      📍 {r.city} • 👤 {r.profiles?.full_name || "—"}
                    </div>
                    <div
                      style={{ fontSize: 10, color: "#6b6050", marginTop: 2 }}
                    >
                      {new Date(r.created_at).toLocaleDateString("ro-RO", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <select
                    value={r.plan || "free"}
                    onChange={(e) => changePlan(r.id, e.target.value)}
                    style={{
                      flex: 1,
                      background: PLAN_BG[r.plan || "free"],
                      border: `1px solid ${PLAN_COLOR[r.plan || "free"]}`,
                      borderRadius: 8,
                      color: PLAN_COLOR[r.plan || "free"],
                      fontSize: 11,
                      fontWeight: 800,
                      padding: "7px 10px",
                      cursor: "pointer",
                      outline: "none",
                      appearance: "none",
                    }}
                  >
                    <option value="free">FREE</option>
                    <option value="pro">PRO — 250 lei/lună</option>
                    <option value="business">BUSINESS — 800 lei/lună</option>
                  </select>
                  <button
                    onClick={() => setViewAsOwner(r)}
                    style={{
                      padding: "7px 12px",
                      borderRadius: 8,
                      background: "rgba(91,141,217,.15)",
                      border: "1px solid rgba(91,141,217,.3)",
                      color: "#5b8dd9",
                      fontSize: 11,
                      cursor: "pointer",
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                    }}
                  >
                    👁️ Vezi
                  </button>
                  <button
                    onClick={() => toggleRestaurant(r.id, r.is_active)}
                    style={{
                      padding: "7px 12px",
                      borderRadius: 8,
                      background: r.is_active
                        ? "rgba(192,57,43,.15)"
                        : "rgba(74,110,74,.15)",
                      border: `1px solid ${r.is_active ? "rgba(192,57,43,.3)" : "rgba(74,110,74,.3)"}`,
                      color: r.is_active ? "#e05050" : "#6b9e6b",
                      fontSize: 11,
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    {r.is_active ? "🔒" : "✅"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── STATISTICI ── */}
        {!loading && activeTab === "statistici" && statistici && (
          <div>
            <div
              style={{
                fontSize: 11,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: "#6b6050",
                marginBottom: 14,
              }}
            >
              Statistici platformă
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
                marginBottom: 20,
              }}
            >
              {[
                {
                  icon: "👥",
                  label: "Proprietari aprobați",
                  value: statistici.totalProp,
                  color: "#c0622f",
                },
                {
                  icon: "🏪",
                  label: "Restaurante active",
                  value: statistici.totalRest,
                  color: "#c8a97e",
                },
                {
                  icon: "🍽️",
                  label: "Total comenzi",
                  value: statistici.totalOrders,
                  color: "#4a6e4a",
                },
                {
                  icon: "💰",
                  label: "Venituri abonamente",
                  value: `${statistici.totalVenituri} lei`,
                  color: "#5b8dd9",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  style={{
                    background: "#161210",
                    border: "1px solid #2a2218",
                    borderRadius: 16,
                    padding: 16,
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 24, marginBottom: 6 }}>{s.icon}</div>
                  <div
                    style={{
                      fontFamily: "'Fraunces',serif",
                      fontSize: 22,
                      fontWeight: 900,
                      color: s.color,
                      marginBottom: 4,
                    }}
                  >
                    {s.value}
                  </div>
                  <div style={{ fontSize: 10, color: "#6b6050" }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Distribuție planuri */}
            <div
              style={{
                background: "#161210",
                border: "1px solid #2a2218",
                borderRadius: 16,
                padding: 16,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  fontFamily: "'Fraunces',serif",
                  fontSize: 16,
                  fontWeight: 700,
                  marginBottom: 14,
                }}
              >
                Distribuție planuri
              </div>
              {[
                {
                  plan: "Free",
                  count: statistici.planCounts?.free || 0,
                  color: "#6b6050",
                },
                {
                  plan: "Pro",
                  count: statistici.planCounts?.pro || 0,
                  color: "#c8a97e",
                },
                {
                  plan: "Business",
                  count: statistici.planCounts?.business || 0,
                  color: "#4a6e4a",
                },
              ].map((p) => {
                const total = Math.max(statistici.totalRest || 1, 1);
                const pct = Math.round((p.count / total) * 100);
                return (
                  <div key={p.plan} style={{ marginBottom: 12 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 12,
                        marginBottom: 5,
                      }}
                    >
                      <span style={{ color: p.color, fontWeight: 700 }}>
                        {p.plan}
                      </span>
                      <span style={{ color: "#6b6050" }}>
                        {p.count} restaurante ({pct}%)
                      </span>
                    </div>
                    <div
                      style={{
                        height: 8,
                        background: "#2a2218",
                        borderRadius: 20,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${pct}%`,
                          background: p.color,
                          borderRadius: 20,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Export rapoarte */}
            <div
              style={{
                background: "#161210",
                border: "1px solid #2a2218",
                borderRadius: 16,
                padding: 16,
              }}
            >
              <div
                style={{
                  fontFamily: "'Fraunces',serif",
                  fontSize: 16,
                  fontWeight: 700,
                  marginBottom: 14,
                }}
              >
                📥 Export Rapoarte Excel/CSV
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  {
                    label: "Export Proprietari",
                    fn: () =>
                      exportToCSV(
                        proprietari.map((p) => ({
                          Nume: p.full_name,
                          Email: p.email,
                          Status: p.status || "approved",
                          "Data inregistrarii": new Date(
                            p.created_at,
                          ).toLocaleDateString("ro-RO"),
                        })),
                        "proprietari",
                      ),
                  },
                  {
                    label: "Export Restaurante",
                    fn: () =>
                      exportToCSV(
                        restaurante.map((r) => ({
                          Nume: r.name,
                          Oras: r.city,
                          Tip: r.type,
                          Plan: r.plan,
                          Status: r.is_active ? "Activ" : "Inactiv",
                          Proprietar: r.profiles?.full_name || "",
                          "Data crearii": new Date(
                            r.created_at,
                          ).toLocaleDateString("ro-RO"),
                        })),
                        "restaurante",
                      ),
                  },
                  {
                    label: "Export Abonamente",
                    fn: () =>
                      exportToCSV(
                        abonamente.map((a) => ({
                          Proprietar: a.profiles?.full_name || "",
                          Restaurant: a.restaurants?.name || "",
                          Plan: a.plan,
                          "Suma (lei)": a.amount,
                          Status: a.status,
                          "Data platii": new Date(
                            a.created_at,
                          ).toLocaleDateString("ro-RO"),
                          Perioada:
                            new Date(a.period_start).toLocaleDateString(
                              "ro-RO",
                            ) +
                            " - " +
                            new Date(a.period_end).toLocaleDateString("ro-RO"),
                        })),
                        "abonamente",
                      ),
                  },
                ].map((btn) => (
                  <button
                    key={btn.label}
                    onClick={btn.fn}
                    style={{
                      width: "100%",
                      padding: 12,
                      borderRadius: 12,
                      background: "rgba(74,110,74,.15)",
                      border: "1px solid rgba(74,110,74,.3)",
                      color: "#6b9e6b",
                      fontSize: 13,
                      cursor: "pointer",
                      fontWeight: 600,
                      textAlign: "left",
                    }}
                  >
                    📥 {btn.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── ABONAMENTE ── */}
        {!loading && activeTab === "abonamente" && (
          <div>
            <div
              style={{
                fontSize: 11,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: "#6b6050",
                marginBottom: 14,
              }}
            >
              Abonamente ({abonamente.length})
            </div>

            {/* Formular plată manuală */}
            <div
              style={{
                background: "rgba(200,169,126,.08)",
                border: "1px solid rgba(200,169,126,.2)",
                borderRadius: 16,
                padding: 16,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  fontFamily: "'Fraunces',serif",
                  fontSize: 15,
                  fontWeight: 700,
                  marginBottom: 12,
                }}
              >
                + Înregistrează plată manuală
              </div>
              <AddSubscriptionForm
                restaurante={restaurante}
                onAdd={addSubscription}
              />
            </div>

            {abonamente.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px 0",
                  color: "#6b6050",
                }}
              >
                <div style={{ fontSize: 36, marginBottom: 10 }}>💰</div>
                <div>Niciun abonament înregistrat</div>
              </div>
            ) : (
              abonamente.map((a) => (
                <div
                  key={a.id}
                  style={{
                    background: "#161210",
                    border: "1px solid #2a2218",
                    borderRadius: 14,
                    padding: 14,
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: 14,
                          marginBottom: 2,
                        }}
                      >
                        {a.restaurants?.name || "—"}
                      </div>
                      <div style={{ fontSize: 11, color: "#6b6050" }}>
                        👤 {a.profiles?.full_name || "—"}
                      </div>
                      <div
                        style={{ fontSize: 11, color: "#6b6050", marginTop: 2 }}
                      >
                        📅{" "}
                        {new Date(a.period_start).toLocaleDateString("ro-RO")} →{" "}
                        {new Date(a.period_end).toLocaleDateString("ro-RO")}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontFamily: "'Fraunces',serif",
                          fontSize: 16,
                          fontWeight: 700,
                          color: "#6b9e6b",
                        }}
                      >
                        {a.amount} lei
                      </div>
                      <div
                        style={{
                          fontSize: 9,
                          fontWeight: 800,
                          padding: "2px 6px",
                          borderRadius: 10,
                          background: PLAN_BG[a.plan || "free"],
                          color: PLAN_COLOR[a.plan || "free"],
                          marginTop: 4,
                        }}
                      >
                        {(a.plan || "free").toUpperCase()}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── FORMULAR ABONAMENT MANUAL ────────────────────────────────────────────────
function AddSubscriptionForm({ restaurante, onAdd }) {
  const [form, setForm] = useState({
    restaurantId: "",
    plan: "pro",
    amount: "250",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleAdd = () => {
    if (!form.restaurantId || !form.amount) return;
    const rest = restaurante.find((r) => r.id === form.restaurantId);
    if (!rest) return;
    onAdd(rest.owner_id, form.restaurantId, form.plan, parseFloat(form.amount));
    setForm({ restaurantId: "", plan: "pro", amount: "250" });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <select
        value={form.restaurantId}
        onChange={(e) => set("restaurantId", e.target.value)}
        style={{
          width: "100%",
          background: "#1e1a14",
          border: "1px solid #2a2218",
          borderRadius: 10,
          padding: "10px 14px",
          color: form.restaurantId ? "#f0ebe3" : "#6b6050",
          fontFamily: "'Plus Jakarta Sans',sans-serif",
          fontSize: 13,
          outline: "none",
          appearance: "none",
        }}
      >
        <option value="">Selectează restaurant...</option>
        {restaurante.map((r) => (
          <option key={r.id} value={r.id}>
            {r.emoji} {r.name}
          </option>
        ))}
      </select>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <select
          value={form.plan}
          onChange={(e) => {
            set("plan", e.target.value);
            set("amount", e.target.value === "pro" ? "250" : "800");
          }}
          style={{
            background: "#1e1a14",
            border: "1px solid #2a2218",
            borderRadius: 10,
            padding: "10px 14px",
            color: "#f0ebe3",
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 13,
            outline: "none",
            appearance: "none",
          }}
        >
          <option value="pro">Pro — 250 lei</option>
          <option value="business">Business — 800 lei</option>
        </select>
        <input
          type="number"
          placeholder="Suma (lei)"
          value={form.amount}
          onChange={(e) => set("amount", e.target.value)}
          style={{
            background: "#1e1a14",
            border: "1px solid #2a2218",
            borderRadius: 10,
            padding: "10px 14px",
            color: "#f0ebe3",
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 13,
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>
      <button
        onClick={handleAdd}
        disabled={!form.restaurantId || !form.amount}
        style={{
          width: "100%",
          padding: 11,
          borderRadius: 10,
          background:
            form.restaurantId && form.amount
              ? "linear-gradient(135deg,#c0622f,#8b3a18)"
              : "#2a2218",
          border: "none",
          color: form.restaurantId && form.amount ? "#fff" : "#6b6050",
          fontFamily: "'Fraunces',serif",
          fontSize: 14,
          fontWeight: 700,
          cursor: form.restaurantId && form.amount ? "pointer" : "not-allowed",
        }}
      >
        ✅ Înregistrează plată
      </button>
    </div>
  );
}
