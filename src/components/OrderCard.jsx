import { useApp } from "../context/AppContext";

export default function OrderCard({ order }) {
  const { dispatch } = useApp();

  const markReady = () => dispatch({ type:"ORDER_UPDATE", payload:{ id:order.id, status:"ready" } });
  const closeOrder = () => dispatch({ type:"ORDER_REMOVE", payload:order.id });

  return (
    <div style={{
      background:"var(--card)", border:"1px solid var(--border)",
      borderRadius:20, padding:18, position:"relative",
      overflow:"hidden", marginBottom:12,
    }}>
      {/* Left accent bar */}
      <div style={{
        position:"absolute", left:0, top:0, bottom:0, width:3,
        background:"linear-gradient(180deg,var(--terra),var(--terra2))",
      }} />

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
        <div>
          <div style={{ fontFamily:"'Fraunces',serif", fontSize:20, fontWeight:900 }}>
            🪑 Masa {order.table}
          </div>
          <div style={{ fontSize:11, color:"var(--muted)", marginTop:2 }}>
            Ora {order.time}
          </div>
        </div>
        <div style={{
          fontSize:10, fontWeight:800, letterSpacing:1, textTransform:"uppercase",
          padding:"4px 10px", borderRadius:20,
          background: order.status === "cooking" ? "rgba(192,98,47,.2)" : "rgba(74,110,74,.2)",
          color: order.status === "cooking" ? "var(--terra2)" : "var(--sage2)",
        }}>
          {order.status === "cooking" ? "⏳ Pregătire" : "✅ Gata"}
        </div>
      </div>

      {/* Items */}
      <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:12 }}>
        {order.items.map((item, i) => (
          <div key={i} style={{ display:"flex", justifyContent:"space-between", fontSize:13 }}>
            <span style={{ color:"rgba(240,235,227,.7)" }}>{item.emoji} {item.name}</span>
            <span style={{ color:"var(--warm)", fontWeight:700 }}>×{item.qty}</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display:"flex", gap:8 }}>
        {order.status === "cooking" && (
          <button onClick={markReady} style={{
            flex:1, padding:9, borderRadius:10,
            background:"rgba(74,110,74,.2)", border:"1px solid rgba(74,110,74,.4)",
            color:"var(--sage2)", fontSize:12, cursor:"pointer", fontWeight:600,
          }}>
            ✅ Marchează gata
          </button>
        )}
        <button onClick={closeOrder} style={{
          flex:1, padding:9, borderRadius:10,
          background:"var(--card2)", border:"1px solid var(--border)",
          color:"var(--cream)", fontSize:12, cursor:"pointer", fontWeight:600,
        }}>
          🗑️ Închide
        </button>
      </div>
    </div>
  );
}
