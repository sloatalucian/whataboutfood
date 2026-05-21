export function WaiterReservations({
  reservations,
  refuseReservation,
  acceptReservation,
  restaurantId,
  waiterId,
  waiterName,
  pendingRes,
  confirmedRes,
}) {
  return (
    <div>
      {pendingRes.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: 10,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "#c8a97e",
              marginBottom: 10,
            }}
          >
            ⏳ Necesită confirmare
          </div>
          {pendingRes.map((r) => (
            <div
              key={r.id}
              style={{
                background: "rgba(200,169,126,.08)",
                border: "1px solid rgba(200,169,126,.25)",
                borderRadius: 16,
                padding: "14px 16px",
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    flexShrink: 0,
                    background: "rgba(200,169,126,.15)",
                    border: "1px solid rgba(200,169,126,.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "'Fraunces',serif",
                    fontSize: 15,
                    fontWeight: 700,
                    color: "#c8a97e",
                  }}
                >
                  {r.table_label}
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      marginBottom: 2,
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                      {r.customer_name}
                    </div>
                    {r.user_id && (
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: 8,
                          background:
                            r.clientRating >= 4
                              ? "rgba(74,110,74,.2)"
                              : r.clientRating >= 3
                                ? "rgba(200,169,126,.2)"
                                : "rgba(192,57,43,.2)",
                          color:
                            r.clientRating >= 4
                              ? "#6b9e6b"
                              : r.clientRating >= 3
                                ? "#c8a97e"
                                : "#e05050",
                          border: `1px solid ${
                            r.clientRating >= 4
                              ? "rgba(74,110,74,.3)"
                              : r.clientRating >= 3
                                ? "rgba(200,169,126,.3)"
                                : "rgba(192,57,43,.3)"
                          }`,
                        }}
                      >
                        ★ {Number(r.clientRating || 5).toFixed(1)}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "#6b6050" }}>
                    📅 {r.date} • 🕐 {r.time} • 👥 {r.persons} pers.
                  </div>
                  {r.clientNoShows > 0 && (
                    <div
                      style={{
                        fontSize: 10,
                        color: "#e05050",
                        marginTop: 2,
                      }}
                    >
                      ⚠️ {r.clientNoShows} no-show
                      {r.clientNoShows > 1 ? "-uri" : ""} • {r.clientVisits}{" "}
                      vizite
                    </div>
                  )}
                </div>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                <button
                  onClick={() => refuseReservation(r.id)}
                  style={{
                    padding: "9px",
                    borderRadius: 10,
                    background: "rgba(192,57,43,.15)",
                    border: "1px solid rgba(192,57,43,.3)",
                    color: "#e05050",
                    fontSize: 12,
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  ❌ Refuză
                </button>
                <button
                  onClick={() => confirmReservation(r.id)}
                  style={{
                    padding: "9px",
                    borderRadius: 10,
                    background: "rgba(74,110,74,.2)",
                    border: "1px solid rgba(74,110,74,.4)",
                    color: "#6b9e6b",
                    fontSize: 12,
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  ✅ Confirmă
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {confirmedRes.length > 0 && (
        <div>
          <div
            style={{
              fontSize: 10,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "#6b6050",
              marginBottom: 10,
            }}
          >
            ✅ Confirmate
          </div>
          {confirmedRes.map((r) => (
            <div
              key={r.id}
              style={{
                background: "#161210",
                border: "1px solid #2a2218",
                borderRadius: 14,
                padding: "12px 14px",
                marginBottom: 8,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  flexShrink: 0,
                  background: "rgba(74,110,74,.1)",
                  border: "1px solid rgba(74,110,74,.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "'Fraunces',serif",
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#6b9e6b",
                }}
              >
                {r.table_label}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  {r.customer_name}
                </div>
                <div style={{ fontSize: 11, color: "#6b6050", marginTop: 2 }}>
                  📅 {r.date} • 🕐 {r.time} • 👥 {r.persons} pers.
                </div>
              </div>
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 800,
                  padding: "3px 8px",
                  borderRadius: 20,
                  background: "rgba(74,110,74,.2)",
                  color: "#6b9e6b",
                }}
              >
                ✅
              </div>
            </div>
          ))}
        </div>
      )}
      {pendingRes.length === 0 && confirmedRes.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "60px 0",
            color: "#6b6050",
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 10 }}>📅</div>
          <div>Nicio rezervare</div>
        </div>
      )}
    </div>
  );
}
