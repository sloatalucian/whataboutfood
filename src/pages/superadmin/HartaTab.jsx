import { useState } from "react";
import { supabase } from "../../supabase";

export default function HartaTab({
  locationRequests,
  approvePin,
  rejectPin,
  showToast,
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          letterSpacing: 2,
          textTransform: "uppercase",
          color: "#6b6050",
          marginBottom: 14,
        }}
      >
        Cereri adăugare pe hartă ({mapPinRequests.length})
      </div>
      {mapPinRequests.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "40px 0",
            color: "#6b6050",
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 10 }}>📍</div>
          <div>Nicio cerere de adăugare pe hartă</div>
        </div>
      ) : (
        mapPinRequests.map((pin) => (
          <div
            key={pin.id}
            style={{
              background: "rgba(74,110,74,.06)",
              border: "1px solid rgba(74,110,74,.25)",
              borderRadius: 16,
              padding: 16,
              marginBottom: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: "'Fraunces',serif",
                    fontWeight: 700,
                    fontSize: 16,
                    color: "#f0ebe3",
                    marginBottom: 4,
                  }}
                >
                  📍 {pin.restaurant_name}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#6b6050",
                    marginBottom: 2,
                  }}
                >
                  👤 {pin.owner_name || "Proprietar"}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "#6b6050",
                    marginBottom: 2,
                  }}
                >
                  🏙️ {pin.city || "—"} · {pin.lat?.toFixed(4)},{" "}
                  {pin.lon?.toFixed(4)}
                </div>
                <div style={{ fontSize: 11, color: "#c8a97e", marginTop: 2 }}>
                  {pin.type === "update"
                    ? "🔄 Modificare locație"
                    : "🆕 Locație nouă"}
                  {pin.restaurants?.is_active && " · Restaurant activ"}
                </div>
                <div style={{ fontSize: 11, color: "#6b6050" }}>
                  📅{" "}
                  {new Date(pin.created_at).toLocaleDateString("ro-RO", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </div>
              </div>
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 800,
                  padding: "3px 8px",
                  borderRadius: 20,
                  background: "rgba(224,122,71,.2)",
                  color: "#e07a47",
                  flexShrink: 0,
                }}
              >
                ⏳ PENDING
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
                onClick={() => rejectPin(pin)}
                style={{
                  padding: 10,
                  borderRadius: 10,
                  background: "rgba(192,57,43,.15)",
                  border: "1px solid rgba(192,57,43,.3)",
                  color: "#e05050",
                  fontSize: 13,
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                ❌ Respinge
              </button>
              <button
                onClick={() => approvePin(pin)}
                style={{
                  padding: 10,
                  borderRadius: 10,
                  background: "rgba(74,110,74,.2)",
                  border: "1px solid rgba(74,110,74,.4)",
                  color: "#6b9e6b",
                  fontSize: 13,
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                ✅ Aprobă
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
