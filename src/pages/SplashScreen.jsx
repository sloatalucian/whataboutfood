import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";

// ─── ANIMAȚIE FARFURIE ────────────────────────────────────────────────────────
function FoodAnimation({ onComplete }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 900),
      setTimeout(() => setPhase(3), 1600),
      setTimeout(() => setPhase(4), 2800),
      setTimeout(() => onComplete(), 3400),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "#0d0a07",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        opacity: phase === 4 ? 0 : 1,
        transition: phase === 4 ? "opacity .6s ease" : "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(192,98,47,.15), transparent 70%)",
          opacity: phase >= 1 ? 1 : 0,
          transition: "opacity .8s ease",
        }}
      />

      {/* Farfurie */}
      <div
        style={{
          position: "relative",
          transform:
            phase >= 1
              ? "scale(1) translateY(0)"
              : "scale(0.3) translateY(60px)",
          opacity: phase >= 1 ? 1 : 0,
          transition:
            "transform .7s cubic-bezier(.34,1.56,.64,1), opacity .5s ease",
          marginBottom: 24,
        }}
      >
        <div
          style={{
            width: 140,
            height: 140,
            borderRadius: "50%",
            background: "linear-gradient(145deg,#2a2218,#1a1410)",
            border: "3px solid #3a3228",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow:
              "0 20px 60px rgba(0,0,0,.6), inset 0 2px 4px rgba(255,255,255,.05)",
            position: "relative",
          }}
        >
          {/* Capac */}
          <div
            style={{
              position: "absolute",
              width: 120,
              height: 60,
              background: "linear-gradient(180deg,#3a3228,#252018)",
              borderRadius: "60px 60px 0 0",
              top: -30,
              left: 10,
              transform:
                phase >= 2
                  ? "translateY(-80px) scale(0.8)"
                  : "translateY(0) scale(1)",
              opacity: phase >= 2 ? 0 : 1,
              transition:
                "transform .6s cubic-bezier(.4,0,.2,1), opacity .4s ease",
              boxShadow: "0 -4px 20px rgba(0,0,0,.4)",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "center",
              paddingTop: 8,
            }}
          >
            <div
              style={{
                width: 20,
                height: 12,
                borderRadius: "50%",
                background: "linear-gradient(180deg,#c8a97e,#8b6a40)",
              }}
            />
          </div>
          {/* Mâncare */}
          <div
            style={{
              fontSize: 52,
              opacity: phase >= 2 ? 1 : 0,
              transform:
                phase >= 2
                  ? "scale(1) translateY(0)"
                  : "scale(0.5) translateY(10px)",
              transition: "all .5s cubic-bezier(.34,1.56,.64,1) .1s",
            }}
          >
            🍝
          </div>
        </div>

        {/* Abur */}
        {phase >= 2 && (
          <>
            <div
              style={{
                position: "absolute",
                top: -20,
                left: "30%",
                fontSize: 16,
                opacity: 0.6,
                animation: "steam1 2s ease-in-out infinite",
              }}
            >
              〰️
            </div>
            <div
              style={{
                position: "absolute",
                top: -30,
                left: "50%",
                fontSize: 14,
                opacity: 0.5,
                animation: "steam2 2s ease-in-out infinite .4s",
              }}
            >
              〰️
            </div>
          </>
        )}

        {/* Emoji orbită */}
        {phase >= 2 &&
          ["🍕", "🍷", "🥗", "☕", "🍰"].map((emoji, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                fontSize: 18,
                top: "50%",
                left: "50%",
                transform: `rotate(${i * 72}deg) translateX(90px) rotate(-${i * 72}deg)`,
                opacity: phase >= 2 ? 1 : 0,
                transition: `all .5s cubic-bezier(.34,1.56,.64,1) ${0.1 + i * 0.08}s`,
              }}
            >
              {emoji}
            </div>
          ))}
      </div>

      {/* Logo */}
      <div
        style={{
          textAlign: "center",
          opacity: phase >= 3 ? 1 : 0,
          transform: phase >= 3 ? "translateY(0)" : "translateY(20px)",
          transition: "all .6s ease",
        }}
      >
        <div
          style={{
            fontFamily: "'Fraunces',serif",
            fontSize: 36,
            fontWeight: 900,
            color: "#f0ebe3",
            marginBottom: 6,
          }}
        >
          Whatabout<span style={{ color: "#c0622f" }}>Food</span>
        </div>
        <div
          style={{
            fontSize: 13,
            color: "#6b6050",
            letterSpacing: 3,
            textTransform: "uppercase",
          }}
        >
          Rezervări · Comenzi · Plăți
        </div>
      </div>

      <style>{`
        @keyframes steam1 { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-12px);} }
        @keyframes steam2 { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-16px);} }
      `}</style>
    </div>
  );
}

