import { useState } from "react";
import { supabase } from "../../supabase";
import { LegalModal, LegalCheckbox } from "./LegalComponents";
import { PRIVACY_POLICY, TERMS_CONDITIONS } from "./legalTexts";

function OwnerRegisterModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    passwordConfirm: "",
    phone: "",
    restaurantName: "",
    city: "",
    cui: "",
  });
  const [restLocation, setRestLocation] = useState(null); // { lat, lon, name }
  const [showLocationMap, setShowLocationMap] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleRegister = async () => {
    if (!form.name || !form.email || !form.password) {
      setError("Completează câmpurile obligatorii.");
      return;
    }
    if (/\p{Emoji}/u.test(form.name)) {
      setError("Numele nu poate conține emoji.");
      return;
    }
    if (!form.restaurantName) {
      setError("Completează numele restaurantului.");
      return;
    }
    if (!form.city) {
      setError("Completează orașul.");
      return;
    }
    if (form.password.length < 6) {
      setError("Parola trebuie să aibă minim 6 caractere.");
      return;
    }
    if (form.password !== form.passwordConfirm) {
      setError("Parolele nu coincid.");
      return;
    }
    if (form.cui && !/^[0-9]{2,10}$/.test(form.cui.replace(/\s/g, ""))) {
      setError("CUI invalid — doar cifre, între 2 și 10 caractere.");
      return;
    }
    if (!agreeTerms || !agreePrivacy) {
      setError(
        "Trebuie să accepți Termenii și Condițiile și Politica de Confidențialitate.",
      );
      return;
    }
    setLoading(true);
    setError("");

    const { data, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.name, role: "owner" } },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      await supabase
        .from("profiles")
        .update({
          full_name: form.name,
          phone: form.phone || null,
          role: "owner",
          plan: "free",
          status: "pending",
          requested_at: new Date().toISOString(),
          rest_location: restLocation ? JSON.stringify(restLocation) : null,
          restaurant_name: form.restaurantName || null,
          city: form.city || null,
          cui: form.cui || null,
        })
        .eq("id", data.user.id);
    }

    setLoading(false);
    onSuccess();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        background: "rgba(0,0,0,.85)",
        backdropFilter: "blur(10px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-end",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#161210",
          borderRadius: "24px 24px 0 0",
          border: "1px solid #2a2218",
          width: "100%",
          maxWidth: 430,
          padding: "28px 24px 48px",
          maxHeight: "85vh",
          overflowY: "auto",
          animation: "slideUp .35s ease",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              margin: "0 auto 16px",
              background: "linear-gradient(135deg,#4a6e4a,#2d4a2d)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
            }}
          >
            🏪
          </div>
          <div
            style={{
              fontFamily: "'Fraunces',serif",
              fontSize: 22,
              fontWeight: 900,
              marginBottom: 4,
            }}
          >
            Înregistrare Proprietar
          </div>
          <div style={{ fontSize: 13, color: "#6b6050", lineHeight: 1.5 }}>
            Cererea ta va fi verificată și aprobată în 24-48 ore.
          </div>
        </div>
        {error && (
          <div
            style={{
              background: "rgba(192,57,43,.15)",
              border: "1px solid rgba(192,57,43,.3)",
              borderRadius: 12,
              padding: "11px 14px",
              marginBottom: 16,
              fontSize: 13,
              color: "#e05050",
            }}
          >
            ⚠️ {error}
          </div>
        )}
        {[
          {
            key: "name",
            label: "Numele tău *",
            type: "text",
            placeholder: "Ion Popescu",
          },
          {
            key: "email",
            label: "Email *",
            type: "email",
            placeholder: "email@restaurant.ro",
          },
          {
            key: "restaurantName",
            label: "Numele restaurantului *",
            type: "text",
            placeholder: "Ex. Bistro Central",
          },
          {
            key: "city",
            label: "Orașul *",
            type: "text",
            placeholder: "Ex. Iași",
          },
          {
            key: "phone",
            label: "Telefon",
            type: "tel",
            placeholder: "0721 234 567",
          },
          {
            key: "cui",
            label: "CUI firmă (opțional)",
            type: "text",
            placeholder: "Ex. 12345678",
          },
          {
            key: "password",
            label: "Parolă * (min. 6 caractere)",
            type: "password",
            placeholder: "••••••••",
          },
          {
            key: "passwordConfirm",
            label: "Confirmă parola *",
            type: "password",
            placeholder: "••••••••",
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
        <div
          style={{
            background: "rgba(200,169,126,.08)",
            border: "1px solid rgba(200,169,126,.2)",
            borderRadius: 12,
            padding: "12px 14px",
            marginBottom: 20,
            fontSize: 12,
            color: "#c8a97e",
            lineHeight: 1.6,
          }}
        >
          💡 Contul tău va fi în așteptare până când echipa WhataboutFood
          verifică și aprobă cererea. Vei fi contactat în 24-48 ore.
        </div>
        {/* Modele legale proprietar */}
        {showTermsModal && (
          <LegalModal
            title="Termeni și Condiții"
            text={TERMS_CONDITIONS}
            onClose={() => setShowTermsModal(false)}
          />
        )}
        {showPrivacyModal && (
          <LegalModal
            title="Politică de Confidențialitate"
            text={PRIVACY_POLICY}
            onClose={() => setShowPrivacyModal(false)}
          />
        )}
        {/* Checkboxuri legale */}
        <div style={{ marginBottom: 16 }}>
          <LegalCheckbox
            checked={agreeTerms}
            onChange={setAgreeTerms}
            label="Sunt de acord cu"
            linkText="Termenii și Condițiile"
            onLinkClick={() => setShowTermsModal(true)}
          />
          <LegalCheckbox
            checked={agreePrivacy}
            onChange={setAgreePrivacy}
            label="Sunt de acord cu"
            linkText="Politica de Confidențialitate"
            onLinkClick={() => setShowPrivacyModal(true)}
          />
        </div>
        <button
          onClick={handleRegister}
          disabled={loading || !agreeTerms || !agreePrivacy}
          style={{
            width: "100%",
            padding: 15,
            background:
              loading || !agreeTerms || !agreePrivacy
                ? "#2a2218"
                : "linear-gradient(135deg,#4a6e4a,#2d4a2d)",
            border: "none",
            borderRadius: 16,
            color: loading || !agreeTerms || !agreePrivacy ? "#6b6050" : "#fff",
            fontFamily: "'Fraunces',serif",
            fontSize: 17,
            fontWeight: 700,
            cursor:
              loading || !agreeTerms || !agreePrivacy
                ? "not-allowed"
                : "pointer",
            marginBottom: 12,
          }}
        >
          {loading ? "Se trimite cererea..." : "🏪 Trimite cererea"}
        </button>
        <button
          onClick={onClose}
          style={{
            width: "100%",
            padding: 11,
            borderRadius: 12,
            background: "none",
            border: "1px solid #2a2218",
            color: "#6b6050",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Anulează
        </button>
      </div>
    </div>
  );
}

export default OwnerRegisterModal;
