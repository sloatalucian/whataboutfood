import { useState, useRef } from "react";
import { useApp } from "../context/AppContext";

// ─── DATE DEMO ────────────────────────────────────────────────────────────────

const REVENUE_DATA = {
  zi: [
    { label: "08:00", value: 0 },
    { label: "09:00", value: 120 },
    { label: "10:00", value: 280 },
    { label: "11:00", value: 420 },
    { label: "12:00", value: 980 },
    { label: "13:00", value: 1240 },
    { label: "14:00", value: 860 },
    { label: "15:00", value: 340 },
    { label: "16:00", value: 280 },
    { label: "17:00", value: 190 },
    { label: "18:00", value: 760 },
    { label: "19:00", value: 1480 },
    { label: "20:00", value: 1820 },
    { label: "21:00", value: 1340 },
    { label: "22:00", value: 640 },
  ],
  saptamana: [
    { label: "Lun", value: 4200 },
    { label: "Mar", value: 3800 },
    { label: "Mie", value: 5100 },
    { label: "Joi", value: 4700 },
    { label: "Vin", value: 8200 },
    { label: "Sam", value: 9400 },
    { label: "Dum", value: 7100 },
  ],
  luna: [
    { label: "1 Apr", value: 3200 },
    { label: "5 Apr", value: 4100 },
    { label: "10 Apr", value: 3800 },
    { label: "15 Apr", value: 5200 },
    { label: "20 Apr", value: 4600 },
    { label: "25 Apr", value: 6800 },
    { label: "30 Apr", value: 5400 },
  ],
};

const TOP_PRODUCTS = [
  {
    name: "Spaghetti Carbonara",
    emoji: "🍝",
    orders: 142,
    revenue: 7384,
    pct: 100,
  },
  {
    name: "Pizza Margherita",
    emoji: "🍕",
    orders: 128,
    revenue: 5376,
    pct: 90,
  },
  { name: "Tiramisù", emoji: "☕", orders: 118, revenue: 3776, pct: 83 },
  {
    name: "Tagliatelle al Ragù",
    emoji: "🫙",
    orders: 97,
    revenue: 5626,
    pct: 68,
  },
  {
    name: "Risotto ai Funghi",
    emoji: "🍄",
    orders: 84,
    revenue: 4704,
    pct: 59,
  },
  { name: "Bruschette", emoji: "🍅", orders: 76, revenue: 1672, pct: 54 },
  { name: "Chianti Classico", emoji: "🍷", orders: 68, revenue: 6460, pct: 48 },
  {
    name: "Tagliata di Manzo",
    emoji: "🥩",
    orders: 54,
    revenue: 5292,
    pct: 38,
  },
];

// Heatmap ore x zile
const HEATMAP = {
  zile: ["Lun", "Mar", "Mie", "Joi", "Vin", "Sam", "Dum"],
  ore: ["12:00", "13:00", "14:00", "18:00", "19:00", "20:00", "21:00"],
  data: [
    // Lun  Mar  Mie  Joi  Vin  Sam  Dum
    [30, 25, 40, 35, 60, 85, 70], // 12:00
    [80, 75, 90, 85, 95, 100, 95], // 13:00
    [60, 55, 65, 60, 75, 80, 70], // 14:00
    [40, 35, 50, 55, 80, 90, 75], // 18:00
    [70, 65, 80, 85, 100, 100, 90], // 19:00
    [85, 80, 90, 88, 100, 100, 95], // 20:00
    [50, 45, 60, 65, 90, 95, 80], // 21:00
  ],
};

