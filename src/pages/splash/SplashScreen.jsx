import { useState } from "react";
import { supabase } from "../../supabase";
import { useApp } from "../../context/AppContext";
import FoodAnimation from "./FoodAnimation";
import WaiterLoginModal from "./WaiterLoginModal";
import OwnerRegisterModal from "./OwnerRegisterModal";
import { LegalModal, LegalCheckbox } from "./LegalComponents";
import { PRIVACY_POLICY, TERMS_CONDITIONS } from "./legalTexts";

export default function SplashScreen({ onComplete, onWaiterLogin }) {
  const { dispatch, showToast } = useApp();
  const [showSplash, setShowSplash] = useState(true);
  const [showWaiterLogin, setShowWaiterLogin] = useState(false);
  const [showOwnerRegister, setShowOwnerRegister] = useState(false);
  const [showOwnerPending, setShowOwnerPending] = useState(false);
  const [loginMode, setLoginMode] = useState("login");
  const [form, setForm] = useState({
    email: localStorage.getItem("waf_email") || "",
    password: "",
    name: "",
  });
  const [rememberMe, setRememberMe] = useState(
    localStorage.getItem("waf_remember") === "true",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [agreeTermsC, setAgreeTermsC] = useState(false);
  const [agreePrivacyC, setAgreePrivacyC] = useState(false);
  const [showTermsModalC, setShowTermsModalC] = useState(false);
  const [showPrivacyModalC, setShowPrivacyModalC] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleLogin = async () => {
    const emailTrimmed = form.email.trim().toLowerCase();
    const passwordTrimmed = form.password.trim();
    if (!emailTrimmed || !passwordTrimmed) {
      setError("Completează email și parola.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrimmed)) {
      setError("Adresa de email nu este validă.");
      return;
    }
    setLoading(true);
    setError("");
    // Salvam sau stergem credentialele din localStorage
    if (rememberMe) {
      localStorage.setItem("waf_email", emailTrimmed);
      // parola nu se stocheaza niciodata
      localStorage.setItem("waf_remember", "true");
    } else {
      localStorage.removeItem("waf_email");
      localStorage.removeItem("waf_pass");
      localStorage.setItem("waf_remember", "false");
    }
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: emailTrimmed,
      password: passwordTrimmed,
    });
    if (authError) {
      setError("Email sau parolă incorectă.");
      setLoading(false);
      return;
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", data.user.id)
      .single();
    if (
      profile?.role === "owner" &&
      profile?.status === "pending" &&
      profile?.role !== "superadmin"
    ) {
      await supabase.auth.signOut();
      setError(
        "Contul tău este în așteptarea aprobării. Vei fi contactat în 24-48 ore.",
      );
      setLoading(false);
      return;
    }
    if (profile?.role === "owner" && profile?.status === "rejected") {
      await supabase.auth.signOut();
      setError("Cererea ta a fost respinsă. Contactează-ne pentru detalii.");
      setLoading(false);
      return;
    }
    if (profile?.role === "waiter") {
      await supabase.auth.signOut();
      setError(
        "Contul tău este de ospătar. Folosește secțiunea de login pentru ospătari.",
      );
      setLoading(false);
      return;
    }
    dispatch({
      type: "SET_USER",
      payload: {
        id: data.user.id,
        name: profile?.full_name || data.user.email.split("@")[0],
        email: data.user.email,
        plan: profile?.plan || "free",
        restName: profile?.restaurant_name || "Restaurantul meu",
        role: profile?.role || "client",
        rating: profile?.rating ?? null,
      },
    });
    showToast("👋 Bine ai venit!");
    onComplete(profile?.role || "client");
    setLoading(false);
  };

  const handleRegisterClient = async () => {
    const nameTrimmed = form.name.trim();
    const emailTrimmed = form.email.trim().toLowerCase();
    const passwordTrimmed = form.password.trim();
    if (!nameTrimmed || !emailTrimmed || !passwordTrimmed) {
      setError("Completează toate câmpurile.");
      return;
    }
    if (nameTrimmed.length < 2) {
      setError("Numele trebuie să aibă minim 2 caractere.");
      return;
    }
    if (/\p{Emoji}/u.test(nameTrimmed)) {
      setError("Numele nu poate conține emoji.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrimmed)) {
      setError("Adresa de email nu este validă.");
      return;
    }
    if (passwordTrimmed.length < 6) {
      setError("Parola trebuie să aibă minim 6 caractere.");
      return;
    }
    if (!agreeTermsC || !agreePrivacyC) {
      setError(
        "Trebuie să accepți Termenii și Condițiile și Politica de Confidențialitate.",
      );
      return;
    }
    setLoading(true);
    setError("");
    const { data, error: authError } = await supabase.auth.signUp({
      email: emailTrimmed,
      password: passwordTrimmed,
      options: { data: { full_name: nameTrimmed } },
    });
    if (authError) {
      // Traducere mesaje Supabase in romana
      const msg = authError.message.toLowerCase();
      if (
        msg.includes("already registered") ||
        msg.includes("already exists")
      ) {
        setError("Există deja un cont cu această adresă de email.");
      } else if (msg.includes("invalid email")) {
        setError("Adresa de email nu este validă.");
      } else if (msg.includes("password")) {
        setError("Parola nu este validă. Trebuie să aibă minim 6 caractere.");
      } else {
        setError("A apărut o eroare. Încearcă din nou.");
      }
      setLoading(false);
      return;
    }
    if (data.user) {
      await supabase.from("profiles").upsert({
        id: data.user.id,
        full_name: form.name,
        role: "client",
        plan: "free",
        status: "approved",
      });
    }
    dispatch({
      type: "SET_USER",
      payload: {
        id: data.user?.id,
        name: nameTrimmed,
        email: emailTrimmed,
        plan: "free",
        role: "client",
        rating: null,
      },
    });
    showToast(`🎉 Bun venit, ${form.name}!`);
    onComplete("client");
    setLoading(false);
  };

  if (showSplash)
    return <FoodAnimation onComplete={() => setShowSplash(false)} />;

  return (
    <>
      {showWaiterLogin && (
        <WaiterLoginModal
          onLogin={(w) => {
            setShowWaiterLogin(false);
            onWaiterLogin(w);
          }}
          onClose={() => setShowWaiterLogin(false)}
        />
      )}
      {showOwnerRegister && (
        <OwnerRegisterModal
          onClose={() => setShowOwnerRegister(false)}
          onSuccess={() => {
            setShowOwnerRegister(false);
            setShowOwnerPending(true);
          }}
        />
      )}

      {showOwnerPending && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 500,
            background: "rgba(0,0,0,.85)",
            backdropFilter: "blur(10px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            style={{
              background: "#161210",
              border: "1px solid rgba(74,110,74,.3)",
              borderRadius: 24,
              padding: 32,
              maxWidth: 380,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
            <div
              style={{
                fontFamily: "'Fraunces',serif",
                fontSize: 22,
                fontWeight: 900,
                marginBottom: 10,
              }}
            >
              Cerere trimisă!
            </div>
            <div
              style={{
                fontSize: 14,
                color: "#6b6050",
                lineHeight: 1.7,
                marginBottom: 24,
              }}
            >
              Cererea ta a fost primită.
              <br />
              Echipa <b style={{ color: "#f0ebe3" }}>WhataboutFood</b> te va
              contacta în <b style={{ color: "#c8a97e" }}>24-48 ore</b>.
            </div>
            <button
              onClick={() => setShowOwnerPending(false)}
              style={{
                width: "100%",
                padding: 13,
                borderRadius: 14,
                background: "linear-gradient(135deg,#4a6e4a,#2d4a2d)",
                border: "none",
                color: "#fff",
                fontFamily: "'Fraunces',serif",
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Am înțeles
            </button>
          </div>
        </div>
      )}

      <div
        style={{
          minHeight: "100vh",
          background: "#0d0a07",
          fontFamily: "'Plus Jakarta Sans',sans-serif",
          color: "#f0ebe3",
          display: "flex",
          flexDirection: "column",
          animation: "fadeInUp .5s ease",
        }}
      >
        <div
          style={{
            padding: "60px 28px 36px",
            textAlign: "center",
            background: "linear-gradient(160deg,#1a0e05 0%,#0d0a07 70%)",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              background:
                "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(192,98,47,.1), transparent 70%)",
            }}
          />
          <div
            style={{
              width: 72,
              height: 72,
              background: "linear-gradient(135deg,#c0622f,#8b3a18)",
              borderRadius: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
              margin: "0 auto 20px",
              boxShadow: "0 8px 32px rgba(192,98,47,.3)",
            }}
          >
            🍽️
          </div>
          <div
            style={{
              fontFamily: "'Fraunces',serif",
              fontSize: 32,
              fontWeight: 900,
              marginBottom: 6,
            }}
          >
            Whatabout<span style={{ color: "#c0622f" }}>Food</span>
          </div>
          <div
            style={{
              fontSize: 13,
              color: "#6b6050",
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            Platforma pentru restaurante moderne
          </div>
        </div>

        <div style={{ padding: "24px 24px 0", flex: 1 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginBottom: 24,
            }}
          >
            {[
              { id: "login", label: "Intră în cont" },
              { id: "register", label: "Cont nou" },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  setLoginMode(m.id);
                  setError("");
                }}
                style={{
                  padding: 12,
                  borderRadius: 14,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  background: loginMode === m.id ? "#c0622f" : "#1e1a14",
                  border: `1px solid ${loginMode === m.id ? "#c0622f" : "#2a2218"}`,
                  color: loginMode === m.id ? "#fff" : "#6b6050",
                }}
              >
                {m.label}
              </button>
            ))}
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

          {loginMode === "login" ? (
            <>
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
                  Email
                </label>
                <input
                  type="email"
                  placeholder="email@gmail.com"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  maxLength={100}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
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
              <div style={{ marginBottom: 20 }}>
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
                  Parolă
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
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
              {/* Checkbox Tine-ma minte */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 16,
                  cursor: "pointer",
                }}
                onClick={() => setRememberMe((prev) => !prev)}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 5,
                    border: `2px solid ${rememberMe ? "#c0622f" : "#3a2e22"}`,
                    background: rememberMe ? "#c0622f" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    transition: "all .2s",
                  }}
                >
                  {rememberMe && (
                    <span
                      style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}
                    >
                      ✓
                    </span>
                  )}
                </div>
                <span style={{ fontSize: 13, color: "#a09070" }}>
                  Ține-mă minte
                </span>
              </div>
              <button
                onClick={handleLogin}
                disabled={loading}
                style={{
                  width: "100%",
                  padding: 15,
                  background: loading
                    ? "#2a2218"
                    : "linear-gradient(135deg,#c0622f,#8b3a18)",
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
                {loading ? "Se verifică..." : "Intră în cont"}
              </button>
            </>
          ) : (
            <>
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
                  Numele tău
                </label>
                <input
                  placeholder="Ion Popescu"
                  value={form.name}
                  maxLength={60}
                  maxLength={60}
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
                  Email
                </label>
                <input
                  type="email"
                  placeholder="email@gmail.com"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
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
              <div style={{ marginBottom: 8 }}>
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
                  Parolă
                </label>
                <input
                  type="password"
                  placeholder="Min. 6 caractere"
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
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
              <div
                style={{
                  fontSize: 11,
                  color: "#6b6050",
                  marginBottom: 16,
                  padding: "10px 14px",
                  background: "rgba(255,255,255,.03)",
                  borderRadius: 10,
                }}
              >
                🔒 Datele tale sunt stocate securizat.
              </div>
              {/* Modale legale client */}
              {showTermsModalC && (
                <LegalModal
                  title="Termeni și Condiții"
                  text={TERMS_CONDITIONS}
                  onClose={() => setShowTermsModalC(false)}
                />
              )}
              {showPrivacyModalC && (
                <LegalModal
                  title="Politică de Confidențialitate"
                  text={PRIVACY_POLICY}
                  onClose={() => setShowPrivacyModalC(false)}
                />
              )}
              {/* Checkboxuri legale client */}
              <div style={{ marginBottom: 16 }}>
                <LegalCheckbox
                  checked={agreeTermsC}
                  onChange={setAgreeTermsC}
                  label="Sunt de acord cu"
                  linkText="Termenii și Condițiile"
                  onLinkClick={() => setShowTermsModalC(true)}
                />
                <LegalCheckbox
                  checked={agreePrivacyC}
                  onChange={setAgreePrivacyC}
                  label="Sunt de acord cu"
                  linkText="Politica de Confidențialitate"
                  onLinkClick={() => setShowPrivacyModalC(true)}
                />
              </div>
              <button
                onClick={handleRegisterClient}
                disabled={loading || !agreeTermsC || !agreePrivacyC}
                style={{
                  width: "100%",
                  padding: 15,
                  background:
                    loading || !agreeTermsC || !agreePrivacyC
                      ? "#2a2218"
                      : "linear-gradient(135deg,#c0622f,#8b3a18)",
                  border: "none",
                  borderRadius: 16,
                  color:
                    loading || !agreeTermsC || !agreePrivacyC
                      ? "#6b6050"
                      : "#fff",
                  fontFamily: "'Fraunces',serif",
                  fontSize: 17,
                  fontWeight: 700,
                  cursor:
                    loading || !agreeTermsC || !agreePrivacyC
                      ? "not-allowed"
                      : "pointer",
                  marginBottom: 14,
                }}
              >
                {loading ? "Se creează contul..." : "Creează cont client"}
              </button>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                <div style={{ flex: 1, height: 1, background: "#2a2218" }} />
                <span style={{ fontSize: 12, color: "#6b6050" }}>sau</span>
                <div style={{ flex: 1, height: 1, background: "#2a2218" }} />
              </div>
              <button
                onClick={() => setShowOwnerRegister(true)}
                style={{
                  width: "100%",
                  padding: 14,
                  borderRadius: 16,
                  background:
                    "linear-gradient(135deg,rgba(74,110,74,.2),rgba(45,74,45,.1))",
                  border: "1px solid rgba(74,110,74,.35)",
                  color: "#6b9e6b",
                  fontFamily: "'Fraunces',serif",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                <span>🏪</span> Sunt proprietar de locație
              </button>
            </>
          )}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <div style={{ flex: 1, height: 1, background: "#2a2218" }} />
            <span style={{ fontSize: 12, color: "#6b6050" }}>sau</span>
            <div style={{ flex: 1, height: 1, background: "#2a2218" }} />
          </div>
          <button
            onClick={() => setShowWaiterLogin(true)}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: 12,
              background: "none",
              border: "1px dashed #2a2218",
              color: "#6b6050",
              fontSize: 12,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              marginBottom: 24,
            }}
          >
            <span>🤵</span> Loghează-te ca ospătar
          </button>
        </div>
        <style>{`@keyframes fadeInUp{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}}`}</style>
      </div>
    </>
  );
}
// Componenta modal documente legale
