import { useState } from "react";
import { supabase } from "../../supabase";

export default function ProprietariTab({
  proprietari,
  restaurante,
  cereri,
  changePlan,
  toggleOwner,
  approveOwner,
  rejectOwner,
  showToast,
}) {
  return (
    <div>
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
          Proprietari ({proprietari.length})
        </div>
        <button
          onClick={() =>
            exportToCSV(
              proprietari.map((p) => ({
                Nume: p.full_name,
                Email: p.phone || "—",
                Status: p.status || "approved",
                "Data inregistrarii": new Date(p.created_at).toLocaleDateString(
                  "ro-RO",
                ),
              })),
              "proprietari",
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
      {proprietari.map((p) => (
        <div
          key={p.id}
          style={{
            background: "#161210",
            border: "1px solid #2a2218",
            borderRadius: 16,
            padding: 14,
            marginBottom: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                flexShrink: 0,
                background: "rgba(192,98,47,.15)",
                border: "1px solid rgba(192,98,47,.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "'Fraunces',serif",
                fontSize: 18,
                fontWeight: 700,
                color: "#c0622f",
              }}
            >
              {(p.full_name || "?").charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>
                {p.full_name}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "#6b6050",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {p.phone || "—"}
              </div>
              <div style={{ fontSize: 10, color: "#6b6050", marginTop: 2 }}>
                {new Date(p.created_at).toLocaleDateString("ro-RO", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: 6,
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 800,
                  padding: "3px 8px",
                  borderRadius: 20,
                  background: STATUS_BG[p.status || "approved"],
                  color: STATUS_COLOR[p.status || "approved"],
                }}
              >
                {(p.status || "APPROVED").toUpperCase()}
              </div>
              <button
                onClick={() => toggleOwner(p.id, p.status || "approved")}
                style={{
                  padding: "4px 10px",
                  borderRadius: 8,
                  background:
                    p.status === "approved" || !p.status
                      ? "rgba(192,57,43,.15)"
                      : "rgba(74,110,74,.15)",
                  border: `1px solid ${p.status === "approved" || !p.status ? "rgba(192,57,43,.3)" : "rgba(74,110,74,.3)"}`,
                  color:
                    p.status === "approved" || !p.status
                      ? "#e05050"
                      : "#6b9e6b",
                  fontSize: 10,
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                {p.status === "approved" || !p.status
                  ? "🔒 Suspendă"
                  : "✅ Activează"}
              </button>
            </div>
          </div>
          {/* Selector plan pe proprietar */}
          <div
            style={{
              marginTop: 10,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 11, color: "#6b6050", flexShrink: 0 }}>
              Plan:
            </span>
            <select
              value={p.plan || "free"}
              onChange={(e) => changePlan(p.id, e.target.value)}
              style={{
                flex: 1,
                padding: "6px 10px",
                borderRadius: 8,
                background: PLAN_BG[p.plan || "free"],
                border: `1px solid ${PLAN_COLOR[p.plan || "free"]}`,
                color: PLAN_COLOR[p.plan || "free"],
                fontSize: 11,
                fontWeight: 800,
                cursor: "pointer",
                outline: "none",
              }}
            >
              <option value="free">FREE</option>
              <option value="pro">PRO — 250 lei/lună</option>
              <option value="business">BUSINESS — 800 lei/lună</option>
            </select>
          </div>
        </div>
      ))}
    </div>
  );
}
