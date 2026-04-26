import { useState } from "react";
import { AppProvider, useApp } from "./context/AppContext";

const TIPURI = [
  "Ristorante Italian",
  "Restaurant Românesc",
  "Japonez / Sushi",
  "Fast Food",
  "Cafenea",
  "Pizzerie",
  "Grill / BBQ",
  "Vegetarian / Vegan",
  "Pub / Bar",
  "Internațional",
];
const ORASE = [
  "București",
  "Cluj-Napoca",
  "Timișoara",
  "Iași",
  "Constanța",
  "Brașov",
  "Galați",
  "Craiova",
  "Ploiești",
  "Oradea",
  "Sibiu",
  "Bacău",
  "Arad",
  "Pitești",
  "Alte orașe",
];
const EMOJIS_REST = [
  "🍝",
  "🍕",
  "🍣",
  "🥩",
  "🍔",
  "🥗",
  "🍜",
  "🥘",
  "🫕",
  "🍱",
  "🥐",
  "☕",
  "🍺",
  "🍷",
];

export default function NewRestaurant() {
  const { navigate, showToast, dispatch } = useApp();

  const [step, setStep] = useState(1); // 1 = date de bază, 2 = configurare
  const [form, setForm] = useState({
    name: "",
    type: "",
    emoji: "🍝",
    address: "",
    city: "",
    phone: "",
    email: "",
    website: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleNext = () => {
    if (!form.name) {
      showToast("⚠️ Completează numele restaurantului!");
      return;
    }
    if (!form.type) {
      showToast("⚠️ Selectează tipul bucătăriei!");
      return;
    }
    if (!form.address) {
      showToast("⚠️ Completează adresa!");
      return;
    }
    if (!form.city) {
      showToast("⚠️ Selectează orașul!");
      return;
    }
    setStep(2);
  };

  const handleCreate = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    // În producție: salvăm în Supabase
    showToast(`🎉 Restaurantul "${form.name}" a fost creat!`);
    setLoading(false);
    // Mergi la Editor Planșeu
    navigate("adminFloor");
  };

  return (
    <div className="page fade-in" style={{ paddingBottom: 100 }}>
      {/* Header */}
      <div
        style={{
          padding: "44px 20px 24px",
          background: "linear-gradient(135deg,#100a05,#0d0a07)",
          borderBottom: "1px solid #2a2218",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 14,
          }}
        >
          <button
            onClick={() => (step === 1 ? navigate("home") : setStep(1))}
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: "rgba(255,255,255,.05)",
              border: "1px solid #2a2218",
              color: "#f0ebe3",
              fontSize: 17,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ←
          </button>
          <div>
            <div
              style={{
                fontFamily: "'Fraunces',serif",
                fontSize: 22,
                fontWeight: 900,
              }}
            >
              🏪 Restaurant Nou
            </div>
            <div style={{ fontSize: 12, color: "#6b6050", marginTop: 2 }}>
              Pasul {step} din 2
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div
          style={{
            height: 4,
            background: "#2a2218",
            borderRadius: 20,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${step === 1 ? 50 : 100}%`,
              background: "linear-gradient(90deg,#c0622f,#e07a47)",
              borderRadius: 20,
              transition: "width .3s",
            }}
          />
        </div>
      </div>

      <div style={{ padding: 20 }}>
        {step === 1 ? (
          /* ── PASUL 1 — Date de bază ── */
          <>
            <div
              style={{
                fontSize: 11,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: "#6b6050",
                marginBottom: 16,
              }}
            >
              Informații restaurant
            </div>

            {/* Emoji selector */}
            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  fontSize: 11,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                  color: "#6b6050",
                  marginBottom: 10,
                  display: "block",
                }}
              >
                Emoji reprezentativ
              </label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {EMOJIS_REST.map((e) => (
                  <div
                    key={e}
                    onClick={() => set("emoji", e)}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 24,
                      cursor: "pointer",
                      background:
                        form.emoji === e ? "rgba(192,98,47,.3)" : "#1e1a14",
                      border: `2px solid ${form.emoji === e ? "#c0622f" : "#2a2218"}`,
                      transition: "all .15s",
                    }}
                  >
                    {e}
                  </div>
                ))}
              </div>
            </div>

            {/* Nume */}
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  fontSize: 11,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                  color: "#6b6050",
                  marginBottom: 7,
                  display: "block",
                }}
              >
                Numele restaurantului *
              </label>
              <input
                placeholder="Ex: Mama Mia, La Fontana, Sushi Zen..."
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                style={{
                  width: "100%",
                  background: "#1e1a14",
                  border: "1px solid #2a2218",
                  borderRadius: 14,
                  padding: "13px 16px",
                  color: "#f0ebe3",
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  fontSize: 14,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Tip bucătărie */}
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  fontSize: 11,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                  color: "#6b6050",
                  marginBottom: 10,
                  display: "block",
                }}
              >
                Tipul bucătăriei *
              </label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {TIPURI.map((t) => (
                  <div
                    key={t}
                    onClick={() => set("type", t)}
                    style={{
                      padding: "7px 14px",
                      borderRadius: 20,
                      cursor: "pointer",
                      background: form.type === t ? "#c0622f" : "#1e1a14",
                      border: `1px solid ${form.type === t ? "#c0622f" : "#2a2218"}`,
                      color: form.type === t ? "#fff" : "#6b6050",
                      fontSize: 12,
                      fontWeight: form.type === t ? 700 : 400,
                    }}
                  >
                    {t}
                  </div>
                ))}
              </div>
            </div>

            {/* Adresă */}
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  fontSize: 11,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                  color: "#6b6050",
                  marginBottom: 7,
                  display: "block",
                }}
              >
                Adresa *
              </label>
              <input
                placeholder="Ex: Str. Floreasca nr. 42"
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                style={{
                  width: "100%",
                  background: "#1e1a14",
                  border: "1px solid #2a2218",
                  borderRadius: 14,
                  padding: "13px 16px",
                  color: "#f0ebe3",
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  fontSize: 14,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Oraș */}
            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  fontSize: 11,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                  color: "#6b6050",
                  marginBottom: 10,
                  display: "block",
                }}
              >
                Orașul *
              </label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {ORASE.map((o) => (
                  <div
                    key={o}
                    onClick={() => set("city", o)}
                    style={{
                      padding: "7px 14px",
                      borderRadius: 20,
                      cursor: "pointer",
                      background: form.city === o ? "#c0622f" : "#1e1a14",
                      border: `1px solid ${form.city === o ? "#c0622f" : "#2a2218"}`,
                      color: form.city === o ? "#fff" : "#6b6050",
                      fontSize: 12,
                      fontWeight: form.city === o ? 700 : 400,
                    }}
                  >
                    {o}
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleNext}
              style={{
                width: "100%",
                padding: 15,
                background: "linear-gradient(135deg,#c0622f,#8b3a18)",
                border: "none",
                borderRadius: 16,
                color: "#fff",
                fontFamily: "'Fraunces',serif",
                fontSize: 17,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Continuă →
            </button>
          </>
        ) : (
          /* ── PASUL 2 — Date de contact ── */
          <>
            <div
              style={{
                marginBottom: 16,
                background: "rgba(192,98,47,.08)",
                border: "1px solid rgba(192,98,47,.2)",
                borderRadius: 16,
                padding: 16,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <span style={{ fontSize: 36 }}>{form.emoji}</span>
              <div>
                <div
                  style={{
                    fontFamily: "'Fraunces',serif",
                    fontSize: 18,
                    fontWeight: 700,
                  }}
                >
                  {form.name}
                </div>
                <div style={{ fontSize: 12, color: "#6b6050" }}>
                  {form.type} • {form.city}
                </div>
                <div style={{ fontSize: 11, color: "#6b6050", marginTop: 2 }}>
                  📍 {form.address}
                </div>
              </div>
            </div>

            <div
              style={{
                fontSize: 11,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: "#6b6050",
                marginBottom: 16,
              }}
            >
              Date de contact (opțional)
            </div>

            <div style={{ marginBottom: 14 }}>
              <label
                style={{
                  fontSize: 11,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                  color: "#6b6050",
                  marginBottom: 7,
                  display: "block",
                }}
              >
                Telefon
              </label>
              <input
                type="tel"
                placeholder="0721 234 567"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                style={{
                  width: "100%",
                  background: "#1e1a14",
                  border: "1px solid #2a2218",
                  borderRadius: 14,
                  padding: "13px 16px",
                  color: "#f0ebe3",
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  fontSize: 14,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label
                style={{
                  fontSize: 11,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                  color: "#6b6050",
                  marginBottom: 7,
                  display: "block",
                }}
              >
                Email restaurant
              </label>
              <input
                type="email"
                placeholder="contact@restaurant.ro"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                style={{
                  width: "100%",
                  background: "#1e1a14",
                  border: "1px solid #2a2218",
                  borderRadius: 14,
                  padding: "13px 16px",
                  color: "#f0ebe3",
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  fontSize: 14,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label
                style={{
                  fontSize: 11,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                  color: "#6b6050",
                  marginBottom: 7,
                  display: "block",
                }}
              >
                Website (opțional)
              </label>
              <input
                placeholder="www.restaurantul-meu.ro"
                value={form.website}
                onChange={(e) => set("website", e.target.value)}
                style={{
                  width: "100%",
                  background: "#1e1a14",
                  border: "1px solid #2a2218",
                  borderRadius: 14,
                  padding: "13px 16px",
                  color: "#f0ebe3",
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  fontSize: 14,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label
                style={{
                  fontSize: 11,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                  color: "#6b6050",
                  marginBottom: 7,
                  display: "block",
                }}
              >
                Descriere scurtă (opțional)
              </label>
              <textarea
                placeholder="Ex: Restaurant cu specific italian, în inima orașului..."
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={3}
                style={{
                  width: "100%",
                  background: "#1e1a14",
                  border: "1px solid #2a2218",
                  borderRadius: 14,
                  padding: "13px 16px",
                  color: "#f0ebe3",
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  fontSize: 13,
                  outline: "none",
                  resize: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <button
              onClick={handleCreate}
              disabled={loading}
              style={{
                width: "100%",
                padding: 15,
                background: loading
                  ? "#2a2218"
                  : "linear-gradient(135deg,#4a6e4a,#2d4a2d)",
                border: "none",
                borderRadius: 16,
                color: loading ? "#6b6050" : "#fff",
                fontFamily: "'Fraunces',serif",
                fontSize: 17,
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                marginBottom: 12,
              }}
            >
              {loading ? "Se creează..." : "🎉 Creează restaurantul"}
            </button>

            <div
              style={{
                fontSize: 11,
                color: "#6b6050",
                textAlign: "center",
                lineHeight: 1.6,
              }}
            >
              După creare vei fi dus la{" "}
              <b style={{ color: "#c8a97e" }}>Editor Planșeu</b> unde
              configurezi mesele restaurantului.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
