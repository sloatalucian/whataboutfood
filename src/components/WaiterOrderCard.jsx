export function WaiterOrderCard({ order, onMarkReady, onClose }) {
  return (
    <div
      style={{
        background: "#161210",
        border: "1px solid #2a2218",
        borderRadius: 16,
        padding: 16,
        marginBottom: 10,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          background:
            order.status === "cooking"
              ? "linear-gradient(180deg,#c0622f,#e07a47)"
              : "linear-gradient(180deg,#4a6e4a,#6b9e6b)",
        }}
      />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
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
            🪑 Masa {order.table_label || order.table}
          </div>
          <div style={{ fontSize: 11, color: "#6b6050" }}>
            {new Date(order.created_at).toLocaleTimeString("ro-RO", {
              hour: "2-digit",
              minute: "2-digit",
            })}
            {order.waiter_name && (
              <span style={{ marginLeft: 8, color: "#c8a97e" }}>
                • {order.waiter_name}
              </span>
            )}
          </div>
        </div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 800,
            padding: "4px 10px",
            borderRadius: 20,
            background:
              order.status === "cooking"
                ? "rgba(192,98,47,.2)"
                : "rgba(74,110,74,.2)",
            color: order.status === "cooking" ? "#e07a47" : "#6b9e6b",
          }}
        >
          {order.status === "cooking" ? "⏳ Pregătire" : "✅ Gata"}
        </div>
      </div>
      {(order.items || []).map((item, i) => (
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
          <span style={{ color: "#c8a97e", fontWeight: 700 }}>×{item.qty}</span>
        </div>
      ))}
      {order.observations && (
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
          💬 {order.observations}
        </div>
      )}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 8,
        }}
      >
        <span
          style={{
            fontFamily: "'Fraunces',serif",
            fontSize: 15,
            fontWeight: 700,
            color: "#c8a97e",
          }}
        >
          {order.total} lei
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          {order.status === "cooking" && (
            <button
              onClick={() => onMarkReady(order.id)}
              style={{
                padding: "8px 14px",
                borderRadius: 10,
                background: "rgba(74,110,74,.2)",
                border: "1px solid rgba(74,110,74,.4)",
                color: "#6b9e6b",
                fontSize: 12,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              ✅ Gata
            </button>
          )}
          <button
            onClick={() => onClose(order.id)}
            style={{
              padding: "8px 14px",
              borderRadius: 10,
              background: "#1e1a14",
              border: "1px solid #2a2218",
              color: "#f0ebe3",
              fontSize: 12,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
}
