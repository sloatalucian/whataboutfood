export default function NoShowSection({
  noShowStats,
  noShowLoading,
  noShowPeriod,
  setNoShowPeriod,
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
      {/* Header cu selector perioada */}
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
          📅 Rata no-show
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {[
            { key: "zi", label: "Azi" },
            { key: "saptamana", label: "7 zile" },
            { key: "luna", label: "Lună" },
          ].map((p) => (
            <button
              key={p.key}
              onClick={() => setNoShowPeriod(p.key)}
              style={{
                padding: "4px 10px",
                borderRadius: 20,
                border: "none",
                background: noShowPeriod === p.key ? "#c0622f" : "transparent",
                color: noShowPeriod === p.key ? "#fff" : "#6b6050",
                fontSize: 11,
                fontWeight: noShowPeriod === p.key ? 700 : 400,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {noShowLoading ? (
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
      ) : !noShowStats || noShowStats.empty ? (
        <div
          style={{
            textAlign: "center",
            padding: "20px 0",
            color: "#6b6050",
            fontSize: 13,
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 8 }}>📅</div>
          Nu există rezervări în perioada selectată
        </div>
      ) : (
        <>
          {/* Sumar cifre */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {[
              {
                label: "Total rezervări",
                value: noShowStats.total,
                color: "#f0ebe3",
              },
              {
                label: "Prezente",
                value: noShowStats.presentCount,
                color: "#6b9e6b",
              },
              {
                label: "No-show",
                value: noShowStats.noShowCount,
                color: "#e05050",
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
                    color: s.color,
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

          {/* Bara rata no-show */}
          <div
            style={{
              background: "#161210",
              borderRadius: 12,
              padding: "12px 14px",
              marginBottom: 10,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <span style={{ fontSize: 12, color: "#8a7a6a" }}>
                Rata no-show
              </span>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color:
                    noShowStats.rate >= 30
                      ? "#e05050"
                      : noShowStats.rate >= 15
                        ? "#c8a97e"
                        : "#6b9e6b",
                }}
              >
                {noShowStats.rate}%
              </span>
            </div>
            <div
              style={{
                height: 8,
                background: "#1e1a14",
                borderRadius: 4,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${noShowStats.rate}%`,
                  background:
                    noShowStats.rate >= 30
                      ? "#e05050"
                      : noShowStats.rate >= 15
                        ? "#c8a97e"
                        : "#6b9e6b",
                  borderRadius: 4,
                  transition: "width 0.6s cubic-bezier(.23,1,.32,1)",
                }}
              />
            </div>
            <div style={{ fontSize: 10, color: "#6b6050", marginTop: 6 }}>
              {noShowStats.rate < 15
                ? "✅ Rată bună"
                : noShowStats.rate < 30
                  ? "⚠️ Rată moderată"
                  : "🔴 Rată ridicată"}
            </div>
          </div>

          {/* Ziua cu cele mai multe no-show */}
          {noShowStats.worstDay && noShowStats.noShowCount > 0 && (
            <div
              style={{
                background: "#161210",
                borderRadius: 12,
                padding: "12px 14px",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: "#6b6050",
                  marginBottom: 4,
                }}
              >
                Ziua cu cele mai multe no-show
              </div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#f0ebe3",
                }}
              >
                {noShowStats.worstDay}
                <span
                  style={{
                    fontSize: 12,
                    color: "#e05050",
                    marginLeft: 8,
                  }}
                >
                  {noShowStats.worstDayCount}{" "}
                  {noShowStats.worstDayCount === 1 ? "rezervare" : "rezervări"}
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
