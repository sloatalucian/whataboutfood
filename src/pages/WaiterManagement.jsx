import { useState } from "react";
import { useApp } from "../context/AppContext";

// ─── CONTURI DEMO PREDEFINITE ─────────────────────────────────────────────────
// Acestea sunt conturile pe care le poți folosi pentru testare:
//
//  OSPĂTAR MAMA MIA:
//    Email:  andrei@mamamia.ro
//    Parolă: 1234
//
//  PROPRIETAR MAMA MIA:
//    Email:  proprietar@mamamia.ro
//    Parolă: 1234
//
// În producție acestea vor fi stocate în Supabase Auth.

const DEMO_ACCOUNTS = {
  waiters: [
    {
      email: "andrei@mamamia.ro",
      password: "1234",
      name: "Andrei Ionescu",
      restaurantName: "Mama Mia",
      role: "waiter",
    },
    {
      email: "maria@mamamia.ro",
      password: "1234",
      name: "Maria Constantin",
      restaurantName: "Mama Mia",
      role: "waiter",
    },
  ],
  owners: [
    {
      email: "proprietar@mamamia.ro",
      password: "1234",
      name: "Admin Mama Mia",
      restaurantName: "Mama Mia",
      role: "owner",
      plan: "pro",
    },
  ],
};

