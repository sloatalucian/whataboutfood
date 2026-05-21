export function WaiterIstoric({
  istoricOrders,
  istoricDate,
  setIstoricDate,
  istoricLoading,
  setTab,
  restaurantId,
  suggestionModal,
  setSuggestionModal,
  sendRefusalWithSuggestion,
}) {
  return (
    <div>
      {/* Selector de dată */}
      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 20,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <button
          onClick={() => {
            const today = new Date().toISOString().split("T")[0];
            setIstoricDate(today);
          }}
          style={{
            padding: "8px 16px",
            borderRadius: 20,
            border: "none",
            cursor: "pointer",
            background:
              istoricDate === new Date().toISOString().split("T")[0]
                ? "var(--terra)"
                : "#1e1a14",
            color: "#fff",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          Astăzi
        </button>
        <button
          onClick={() => {
            const yesterday = new Date(Date.now() - 86400000)
              .toISOString()
              .split("T")[0];
            setIstoricDate(yesterday);
          }}
          style={{
            padding: "8px 16px",
            borderRadius: 20,
            border: "none",
            cursor: "pointer",
            background:
              istoricDate ===
              new Date(Date.now() - 86400000).toISOString().split("T")[0]
                ? "var(--terra)"
                : "#1e1a14",
            color: "#fff",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          Ieri
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
          <span style={{ fontSize: 11, color: "var(--muted)" }}>Altă zi:</span>
          <input
            type="date"
            value={istoricDate}
            max={new Date().toISOString().split("T")[0]}
            onChange={(e) => setIstoricDate(e.target.value)}
            style={{
              background: "#1e1a14",
              border: "1px solid #2a2218",
              borderRadius: 10,
              color: "#f0ebe3",
              padding: "6px 10px",
              fontSize: 12,
              fontFamily: "inherit",
              flex: 1,
            }}
          />
        </div>
      </div>

      {/* Statistici ziua */}
      {!istoricLoading && istoricOrders.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              background: "#161210",
              border: "1px solid #2a2218",
              borderRadius: 14,
              padding: "12px 16px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 22,
                fontWeight: 900,
                color: "var(--terra)",
                fontFamily: "'Fraunces',serif",
              }}
            >
              {istoricOrders.length}
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
              Comenzi totale
            </div>
          </div>
          <div
            style={{
              background: "#161210",
              border: "1px solid #2a2218",
              borderRadius: 14,
              padding: "12px 16px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 22,
                fontWeight: 900,
                color: "#6b9e6b",
                fontFamily: "'Fraunces',serif",
              }}
            >
              {istoricOrders
                .reduce((s, o) => s + Number(o.total || 0), 0)
                .toFixed(0)}{" "}
              lei
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
              Total vânzări
            </div>
          </div>
        </div>
      )}

      {/* Lista comenzi */}
      {istoricLoading ? (
        <div
          style={{
            textAlign: "center",
            padding: "30px 0",
            color: "var(--muted)",
            fontSize: 13,
          }}
        >
          Se încarcă...
        </div>
      ) : istoricOrders.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "40px 0",
            color: "var(--muted)",
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 10 }}>🕐</div>
          <div>Nicio comandă în această zi</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {istoricOrders.map((o) => {
            const ora = new Date(o.created_at).toLocaleTimeString("ro-RO", {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Europe/Bucharest",
            });
            const statusColors = {
              completed: "#6b9e6b",
              paid: "#5b8dd9",
              cancelled: "#e05050",
              pending: "#c8a97e",
              cooking: "#e07a47",
              ready: "#6b9e6b",
            };
            const statusLabel = {
              completed: "Finalizată",
              paid: "Plătită",
              cancelled: "Anulată",
              pending: "În așteptare",
              cooking: "Se prepară",
              ready: "Gata",
            };
            return (
              <div
                key={o.id}
                style={{
                  background: "#161210",
                  border: "1px solid #2a2218",
                  borderRadius: 14,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "10px 14px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: "1px solid #2a2218",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 700 }}>
                      {o.table_label ? `Masa ${o.table_label}` : "—"}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--muted)" }}>
                      {ora}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "3px 8px",
                        borderRadius: 10,
                        background: `${statusColors[o.status] || "#6b6050"}22`,
                        color: statusColors[o.status] || "#6b6050",
                        border: `1px solid ${statusColors[o.status] || "#6b6050"}44`,
                      }}
                    >
                      {statusLabel[o.status] || o.status}
                    </span>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 900,
                        color: "var(--terra)",
                      }}
                    >
                      {Number(o.total || 0).toFixed(2)} lei
                    </span>
                  </div>
                </div>
                <div style={{ padding: "8px 14px" }}>
                  {(Array.isArray(o.items) ? o.items : []).map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 12,
                        color: "var(--muted)",
                        padding: "3px 0",
                      }}
                    >
                      <span>
                        {item.emoji || "🍴"} {item.name}{" "}
                        {item.qty > 1 ? `x${item.qty}` : ""}
                      </span>
                      <span style={{ color: "var(--cream)" }}>
                        {(item.price * (item.qty || 1)).toFixed(2)} lei
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
{
  /* Modal Sugestie Alternativă */
}
{
  suggestionModal && (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.7)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onClick={() => setSuggestionModal(null)}
    >
      <div
        style={{
          background: "#161210",
          borderRadius: 20,
          border: "1px solid #2a2218",
          width: "100%",
          maxWidth: 390,
          padding: "24px 20px 28px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            fontFamily: "'Fraunces',serif",
            fontSize: 18,
            fontWeight: 900,
            marginBottom: 8,
          }}
        >
          ❌ Refuză rezervarea
        </div>
        <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>
          Poți trimite clientului o sugestie alternativă (opțional):
        </div>
        <textarea
          value={suggestionModal.text}
          maxLength={200}
          onChange={(e) =>
            setSuggestionModal((prev) => ({
              ...prev,
              text: e.target.value,
            }))
          }
          placeholder="Ex: Masa T3 este disponibilă la ora 20:00. Vă așteptăm!"
          rows={4}
          style={{
            width: "100%",
            background: "#1e1a14",
            border: "1px solid #2a2218",
            borderRadius: 12,
            color: "#f0ebe3",
            padding: "12px",
            fontSize: 13,
            fontFamily: "inherit",
            resize: "none",
            boxSizing: "border-box",
            marginBottom: 16,
          }}
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
          }}
        >
          <button
            onClick={() => setSuggestionModal(null)}
            style={{
              padding: "11px",
              borderRadius: 12,
              background: "#1e1a14",
              border: "1px solid #2a2218",
              color: "var(--muted)",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Anulează
          </button>
          <button
            onClick={() =>
              sendRefusalWithSuggestion(
                suggestionModal.reservationId,
                suggestionModal.text,
              )
            }
            style={{
              padding: "11px",
              borderRadius: 12,
              background: "rgba(192,57,43,.2)",
              border: "1px solid rgba(192,57,43,.4)",
              color: "#e05050",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Refuză & trimite
          </button>
        </div>
      </div>
    </div>
  );
}
