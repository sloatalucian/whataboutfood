import { useState } from "react";
import { useApp } from "../context/AppContext";

export default function CartBar({ onOrder, loading = false }) {
  const { state, cartTotal, cartCount } = useApp();
  const { cart, orderTableNum } = state;
  const [showSummary, setShowSummary] = useState(false);
  const [observations, setObservations] = useState("");

  if (!cart.length) return null;

  const handleOrder = () => {
    onOrder(observations);
    setObservations("");
    setShowSummary(false);
  };

  return (
    <>
      {/* Overlay când e deschis summary */}
      {showSummary && (
        <div
          onClick={() => setShowSummary(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.5)",
            zIndex: 88,
            backdropFilter: "blur(4px)",
          }}
        />
      )}

      {/* Panel expandat cu observații */}
      {showSummary && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: "100%",
            maxWidth: 430,
            zIndex: 89,
            background: "#1e1a14",
            borderTop: "1px solid #2a2218",
            borderRadius: "20px 20px 0 0",
            padding: "20px 20px 100px",
          }}
        >
          <div
            style={{
              fontFamily: "'Fraunces',serif",
              fontSize: 18,
              fontWeight: 700,
              marginBottom: 16,
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>🛒 Comanda ta</span>
            <button
              onClick={() => setShowSummary(false)}
              style={{
                background: "none",
                border: "none",
                color: "#6b6050",
                fontSize: 20,
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>

          {/* Lista produse */}
          <div
            style={{
              background: "#161210",
              border: "1px solid #2a2218",
              borderRadius: 14,
              padding: 14,
              marginBottom: 14,
            }}
          >
            {cart.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 13,
                  marginBottom: 8,
                  alignItems: "center",
                }}
              >
                <span style={{ color: "rgba(240,235,227,.8)" }}>
                  {item.emoji} {item.name}
                  <span style={{ color: "#6b6050", marginLeft: 6 }}>
                    ×{item.qty}
                  </span>
                </span>
                <span
                  style={{ color: "#c8a97e", fontWeight: 700, flexShrink: 0 }}
                >
                  {item.price * item.qty} lei
                </span>
              </div>
            ))}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                borderTop: "1px solid #2a2218",
                marginTop: 8,
                paddingTop: 8,
                fontFamily: "'Fraunces',serif",
                fontSize: 16,
                fontWeight: 700,
              }}
            >
              <span>Total</span>
              <span style={{ color: "#c8a97e" }}>{cartTotal} lei</span>
            </div>
          </div>

          {/* Observații */}
          <div style={{ marginBottom: 14 }}>
            <label
              style={{
                fontSize: 11,
                letterSpacing: 1.5,
                textTransform: "uppercase",
                color: "#6b6050",
                marginBottom: 8,
                display: "block",
              }}
            >
              💬 Observații pentru ospătar (opțional)
            </label>
            <textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Ex: fără ceapă la carbonara, apă la temperatura camerei, alergie la nuci..."
              rows={3}
              style={{
                width: "100%",
                background: "#161210",
                border: `1px solid ${observations ? "#c0622f" : "#2a2218"}`,
                borderRadius: 12,
                padding: "12px 14px",
                color: "#f0ebe3",
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                fontSize: 13,
                outline: "none",
                resize: "none",
                lineHeight: 1.5,
                transition: "border-color .2s",
              }}
            />
            {observations && (
              <div style={{ fontSize: 11, color: "#c0622f", marginTop: 4 }}>
                ✍️ Observațiile vor fi trimise ospătarului
              </div>
            )}
          </div>

          {/* Buton trimitere */}
          <button
            onClick={handleOrder}
            disabled={loading}
            style={{
              width: "100%",
              padding: 15,
              background: loading
                ? "#4a3020"
                : "linear-gradient(135deg,#c0622f,#8b3a18)",
              border: "none",
              borderRadius: 14,
              color: loading ? "#6b6050" : "#fff",
              fontFamily: "'Fraunces',serif",
              fontSize: 16,
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              letterSpacing: 0.5,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Se trimite..." : "Trimite comanda la bucătărie 👨‍🍳"}
          </button>
        </div>
      )}

      {/* Bara compactă de jos */}
      <div
        style={{
          position: "fixed",
          bottom: 70,
          left: "50%",
          transform: "translateX(-50%)",
          width: "calc(100% - 32px)",
          maxWidth: 398,
          zIndex: 87,
          background: "rgba(30,26,20,.97)",
          border: "1px solid #2a2218",
          borderRadius: 18,
          padding: "12px 16px",
          backdropFilter: "blur(20px)",
          boxShadow: "0 -4px 20px rgba(0,0,0,.4)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: "#6b6050", marginBottom: 2 }}>
              🛒 {cartCount} produse • 🪑 Masa {orderTableNum}
            </div>
            <div
              style={{
                fontFamily: "'Fraunces',serif",
                fontSize: 20,
                fontWeight: 700,
                color: "#c8a97e",
              }}
            >
              {cartTotal} lei
            </div>
          </div>
          <button
            onClick={() => setShowSummary(true)}
            style={{
              padding: "12px 20px",
              background: "linear-gradient(135deg,#c0622f,#8b3a18)",
              border: "none",
              borderRadius: 12,
              color: "#fff",
              fontFamily: "'Fraunces',serif",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Vezi comanda →
          </button>
        </div>
      </div>
    </>
  );
}