const DEMO_WAITERS_LIST = [
  {
    id: 1,
    name: "Andrei Ionescu",
    email: "andrei@mamamia.ro",
    isActive: true,
    since: "15 Ian 2025",
  },
  {
    id: 2,
    name: "Maria Constantin",
    email: "maria@mamamia.ro",
    isActive: true,
    since: "3 Feb 2025",
  },
  {
    id: 3,
    name: "Cristi Popescu",
    email: "cristi@mamamia.ro",
    isActive: false,
    since: "20 Mar 2025",
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// LOGIN OSPĂTAR
// ═══════════════════════════════════════════════════════════════════════════
export function WaiterLogin({ onLogin, onBack }) {
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
    await new Promise((r) => setTimeout(r, 700));

    // Verifică conturile demo
    const account = DEMO_ACCOUNTS.waiters.find(
      (a) =>
        a.email.toLowerCase() === email.toLowerCase() &&
        a.password === password,
    );

    if (account) {
      onLogin({
        id: Date.now(),
        name: account.name,
        email: account.email,
        role: "waiter",
        restaurantName: account.restaurantName,
      });
    } else {
      setError("Email sau parolă incorectă. Încearcă andrei@mamamia.ro / 1234");
    }
    setLoading(false);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0d0a07",
        fontFamily: "'Plus Jakarta Sans',sans-serif",
        color: "#f0ebe3",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "60px 24px 40px",
          background: "linear-gradient(160deg,#1a1200,#0d0a07)",
          textAlign: "center",
          position: "relative",
        }}
      >
        {onBack && (
          <button
            onClick={onBack}
            style={{
              position: "absolute",
              top: 20,
              left: 20,
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
        )}
        <div
          style={{
            width: 72,
            height: 72,
            background: "linear-gradient(135deg,#c8a97e,#8b6a40)",
            borderRadius: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 36,
            margin: "0 auto 20px",
            boxShadow: "0 8px 24px rgba(200,169,126,.3)",
          }}
        >
          🤵
        </div>
        <div
          style={{
            fontFamily: "'Fraunces',serif",
            fontSize: 28,
            fontWeight: 900,
            marginBottom: 6,
          }}
        >
          Tabletă Ospătar
        </div>
        <div style={{ fontSize: 14, color: "#6b6050", lineHeight: 1.5 }}>
          Intră în contul tău pentru a<br />
          vedea comenzile și rezervările
        </div>
      </div>

      {/* Form */}
      <div style={{ padding: "32px 24px", flex: 1 }}>
        {error && (
          <div
            style={{
              background: "rgba(192,57,43,.15)",
              border: "1px solid rgba(192,57,43,.3)",
              borderRadius: 12,
              padding: "12px 16px",
              marginBottom: 20,
              fontSize: 13,
              color: "#e05050",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* Hint conturi demo */}
        <div
          style={{
            background: "rgba(200,169,126,.08)",
            border: "1px solid rgba(200,169,126,.2)",
            borderRadius: 12,
            padding: "12px 16px",
            marginBottom: 20,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#c8a97e",
              marginBottom: 6,
            }}
          >
            🔑 Conturi demo disponibile
          </div>
          <div style={{ fontSize: 11, color: "#6b6050", lineHeight: 1.8 }}>
            <span style={{ color: "#f0ebe3" }}>andrei@mamamia.ro</span> /{" "}
            <span style={{ color: "#f0ebe3" }}>1234</span>
            <br />
            <span style={{ color: "#f0ebe3" }}>maria@mamamia.ro</span> /{" "}
            <span style={{ color: "#f0ebe3" }}>1234</span>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              fontSize: 11,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              color: "#6b6050",
              marginBottom: 8,
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
              padding: "14px 16px",
              color: "#f0ebe3",
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: 15,
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
              marginBottom: 8,
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
              padding: "14px 16px",
              color: "#f0ebe3",
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: 15,
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
            padding: 16,
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
            transition: "all .2s",
          }}
        >
          {loading ? "Se verifică..." : "Intră în tabletă →"}
        </button>

        <div
          style={{
            marginTop: 24,
            padding: 16,
            background: "rgba(255,255,255,.03)",
            border: "1px solid #2a2218",
            borderRadius: 14,
          }}
        >
          <div style={{ fontSize: 12, color: "#6b6050", lineHeight: 1.7 }}>
            💡 Contul tău de ospătar a fost creat de proprietarul
            restaurantului.
            <br />
            Dacă nu ai primit datele de acces, contactează managerul tău.
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// GESTIONARE OSPĂTARI — în dashboard proprietar
// ═══════════════════════════════════════════════════════════════════════════
export function WaiterManagement({ restaurantId, restaurantName }) {
  const { showToast } = useApp();
  const [waiters, setWaiters] = useState(DEMO_WAITERS_LIST);
  const [showAdd, setShowAdd] = useState(false);
  const [newWaiter, setNewWaiter] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setNewWaiter((w) => ({ ...w, [k]: v }));

  const handleAdd = async () => {
    if (!newWaiter.name || !newWaiter.email || !newWaiter.password) {
      showToast("⚠️ Completează toate câmpurile!");
      return;
    }
    if (newWaiter.password.length < 4) {
      showToast("⚠️ Parola trebuie să aibă minim 4 caractere!");
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setWaiters((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: newWaiter.name,
        email: newWaiter.email,
        isActive: true,
        since: new Date().toLocaleDateString("ro-RO", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
      },
    ]);
    setNewWaiter({ name: "", email: "", password: "" });
    setShowAdd(false);
    setLoading(false);
    showToast("✅ Ospătar adăugat! Se poate loga cu datele setate.");
  };

  const toggleActive = (id) => {
    setWaiters((prev) =>
      prev.map((w) => (w.id === id ? { ...w, isActive: !w.isActive } : w)),
    );
    const w = waiters.find((w) => w.id === id);
    showToast(w?.isActive ? "🔒 Cont dezactivat" : "✅ Cont activat");
  };

  const deleteWaiter = (id) => {
    setWaiters((prev) => prev.filter((w) => w.id !== id));
    showToast("🗑️ Ospătar șters");
  };

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "'Fraunces',serif",
              fontSize: 20,
              fontWeight: 700,
            }}
          >
            🤵 Ospătari
          </div>
          <div style={{ fontSize: 12, color: "#6b6050", marginTop: 2 }}>
            {waiters.filter((w) => w.isActive).length} activi din{" "}
            {waiters.length} total
          </div>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          style={{
            padding: "9px 16px",
            borderRadius: 12,
            background: showAdd ? "#1e1a14" : "var(--terra,#c0622f)",
            border: `1px solid ${showAdd ? "#2a2218" : "transparent"}`,
            color: showAdd ? "#6b6050" : "#fff",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {showAdd ? "✕ Anulează" : "+ Adaugă ospătar"}
        </button>
      </div>

      {/* Formular adăugare */}
      {showAdd && (
        <div
          style={{
            background: "#1e1a14",
            border: "1px solid #2a2218",
            borderRadius: 18,
            padding: 20,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              fontFamily: "'Fraunces',serif",
              fontSize: 16,
              fontWeight: 700,
              marginBottom: 16,
            }}
          >
            Adaugă ospătar nou
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              marginBottom: 12,
            }}
          >
            <div>
              <label
                style={{
                  fontSize: 10,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                  color: "#6b6050",
                  marginBottom: 6,
                  display: "block",
                }}
              >
                Nume complet
              </label>
              <input
                placeholder="Ion Popescu"
                value={newWaiter.name}
                onChange={(e) => set("name", e.target.value)}
                style={{
                  width: "100%",
                  background: "#252018",
                  border: "1px solid #2a2218",
                  borderRadius: 10,
                  padding: "10px 12px",
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
                  fontSize: 10,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                  color: "#6b6050",
                  marginBottom: 6,
                  display: "block",
                }}
              >
                Email
              </label>
              <input
                type="email"
                placeholder="ion@restaurant.ro"
                value={newWaiter.email}
                onChange={(e) => set("email", e.target.value)}
                style={{
                  width: "100%",
                  background: "#252018",
                  border: "1px solid #2a2218",
                  borderRadius: 10,
                  padding: "10px 12px",
                  color: "#f0ebe3",
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  fontSize: 13,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                fontSize: 10,
                letterSpacing: 1.5,
                textTransform: "uppercase",
                color: "#6b6050",
                marginBottom: 6,
                display: "block",
              }}
            >
              Parolă
            </label>
            <input
              type="password"
              placeholder="Min. 4 caractere"
              value={newWaiter.password}
              onChange={(e) => set("password", e.target.value)}
              style={{
                width: "100%",
                background: "#252018",
                border: "1px solid #2a2218",
                borderRadius: 10,
                padding: "10px 12px",
                color: "#f0ebe3",
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                fontSize: 13,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <div style={{ fontSize: 11, color: "#6b6050", marginTop: 6 }}>
              💡 Ospătarul se va loga cu aceste date pe tableta sa.
            </div>
          </div>
          <button
            onClick={handleAdd}
            disabled={loading}
            style={{
              width: "100%",
              padding: 13,
              background: loading
                ? "#2a2218"
                : "linear-gradient(135deg,#c0622f,#8b3a18)",
              border: "none",
              borderRadius: 12,
              color: loading ? "#6b6050" : "#fff",
              fontFamily: "'Fraunces',serif",
              fontSize: 15,
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Se creează..." : "✅ Creează cont ospătar"}
          </button>
        </div>
      )}

      {/* Lista */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {waiters.map((w) => (
          <div
            key={w.id}
            style={{
              background: "#161210",
              border: "1px solid #2a2218",
              borderRadius: 16,
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              gap: 14,
              opacity: w.isActive ? 1 : 0.6,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                flexShrink: 0,
                background: w.isActive
                  ? "rgba(200,169,126,.15)"
                  : "rgba(255,255,255,.05)",
                border: `1px solid ${w.isActive ? "rgba(200,169,126,.3)" : "#2a2218"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "'Fraunces',serif",
                fontSize: 18,
                fontWeight: 700,
                color: w.isActive ? "#c8a97e" : "#6b6050",
              }}
            >
              {w.name.charAt(0)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>
                {w.name}
              </div>
              <div style={{ fontSize: 11, color: "#6b6050" }}>
                {w.email} • Din {w.since}
              </div>
            </div>
            <div
              style={{
                fontSize: 9,
                fontWeight: 800,
                letterSpacing: 1,
                textTransform: "uppercase",
                padding: "3px 8px",
                borderRadius: 20,
                background: w.isActive
                  ? "rgba(74,110,74,.2)"
                  : "rgba(255,255,255,.05)",
                color: w.isActive ? "#6b9e6b" : "#6b6050",
              }}
            >
              {w.isActive ? "● Activ" : "○ Inactiv"}
            </div>
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              <button
                onClick={() => toggleActive(w.id)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: w.isActive
                    ? "rgba(192,57,43,.15)"
                    : "rgba(74,110,74,.15)",
                  border: `1px solid ${w.isActive ? "rgba(192,57,43,.3)" : "rgba(74,110,74,.3)"}`,
                  color: w.isActive ? "#e05050" : "#6b9e6b",
                  fontSize: 14,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {w.isActive ? "🔒" : "✅"}
              </button>
              <button
                onClick={() => deleteWaiter(w.id)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "rgba(192,57,43,.1)",
                  border: "1px solid rgba(192,57,43,.2)",
                  color: "#e05050",
                  fontSize: 14,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
