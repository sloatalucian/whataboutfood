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

export default StatCard;