// ─── WAITER LOGIN MODAL ───────────────────────────────────────────────────────
function WaiterLoginModal({ onLogin, onClose }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Completează email și parola.");
      return;
    }
    setLoading(true);
    setError("");
    await new Promise((r) => setTimeout(r, 800));
    if (email.includes("@") && password.length >= 4) {
      onLogin({
        id: Date.now(),
        name:
          email.split("@")[0].charAt(0).toUpperCase() +
          email.split("@")[0].slice(1),
        email,
        role: "waiter",
        restaurantName: "Mama Mia",
      });
    } else {
      setError("Email sau parolă incorectă.");
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        background: "rgba(0,0,0,.8)",
        backdropFilter: "blur(10px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-end",
        animation: "fadeIn .3s ease",
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
          animation: "slideUp .35s cubic-bezier(.4,0,.2,1)",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              margin: "0 auto 16px",
              background: "linear-gradient(135deg,#c8a97e,#8b6a40)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
            }}
          >
            🤵
          </div>
          <div
            style={{
              fontFamily: "'Fraunces',serif",
              fontSize: 22,
              fontWeight: 900,
              marginBottom: 4,
            }}
          >
            Tabletă Ospătar
          </div>
          <div style={{ fontSize: 13, color: "#6b6050" }}>
            Intră în contul tău de ospătar
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
            placeholder="email@restaurant.ro"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: "100%",
            padding: 15,
            background: loading
              ? "#2a2218"
              : "linear-gradient(135deg,#c8a97e,#8b6a40)",
            border: "none",
            borderRadius: 16,
            color: loading ? "#6b6050" : "#1a1208",
            fontFamily: "'Fraunces',serif",
            fontSize: 17,
            fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
            marginBottom: 12,
          }}
        >
          {loading ? "Se verifică..." : "Intră în tabletă →"}
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
      <style>{`
        @keyframes slideUp { from{transform:translateY(100%);} to{transform:translateY(0);} }
        @keyframes fadeIn  { from{opacity:0;} to{opacity:1;} }
      `}</style>
    </div>
  );
}

