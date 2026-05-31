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

export default StatCard;
