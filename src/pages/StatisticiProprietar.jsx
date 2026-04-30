import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { supabase } from "../supabase";

const fmt = (n) => Number(n || 0).toLocaleString("ro-RO") + " lei";

const ZILE = ["Lun", "Mar", "Mie", "Joi", "Vin", "Sam", "Dum"];
const ORE = ["12:00", "13:00", "14:00", "18:00", "19:00", "20:00", "21:00"];

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
  const { navigate, state } = useApp();
  const { user } = state;
  const [period, setPeriod] = useState("saptamana");
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
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
      let startDate;
      if (period === "zi") {
        startDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
        ).toISOString();
      } else if (period === "saptamana") {
        startDate = new Date(
          now.getTime() - 7 * 24 * 60 * 60 * 1000,
        ).toISOString();
      } else {
        startDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          1,
        ).toISOString();
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
      const monthStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        1,
      ).toISOString();
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
        (o.items || []).forEach((item) => {
          const key = item.name;
          if (!productMap[key])
            productMap[key] = {
              name: item.name,
              emoji: item.emoji || "🍴",
              orders: 0,
              revenue: 0,
            };
          productMap[key].orders += item.qty || 1;
          productMap[key].revenue += (item.price || 0) * (item.qty || 1);
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
    } catch (err) {
      console.error("Stats error:", err);
    }
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
          </>
        )}
      </div>
    </div>
  );
}
