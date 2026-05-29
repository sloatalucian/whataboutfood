import { useState } from "react";
import { supabase } from "../../supabase";

export default function CereriTab({
  cereri,
  approveOwner,
  rejectOwner,
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
        Cereri în așteptare ({cereri.length})
      </div>
      {cereri.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "40px 0",
            color: "#6b6050",
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 10 }}>✅</div>
          <div>Nicio cerere în așteptare</div>
        </div>
      ) : (
        cereri.map((c) => (
          <div
            key={c.id}
            style={{
              background: "rgba(224,122,71,.08)",
              border: "1px solid rgba(224,122,71,.25)",
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
                    fontWeight: 700,
                    fontSize: 15,
                    marginBottom: 4,
                  }}
                >
                  {c.full_name}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#6b6050",
                    marginBottom: 2,
                  }}
                >
                  📧 {c.phone || "—"}
                </div>
                {c.phone && (
                  <div
                    style={{
                      fontSize: 12,
                      color: "#6b6050",
                      marginBottom: 2,
                    }}
                  >
                    📞 {c.phone}
                  </div>
                )}
                <div style={{ fontSize: 11, color: "#6b6050" }}>
                  📅{" "}
                  {new Date(c.created_at).toLocaleDateString("ro-RO", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </div>
                {c.rest_location &&
                  (() => {
                    try {
                      const loc =
                        typeof c.rest_location === "string"
                          ? JSON.parse(c.rest_location)
                          : c.rest_location;
                      return (
                        <div
                          style={{
                            fontSize: 11,
                            color: "#c0622f",
                            marginTop: 4,
                          }}
                        >
                          📍 {loc.name} — {loc.city}
                          <br />
                          <span style={{ color: "#6b6050" }}>
                            {loc.lat?.toFixed(5)}, {loc.lon?.toFixed(5)}
                            {loc.isManualPin ? " (pin manual)" : " (din hartă)"}
                          </span>
                        </div>
                      );
                    } catch {
                      return null;
                    }
                  })()}
              </div>
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 800,
                  padding: "3px 8px",
                  borderRadius: 20,
                  background: "rgba(224,122,71,.2)",
                  color: "#e07a47",
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
                onClick={() => rejectOwner(c.id, c.full_name)}
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
                onClick={() => approveOwner(c.id, c.phone || "—", c.full_name)}
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
