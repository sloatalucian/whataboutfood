import { WaiterOrderCard } from "../components/WaiterOrderCard";

export function WaiterOrders({
  orders,
  loading,
  waiterCalls,
  setWaiterCalls,
  cancellingOrders,
  initCancellation,
  cancelItem,
  acceptOrder,
  markReady,
  closeOrder,
  confirmPayment,
  pendingOrders,
  cookingOrders,
}) {
  return (
    <div>
      {loading && (
        <div
          style={{
            textAlign: "center",
            padding: "40px 0",
            color: "#6b6050",
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 10 }}>🍽️</div>
          <div>Se încarcă comenzile...</div>
        </div>
      )}

      {/* ── CERERI DE PLATĂ ── */}
      {!loading && payingOrders.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: 10,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "#5b8dd9",
              marginBottom: 10,
            }}
          >
            💳 Cereri de plată — acțiune necesară
          </div>
          {payingOrders.map((o) => (
            <div
              key={o.id}
              style={{
                background: "rgba(91,141,217,.08)",
                border: "2px solid rgba(91,141,217,.4)",
                borderRadius: 16,
                padding: 16,
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: "'Fraunces',serif",
                      fontSize: 18,
                      fontWeight: 900,
                    }}
                  >
                    🪑 Masa {o.table_label || o.table}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "#6b6050",
                      marginTop: 2,
                    }}
                  >
                    {new Date(o.created_at).toLocaleTimeString("ro-RO", {
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "Europe/Bucharest",
                    })}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    padding: "4px 12px",
                    borderRadius: 20,
                    background: "rgba(91,141,217,.2)",
                    color: "#5b8dd9",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  {o.payment_method === "cash" ? "💵 Cash" : "💳 Card"}
                </div>
              </div>
              {(o.items || []).map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 13,
                    marginBottom: 4,
                  }}
                >
                  <span style={{ color: "rgba(240,235,227,.7)" }}>
                    {item.emoji} {item.name}
                  </span>
                  <span style={{ color: "#c8a97e", fontWeight: 700 }}>
                    ×{item.qty}
                  </span>
                </div>
              ))}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 10,
                  paddingTop: 10,
                  borderTop: "1px solid rgba(91,141,217,.2)",
                }}
              >
                <span
                  style={{
                    fontFamily: "'Fraunces',serif",
                    fontSize: 16,
                    fontWeight: 700,
                    color: "#c8a97e",
                  }}
                >
                  Total: {Number(o.total).toFixed(2)} lei
                </span>
                <button
                  onClick={() => confirmPayment(o)}
                  style={{
                    padding: "10px 18px",
                    borderRadius: 12,
                    background: "linear-gradient(135deg,#3a5a8a,#1e3a6a)",
                    border: "none",
                    color: "#fff",
                    fontFamily: "'Fraunces',serif",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  ✅ Confirmă plata
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Chemări ospătar */}
      {waiterCalls.length > 0 && (
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
            🔔 Chemări ospătar
          </div>
          {waiterCalls.map((call) => (
            <div
              key={call.id}
              style={{
                background: "rgba(200,169,126,.08)",
                border: "1px solid rgba(200,169,126,.25)",
                borderRadius: 14,
                padding: "14px 16px",
                marginBottom: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span
                style={{
                  fontSize: 14,
                  color: "#c8a97e",
                  fontWeight: 600,
                }}
              >
                {call.message}
              </span>
              <button
                onClick={() =>
                  setWaiterCalls((prev) => prev.filter((c) => c.id !== call.id))
                }
                style={{
                  background: "rgba(200,169,126,.15)",
                  border: "1px solid rgba(200,169,126,.2)",
                  borderRadius: 8,
                  padding: "4px 12px",
                  color: "#c8a97e",
                  fontSize: 12,
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                ✓ Am văzut
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Comenzi noi */}
      {!loading && pendingOrders.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: 10,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "#e07a47",
              marginBottom: 10,
            }}
          >
            🆕 Comenzi noi — necesită acceptare
          </div>
          {pendingOrders.map((o) => {
            const isCancelling = !!cancellingOrders[o.id];
            const displayItems = isCancelling
              ? cancellingOrders[o.id].items
              : o.items || [];
            const displayTotal = isCancelling
              ? displayItems.reduce(
                  (s, i) => s + (i.price || 0) * (i.qty || 1),
                  0,
                )
              : o.total;
            return (
              <div
                key={o.id}
                style={{
                  background: "rgba(224,122,71,.08)",
                  border: "1px solid rgba(224,122,71,.3)",
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 10,
                }}
              >
                {/* Header */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 10,
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <div
                        style={{
                          fontFamily: "'Fraunces',serif",
                          fontSize: 18,
                          fontWeight: 900,
                        }}
                      >
                        🪑 Masa {o.table_label || o.table}
                      </div>
                      {o.has_new_items && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "3px 8px",
                            borderRadius: 20,
                            background: "#c8a97e22",
                            color: "#c8a97e",
                            border: "1px solid #c8a97e44",
                          }}
                        >
                          🆕 Produse noi
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: "#6b6050" }}>
                      {new Date(o.created_at).toLocaleTimeString("ro-RO", {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "Europe/Bucharest",
                      })}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      padding: "4px 10px",
                      borderRadius: 20,
                      background: "rgba(224,122,71,.2)",
                      color: "#e07a47",
                    }}
                  >
                    🆕 Nouă
                  </div>
                </div>

                {/* Produse cu buton anulare */}
                {displayItems.map((item, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: 13,
                      marginBottom: 6,
                      padding: "6px 8px",
                      borderRadius: 8,
                      background: "rgba(255,255,255,.03)",
                    }}
                  >
                    <span
                      style={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <span style={{ color: "rgba(240,235,227,.7)" }}>
                        {item.emoji} {item.name}
                      </span>
                      {item.is_new && (
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: 10,
                            background: "#c8a97e22",
                            color: "#c8a97e",
                            border: "1px solid #c8a97e44",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Comandat acum
                        </span>
                      )}
                    </span>
                    <span
                      style={{
                        color: "#c8a97e",
                        fontWeight: 700,
                        marginRight: 8,
                      }}
                    >
                      ×{item.qty}
                    </span>
                    <button
                      onClick={() => {
                        if (!isCancelling) {
                          initCancellation(o);
                          setTimeout(
                            () => cancelItem(o.id, item.name, item.qty),
                            50,
                          );
                        } else {
                          cancelItem(o.id, item.name, item.qty);
                        }
                      }}
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 6,
                        background: "rgba(192,57,43,.2)",
                        border: "1px solid rgba(192,57,43,.3)",
                        color: "#e05050",
                        fontSize: 12,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}

                {/* Produse anulate */}
                {isCancelling &&
                  (o.items || [])
                    .filter(
                      (item) =>
                        !displayItems.find(
                          (r) => r.name === item.name && r.qty === item.qty,
                        ),
                    )
                    .map((item, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 12,
                          marginBottom: 4,
                          padding: "4px 8px",
                          opacity: 0.4,
                          textDecoration: "line-through",
                          color: "#e05050",
                        }}
                      >
                        <span>
                          {item.emoji} {item.name}
                        </span>
                        <span>×{item.qty}</span>
                      </div>
                    ))}

                {/* Câmp motiv anulare */}
                {isCancelling &&
                  (o.items || []).length > displayItems.length && (
                    <div style={{ marginTop: 10 }}>
                      <textarea
                        placeholder="Motivul anulării (ex: Nu avem cola)"
                        value={cancellingOrders[o.id]?.note || ""}
                        maxLength={200}
                        onChange={(e) =>
                          setCancellingOrders((prev) => ({
                            ...prev,
                            [o.id]: {
                              ...prev[o.id],
                              note: e.target.value,
                            },
                          }))
                        }
                        rows={2}
                        style={{
                          width: "100%",
                          background: "#1e1a14",
                          border: "1px solid rgba(192,57,43,.3)",
                          borderRadius: 10,
                          color: "#f0ebe3",
                          padding: "8px 10px",
                          fontSize: 12,
                          fontFamily: "inherit",
                          resize: "none",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                  )}

                {o.observations && (
                  <div
                    style={{
                      background: "rgba(200,169,126,.08)",
                      border: "1px solid rgba(200,169,126,.2)",
                      borderRadius: 10,
                      padding: "8px 12px",
                      margin: "8px 0",
                      fontSize: 12,
                      color: "#c8a97e",
                    }}
                  >
                    💬 {o.observations}
                  </div>
                )}

                {/* Footer */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: 8,
                    paddingTop: 8,
                    borderTop: "1px solid rgba(255,255,255,.06)",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Fraunces',serif",
                      fontSize: 16,
                      fontWeight: 700,
                      color: "#c8a97e",
                    }}
                  >
                    Total: {Number(displayTotal).toFixed(2)} lei
                  </span>
                  <button
                    onClick={() =>
                      isCancelling
                        ? acceptOrderWithItems(o.id, o)
                        : acceptOrder(o.id)
                    }
                    disabled={isCancelling && displayItems.length === 0}
                    style={{
                      padding: "10px 18px",
                      borderRadius: 12,
                      background:
                        displayItems.length === 0
                          ? "#2a2218"
                          : "linear-gradient(135deg,#4a6e4a,#2d4a2d)",
                      border: "none",
                      color: displayItems.length === 0 ? "#6b6050" : "#fff",
                      fontFamily: "'Fraunces',serif",
                      fontSize: 14,
                      fontWeight: 700,
                      cursor:
                        displayItems.length === 0 ? "not-allowed" : "pointer",
                    }}
                  >
                    ✅ Confirmă comanda
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* În pregătire */}
      {!loading && cookingOrders.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 10,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "#6b6050",
              marginBottom: 10,
            }}
          >
            ⏳ În pregătire
          </div>
          {cookingOrders.map((o) => (
            <WaiterOrderCard
              key={o.id}
              order={o}
              onMarkReady={markReady}
              onClose={closeOrder}
            />
          ))}
        </div>
      )}

      {/* Gata */}
      {!loading && readyOrders.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 10,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "#6b6050",
              marginBottom: 10,
            }}
          >
            ✅ Gata de servit
          </div>
          {readyOrders.map((o) => (
            <WaiterOrderCard
              key={o.id}
              order={o}
              onMarkReady={markReady}
              onClose={closeOrder}
            />
          ))}
        </div>
      )}

      {!loading &&
        pendingOrders.length === 0 &&
        cookingOrders.length === 0 &&
        readyOrders.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "60px 0",
              color: "#6b6050",
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 10 }}>🍽️</div>
            <div style={{ fontSize: 15 }}>Nicio comandă activă</div>
            <div style={{ fontSize: 12, marginTop: 6 }}>
              Comenzile clienților apar automat aici
            </div>
          </div>
        )}
    </div>
  );
}
