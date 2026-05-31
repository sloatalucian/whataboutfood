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

export default BarChart;
