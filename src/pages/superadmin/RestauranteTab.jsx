import { useState } from "react";
import { supabase } from "../../supabase";

const PLAN_COLOR = { free: "#6b6050", pro: "#c8a97e", business: "#4a6e4a" };
const PLAN_BG = {
  free: "rgba(107,96,80,.2)",
  pro: "rgba(200,169,126,.2)",
  business: "rgba(74,110,74,.2)",
};

export default function RestauranteTab({
  restaurante,
  approveRestaurant,
  toggleRestaurant,
  loadViewStats,
  viewStats,
  viewStatsLoading,
  showToast,
}) {
  return (
    <div>
      {/* Subsectiune: in asteptare */}
      {restaurante.filter((r) => !r.is_active).length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "#e07a47",
              marginBottom: 12,
            }}
          >
            ⏳ În așteptare aprobare (
            {restaurante.filter((r) => !r.is_active).length})
          </div>
          {restaurante
            .filter((r) => !r.is_active)
            .map((r) => (
              <div
                key={r.id}
                style={{
                  background: "rgba(224,122,71,.06)",
                  border: "1px solid rgba(224,122,71,.3)",
                  borderRadius: 16,
                  padding: 14,
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 10,
                  }}
                >
                  <div style={{ fontSize: 28, flexShrink: 0 }}>
                    {r.emoji || "🍽️"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 14,
                        marginBottom: 2,
                      }}
                    >
                      {r.name}
                    </div>
                    <div style={{ fontSize: 11, color: "#6b6050" }}>
                      📍 {r.city} • 👤 {r.profiles?.full_name || "—"}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: "#6b6050",
                        marginTop: 2,
                      }}
                    >
                      {new Date(r.created_at).toLocaleDateString("ro-RO", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
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
                    onClick={() => toggleRestaurant(r.id, false)}
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
                    onClick={() => approveRestaurant(r.id, r.name)}
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
            ))}
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <div
          style={{
            fontSize: 11,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: "#6b6050",
          }}
        >
          Restaurante ({restaurante.length})
        </div>
        <button
          onClick={() =>
            exportToCSV(
              restaurante.map((r) => ({
                Nume: r.name,
                Oras: r.city,
                Tip: r.type,
                Plan: r.plan,
                Status: r.is_active ? "Activ" : "Inactiv",
                Proprietar: r.profiles?.full_name || "",
                "Data crearii": new Date(r.created_at).toLocaleDateString(
                  "ro-RO",
                ),
              })),
              "restaurante",
            )
          }
          style={{
            padding: "6px 12px",
            borderRadius: 10,
            background: "rgba(74,110,74,.2)",
            border: "1px solid rgba(74,110,74,.4)",
            color: "#6b9e6b",
            fontSize: 12,
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          📥 Export
        </button>
      </div>
      {restaurante.map((r) => (
        <div
          key={r.id}
          style={{
            background: "#161210",
            border: "1px solid #2a2218",
            borderRadius: 16,
            padding: 14,
            marginBottom: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 8,
            }}
          >
            <div style={{ fontSize: 28, flexShrink: 0 }}>{r.emoji || "🍽️"}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>
                {r.name}
              </div>
              <div style={{ fontSize: 11, color: "#6b6050" }}>
                📍 {r.city} • 👤 {r.profiles?.full_name || "—"}
              </div>
              <div style={{ fontSize: 10, color: "#6b6050", marginTop: 2 }}>
                {new Date(r.created_at).toLocaleDateString("ro-RO", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div
              style={{
                flex: 1,
                background: PLAN_BG[r.plan || "free"],
                border: `1px solid ${PLAN_COLOR[r.plan || "free"]}`,
                borderRadius: 8,
                color: PLAN_COLOR[r.plan || "free"],
                fontSize: 11,
                fontWeight: 800,
                padding: "7px 10px",
                textAlign: "center",
              }}
            >
              {(r.plan || "free").toUpperCase()}
              <span style={{ fontSize: 9, opacity: 0.7, marginLeft: 4 }}>
                (plan proprietar)
              </span>
            </div>
            <button
              onClick={() => loadViewStats(r)}
              style={{
                padding: "7px 12px",
                borderRadius: 8,
                background: "rgba(91,141,217,.15)",
                border: "1px solid rgba(91,141,217,.3)",
                color: "#5b8dd9",
                fontSize: 11,
                cursor: "pointer",
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              👁️ Vezi
            </button>
            <button
              onClick={() => toggleRestaurant(r.id, r.is_active)}
              style={{
                padding: "7px 12px",
                borderRadius: 8,
                background: r.is_active
                  ? "rgba(192,57,43,.15)"
                  : "rgba(74,110,74,.15)",
                border: `1px solid ${r.is_active ? "rgba(192,57,43,.3)" : "rgba(74,110,74,.3)"}`,
                color: r.is_active ? "#e05050" : "#6b9e6b",
                fontSize: 11,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              {r.is_active ? "🔒" : "✅"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
