import { useState, useEffect, useCallback } from "react";
import { useApp } from "../context/AppContext";
import { supabase } from "../supabase";

function StatCard({ icon, label, value, sub, color = "#c8a97e" }) {
  return (
    <div
      style={{
        background: "#161210",
        border: "1px solid #2a2218",
        borderRadius: 16,
        padding: "14px 12px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
      <div
        style={{
          fontFamily: "'Fraunces',serif",
          fontSize: 24,
          fontWeight: 900,
          color,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 11,
          color: "#f0ebe3",
          fontWeight: 600,
          marginTop: 2,
        }}
      >
        {label}
      </div>
      {sub && (
        <div style={{ fontSize: 10, color: "#6b6050", marginTop: 2 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

export default function DashboardLive() {
  const { state, navigate } = useApp();
  const { user } = state;

  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestId, setSelectedRestId] = useState(null);
  const [selectedRestName, setSelectedRestName] = useState("");
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Stats
  const [activeOrders, setActiveOrders] = useState([]);
  const [todayOrders, setTodayOrders] = useState(0);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [todayReservations, setTodayReservations] = useState(0);
  const [activeWaiters, setActiveWaiters] = useState(0);
  const [tablesStats, setTablesStats] = useState({
    free: 0,
    occupied: 0,
    total: 0,
  });

  // Încarcă restaurantele proprietarului
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("restaurants")
      .select("id, name, emoji")
      .eq("owner_id", user.id)
      .eq("is_deleted", false)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setRestaurants(data);
          setSelectedRestId(data[0].id);
          setSelectedRestName(data[0].name);
        }
      });
  }, [user?.id]);

  const loadStats = useCallback(async () => {
    if (!selectedRestId) return;
    setLoading(true);

    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    ).toISOString();

    // Comenzi active
    const { data: active } = await supabase
      .from("orders")
      .select("*")
      .eq("restaurant_id", selectedRestId)
      .in("status", ["pending", "cooking", "ready", "paying"])
      .order("created_at", { ascending: false });
    setActiveOrders(active || []);

    // Comenzi azi
    const { data: todayOrd } = await supabase
      .from("orders")
      .select("total, status")
      .eq("restaurant_id", selectedRestId)
      .gte("created_at", startOfDay);
    setTodayOrders((todayOrd || []).length);
    setTodayRevenue(
      (todayOrd || [])
        .filter((o) => o.status === "paid" || o.status === "completed")
        .reduce((s, o) => s + Number(o.total || 0), 0),
    );

    // Rezervări azi
    const todayStr = today.toISOString().split("T")[0];
    const { count: resCount } = await supabase
      .from("reservations")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", selectedRestId)
      .eq("date", todayStr)
      .eq("status", "confirmed");
    setTodayReservations(resCount || 0);

    // Ospătari activi (din profiles)
    const { count: waiterCount } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", selectedRestId)
      .eq("role", "waiter")
      .eq("status", "approved");
    setActiveWaiters(waiterCount || 0);

    // Mese
    const { data: floors } = await supabase
      .from("floors")
      .select("id")
      .eq("restaurant_id", selectedRestId);
    if (floors && floors.length > 0) {
      const floorIds = floors.map((f) => f.id);
      const { data: tables } = await supabase
        .from("tables")
        .select("id")
        .in("floor_id", floorIds);
      setTablesStats({ total: (tables || []).length, free: 0, occupied: 0 });
    }

    setLastUpdate(new Date());
    setLoading(false);
  }, [selectedRestId]);

  useEffect(() => {
    if (!selectedRestId) return;
    loadStats();
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, [selectedRestId, loadStats]);

  const statusLabel = {
    pending: "Nouă",
    cooking: "Se prepară",
    ready: "Gata",
    paying: "Cere nota",
  };
  const statusColor = {
    pending: "#c8a97e",
    cooking: "#e07a47",
    ready: "#6b9e6b",
    paying: "#5b8dd9",
  };

  const formatOra = (iso) =>
    new Date(iso).toLocaleTimeString("ro-RO", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Bucharest",
    });

  return (
    <div className="page fade-in" style={{ paddingBottom: 100 }}>
      {/* Header */}
      <div
        style={{
          padding: "44px 20px 20px",
          background: "linear-gradient(135deg,#100a05,#0d0a07)",
          borderBottom: "1px solid #2a2218",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 16,
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
                fontSize: 20,
                fontWeight: 900,
              }}
            >
              📡 Dashboard Live
            </div>
            <div style={{ fontSize: 11, color: "#6b6050", marginTop: 2 }}>
              Actualizat la {formatOra(lastUpdate.toISOString())} • refresh 30s
            </div>
          </div>
          <button
            onClick={loadStats}
            style={{
              marginLeft: "auto",
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "rgba(192,98,47,.15)",
              border: "1px solid rgba(192,98,47,.3)",
              color: "#c0622f",
              fontSize: 16,
              cursor: "pointer",
            }}
          >
            ↻
          </button>
        </div>

        {/* Selector restaurant */}
        {restaurants.length > 1 && (
          <select
            value={selectedRestId || ""}
            onChange={(e) => {
              const r = restaurants.find((r) => r.id === e.target.value);
              setSelectedRestId(e.target.value);
              setSelectedRestName(r?.name || "");
            }}
            style={{
              width: "100%",
              background: "#1e1a14",
              border: "1px solid #2a2218",
              borderRadius: 10,
              color: "#f0ebe3",
              padding: "10px 12px",
              fontSize: 13,
              fontFamily: "inherit",
            }}
          >
            {restaurants.map((r) => (
              <option key={r.id} value={r.id}>
                {r.emoji} {r.name}
              </option>
            ))}
          </select>
        )}
        {restaurants.length === 1 && (
          <div style={{ fontSize: 14, fontWeight: 700, color: "#f0ebe3" }}>
            {restaurants[0]?.emoji} {restaurants[0]?.name}
          </div>
        )}
      </div>

      <div style={{ padding: 16 }}>
        {/* Stats cards */}
        <div
          style={{
            fontSize: 10,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: "#6b6050",
            marginBottom: 12,
          }}
        >
          Azi
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            marginBottom: 20,
          }}
        >
          <StatCard
            icon="🍽️"
            label="Comenzi azi"
            value={todayOrders}
            color="#c0622f"
          />
          <StatCard
            icon="💰"
            label="Venituri azi"
            value={`${todayRevenue.toFixed(0)} lei`}
            color="#6b9e6b"
          />
          <StatCard
            icon="📅"
            label="Rezervări"
            value={todayReservations}
            sub="confirmate azi"
            color="#c8a97e"
          />
          <StatCard
            icon="🤵"
            label="Ospătari"
            value={activeWaiters}
            sub="conturi active"
            color="#5b8dd9"
          />
        </div>

        {/* Comenzi active */}
        <div
          style={{
            fontSize: 10,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: "#6b6050",
            marginBottom: 12,
          }}
        >
          Comenzi active acum — {activeOrders.length}
        </div>

        {loading ? (
          <div
            style={{
              textAlign: "center",
              padding: "30px 0",
              color: "#6b6050",
              fontSize: 13,
            }}
          >
            Se încarcă...
          </div>
        ) : activeOrders.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "30px 0",
              background: "#161210",
              border: "1px solid #2a2218",
              borderRadius: 16,
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
            <div style={{ fontSize: 14, color: "#f0ebe3", fontWeight: 600 }}>
              Nicio comandă activă
            </div>
            <div style={{ fontSize: 12, color: "#6b6050", marginTop: 4 }}>
              Toate comenzile au fost procesate
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {activeOrders.map((o) => (
              <div
                key={o.id}
                style={{
                  background: "#161210",
                  border: `1px solid ${statusColor[o.status] || "#2a2218"}44`,
                  borderLeft: `3px solid ${statusColor[o.status] || "#2a2218"}`,
                  borderRadius: 14,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "12px 14px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontFamily: "'Fraunces',serif",
                        fontSize: 16,
                        fontWeight: 700,
                      }}
                    >
                      Masa {o.table_label || "—"}
                    </div>
                    <div
                      style={{ fontSize: 11, color: "#6b6050", marginTop: 2 }}
                    >
                      {formatOra(o.created_at)}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      gap: 4,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "3px 8px",
                        borderRadius: 10,
                        background: `${statusColor[o.status]}22`,
                        color: statusColor[o.status],
                        border: `1px solid ${statusColor[o.status]}44`,
                      }}
                    >
                      {statusLabel[o.status] || o.status}
                    </span>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 900,
                        color: "#c8a97e",
                        fontFamily: "'Fraunces',serif",
                      }}
                    >
                      {Number(o.total || 0).toFixed(2)} lei
                    </span>
                  </div>
                </div>
                {/* Produse */}
                <div
                  style={{
                    padding: "0 14px 12px",
                    borderTop: "1px solid #1e1a14",
                  }}
                >
                  {(o.items || []).slice(0, 3).map((item, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 12,
                        color: "#6b6050",
                        padding: "3px 0",
                      }}
                    >
                      <span>
                        {item.emoji || "🍴"} {item.name}{" "}
                        {item.qty > 1 ? `×${item.qty}` : ""}
                      </span>
                      <span style={{ color: "#c8a97e" }}>
                        {(item.price * (item.qty || 1)).toFixed(2)} lei
                      </span>
                    </div>
                  ))}
                  {(o.items || []).length > 3 && (
                    <div
                      style={{ fontSize: 11, color: "#6b6050", marginTop: 4 }}
                    >
                      +{o.items.length - 3} produse
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
