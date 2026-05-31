export default function RatingSection({
  ratingStats,
  ratingLoading,
  ratingPeriod,
  setRatingPeriod,
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
          }}
        >
          ⭐ Rating clienți
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {[
            { key: "zi", label: "Azi" },
            { key: "saptamana", label: "7 zile" },
            { key: "luna", label: "Lună" },
          ].map((p) => (
            <button
              key={p.key}
              onClick={() => setRatingPeriod(p.key)}
              style={{
                padding: "4px 10px",
                borderRadius: 20,
                border: "none",
                background: ratingPeriod === p.key ? "#c0622f" : "transparent",
                color: ratingPeriod === p.key ? "#fff" : "#6b6050",
                fontSize: 11,
                fontWeight: ratingPeriod === p.key ? 700 : 400,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {ratingLoading ? (
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
      ) : !ratingStats || ratingStats.empty ? (
        <div
          style={{
            textAlign: "center",
            padding: "20px 0",
            color: "#6b6050",
            fontSize: 13,
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 8 }}>⭐</div>
          Nu există recenzii în perioada selectată
        </div>
      ) : (
        <>
          {/* Media si total */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <div
              style={{
                flex: 1,
                background: "#161210",
                borderRadius: 10,
                padding: "14px 12px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontFamily: "'Fraunces',serif",
                  fontSize: 36,
                  fontWeight: 900,
                  color: "#c0622f",
                  lineHeight: 1,
                }}
              >
                {ratingStats.avg}
              </div>
              <div style={{ fontSize: 20, marginTop: 4 }}>
                {"★".repeat(Math.round(ratingStats.avg))}
                {"☆".repeat(5 - Math.round(ratingStats.avg))}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "#6b6050",
                  marginTop: 4,
                }}
              >
                din {ratingStats.total}{" "}
                {ratingStats.total === 1 ? "recenzie" : "recenzii"}
              </div>
            </div>

            {/* Distributie stele */}
            <div
              style={{
                flex: 1,
                background: "#161210",
                borderRadius: 10,
                padding: "10px 12px",
              }}
            >
              {[5, 4, 3, 2, 1].map((star) => {
                const count = ratingStats.distribution[star] || 0;
                const pct =
                  ratingStats.total > 0
                    ? Math.round((count / ratingStats.total) * 100)
                    : 0;
                return (
                  <div
                    key={star}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        color: "#8a7a6a",
                        width: 14,
                        textAlign: "right",
                      }}
                    >
                      {star}★
                    </span>
                    <div
                      style={{
                        flex: 1,
                        height: 5,
                        background: "#1e1a14",
                        borderRadius: 3,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${pct}%`,
                          background:
                            star >= 4
                              ? "#c0622f"
                              : star === 3
                                ? "#c8a97e"
                                : "#5b8dd9",
                          borderRadius: 3,
                          transition: "width 0.6s cubic-bezier(.23,1,.32,1)",
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        color: "#6b6050",
                        width: 20,
                      }}
                    >
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recenzii recente */}
          {ratingStats.recent && ratingStats.recent.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: 11,
                  color: "#6b6050",
                  letterSpacing: "1px",
                  textTransform: "uppercase",
                  marginBottom: 10,
                }}
              >
                Recenzii recente
              </div>
              {ratingStats.recent.map((r) => (
                <div
                  key={r.id}
                  style={{
                    background: "#161210",
                    borderRadius: 10,
                    padding: "10px 12px",
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: r.comment ? 6 : 0,
                    }}
                  >
                    <span style={{ color: "#c0622f", fontSize: 14 }}>
                      {"★".repeat(r.rating)}
                      {"☆".repeat(5 - r.rating)}
                    </span>
                    <span style={{ fontSize: 10, color: "#6b6050" }}>
                      {new Date(r.created_at).toLocaleDateString("ro-RO", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  {r.comment && (
                    <div
                      style={{
                        fontSize: 12,
                        color: "#8a7a6a",
                        fontStyle: "italic",
                        lineHeight: 1.5,
                      }}
                    >
                      "{r.comment}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
