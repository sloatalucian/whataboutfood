import { useState } from "react";
import { supabase } from "../../supabase";

export default function StatisticiTab({ statistici }) {
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
        Statistici platformă
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
          marginBottom: 20,
        }}
      >
        {[
          {
            icon: "👥",
            label: "Proprietari aprobați",
            value: statistici.totalProp,
            color: "#c0622f",
          },
          {
            icon: "🏪",
            label: "Restaurante active",
            value: statistici.totalRest,
            color: "#c8a97e",
          },
          {
            icon: "🍽️",
            label: "Total comenzi",
            value: statistici.totalOrders,
            color: "#4a6e4a",
          },
          {
            icon: "💰",
            label: "Venituri abonamente",
            value: `${statistici.totalVenituri} lei`,
            color: "#5b8dd9",
          },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: "#161210",
              border: "1px solid #2a2218",
              borderRadius: 16,
              padding: 16,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 6 }}>{s.icon}</div>
            <div
              style={{
                fontFamily: "'Fraunces',serif",
                fontSize: 22,
                fontWeight: 900,
                color: s.color,
                marginBottom: 4,
              }}
            >
              {s.value}
            </div>
            <div style={{ fontSize: 10, color: "#6b6050" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Distribuție planuri */}
      <div
        style={{
          background: "#161210",
          border: "1px solid #2a2218",
          borderRadius: 16,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontFamily: "'Fraunces',serif",
            fontSize: 16,
            fontWeight: 700,
            marginBottom: 14,
          }}
        >
          Distribuție planuri
        </div>
        {[
          {
            plan: "Free",
            count: statistici.planCounts?.free || 0,
            color: "#6b6050",
          },
          {
            plan: "Pro",
            count: statistici.planCounts?.pro || 0,
            color: "#c8a97e",
          },
          {
            plan: "Business",
            count: statistici.planCounts?.business || 0,
            color: "#4a6e4a",
          },
        ].map((p) => {
          const total = Math.max(statistici.totalRest || 1, 1);
          const pct = Math.round((p.count / total) * 100);
          return (
            <div key={p.plan} style={{ marginBottom: 12 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                  marginBottom: 5,
                }}
              >
                <span style={{ color: p.color, fontWeight: 700 }}>
                  {p.plan}
                </span>
                <span style={{ color: "#6b6050" }}>
                  {p.count} restaurante ({pct}%)
                </span>
              </div>
              <div
                style={{
                  height: 8,
                  background: "#2a2218",
                  borderRadius: 20,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${pct}%`,
                    background: p.color,
                    borderRadius: 20,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Export rapoarte */}
      <div
        style={{
          background: "#161210",
          border: "1px solid #2a2218",
          borderRadius: 16,
          padding: 16,
        }}
      >
        <div
          style={{
            fontFamily: "'Fraunces',serif",
            fontSize: 16,
            fontWeight: 700,
            marginBottom: 14,
          }}
        >
          📥 Export Rapoarte Excel/CSV
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            {
              label: "Export Proprietari",
              fn: () =>
                exportToCSV(
                  proprietari.map((p) => ({
                    Nume: p.full_name,
                    Email: p.phone || "—",
                    Status: p.status || "approved",
                    "Data inregistrarii": new Date(
                      p.created_at,
                    ).toLocaleDateString("ro-RO"),
                  })),
                  "proprietari",
                ),
            },
            {
              label: "Export Restaurante",
              fn: () =>
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
                ),
            },
            {
              label: "Export Abonamente",
              fn: () =>
                exportToCSV(
                  abonamente.map((a) => ({
                    Proprietar: a.profiles?.full_name || "",
                    Restaurant: a.restaurants?.name || "",
                    Plan: a.plan,
                    "Suma (lei)": a.amount,
                    Status: a.status,
                    "Data platii": new Date(a.created_at).toLocaleDateString(
                      "ro-RO",
                    ),
                    Perioada:
                      new Date(a.period_start).toLocaleDateString("ro-RO") +
                      " - " +
                      new Date(a.period_end).toLocaleDateString("ro-RO"),
                  })),
                  "abonamente",
                ),
            },
          ].map((btn) => (
            <button
              key={btn.label}
              onClick={btn.fn}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 12,
                background: "rgba(74,110,74,.15)",
                border: "1px solid rgba(74,110,74,.3)",
                color: "#6b9e6b",
                fontSize: 13,
                cursor: "pointer",
                fontWeight: 600,
                textAlign: "left",
              }}
            >
              📥 {btn.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
