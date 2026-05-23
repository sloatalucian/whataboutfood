export default function ActiveOrderCard({
  activeOrder,
  waiterCalled,
  waiterCooldown,
  callWaiter,
  onCereNota,
}) {
  if (!activeOrder) return null;

  const STATUS_BG = {
    paying: "rgba(91,141,217,.1)",
    ready: "rgba(107,158,107,.1)",
    cooking: "rgba(224,122,71,.1)",
    pending: "rgba(200,169,126,.1)",
  };
  const STATUS_BORDER = {
    paying: "rgba(91,141,217,.4)",
    ready: "rgba(107,158,107,.4)",
    cooking: "rgba(224,122,71,.4)",
    pending: "rgba(200,169,126,.4)",
  };
  const STATUS_BADGE_BG = {
    paying: "rgba(91,141,217,.2)",
    ready: "rgba(107,158,107,.2)",
    cooking: "rgba(224,122,71,.2)",
    pending: "rgba(200,169,126,.2)",
  };
  const STATUS_BADGE_COLOR = {
    paying: "#5b8dd9",
    ready: "#6b9e6b",
    cooking: "#e07a47",
    pending: "#c8a97e",
  };
  const STATUS_LABEL = {
    pending: "⏳ Comanda ta a fost trimisă",
    cooking: "👨‍🍳 Comanda ta se prepară",
    ready: "✅ Comanda e gata! Ospătarul vine",
    paying: "🧾 Nota cerută — ospătarul vine",
  };

  const s = activeOrder.status;
  const statuses = ["pending", "cooking", "ready", "paying"];
  const currentIdx = statuses.indexOf(s);

  return (
    <div
      style={{
        background: STATUS_BG[s] || STATUS_BG.pending,
        border: `1px solid ${STATUS_BORDER[s] || STATUS_BORDER.pending}`,
        borderRadius: 16,
        padding: "14px 16px",
        marginBottom: 16,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700 }}>{STATUS_LABEL[s]}</div>
        <span
          style={{
            fontSize: 10,
            fontWeight: 800,
            padding: "3px 8px",
            borderRadius: 10,
            background: STATUS_BADGE_BG[s] || STATUS_BADGE_BG.pending,
            color: STATUS_BADGE_COLOR[s] || STATUS_BADGE_COLOR.pending,
          }}
        >
          Masa {activeOrder.table_label}
        </span>
      </div>

      {/* Progress steps */}
      <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
        {[
          { s: "pending", label: "Trimisă" },
          { s: "cooking", label: "Preparare" },
          { s: "ready", label: "Gata" },
          { s: "paying", label: "Plată" },
        ].map((step) => {
          const isDone = statuses.indexOf(step.s) <= currentIdx;
          return (
            <div key={step.s} style={{ flex: 1 }}>
              <div
                style={{
                  height: 4,
                  borderRadius: 4,
                  background: isDone ? "#c0622f" : "rgba(255,255,255,.1)",
                  marginBottom: 4,
                }}
              />
              <div
                style={{
                  fontSize: 9,
                  color: isDone ? "#c0622f" : "#6b6050",
                  textAlign: "center",
                }}
              >
                {step.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Cheamă ospătarul */}
      {s !== "pending" && s !== "paying" && (
        <div style={{ marginBottom: 8 }}>
          {waiterCalled && waiterCooldown > 0 ? (
            <div
              style={{
                background: "rgba(200,169,126,.08)",
                border: "1px solid rgba(200,169,126,.2)",
                borderRadius: 12,
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: 13, color: "#c8a97e" }}>
                🔔 Ospătarul a fost chemat
              </span>
              <span style={{ fontSize: 12, color: "#6b6050", fontWeight: 600 }}>
                {Math.floor(waiterCooldown / 60)}:
                {String(waiterCooldown % 60).padStart(2, "0")}
              </span>
            </div>
          ) : (
            <button
              onClick={callWaiter}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: 12,
                background: "rgba(200,169,126,.1)",
                border: "1px solid rgba(200,169,126,.3)",
                color: "#c8a97e",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              🔔 Cheamă ospătarul
            </button>
          )}
        </div>
      )}

      {/* Cere nota */}
      {s === "ready" && !activeOrder.has_new_items && (
        <button
          onClick={onCereNota}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: 14,
            background: "linear-gradient(135deg,#c0622f,#8b3a18)",
            border: "none",
            color: "#fff",
            fontFamily: "'Fraunces',serif",
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          🧾 Cere nota de plată
        </button>
      )}

      {/* Produse noi în așteptare */}
      {activeOrder.has_new_items && (
        <div
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: 14,
            background: "#1e1a14",
            border: "1px solid #c8a97e44",
            color: "#c8a97e",
            fontFamily: "'Fraunces',serif",
            fontSize: 13,
            fontWeight: 600,
            textAlign: "center",
          }}
        >
          🆕 Produse noi in asteptare...
        </div>
      )}

      {/* Metoda de plată aleasă */}
      {s === "paying" && (
        <div
          style={{ fontSize: 12, color: "var(--muted)", textAlign: "center" }}
        >
          Ai ales:{" "}
          {activeOrder.payment_method === "cash" ? "💵 Cash" : "💳 Card"}
        </div>
      )}
    </div>
  );
}
