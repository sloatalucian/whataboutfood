import { useState } from "react";
import { useApp } from "../context/AppContext";
import { supabase } from "../supabase";

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
  "Alba Iulia",
  "Alexandria",
  "Arad",
  "Bacău",
  "Baia Mare",
  "Bistrița",
  "Botoșani",
  "Brăila",
  "Brașov",
  "București",
  "Buzău",
  "Călărași",
  "Cluj-Napoca",
  "Constanța",
  "Craiova",
  "Deva",
  "Drobeta-Turnu Severin",
  "Drobeta",
  "Focșani",
  "Galați",
  "Giurgiu",
  "Iași",
  "Miercurea Ciuc",
  "Oradea",
  "Piatra Neamț",
  "Pitești",
  "Ploiești",
  "Râmnicu Vâlcea",
  "Reșița",
  "Satu Mare",
  "Sfântu Gheorghe",
  "Sibiu",
  "Slatina",
  "Slobozia",
  "Suceava",
  "Târgoviște",
  "Târgu Jiu",
  "Târgu Mureș",
  "Timișoara",
  "Tulcea",
  "Vaslui",
  "Zalău",
  "Alexandria",
  "Alte orașe",
].sort();

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
  const { navigate, showToast, state } = useApp();
  const { user } = state;

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
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
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const userId = user?.id || session?.user?.id;

      if (!userId) {
        showToast("❌ Trebuie să fii logat!");
        setLoading(false);
        return;
      }

      const { error } = await supabase.from("restaurants").insert({
        owner_id: userId,
        name: form.name,
        type: form.type,
        emoji: form.emoji,
        address: form.address,
        city: form.city,
        phone: form.phone || null,
        email: form.email || null,
        website: form.website || null,
        description: form.description || null,
        plan: user?.plan || "free",
        is_active: true,
      });

      if (error) throw error;
      showToast(`🎉 Restaurantul „${form.name}" a fost creat!`);
      navigate("adminFloor");
    } catch (err) {
      console.log("Create restaurant error:", err);
      showToast("❌ Eroare la creare. Încearcă din nou.");
    }
    setLoading(false);
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
              width: step === 1 ? "50%" : "100%",
              background: "linear-gradient(90deg,#c0622f,#e07a47)",
              borderRadius: 20,
              transition: "width .3s",
            }}
          />
        </div>
      </div>

      <div style={{ padding: 20 }}>
        {step === 1 ? (
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
              Informații de bază
            </div>

            {/* Emoji */}
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
                placeholder="Ex: Mama Mia, La Fontana..."
                value={form.name}
                maxLength={80}
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
                maxLength={120}
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

            {/* Oraș — dropdown cu 8 opțiuni vizibile */}
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
                Orașul *
              </label>
              <div style={{ position: "relative" }}>
                <select
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                  size={8}
                  style={{
                    width: "100%",
                    background: "#1e1a14",
                    border: `1px solid ${form.city ? "#c0622f" : "#2a2218"}`,
                    borderRadius: 14,
                    color: "#f0ebe3",
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                    fontSize: 14,
                    outline: "none",
                    cursor: "pointer",
                    padding: "4px 0",
                  }}
                >
                  <option
                    value=""
                    disabled
                    style={{ color: "#6b6050", padding: "10px 16px" }}
                  >
                    Selectează orașul...
                  </option>
                  {ORASE.map((oras) => (
                    <option
                      key={oras}
                      value={oras}
                      style={{
                        padding: "10px 16px",
                        background: form.city === oras ? "#c0622f" : "#1e1a14",
                        color: form.city === oras ? "#fff" : "#f0ebe3",
                      }}
                    >
                      {oras}
                    </option>
                  ))}
                </select>
              </div>
              {form.city && (
                <div
                  style={{
                    marginTop: 8,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span style={{ fontSize: 13, color: "#e07a47" }}>
                    📍 {form.city} selectat
                  </span>
                  <button
                    onClick={() => set("city", "")}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#6b6050",
                      fontSize: 11,
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    ✕
                  </button>
                </div>
              )}
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
          <>
            {/* Preview */}
            <div
              style={{
                marginBottom: 20,
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

            {[
              {
                key: "phone",
                label: "Telefon",
                type: "tel",
                placeholder: "0721 234 567",
              },
              {
                key: "email",
                label: "Email restaurant",
                type: "email",
                placeholder: "contact@restaurant.ro",
              },
              {
                key: "website",
                label: "Website",
                type: "text",
                placeholder: "www.restaurantul-meu.ro",
              },
            ].map((f) => (
              <div key={f.key} style={{ marginBottom: 14 }}>
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
                  {f.label}
                </label>
                <input
                  type={f.type}
                  placeholder={f.placeholder}
                  value={form[f.key]}
                  onChange={(e) => set(f.key, e.target.value)}
                  maxLength={100}
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
            ))}

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
                Descriere scurtă
              </label>
              <textarea
                placeholder="Ex: Restaurant cu specific italian, în inima orașului..."
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                maxLength={500}
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
              style={{ fontSize: 11, color: "#6b6050", textAlign: "center" }}
            >
              Vei fi dus la <b style={{ color: "#c8a97e" }}>Editor Planșeu</b>{" "}
              după creare.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
