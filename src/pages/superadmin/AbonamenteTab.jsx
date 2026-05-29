import { useState } from "react";
import { supabase } from "../../supabase";

const PLAN_COLOR = { free: "#6b6050", pro: "#c8a97e", business: "#4a6e4a" };
const PLAN_BG = {
  free: "rgba(107,96,80,.2)",
  pro: "rgba(200,169,126,.2)",
  business: "rgba(74,110,74,.2)",
};
const PLAN_LABEL = { free: "FREE", pro: "PRO", business: "BUSINESS" };

// ─── FORMULAR ABONAMENT MANUAL ────────────────────────────────────────────────
function AddSubscriptionForm({ restaurante, onAdd }) {
  const [form, setForm] = useState({
    restaurantId: "",
    plan: "pro",
    amount: "250",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleAdd = () => {
    if (!form.restaurantId || !form.amount) return;
    const rest = restaurante.find((r) => r.id === form.restaurantId);
    if (!rest) return;
    onAdd(rest.owner_id, form.restaurantId, form.plan, parseFloat(form.amount));
    setForm({ restaurantId: "", plan: "pro", amount: "250" });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <select
        value={form.restaurantId}
        onChange={(e) => set("restaurantId", e.target.value)}
        style={{
          width: "100%",
          background: "#1e1a14",
          border: "1px solid #2a2218",
          borderRadius: 10,
          padding: "10px 14px",
          color: form.restaurantId ? "#f0ebe3" : "#6b6050",
          fontFamily: "'Plus Jakarta Sans',sans-serif",
          fontSize: 13,
          outline: "none",
          appearance: "none",
        }}
      >
        <option value="">Selectează restaurant...</option>
        {restaurante.map((r) => (
          <option key={r.id} value={r.id}>
            {r.emoji} {r.name}
          </option>
        ))}
      </select>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <select
          value={form.plan}
          onChange={(e) => {
            set("plan", e.target.value);
            set("amount", e.target.value === "pro" ? "250" : "800");
          }}
          style={{
            background: "#1e1a14",
            border: "1px solid #2a2218",
            borderRadius: 10,
            padding: "10px 14px",
            color: "#f0ebe3",
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 13,
            outline: "none",
            appearance: "none",
          }}
        >
          <option value="pro">Pro — 250 lei</option>
          <option value="business">Business — 800 lei</option>
        </select>
        <input
          type="number"
          placeholder="Suma (lei)"
          value={form.amount}
          onChange={(e) => set("amount", e.target.value)}
          style={{
            background: "#1e1a14",
            border: "1px solid #2a2218",
            borderRadius: 10,
            padding: "10px 14px",
            color: "#f0ebe3",
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 13,
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>
      <button
        onClick={handleAdd}
        disabled={!form.restaurantId || !form.amount}
        style={{
          width: "100%",
          padding: 11,
          borderRadius: 10,
          background:
            form.restaurantId && form.amount
              ? "linear-gradient(135deg,#c0622f,#8b3a18)"
              : "#2a2218",
          border: "none",
          color: form.restaurantId && form.amount ? "#fff" : "#6b6050",
          fontFamily: "'Fraunces',serif",
          fontSize: 14,
          fontWeight: 700,
          cursor: form.restaurantId && form.amount ? "pointer" : "not-allowed",
        }}
      >
        ✅ Înregistrează plată
      </button>
    </div>
  );
}

export default function AbonamenteTab({
  restaurante,
  addSubscription,
  abonamente,
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
        Abonamente ({abonamente.length})
      </div>

      {/* Formular plată manuală */}
      <div
        style={{
          background: "rgba(200,169,126,.08)",
          border: "1px solid rgba(200,169,126,.2)",
          borderRadius: 16,
          padding: 16,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            fontFamily: "'Fraunces',serif",
            fontSize: 15,
            fontWeight: 700,
            marginBottom: 12,
          }}
        >
          + Înregistrează plată manuală
        </div>
        <AddSubscriptionForm
          restaurante={restaurante}
          onAdd={addSubscription}
        />
      </div>

      {abonamente.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "40px 0",
            color: "#6b6050",
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 10 }}>💰</div>
          <div>Niciun abonament înregistrat</div>
        </div>
      ) : (
        abonamente.map((a) => (
          <div
            key={a.id}
            style={{
              background: "#161210",
              border: "1px solid #2a2218",
              borderRadius: 14,
              padding: 14,
              marginBottom: 8,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <div>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 14,
                    marginBottom: 2,
                  }}
                >
                  {a.restaurants?.name || "—"}
                </div>
                <div style={{ fontSize: 11, color: "#6b6050" }}>
                  👤 {a.profiles?.full_name || "—"}
                </div>
                <div style={{ fontSize: 11, color: "#6b6050", marginTop: 2 }}>
                  📅 {new Date(a.period_start).toLocaleDateString("ro-RO")} →{" "}
                  {new Date(a.period_end).toLocaleDateString("ro-RO")}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontFamily: "'Fraunces',serif",
                    fontSize: 16,
                    fontWeight: 700,
                    color: "#6b9e6b",
                  }}
                >
                  {a.amount} lei
                </div>
                <div
                  style={{
                    fontSize: 9,
                    fontWeight: 800,
                    padding: "2px 6px",
                    borderRadius: 10,
                    background: PLAN_BG[a.plan || "free"],
                    color: PLAN_COLOR[a.plan || "free"],
                    marginTop: 4,
                  }}
                >
                  {(a.plan || "free").toUpperCase()}
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
