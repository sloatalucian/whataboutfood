import { useState } from "react";
import { supabase } from "../../supabase";

export default function SterseTab({ sterseRestaurante, showToast }) {
  return (
    <div style={{ padding: "0 0 40px" }}>
      <div
        style={{
          fontSize: 11,
          letterSpacing: 2,
          textTransform: "uppercase",
          color: "#e05050",
          marginBottom: 14,
          padding: "0 4px",
        }}
      >
        🗑️ Restaurante șterse ({sterseRestaurante.length})
      </div>
      {sterseRestaurante.length === 0 ? (
        <div
          style={{
            color: "#6b6050",
            fontSize: 14,
            textAlign: "center",
            padding: 32,
          }}
        >
          Niciun restaurant șters.
        </div>
      ) : (
        sterseRestaurante.map((r) => {
          const deletedAt = r.deleted_at ? new Date(r.deleted_at) : null;
          const expireAt = deletedAt
            ? new Date(deletedAt.getTime() + 90 * 24 * 60 * 60 * 1000)
            : null;
          const daysLeft = expireAt
            ? Math.ceil((expireAt - new Date()) / (1000 * 60 * 60 * 24))
            : null;
          return (
            <div
              key={r.id}
              style={{
                background: "rgba(192,57,43,.06)",
                border: "1px solid rgba(192,57,43,.25)",
                borderRadius: 16,
                padding: 16,
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 12,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 15,
                      marginBottom: 4,
                    }}
                  >
                    {r.emoji || "🍽️"} {r.name}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#6b6050",
                      marginBottom: 2,
                    }}
                  >
                    📍 {r.city || "—"} • 👤 {r.profiles?.full_name || "—"}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "#6b6050",
                      marginBottom: 6,
                    }}
                  >
                    Șters la:{" "}
                    {deletedAt ? deletedAt.toLocaleDateString("ro-RO") : "—"}
                  </div>
                  {daysLeft !== null && (
                    <div
                      style={{
                        display: "inline-block",
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "3px 10px",
                        borderRadius: 20,
                        background:
                          daysLeft <= 10
                            ? "rgba(192,57,43,.2)"
                            : "rgba(107,96,80,.2)",
                        color: daysLeft <= 10 ? "#e05050" : "#6b6050",
                      }}
                    >
                      {daysLeft > 0
                        ? `⏳ Expiră în ${daysLeft} zile`
                        : "⚠️ Expirat"}
                    </div>
                  )}
                </div>
                <button
                  onClick={async () => {
                    if (
                      !window.confirm(
                        `Ștergi definitiv "${r.name}"? Această acțiune NU poate fi anulată.`,
                      )
                    )
                      return;
                    const { error } = await supabase
                      .from("restaurants")
                      .delete()
                      .eq("id", r.id);
                    if (!error) {
                      setSterseRestaurante((prev) =>
                        prev.filter((x) => x.id !== r.id),
                      );
                      showToast("🗑️ Restaurantul a fost șters definitiv.");
                    } else {
                      showToast("❌ Eroare la ștergere.");
                    }
                  }}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 10,
                    background: "rgba(192,57,43,.2)",
                    border: "1px solid rgba(192,57,43,.4)",
                    color: "#e05050",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  🗑️ Șterge definitiv
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