// ─── SELECTOR DEMO ────────────────────────────────────────────────────────────
function DemoSelector({ onSelect, onClose }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        background: "rgba(0,0,0,.8)",
        backdropFilter: "blur(10px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-end",
        animation: "fadeIn .3s ease",
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
          padding: "28px 24px 40px",
          animation: "slideUp .35s cubic-bezier(.4,0,.2,1)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div
            style={{
              fontFamily: "'Fraunces',serif",
              fontSize: 22,
              fontWeight: 900,
              marginBottom: 6,
            }}
          >
            Alege experiența demo
          </div>
          <div style={{ fontSize: 13, color: "#6b6050" }}>
            Explorează aplicația din perspectiva dorită
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            {
              role: "client",
              icon: "👤",
              label: "Sunt client",
              desc: "Rezervă masă, explorează meniul, comandă și plătește",
              color: "#c0622f",
              bg: "rgba(192,98,47,.2)",
              border: "rgba(192,98,47,.35)",
            },
            {
              role: "ospatar",
              icon: "🤵",
              label: "Sunt ospătar",
              desc: "Gestionează comenzile active, confirmă rezervări",
              color: "#c8a97e",
              bg: "rgba(200,169,126,.15)",
              border: "rgba(200,169,126,.3)",
            },
            {
              role: "proprietar",
              icon: "👑",
              label: "Sunt proprietar",
              desc: "Dashboard, editor planșeu, statistici, meniu",
              color: "#4a6e4a",
              bg: "rgba(74,110,74,.15)",
              border: "rgba(74,110,74,.3)",
            },
          ].map((opt) => (
            <button
              key={opt.role}
              onClick={() => onSelect(opt.role)}
              style={{
                padding: "16px 18px",
                borderRadius: 16,
                background: `linear-gradient(135deg,${opt.bg},transparent)`,
                border: `1px solid ${opt.border}`,
                color: "#f0ebe3",
                cursor: "pointer",
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 13,
                  flexShrink: 0,
                  background: `linear-gradient(135deg,${opt.color},${opt.color}88)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24,
                }}
              >
                {opt.icon}
              </div>
              <div>
                <div
                  style={{
                    fontFamily: "'Fraunces',serif",
                    fontSize: 16,
                    fontWeight: 700,
                    marginBottom: 2,
                  }}
                >
                  {opt.label}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "rgba(240,235,227,.5)",
                    lineHeight: 1.4,
                  }}
                >
                  {opt.desc}
                </div>
              </div>
              <span
                style={{ marginLeft: "auto", fontSize: 16, color: opt.color }}
              >
                ›
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          style={{
            width: "100%",
            marginTop: 14,
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

// ─── SPLASH SCREEN PRINCIPAL ──────────────────────────────────────────────────
export default function SplashScreen({ onComplete, onWaiterLogin }) {
  const { dispatch, navigate, showToast } = useApp();
  const [showSplash, setShowSplash] = useState(true);
  const [showDemo, setShowDemo] = useState(false);
  const [showWaiterLogin, setShowWaiterLogin] = useState(false);
  const [loginMode, setLoginMode] = useState("login");
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    restName: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleDemo = (role) => {
    setShowDemo(false);
    if (role === "client") {
      dispatch({
        type: "SET_USER",
        payload: { name: "Client Demo", role: "client", plan: "free" },
      });
      onComplete("client");
    } else if (role === "ospatar") {
      setShowWaiterLogin(true);
    } else if (role === "proprietar") {
      dispatch({
        type: "SET_USER",
        payload: {
          name: "Demo Admin",
          email: "demo@mamamia.ro",
          plan: "pro",
          restName: "Mama Mia",
          role: "owner",
        },
      });
      onComplete("owner");
    }
  };

  const handleWaiterLogin = (waiter) => {
    setShowWaiterLogin(false);
    onWaiterLogin(waiter);
    showToast(`👋 Bun venit, ${waiter.name}!`);
  };

  const handleLogin = async () => {
    if (!form.email || !form.password) {
      setError("Completează email și parola.");
      return;
    }
    setLoading(true);
    setError("");
    await new Promise((r) => setTimeout(r, 800));
    // Demo: orice email cu @
    dispatch({
      type: "SET_USER",
      payload: {
        name: "Admin",
        email: form.email,
        plan: "pro",
        restName: "Restaurantul meu",
        role: "owner",
      },
    });
    onComplete("owner");
    setLoading(false);
  };

  const handleRegister = async () => {
    if (!form.name || !form.email || !form.password || !form.restName) {
      setError("Completează toate câmpurile.");
      return;
    }
    setLoading(true);
    setError("");
    await new Promise((r) => setTimeout(r, 1000));
    dispatch({
      type: "SET_USER",
      payload: {
        name: form.name,
        email: form.email,
        plan: "free",
        restName: form.restName,
        role: "owner",
      },
    });
    onComplete("owner");
    setLoading(false);
  };

  if (showSplash)
    return <FoodAnimation onComplete={() => setShowSplash(false)} />;

  return (
    <>
      {showDemo && (
        <DemoSelector
          onSelect={handleDemo}
          onClose={() => setShowDemo(false)}
        />
      )}
      {showWaiterLogin && (
        <WaiterLoginModal
          onLogin={handleWaiterLogin}
          onClose={() => setShowWaiterLogin(false)}
        />
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
        {/* Hero */}
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

        {/* Form */}
        <div style={{ padding: "24px 24px 0", flex: 1 }}>
          {/* Tabs */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginBottom: 24,
            }}
          >
            {["login", "register"].map((m) => (
              <button
                key={m}
                onClick={() => {
                  setLoginMode(m);
                  setError("");
                }}
                style={{
                  padding: 12,
                  borderRadius: 14,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  background: loginMode === m ? "#c0622f" : "#1e1a14",
                  border: `1px solid ${loginMode === m ? "#c0622f" : "#2a2218"}`,
                  color: loginMode === m ? "#fff" : "#6b6050",
                  transition: "all .2s",
                }}
              >
                {m === "login" ? "Intră în cont" : "Înregistrare"}
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
                  placeholder="email@restaurant.ro"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
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
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                  marginBottom: 14,
                }}
              >
                <div>
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
                    onChange={(e) => set("name", e.target.value)}
                    style={{
                      width: "100%",
                      background: "#1e1a14",
                      border: "1px solid #2a2218",
                      borderRadius: 12,
                      padding: "12px 14px",
                      color: "#f0ebe3",
                      fontFamily: "'Plus Jakarta Sans',sans-serif",
                      fontSize: 13,
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div>
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
                    Restaurant
                  </label>
                  <input
                    placeholder="Mama Mia"
                    value={form.restName}
                    onChange={(e) => set("restName", e.target.value)}
                    style={{
                      width: "100%",
                      background: "#1e1a14",
                      border: "1px solid #2a2218",
                      borderRadius: 12,
                      padding: "12px 14px",
                      color: "#f0ebe3",
                      fontFamily: "'Plus Jakarta Sans',sans-serif",
                      fontSize: 13,
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
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
                  placeholder="email@restaurant.ro"
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
                  placeholder="Min. 8 caractere"
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
              <button
                onClick={handleRegister}
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
                {loading ? "Se creează contul..." : "Creează contul gratuit"}
              </button>
            </>
          )}

          {/* Separator */}
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

          {/* Demo */}
          <button
            onClick={() => setShowDemo(true)}
            style={{
              width: "100%",
              padding: 15,
              borderRadius: 16,
              background:
                "linear-gradient(135deg,rgba(200,169,126,.15),rgba(139,106,64,.08))",
              border: "1px solid rgba(200,169,126,.3)",
              color: "#c8a97e",
              fontFamily: "'Fraunces',serif",
              fontSize: 16,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              marginBottom: 12,
            }}
          >
            <span>✨</span>
            Explorează demo-ul
            <span
              style={{
                fontSize: 11,
                color: "rgba(200,169,126,.5)",
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                fontWeight: 400,
              }}
            >
              fără cont
            </span>
          </button>

          {/* Buton ospătar — mic și discret */}
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
              marginBottom: 8,
            }}
          >
            <span>🤵</span>
            Loghează-te ca ospătar
          </button>
        </div>

        <style>{`
          @keyframes fadeInUp { from{opacity:0;transform:translateY(16px);} to{opacity:1;transform:translateY(0);} }
        `}</style>
      </div>
    </>
  );
}
