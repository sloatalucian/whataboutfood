import { useState, useEffect, useCallback } from "react";
import { useApp } from "../../context/AppContext";
import { supabase } from "../../supabase";
import CereriTab from "./CereriTab";
import HartaTab from "./HartaTab";
import ProprietariTab from "./ProprietariTab";
import RestauranteTab from "./RestauranteTab";
import StatisticiTab from "./StatisticiTab";
import AbonamenteTab from "./AbonamenteTab";
import SterseTab from "./SterseTab";
import EvenimenteTab from "./EvenimenteTab";

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
  { id: "hartaPinuri", icon: "📍", label: "Hartă" },
  { id: "proprietari", icon: "👥", label: "Proprietari" },
  { id: "restaurante", icon: "🏪", label: "Restaurante" },
  { id: "statistici", icon: "📊", label: "Statistici" },
  { id: "abonamente", icon: "💰", label: "Abonamente" },
  { id: "sterse", icon: "🗑️", label: "Șterse" },
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
  const [mapPinRequests, setMapPinRequests] = useState([]);
  const [sterseRestaurante, setSterseRestaurante] = useState([]);
  const [statistici, setStatistici] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewAsOwner, setViewAsOwner] = useState(null);
  const [viewStats, setViewStats] = useState(null);
  const [viewStatsLoading, setViewStatsLoading] = useState(false);

  // ── Verifică acces admin ──
  if (!user || user?.role !== "superadmin") {
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
        { data: pinData },
        { count: totalProp },
        { count: totalRest },
        { count: totalOrders },
        { data: venituriData },
        { data: sterseData },
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
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("subscriptions")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("location_requests")
          .select("*, restaurants(name, city, is_active)")
          .eq("status", "pending")
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
        supabase
          .from("restaurants")
          .select("*")
          .eq("is_deleted", true)
          .order("deleted_at", { ascending: false }),
      ]);

      setCereri(cereriData || []);
      setMapPinRequests(pinData || []);
      setProprietari(propData || []);
      // Mapam proprietarii si restaurantele manual
      const propMap = {};
      (propData || []).forEach((p) => {
        propMap[p.id] = p;
      });
      const restMap = {};
      (restData || []).forEach((r) => {
        restMap[r.id] = r;
      });
      const restWithOwner = (restData || []).map((r) => ({
        ...r,
        profiles: propMap[r.owner_id] || null,
        plan: propMap[r.owner_id]?.plan || "free",
      }));
      setRestaurante(restWithOwner);
      // Restaurante sterse
      const sterseWithOwner = (sterseData || []).map((r) => ({
        ...r,
        profiles: propMap[r.owner_id] || null,
        plan: propMap[r.owner_id]?.plan || "free",
      }));
      setSterseRestaurante(sterseWithOwner);
      // Mapam proprietarii si restaurantele pe abonamente
      const aboWithData = (aboData || []).map((a) => ({
        ...a,
        profiles:
          propMap[a.user_id] ||
          propMap[restMap[a.restaurant_id]?.owner_id] ||
          null,
        restaurants: restMap[a.restaurant_id] || null,
      }));
      setAbonamente(aboWithData);

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

      // Salvam coordonatele in tabelul restaurants daca proprietarul le-a ales
      const { data: profile } = await supabase
        .from("profiles")
        .select("rest_location")
        .eq("id", id)
        .single();

      if (profile?.rest_location) {
        try {
          const loc =
            typeof profile.rest_location === "string"
              ? JSON.parse(profile.rest_location)
              : profile.rest_location;
          if (loc?.lat && loc?.lon) {
            await supabase
              .from("restaurants")
              .update({
                latitude: loc.lat,
                longitude: loc.lon,
                is_active: true,
              })
              .eq("owner_id", id);
          } else {
            await supabase
              .from("restaurants")
              .update({ is_active: true })
              .eq("owner_id", id);
          }
        } catch (_) {}
      }

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

  const approvePin = async (pin) => {
    try {
      console.log("approvePin called with:", JSON.stringify(pin, null, 2));

      // Actualizam statusul cererii
      const { error: reqError } = await supabase
        .from("location_requests")
        .update({ status: "approved" })
        .eq("id", pin.id);
      console.log("location_requests update error:", reqError);

      // Salvam coordonatele in restaurants si activam
      if (pin.restaurant_id) {
        const { error: restError } = await supabase
          .from("restaurants")
          .update({
            latitude: pin.lat,
            longitude: pin.lon,
            location_name: pin.restaurant_name,
            is_active: true,
          })
          .eq("id", pin.restaurant_id);
        console.log("restaurants update error:", restError);
      } else {
        console.warn(
          "pin.restaurant_id is null — restaurants table NOT updated!",
        );
      }

      setMapPinRequests((prev) => prev.filter((p) => p.id !== pin.id));
      showToast(
        `✅ Locația „${pin.restaurant_name}" aprobată! Apare pe hartă.`,
      );
    } catch (e) {
      console.error("approvePin exception:", e);
      showToast("❌ Eroare.");
    }
  };

  const rejectPin = async (pin) => {
    try {
      await supabase
        .from("location_requests")
        .update({ status: "rejected" })
        .eq("id", pin.id);
      setMapPinRequests((prev) => prev.filter((p) => p.id !== pin.id));
      showToast(`❌ Locația „${pin.restaurant_name}" respinsă.`);
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

  const changePlan = async (ownerId, plan) => {
    try {
      await supabase.from("profiles").update({ plan }).eq("id", ownerId);
      // Update proprietari list
      setProprietari((prev) =>
        prev.map((p) => (p.id === ownerId ? { ...p, plan } : p)),
      );
      // Update restaurante list - toate restaurantele proprietarului
      setRestaurante((prev) =>
        prev.map((r) => (r.owner_id === ownerId ? { ...r, plan } : r)),
      );
      showToast(`✅ Plan schimbat la ${plan.toUpperCase()}!`);
    } catch {
      showToast("❌ Eroare.");
    }
  };

  const approveRestaurant = async (id, name) => {
    try {
      await supabase
        .from("restaurants")
        .update({ is_active: true })
        .eq("id", id);
      setRestaurante((prev) =>
        prev.map((r) => (r.id === id ? { ...r, is_active: true } : r)),
      );
      showToast(`✅ „${name}" aprobat! Vizibil pentru clienți.`);
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
      await supabase.from("subscriptions").insert({
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

  // ── Încarcă statistici restaurant pentru vizualizare ──
  const loadViewStats = async (restaurant) => {
    setViewAsOwner(restaurant);
    setViewStats(null);
    setViewStatsLoading(true);
    try {
      const [
        { count: ordersCount },
        { data: ordersData },
        { count: rezCount },
      ] = await Promise.all([
        supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .eq("restaurant_id", restaurant.id)
          .eq("status", "paid"),
        supabase
          .from("orders")
          .select("total")
          .eq("restaurant_id", restaurant.id)
          .eq("status", "paid"),
        supabase
          .from("reservations")
          .select("*", { count: "exact", head: true })
          .eq("restaurant_id", restaurant.id)
          .eq("status", "confirmed"),
      ]);
      const totalVenituri = (ordersData || []).reduce(
        (s, o) => s + Number(o.total || 0),
        0,
      );
      setViewStats({
        ordersCount: ordersCount || 0,
        totalVenituri,
        rezCount: rezCount || 0,
      });
    } catch {}
    setViewStatsLoading(false);
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
            {viewStatsLoading && (
              <div
                style={{
                  gridColumn: "1/-1",
                  textAlign: "center",
                  color: "#6b6050",
                  padding: 20,
                }}
              >
                Se încarcă...
              </div>
            )}
            {!viewStatsLoading &&
              [
                {
                  icon: "🍽️",
                  label: "Comenzi plătite",
                  value: viewStats?.ordersCount ?? "—",
                  color: "#c0622f",
                },
                {
                  icon: "📅",
                  label: "Rezervări confirmate",
                  value: viewStats?.rezCount ?? "—",
                  color: "#c8a97e",
                },
                {
                  icon: "💰",
                  label: "Venituri totale",
                  value: viewStats
                    ? `${viewStats.totalVenituri.toFixed(0)} lei`
                    : "—",
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
      {/* ── HEADER ── */}
      <div style={{ padding: "44px 16px 0" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <button
            onClick={() => navigate("home")}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "rgba(255,255,255,.05)",
              border: "1px solid #2a2218",
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
              fontFamily: "'Fraunces',serif",
              fontSize: 18,
              fontWeight: 900,
            }}
          >
            Whatabout<span style={{ color: "#c0622f" }}>Food</span>
          </div>
          <div style={{ width: 36 }} />
        </div>
      </div>

      {/* ── HERO CARD ── */}
      <div
        style={{
          margin: "0 16px 16px",
          background: "linear-gradient(135deg,#1a0f08,#120c06)",
          border: "1px solid #2a1a0e",
          borderRadius: 18,
          padding: "18px 20px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -30,
            right: -30,
            width: 120,
            height: 120,
            background:
              "radial-gradient(circle, rgba(192,98,47,0.12) 0%, transparent 70%)",
          }}
        ></div>
        <div
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            background: "rgba(192,98,47,0.12)",
            border: "1px solid rgba(192,98,47,0.25)",
            borderRadius: 20,
            padding: "3px 12px",
            fontSize: 11,
            color: "#c0622f",
            fontWeight: 600,
          }}
        >
          ⚙️ Super Admin
        </div>
        <div
          style={{
            fontSize: 10,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: "#4a3a2a",
            marginBottom: 4,
          }}
        >
          Panou de control
        </div>
        <div
          style={{
            fontFamily: "'Fraunces',serif",
            fontSize: 22,
            fontWeight: 900,
            marginBottom: 2,
          }}
        >
          WhataboutFood
        </div>
        <div style={{ fontSize: 12, color: "#6b6050" }}>
          Platform Management Dashboard
        </div>
      </div>

      {/* ── STATS ── */}
      {statistici && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: 8,
            margin: "0 16px 20px",
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
              color: statistici.cereriPending > 0 ? "#e05050" : "#c0622f",
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
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: 2,
                  background: `linear-gradient(90deg, transparent, ${s.color}, transparent)`,
                  opacity: 0.35,
                }}
              ></div>
              <div
                style={{
                  fontFamily: "'Fraunces',serif",
                  fontSize: 26,
                  fontWeight: 900,
                  color: s.color,
                  lineHeight: 1,
                }}
              >
                {s.value}
              </div>
              <div style={{ fontSize: 10, color: "#6b6050", marginTop: 4 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── TABS GRID 2x4 ── */}
      <div
        style={{
          fontSize: 10,
          letterSpacing: 2,
          textTransform: "uppercase",
          color: "#3a2a18",
          margin: "0 16px 10px",
        }}
      >
        Navigare
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          margin: "0 16px 16px",
        }}
      >
        {TABS.map((t) => (
          <div
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              background:
                activeTab === t.id ? "rgba(192,98,47,0.06)" : "#111009",
              border: `1px solid ${activeTab === t.id ? "rgba(192,98,47,0.3)" : "#1e1a14"}`,
              borderRadius: 14,
              padding: "13px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {activeTab === t.id && (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 3,
                  background: "#c0622f",
                  borderRadius: "14px 0 0 14px",
                }}
              ></div>
            )}
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background:
                  activeTab === t.id ? "rgba(192,98,47,0.12)" : "#1a1612",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 17,
                flexShrink: 0,
              }}
            >
              {t.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: activeTab === t.id ? "#f0ebe3" : "#c8b8a0",
                }}
              >
                {t.label}
              </div>
              <div style={{ fontSize: 10, color: "#4a3a2a", marginTop: 1 }}>
                {t.desc || ""}
              </div>
            </div>
            {t.id === "cereri" && cereri.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  background: "#e05050",
                  borderRadius: 20,
                  padding: "2px 7px",
                  fontSize: 9,
                  fontWeight: 700,
                  color: "#fff",
                }}
              >
                {cereri.length}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ padding: "20px 20px 0" }}>
        {loading && (
          <div
            style={{ textAlign: "center", padding: "40px 0", color: "#6b6050" }}
          >
            <div style={{ fontSize: 32, marginBottom: 10 }}>⚙️</div>
            <div>Se încarcă...</div>
          </div>
        )}

        {!loading && activeTab === "cereri" && (
          <CereriTab
            cereri={cereri}
            approveOwner={approveOwner}
            rejectOwner={rejectOwner}
            showToast={showToast}
          />
        )}
        {!loading && activeTab === "hartaPinuri" && (
          <HartaTab
            locationRequests={mapPinRequests}
            approvePin={approvePin}
            rejectPin={rejectPin}
            showToast={showToast}
          />
        )}
        {!loading && activeTab === "proprietari" && (
          <ProprietariTab
            proprietari={proprietari}
            restaurante={restaurante}
            cereri={cereri}
            changePlan={changePlan}
            toggleOwner={toggleOwner}
            approveOwner={approveOwner}
            rejectOwner={rejectOwner}
            showToast={showToast}
          />
        )}
        {!loading && activeTab === "restaurante" && (
          <RestauranteTab
            restaurante={restaurante}
            approveRestaurant={approveRestaurant}
            toggleRestaurant={toggleRestaurant}
            loadViewStats={loadViewStats}
            viewStats={viewStats}
            viewStatsLoading={viewStatsLoading}
            showToast={showToast}
          />
        )}
        {!loading && activeTab === "statistici" && (
          <StatisticiTab statistici={statistici} />
        )}
        {!loading && activeTab === "abonamente" && (
          <AbonamenteTab
            restaurante={restaurante}
            addSubscription={addSubscription}
            abonamente={abonamente}
            showToast={showToast}
          />
        )}
        {!loading && activeTab === "sterse" && (
          <SterseTab
            sterseRestaurante={sterseRestaurante}
            showToast={showToast}
          />
        )}
        {!loading && activeTab === "evenimente" && (
          <EvenimenteTab showToast={showToast} />
        )}
      </div>
    </div>
  );
}
