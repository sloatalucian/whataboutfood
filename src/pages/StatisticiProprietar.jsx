import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { supabase } from "../supabase";

const fmt = (n) => Number(n || 0).toLocaleString("ro-RO") + " lei";

const ZILE = ["Lun", "Mar", "Mie", "Joi", "Vin", "Sam", "Dum"];
const ORE = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
  "21:00",
  "22:00",
  "23:00",
];

function BarChart({ data, color = "#c0622f", height = 140 }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: 4,
        height,
        paddingTop: 8,
      }}
    >
      {data.map((d, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
          }}
        >
          <div
            style={{
              width: "100%",
              borderRadius: "4px 4px 0 0",
              background: `linear-gradient(180deg,${color},${color}88)`,
              height: `${(d.value / max) * 100}%`,
              minHeight: 4,
              transition: "height .4s ease",
            }}
          />
          <span style={{ fontSize: 8, color: "#6b6050", whiteSpace: "nowrap" }}>
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function StatCard({ icon, label, value, sub, color = "#c8a97e" }) {
  return (
    <div
      style={{
        background: "#161210",
        border: "1px solid #2a2218",
        borderRadius: 16,
        padding: "16px 14px",
      }}
    >
      <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
      <div
        style={{
          fontFamily: "'Fraunces',serif",
          fontSize: 22,
          fontWeight: 900,
          color,
          marginBottom: 2,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 11,
          color: "#f0ebe3",
          fontWeight: 600,
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      {sub && <div style={{ fontSize: 10, color: "#6b6050" }}>{sub}</div>}
    </div>
  );
}

const heatColor = (pct) => {
  if (pct >= 90) return { bg: "rgba(192,98,47,.9)", color: "#fff" };
  if (pct >= 70) return { bg: "rgba(192,98,47,.6)", color: "#fff" };
  if (pct >= 50) return { bg: "rgba(192,98,47,.35)", color: "#f0ebe3" };
  if (pct >= 30) return { bg: "rgba(192,98,47,.18)", color: "#c8a97e" };
  return { bg: "rgba(255,255,255,.04)", color: "#6b6050" };
};

export default function StatisticiProprietar() {
  const { navigate, state, isLocked } = useApp();
  const { user } = state;
  const [period, setPeriod] = useState("saptamana");
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [waiterStats, setWaiterStats] = useState([]);
  const [waiterLoading, setWaiterLoading] = useState(false);
  const [myRestaurants, setMyRestaurants] = useState([]);
  const [selectedRestId, setSelectedRestId] = useState(null);

  // Date reale
  const [monthStats, setMonthStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    reservations: 0,
  });
  const [revenueData, setRevenueData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [topCategories, setTopCategories] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [restaurantName, setRestaurantName] = useState("");

  // Încarcă lista restaurante
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("restaurants")
      .select("id, name")
      .eq("owner_id", user.id)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setMyRestaurants(data);
          setSelectedRestId(data[0].id);
          setRestaurantName(data[0].name);
        }
      });
  }, [user?.id]);

  useEffect(() => {
    if (!selectedRestId) return;
    loadStats();
  }, [selectedRestId, period]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const restId = selectedRestId;
      if (!restId) {
        setLoading(false);
        return;
      }

      // Interval de timp
      const now = new Date();
      // Offset timezone Romania (UTC+2 iarna, UTC+3 vara)
      const offsetMin = -now.getTimezoneOffset();
      const sign = offsetMin >= 0 ? "+" : "-";
      const tzHH = String(Math.floor(Math.abs(offsetMin) / 60)).padStart(
        2,
        "0",
      );
      const tzMM = String(Math.abs(offsetMin) % 60).padStart(2, "0");
      const tz = `${sign}${tzHH}:${tzMM}`;
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      let startDate;
      if (period === "zi") {
        startDate = `${todayStr}T00:00:00${tz}`;
      } else if (period === "saptamana") {
        const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const d7Str = `${d7.getFullYear()}-${String(d7.getMonth() + 1).padStart(2, "0")}-${String(d7.getDate()).padStart(2, "0")}`;
        startDate = `${d7Str}T00:00:00${tz}`;
      } else {
        const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
        startDate = `${monthStr}T00:00:00${tz}`;
      }

      // Toate comenzile plătite din perioada selectată
      const { data: orders } = await supabase
        .from("orders")
        .select("*")
        .eq("restaurant_id", restId)
        .in("status", ["paid", "completed"])
        .gte("created_at", startDate)
        .order("created_at");

      const allOrders = orders || [];

      // ── Sumar ──
      const totalRevenue = allOrders.reduce(
        (s, o) => s + Number(o.total || 0),
        0,
      );
      const totalOrders = allOrders.length;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Rezervări confirmate luna curentă
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01T00:00:00${tz}`;
      const { count: resCount } = await supabase
        .from("reservations")
        .select("id", { count: "exact", head: true })
        .eq("restaurant_id", restId)
        .eq("status", "confirmed")
        .gte("created_at", monthStart);

      setMonthStats({
        totalRevenue,
        totalOrders,
        avgOrderValue: Math.round(avgOrderValue * 10) / 10,
        reservations: resCount || 0,
      });

      // ── Grafic venituri ──
      if (period === "zi") {
        const hourly = {};
        ORE.forEach((h) => {
          hourly[h] = 0;
        });
        allOrders.forEach((o) => {
          const h = new Date(o.created_at)
            .toLocaleTimeString("ro-RO", {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Europe/Bucharest",
            })
            .substring(0, 5);
          const slot = ORE.find((s) => s <= h) || ORE[0];
          if (slot) hourly[slot] = (hourly[slot] || 0) + Number(o.total || 0);
        });
        setRevenueData(ORE.map((h) => ({ label: h, value: hourly[h] || 0 })));
      } else if (period === "saptamana") {
        const daily = {};
        ZILE.forEach((z) => {
          daily[z] = 0;
        });
        allOrders.forEach((o) => {
          const dayIdx = new Date(o.created_at).getDay();
          const dayName = ZILE[dayIdx === 0 ? 6 : dayIdx - 1];
          daily[dayName] = (daily[dayName] || 0) + Number(o.total || 0);
        });
        setRevenueData(ZILE.map((z) => ({ label: z, value: daily[z] || 0 })));
      } else {
        // Luna - pe săptămâni
        const weekly = [0, 0, 0, 0];
        allOrders.forEach((o) => {
          const day = new Date(o.created_at).getDate();
          const weekIdx = Math.min(Math.floor((day - 1) / 7), 3);
          weekly[weekIdx] += Number(o.total || 0);
        });
        setRevenueData([
          { label: "Săpt 1", value: weekly[0] },
          { label: "Săpt 2", value: weekly[1] },
          { label: "Săpt 3", value: weekly[2] },
          { label: "Săpt 4", value: weekly[3] },
        ]);
      }

      // ── Top produse ──
      const productMap = {};
      allOrders.forEach((o) => {
        // Deduplicam produsele - acelasi produs poate aparea de mai multe ori
        const seenItems = {};
        (o.items || []).forEach((item) => {
          const key = item.name;
          if (!seenItems[key]) seenItems[key] = { ...item, qty: item.qty || 1 };
          else seenItems[key].qty += item.qty || 1;
        });
        Object.values(seenItems).forEach((item) => {
          if (!productMap[item.name])
            productMap[item.name] = {
              name: item.name,
              emoji: item.emoji || "🍴",
              orders: 0,
              revenue: 0,
            };
          productMap[item.name].orders += item.qty;
          productMap[item.name].revenue += (item.price || 0) * item.qty;
        });
      });
      const products = Object.values(productMap)
        .sort((a, b) => b.orders - a.orders)
        .slice(0, 8);
      const maxOrders = products[0]?.orders || 1;
      setTopProducts(
        products.map((p) => ({
          ...p,
          pct: Math.round((p.orders / maxOrders) * 100),
        })),
      );

      // ── Top categorii ──
      const { data: cats } = await supabase
        .from("menu_categories")
        .select("id, name, emoji, menu_items(id, name)")
        .eq("restaurant_id", restId);

      if (cats) {
        const catMap = {};
        cats.forEach((c) => {
          const itemNames = (c.menu_items || []).map((i) => i.name);
          catMap[c.name] = {
            name: c.name,
            emoji: c.emoji || "🍽️",
            revenue: 0,
            orders: 0,
          };
          allOrders.forEach((o) => {
            (o.items || []).forEach((item) => {
              if (itemNames.includes(item.name)) {
                catMap[c.name].revenue += (item.price || 0) * (item.qty || 1);
                catMap[c.name].orders += item.qty || 1;
              }
            });
          });
        });
        const catList = Object.values(catMap)
          .filter((c) => c.revenue > 0)
          .sort((a, b) => b.revenue - a.revenue);
        const totalCatRevenue = catList.reduce((s, c) => s + c.revenue, 1);
        setTopCategories(
          catList.slice(0, 6).map((c) => ({
            ...c,
            pct: Math.round((c.revenue / totalCatRevenue) * 100),
          })),
        );
      }

      // ── Heatmap ore aglomerate (luna curentă) ──
      const { data: allMonthOrders } = await supabase
        .from("orders")
        .select("created_at")
        .eq("restaurant_id", restId)
        .in("status", ["paid", "completed"])
        .gte("created_at", monthStart);

      const heatGrid = ORE.map(() => ZILE.map(() => 0));
      (allMonthOrders || []).forEach((o) => {
        const d = new Date(o.created_at);
        const dayIdx = d.getDay();
        const zi = dayIdx === 0 ? 6 : dayIdx - 1;
        const h = d
          .toLocaleTimeString("ro-RO", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Europe/Bucharest",
          })
          .substring(0, 5);
        const oraIdx = ORE.findIndex(
          (slot) =>
            slot <= h &&
            (ORE[ORE.indexOf(slot) + 1] > h || !ORE[ORE.indexOf(slot) + 1]),
        );
        if (oraIdx >= 0 && zi >= 0) heatGrid[oraIdx][zi]++;
      });
      const maxHeat = Math.max(...heatGrid.flat(), 1);
      setHeatmapData(
        heatGrid.map((row) => row.map((v) => Math.round((v / maxHeat) * 100))),
      );
    } catch (err) {}
    setLoading(false);
  };

  const exportCSV = () => {
    setExportLoading(true);
    setTimeout(() => {
      const rows = [
        ["Produs", "Comenzi", "Venituri (lei)"],
        ...topProducts.map((p) => [p.name, p.orders, p.revenue.toFixed(2)]),
        [],
        ["TOTAL", monthStats.totalOrders, monthStats.totalRevenue.toFixed(2)],
      ];
      const csv = rows.map((r) => r.join(",")).join("\n");
      const blob = new Blob(["\uFEFF" + csv], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `WhataboutFood_${restaurantName}_${new Date().toLocaleDateString("ro-RO").replace(/\//g, "-")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setExportLoading(false);
    }, 400);
  };

  // ── Performanta per ospatar ──
  useEffect(() => {
    if (!selectedRestId || isLocked("stats_waiter")) return;

    const loadWaiterStats = async () => {
      setWaiterLoading(true);
      try {
        // Calculeaza startDate identic cu filtrul de perioada principal
        const now = new Date();
        const offsetMin = -now.getTimezoneOffset();
        const sign = offsetMin >= 0 ? "+" : "-";
        const tzHH = String(Math.floor(Math.abs(offsetMin) / 60)).padStart(
          2,
          "0",
        );
        const tzMM = String(Math.abs(offsetMin) % 60).padStart(2, "0");
        const tz = `${sign}${tzHH}:${tzMM}`;
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        let startDate;
        if (period === "zi") {
          startDate = `${todayStr}T00:00:00${tz}`;
        } else if (period === "saptamana") {
          const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          const d7Str = `${d7.getFullYear()}-${String(d7.getMonth() + 1).padStart(2, "0")}-${String(d7.getDate()).padStart(2, "0")}`;
          startDate = `${d7Str}T00:00:00${tz}`;
        } else {
          const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
          startDate = `${monthStr}T00:00:00${tz}`;
        }

        // Incarca comenzile platite cu waiter_id din perioada selectata
        const { data: orders, error } = await supabase
          .from("orders")
          .select("id, waiter_id, total, accepted_at, completed_at")
          .eq("restaurant_id", selectedRestId)
          .eq("status", "paid")
          .not("waiter_id", "is", null)
          .gte("created_at", startDate);

        if (error || !orders || orders.length === 0) {
          setWaiterStats([]);
          return;
        }

        // Ia ID-urile unice ale ospatarilor
        const waiterIds = [...new Set(orders.map((o) => o.waiter_id))];

        // Ospătarii sunt în profiles cu role = waiter
        const { data: waiterProfiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", waiterIds)
          .eq("role", "waiter");

        const waiterNames = {};
        (waiterProfiles || []).forEach((w) => {
          waiterNames[w.id] = w.full_name || "Ospătar necunoscut";
        });

        const byWaiter = {};
        orders.forEach((o) => {
          const id = o.waiter_id;
          const name = waiterNames[id] || "Ospătar necunoscut";
          if (!byWaiter[id]) {
            byWaiter[id] = {
              id,
              name,
              orders: 0,
              revenue: 0,
              totalTime: 0,
              timedOrders: 0,
            };
          }
          byWaiter[id].orders += 1;
          byWaiter[id].revenue += Number(o.total || 0);
          if (o.accepted_at && o.completed_at) {
            const diff =
              (new Date(o.completed_at) - new Date(o.accepted_at)) / 60000;
            if (diff > 0 && diff < 180) {
              byWaiter[id].totalTime += diff;
              byWaiter[id].timedOrders += 1;
            }
          }
        });

        const stats = Object.values(byWaiter)
          .map((w) => ({
            ...w,
            avgTime:
              w.timedOrders > 0
                ? Math.round(w.totalTime / w.timedOrders)
                : null,
          }))
          .sort((a, b) => b.revenue - a.revenue);

        setWaiterStats(stats);
      } catch (e) {
        setWaiterStats([]);
      } finally {
        setWaiterLoading(false);
      }
    };

    loadWaiterStats();
  }, [selectedRestId, period]);

  const totalPeriod = revenueData.reduce((s, d) => s + d.value, 0);
  const topDay =
    ZILE[
      revenueData.reduce(
        (maxI, d, i, arr) => (d.value > arr[maxI].value ? i : maxI),
        0,
      )
    ] || "—";

  return (
    <div className="page fade-in" style={{ paddingBottom: 100 }}>
      {/* Header */}
      <div
        style={{
          padding: "44px 20px 24px",
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
                fontSize: 22,
                fontWeight: 900,
              }}
            >
              📊 Statistici
            </div>
            <div style={{ fontSize: 11, color: "#6b6050", marginTop: 2 }}>
              {restaurantName || "..."} •{" "}
              {new Date().toLocaleDateString("ro-RO", {
                month: "long",
                year: "numeric",
              })}
            </div>
          </div>
        </div>
        {/* Selector restaurant - apare doar dacă are mai multe */}
        {myRestaurants.length > 1 && (
          <div style={{ marginBottom: 12 }}>
            <select
              value={selectedRestId || ""}
              onChange={(e) => {
                const r = myRestaurants.find((r) => r.id === e.target.value);
                setSelectedRestId(e.target.value);
                setRestaurantName(r?.name || "");
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
              {myRestaurants.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={exportCSV}
            disabled={exportLoading}
            style={{
              flex: 1,
              padding: "9px 14px",
              borderRadius: 10,
              background: "rgba(74,110,74,.2)",
              border: "1px solid rgba(74,110,74,.4)",
              color: "#6b9e6b",
              fontSize: 12,
              cursor: "pointer",
              fontWeight: 700,
              opacity: exportLoading ? 0.6 : 1,
            }}
          >
            {exportLoading ? "Se exportă..." : "📥 Export CSV"}
          </button>
          <button
            onClick={() => window.print()}
            style={{
              flex: 1,
              padding: "9px 14px",
              borderRadius: 10,
              background: "rgba(91,141,217,.2)",
              border: "1px solid rgba(91,141,217,.4)",
              color: "#5b8dd9",
              fontSize: 12,
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            🖨️ Export PDF
          </button>
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
            Se încarcă statisticile...
          </div>
        ) : (
          <>
            {/* Sumar */}
            <div
              style={{
                fontSize: 10,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: "#6b6050",
                marginBottom: 12,
              }}
            >
              Sumar luna curentă
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
                marginBottom: 24,
              }}
            >
              <StatCard
                icon="💰"
                label="Venituri totale"
                value={fmt(monthStats.totalRevenue)}
                sub="luna curentă"
                color="#c8a97e"
              />
              <StatCard
                icon="🍽️"
                label="Total comenzi"
                value={monthStats.totalOrders}
                sub="plătite"
                color="#6b9e6b"
              />
              <StatCard
                icon="🧾"
                label="Valoare medie"
                value={`${monthStats.avgOrderValue} lei`}
                sub="per comandă"
                color="#c0622f"
              />
              <StatCard
                icon="📅"
                label="Rezervări"
                value={monthStats.reservations}
                sub="confirmate"
                color="#5b8dd9"
              />
            </div>

            {/* Grafic venituri */}
            <div
              style={{
                background: "#161210",
                border: "1px solid #2a2218",
                borderRadius: 18,
                padding: 18,
                marginBottom: 16,
              }}
            >
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
                    fontFamily: "'Fraunces',serif",
                    fontSize: 16,
                    fontWeight: 700,
                  }}
                >
                  Venituri
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 4,
                    background: "#1e1a14",
                    borderRadius: 10,
                    padding: 3,
                  }}
                >
                  {[
                    { key: "zi", label: "Azi" },
                    { key: "saptamana", label: "7 zile" },
                    { key: "luna", label: "Lună" },
                  ].map((p) => (
                    <button
                      key={p.key}
                      onClick={() => setPeriod(p.key)}
                      style={{
                        padding: "5px 10px",
                        borderRadius: 8,
                        fontSize: 11,
                        cursor: "pointer",
                        background:
                          period === p.key ? "#c0622f" : "transparent",
                        border: "none",
                        color: period === p.key ? "#fff" : "#6b6050",
                        fontWeight: period === p.key ? 700 : 400,
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <span
                  style={{
                    fontFamily: "'Fraunces',serif",
                    fontSize: 28,
                    fontWeight: 900,
                    color: "#c8a97e",
                  }}
                >
                  {fmt(totalPeriod)}
                </span>
                <span style={{ fontSize: 12, color: "#6b6050", marginLeft: 8 }}>
                  {period === "zi"
                    ? "azi"
                    : period === "saptamana"
                      ? "această săptămână"
                      : "această lună"}
                </span>
              </div>
              {revenueData.length > 0 ? (
                <BarChart data={revenueData} color="#c0622f" height={140} />
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    padding: "30px 0",
                    color: "#6b6050",
                    fontSize: 12,
                  }}
                >
                  Nicio comandă în această perioadă
                </div>
              )}
            </div>

            {/* Top produse */}
            <div
              style={{
                background: "#161210",
                border: "1px solid #2a2218",
                borderRadius: 18,
                padding: 18,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  fontFamily: "'Fraunces',serif",
                  fontSize: 16,
                  fontWeight: 700,
                  marginBottom: 16,
                }}
              >
                🏆 Top Produse
              </div>
              {topProducts.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "20px 0",
                    color: "#6b6050",
                    fontSize: 12,
                  }}
                >
                  Nicio comandă înregistrată
                </div>
              ) : (
                topProducts.map((p, i) => (
                  <div key={p.name} style={{ marginBottom: 12 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginBottom: 5,
                      }}
                    >
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 8,
                          flexShrink: 0,
                          background:
                            i === 0
                              ? "rgba(200,169,126,.3)"
                              : i === 1
                                ? "rgba(255,255,255,.08)"
                                : i === 2
                                  ? "rgba(192,98,47,.15)"
                                  : "rgba(255,255,255,.04)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontFamily: "'Fraunces',serif",
                          fontSize: 11,
                          fontWeight: 900,
                          color:
                            i === 0
                              ? "#c8a97e"
                              : i === 1
                                ? "#aaa"
                                : i === 2
                                  ? "#c0622f"
                                  : "#6b6050",
                        }}
                      >
                        {i + 1}
                      </div>
                      <span style={{ fontSize: 18 }}>{p.emoji}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: "#f0ebe3",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {p.name}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: "#c8a97e",
                          }}
                        >
                          {p.orders} comenzi
                        </div>
                        <div style={{ fontSize: 10, color: "#6b6050" }}>
                          {fmt(p.revenue)}
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        marginLeft: 34,
                        height: 4,
                        background: "#2a2218",
                        borderRadius: 20,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          borderRadius: 20,
                          width: `${p.pct}%`,
                          background:
                            i < 3
                              ? "linear-gradient(90deg,#c0622f,#e07a47)"
                              : "linear-gradient(90deg,#2a2218,#3a3228)",
                          transition: "width .5s ease",
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Heatmap */}
            {heatmapData.length > 0 && (
              <div
                style={{
                  background: "#161210",
                  border: "1px solid #2a2218",
                  borderRadius: 18,
                  padding: 18,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Fraunces',serif",
                    fontSize: 16,
                    fontWeight: 700,
                    marginBottom: 6,
                  }}
                >
                  🔥 Ore aglomerate
                </div>
                <div
                  style={{ fontSize: 11, color: "#6b6050", marginBottom: 14 }}
                >
                  Activitate per zi și oră (luna curentă)
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "48px repeat(7,1fr)",
                    gap: 3,
                    marginBottom: 3,
                  }}
                >
                  <div />
                  {ZILE.map((z) => (
                    <div
                      key={z}
                      style={{
                        fontSize: 9,
                        color: "#6b6050",
                        textAlign: "center",
                        fontWeight: 700,
                      }}
                    >
                      {z}
                    </div>
                  ))}
                </div>
                {ORE.map((ora, oi) => (
                  <div
                    key={ora}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "48px repeat(7,1fr)",
                      gap: 3,
                      marginBottom: 3,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 9,
                        color: "#6b6050",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      {ora}
                    </div>
                    {(heatmapData[oi] || ZILE.map(() => 0)).map((pct, di) => {
                      const { bg, color } = heatColor(pct);
                      return (
                        <div
                          key={di}
                          style={{
                            background: bg,
                            borderRadius: 5,
                            padding: "6px 2px",
                            textAlign: "center",
                            fontSize: 8,
                            color,
                            fontWeight: 700,
                          }}
                        >
                          {pct > 0 ? `${pct}%` : "—"}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}

            {/* Top categorii */}
            {topCategories.length > 0 && (
              <div
                style={{
                  background: "#161210",
                  border: "1px solid #2a2218",
                  borderRadius: 18,
                  padding: 18,
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
                  🍽️ Venituri pe categorie
                </div>
                {topCategories.map((cat, i) => {
                  const colors = [
                    "#c0622f",
                    "#e07a47",
                    "#c8a97e",
                    "#6b9e6b",
                    "#5b8dd9",
                    "#8b6a8a",
                  ];
                  return (
                    <div key={cat.name} style={{ marginBottom: 12 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: 5,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 12,
                            color: "#f0ebe3",
                            fontWeight: 600,
                          }}
                        >
                          {cat.emoji} {cat.name}
                        </span>
                        <div style={{ textAlign: "right" }}>
                          <span
                            style={{
                              fontSize: 12,
                              color: colors[i],
                              fontWeight: 700,
                            }}
                          >
                            {cat.pct}%
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              color: "#6b6050",
                              marginLeft: 6,
                            }}
                          >
                            {fmt(cat.revenue)}
                          </span>
                        </div>
                      </div>
                      <div
                        style={{
                          height: 6,
                          background: "#2a2218",
                          borderRadius: 20,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            borderRadius: 20,
                            width: `${cat.pct}%`,
                            background: colors[i],
                            transition: "width .5s ease",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Insights */}
            <div
              style={{
                background: "#161210",
                border: "1px solid #2a2218",
                borderRadius: 18,
                padding: 18,
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
                💡 Insights
              </div>
              {[
                {
                  icon: "📈",
                  text: `Cea mai activă zi: ${topDay}`,
                  sub: "În perioada selectată",
                  color: "#6b9e6b",
                },
                {
                  icon: "🧾",
                  text: `Valoare medie comandă: ${monthStats.avgOrderValue} lei`,
                  sub: "Luna curentă",
                  color: "#c8a97e",
                },
                {
                  icon: "📅",
                  text: `Rezervări confirmate: ${monthStats.reservations}`,
                  sub: "Luna curentă",
                  color: "#5b8dd9",
                },
                {
                  icon: "💰",
                  text: `Total venituri: ${fmt(monthStats.totalRevenue)}`,
                  sub: "Luna curentă, comenzi plătite",
                  color: "#c0622f",
                },
              ].map((ins) => (
                <div
                  key={ins.text}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    padding: "10px 0",
                    borderBottom: "1px solid #1e1a14",
                  }}
                >
                  <span style={{ fontSize: 20, flexShrink: 0 }}>
                    {ins.icon}
                  </span>
                  <div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: ins.color,
                        marginBottom: 2,
                      }}
                    >
                      {ins.text}
                    </div>
                    <div style={{ fontSize: 11, color: "#6b6050" }}>
                      {ins.sub}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── PERFORMANTA PER OSPATAR (Pro) ── */}
            {!isLocked("stats_waiter") && (
              <div
                style={{
                  background: "#111009",
                  borderRadius: 16,
                  padding: "16px",
                  marginBottom: 16,
                  border: "1px solid #1e1a14",
                }}
              >
                <div
                  style={{
                    fontFamily: "'Fraunces',serif",
                    fontSize: 16,
                    fontWeight: 700,
                    marginBottom: 14,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  👨‍🍳 Performanță per ospătar
                </div>
                {waiterLoading ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "20px 0",
                      color: "#6b6050",
                      fontSize: 13,
                    }}
                  >
                    Se încarcă...
                  </div>
                ) : waiterStats.length === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "20px 0",
                      color: "#6b6050",
                      fontSize: 13,
                    }}
                  >
                    <div style={{ fontSize: 28, marginBottom: 8 }}>👨‍🍳</div>
                    Nu există comenzi cu ospătar asignat în perioada selectată
                  </div>
                ) : (
                  <>
                    <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                      {[
                        { label: "Ospătari activi", value: waiterStats.length },
                        {
                          label: "Comenzi totale",
                          value: waiterStats.reduce((s, w) => s + w.orders, 0),
                        },
                      ].map((s) => (
                        <div
                          key={s.label}
                          style={{
                            flex: 1,
                            background: "#161210",
                            borderRadius: 10,
                            padding: "10px 12px",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 20,
                              fontWeight: 700,
                              color: "#f0ebe3",
                              fontFamily: "'Fraunces',serif",
                            }}
                          >
                            {s.value}
                          </div>
                          <div
                            style={{
                              fontSize: 10,
                              color: "#6b6050",
                              marginTop: 2,
                            }}
                          >
                            {s.label}
                          </div>
                        </div>
                      ))}
                    </div>
                    {waiterStats.map((w, i) => (
                      <div
                        key={w.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "10px 12px",
                          background: "#161210",
                          borderRadius: 10,
                          marginBottom: 8,
                        }}
                      >
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            background:
                              i === 0
                                ? "#c0622f"
                                : i === 1
                                  ? "#5b8dd9"
                                  : "#2a2218",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 13,
                            color: "#fff",
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {w.name.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: "#f0ebe3",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {w.name}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: "#6b6050",
                              marginTop: 1,
                            }}
                          >
                            {w.orders} comenzi
                            {w.avgTime ? ` • ${w.avgTime} min avg` : ""}
                          </div>
                        </div>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: "#c0622f",
                            flexShrink: 0,
                          }}
                        >
                          {fmt(w.revenue)} lei
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* ── PRO LOCK OVERLAY ── */}
            {isLocked("stats_waiter") && (
              <div style={{ marginTop: 16 }}>
                <style>{`
                  @keyframes proShimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }
                  @keyframes proLockBounce { 0%,100%{transform:translateY(0) scale(1)} 30%{transform:translateY(-6px) scale(1.1)} 60%{transform:translateY(-3px) scale(1.05)} }
                  @keyframes proFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
                  @keyframes proPulseRing { 0%,100%{opacity:0.2;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.1)} }
                `}</style>

                {/* Performanta per ospatar - continut blur */}
                <div
                  style={{
                    position: "relative",
                    borderRadius: 16,
                    overflow: "hidden",
                    marginBottom: 16,
                    border: "1px solid #1e1a14",
                  }}
                >
                  {/* Continut real vizibil in spate */}
                  <div
                    style={{
                      padding: 16,
                      filter: "blur(3px)",
                      pointerEvents: "none",
                      userSelect: "none",
                      opacity: 0.6,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "'Fraunces',serif",
                        fontSize: 16,
                        fontWeight: 700,
                        marginBottom: 12,
                      }}
                    >
                      👨‍🍳 Performanță per ospătar
                    </div>
                    <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                      {[
                        { l: "Ospătari activi", v: "3" },
                        { l: "Comenzi totale", v: "26" },
                      ].map((s) => (
                        <div
                          key={s.l}
                          style={{
                            flex: 1,
                            background: "#161210",
                            borderRadius: 10,
                            padding: "10px 12px",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 18,
                              fontWeight: 700,
                              color: "#f0ebe3",
                              fontFamily: "'Fraunces',serif",
                            }}
                          >
                            {s.v}
                          </div>
                          <div
                            style={{
                              fontSize: 10,
                              color: "#6b6050",
                              marginTop: 2,
                            }}
                          >
                            {s.l}
                          </div>
                        </div>
                      ))}
                    </div>
                    {[
                      { n: "Ospătar 1", c: "14 comenzi", v: "1.240 lei" },
                      { n: "Ospătar 2", c: "8 comenzi", v: "724 lei" },
                      { n: "Ospătar 3", c: "4 comenzi", v: "257 lei" },
                    ].map((o) => (
                      <div
                        key={o.n}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "10px 12px",
                          background: "#161210",
                          borderRadius: 10,
                          marginBottom: 8,
                        }}
                      >
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            background: "#c0622f",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 12,
                            color: "#fff",
                            fontWeight: 700,
                          }}
                        >
                          {o.n.charAt(o.n.length - 1)}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: "#f0ebe3",
                            }}
                          >
                            {o.n}
                          </div>
                          <div style={{ fontSize: 11, color: "#6b6050" }}>
                            {o.c}
                          </div>
                        </div>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: "#c0622f",
                          }}
                        >
                          {o.v}
                        </div>
                      </div>
                    ))}

                    <div
                      style={{
                        fontFamily: "'Fraunces',serif",
                        fontSize: 16,
                        fontWeight: 700,
                        marginTop: 16,
                        marginBottom: 12,
                      }}
                    >
                      📅 Rata no-show rezervări
                    </div>
                    <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                      {[
                        { l: "Rezervări luna aceasta", v: "12" },
                        { l: "No-show", v: "3", red: true },
                      ].map((s) => (
                        <div
                          key={s.l}
                          style={{
                            flex: 1,
                            background: "#161210",
                            borderRadius: 10,
                            padding: "10px 12px",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 18,
                              fontWeight: 700,
                              color: s.red ? "#e05050" : "#f0ebe3",
                              fontFamily: "'Fraunces',serif",
                            }}
                          >
                            {s.v}
                          </div>
                          <div
                            style={{
                              fontSize: 10,
                              color: "#6b6050",
                              marginTop: 2,
                            }}
                          >
                            {s.l}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div
                      style={{
                        background: "#161210",
                        borderRadius: 10,
                        padding: 12,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: 6,
                        }}
                      >
                        <span style={{ fontSize: 12, color: "#8a7a6a" }}>
                          Rata no-show
                        </span>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: "#e05050",
                          }}
                        >
                          25%
                        </span>
                      </div>
                      <div
                        style={{
                          height: 6,
                          background: "#1e1a14",
                          borderRadius: 3,
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: "25%",
                            background: "#e05050",
                            borderRadius: 3,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Overlay gradient + lacăt */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background:
                        "linear-gradient(180deg, rgba(13,10,7,0.05) 0%, rgba(13,10,7,0.6) 35%, rgba(13,10,7,0.95) 65%, #0d0a07 100%)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      paddingBottom: 24,
                    }}
                  >
                    <div style={{ position: "relative", marginBottom: 10 }}>
                      <div
                        style={{
                          position: "absolute",
                          inset: -6,
                          borderRadius: "50%",
                          border: "1px solid rgba(192,98,47,0.3)",
                          animation: "proPulseRing 2s ease-in-out infinite",
                        }}
                      />
                      <div
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: "50%",
                          background: "rgba(192,98,47,0.12)",
                          border: "1.5px solid rgba(192,98,47,0.35)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          position: "relative",
                          overflow: "hidden",
                          animation: "proLockBounce 2.5s ease-in-out infinite",
                        }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            background:
                              "linear-gradient(90deg,transparent,rgba(192,98,47,0.25),transparent)",
                            animation: "proShimmer 2s ease infinite",
                          }}
                        />
                        <svg
                          width="22"
                          height="22"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#c0622f"
                          strokeWidth="2"
                          strokeLinecap="round"
                        >
                          <rect x="3" y="11" width="18" height="11" rx="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                      </div>
                    </div>
                    <div
                      style={{
                        fontFamily: "'Fraunces',serif",
                        fontSize: 17,
                        fontWeight: 700,
                        color: "#f0ebe3",
                        textAlign: "center",
                        marginBottom: 4,
                      }}
                    >
                      Funcție{" "}
                      <span style={{ color: "#c0622f", fontStyle: "italic" }}>
                        Pro
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#8a7a6a",
                        textAlign: "center",
                        marginBottom: 14,
                        lineHeight: 1.5,
                      }}
                    >
                      Performanță ospătari, rata no-show,
                      <br />
                      ocupare mese și rating clienți
                    </div>
                    <button
                      style={{
                        background: "linear-gradient(135deg,#c0622f,#8b3a18)",
                        border: "none",
                        borderRadius: 22,
                        padding: "10px 24px",
                        color: "#fff",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        animation: "proFloat 2s ease-in-out infinite",
                      }}
                    >
                      Upgrade la Pro →
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