const MONTHLY_STATS = {
  totalRevenue: 42840,
  totalOrders: 1284,
  avgOrderValue: 33.4,
  avgTableTime: 68,
  reservations: 312,
  topDay: "Sâmbătă",
  topHour: "20:00",
  growth: "+18%",
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const fmt = (n) => n.toLocaleString("ro-RO") + " lei";

const heatColor = (pct) => {
  if (pct >= 90) return { bg: "rgba(192,98,47,.9)", color: "#fff" };
  if (pct >= 70) return { bg: "rgba(192,98,47,.6)", color: "#fff" };
  if (pct >= 50) return { bg: "rgba(192,98,47,.35)", color: "#f0ebe3" };
  if (pct >= 30) return { bg: "rgba(192,98,47,.18)", color: "#c8a97e" };
  return { bg: "rgba(255,255,255,.04)", color: "#6b6050" };
};

// ─── COMPONENTE ───────────────────────────────────────────────────────────────

// Bar chart simplu
function BarChart({ data, color = "#c0622f", height = 140 }) {
  const max = Math.max(...data.map((d) => d.value));
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
            title={`${d.label}: ${fmt(d.value)}`}
            style={{
              width: "100%",
              borderRadius: "4px 4px 0 0",
              background: `linear-gradient(180deg, ${color}, ${color}88)`,
              height: max > 0 ? `${(d.value / max) * 100}%` : "4px",
              minHeight: 4,
              transition: "height .4s ease",
              cursor: "default",
            }}
          />
          <span
            style={{
              fontSize: 8,
              color: "#6b6050",
              whiteSpace: "nowrap",
              textAlign: "center",
            }}
          >
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// Stat card
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

// ─── PAGINA PRINCIPALĂ ────────────────────────────────────────────────────────
export default function StatisticiProprietar() {
  const { navigate, state } = useApp();
  const { user } = state;
  const [period, setPeriod] = useState("saptamana");
  const [exportLoading, setExportLoading] = useState(false);

  const revenueData = REVENUE_DATA[period];
  const totalPeriod = revenueData.reduce((s, d) => s + d.value, 0);

  // Export simplu CSV (funcționează fără librării)
  const exportCSV = () => {
    setExportLoading(true);
    setTimeout(() => {
      const rows = [
        ["Produs", "Comenzi", "Venituri (lei)"],
        ...TOP_PRODUCTS.map((p) => [p.name, p.orders, p.revenue]),
        [],
        ["Total", MONTHLY_STATS.totalOrders, MONTHLY_STATS.totalRevenue],
      ];
      const csv = rows.map((r) => r.join(",")).join("\n");
      const blob = new Blob(["\uFEFF" + csv], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `WhataboutFood_Raport_${new Date().toLocaleDateString("ro-RO").replace(/\//g, "-")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setExportLoading(false);
    }, 600);
  };

  // Export PDF simplu via print
  const exportPDF = () => {
    window.print();
  };

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
            onClick={() => navigate("admin")}
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
              {user?.restName || "Mama Mia"} • Aprilie 2025
            </div>
          </div>
        </div>

        {/* Export buttons */}
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
            {exportLoading ? "Se exportă..." : "📥 Export Excel/CSV"}
          </button>
          <button
            onClick={exportPDF}
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
        {/* ── SUMAR LUNAR ── */}
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
            value={fmt(MONTHLY_STATS.totalRevenue)}
            sub="Aprilie 2025"
            color="#c8a97e"
          />
          <StatCard
            icon="🍽️"
            label="Total comenzi"
            value={MONTHLY_STATS.totalOrders}
            sub={`${MONTHLY_STATS.growth} față de luna trecută`}
            color="#6b9e6b"
          />
          <StatCard
            icon="🧾"
            label="Valoare medie"
            value={`${MONTHLY_STATS.avgOrderValue} lei`}
            sub="per comandă"
            color="#c0622f"
          />
          <StatCard
            icon="📅"
            label="Rezervări"
            value={MONTHLY_STATS.reservations}
            sub="confirmate luna aceasta"
            color="#5b8dd9"
          />
        </div>

        {/* ── GRAFIC VENITURI ── */}
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
            {/* Period toggle */}
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
                    background: period === p.key ? "#c0622f" : "transparent",
                    border: "none",
                    color: period === p.key ? "#fff" : "#6b6050",
                    fontWeight: period === p.key ? 700 : 400,
                    transition: "all .15s",
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Total perioadă */}
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

          <BarChart data={revenueData} color="#c0622f" height={140} />
        </div>

        {/* ── TOP PRODUSE ── */}
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

          {TOP_PRODUCTS.map((p, i) => (
            <div key={p.name} style={{ marginBottom: 12 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 5,
                }}
              >
                {/* Rank */}
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
                    style={{ fontSize: 12, fontWeight: 700, color: "#c8a97e" }}
                  >
                    {p.orders} comenzi
                  </div>
                  <div style={{ fontSize: 10, color: "#6b6050" }}>
                    {fmt(p.revenue)}
                  </div>
                </div>
              </div>
              {/* Progress bar */}
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
          ))}
        </div>

        {/* ── HEATMAP ORE AGLOMERATE ── */}
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
          <div style={{ fontSize: 11, color: "#6b6050", marginBottom: 14 }}>
            Procentaj ocupare mese per zi și oră
          </div>

          {/* Header zile */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "48px repeat(7, 1fr)",
              gap: 3,
              marginBottom: 3,
            }}
          >
            <div />
            {HEATMAP.zile.map((z) => (
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

          {/* Grid */}
          {HEATMAP.ore.map((ora, oi) => (
            <div
              key={ora}
              style={{
                display: "grid",
                gridTemplateColumns: "48px repeat(7, 1fr)",
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
              {HEATMAP.data[oi].map((pct, di) => {
                const { bg, color } = heatColor(pct);
                return (
                  <div
                    key={di}
                    title={`${HEATMAP.zile[di]} ${ora}: ${pct}%`}
                    style={{
                      background: bg,
                      borderRadius: 5,
                      padding: "6px 2px",
                      textAlign: "center",
                      fontSize: 8,
                      color,
                      fontWeight: 700,
                      cursor: "default",
                    }}
                  >
                    {pct}%
                  </div>
                );
              })}
            </div>
          ))}

          {/* Legendă */}
          <div
            style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}
          >
            {[
              { label: "< 30%", bg: "rgba(255,255,255,.04)", color: "#6b6050" },
              { label: "30–50%", bg: "rgba(192,98,47,.18)", color: "#c8a97e" },
              { label: "50–70%", bg: "rgba(192,98,47,.35)", color: "#f0ebe3" },
              { label: "70–90%", bg: "rgba(192,98,47,.6)", color: "#fff" },
              { label: "> 90%", bg: "rgba(192,98,47,.9)", color: "#fff" },
            ].map((l) => (
              <div
                key={l.label}
                style={{ display: "flex", alignItems: "center", gap: 5 }}
              >
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 3,
                    background: l.bg,
                  }}
                />
                <span style={{ fontSize: 9, color: "#6b6050" }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── INSIGHTS ── */}
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
            💡 Insights
          </div>
          {[
            {
              icon: "📈",
              text: `Cea mai aglomerată zi: ${MONTHLY_STATS.topDay}`,
              sub: "92% ocupare medie",
              color: "#6b9e6b",
            },
            {
              icon: "⏰",
              text: `Ora de vârf: ${MONTHLY_STATS.topHour}`,
              sub: "100% mese ocupate Vin-Sam",
              color: "#c8a97e",
            },
            {
              icon: "⏱️",
              text: `Timp mediu la masă: ${MONTHLY_STATS.avgTableTime} min`,
              sub: "De la ocupare până la plată",
              color: "#5b8dd9",
            },
            {
              icon: "🚀",
              text: `Creștere față de luna trecută: ${MONTHLY_STATS.growth}`,
              sub: "Venituri totale",
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
              <span style={{ fontSize: 20, flexShrink: 0 }}>{ins.icon}</span>
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
                <div style={{ fontSize: 11, color: "#6b6050" }}>{ins.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── VENITURI PE CATEGORIE ── */}
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
            🍽️ Venituri pe categorie
          </div>
          {[
            {
              label: "Paste & Risotto",
              pct: 32,
              value: 13709,
              color: "#c0622f",
            },
            { label: "Pizza", pct: 24, value: 10282, color: "#e07a47" },
            { label: "Băuturi", pct: 18, value: 7711, color: "#c8a97e" },
            { label: "Secondi", pct: 14, value: 5998, color: "#6b9e6b" },
            { label: "Antipasti", pct: 7, value: 2999, color: "#5b8dd9" },
            { label: "Dolci", pct: 5, value: 2141, color: "#8b6a8a" },
          ].map((cat) => (
            <div key={cat.label} style={{ marginBottom: 12 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 5,
                }}
              >
                <span
                  style={{ fontSize: 12, color: "#f0ebe3", fontWeight: 600 }}
                >
                  {cat.label}
                </span>
                <div style={{ textAlign: "right" }}>
                  <span
                    style={{ fontSize: 12, color: cat.color, fontWeight: 700 }}
                  >
                    {cat.pct}%
                  </span>
                  <span
                    style={{ fontSize: 11, color: "#6b6050", marginLeft: 6 }}
                  >
                    {fmt(cat.value)}
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
                    background: cat.color,
                    transition: "width .5s ease",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
