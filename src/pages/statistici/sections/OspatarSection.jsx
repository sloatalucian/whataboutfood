import { fmt } from "../utils";

export default function OspatarSection({
  period,
  waiterStats,
  waiterLoading,
  setPeriod,
}) {
  return (
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
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          👨‍🍳 Performanță per ospătar
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {[
            { key: "zi", label: "Azi" },
            { key: "saptamana", label: "7 zile" },
            { key: "luna", label: "Lună" },
          ].map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              style={{
                padding: "4px 10px",
                borderRadius: 20,
                border: "none",
                background: period === p.key ? "#c0622f" : "transparent",
                color: period === p.key ? "#fff" : "#6b6050",
                fontSize: 11,
                fontWeight: period === p.key ? 700 : 400,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
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
                    i === 0 ? "#c0622f" : i === 1 ? "#5b8dd9" : "#2a2218",
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
                  {w.orders} {w.orders === 1 ? "comandă" : "comenzi"}
                  {w.avgTimeSec !== null
                    ? w.avgTime >= 1
                      ? ` • ${w.avgTime} min avg`
                      : ` • ${w.avgTimeSec}s avg`
                    : " • — avg"}
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
                {fmt(w.revenue)}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
