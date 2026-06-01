import { useState } from "react";
import { supabase } from "../../supabase";

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
    try {
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: email.toLowerCase().trim(),
          password,
        });
      if (authError || !authData?.user) {
        setError("Email sau parolă incorectă.");
        setLoading(false);
        return;
      }
      const { data, error: dbError } = await supabase
        .from("profiles")
        .select("id, full_name, role, restaurant_id, status")
        .eq("id", authData.user.id)
        .single();
      if (dbError || !data || data.role !== "waiter") {
        setError("Cont inexistent sau dezactivat.");
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }
      const { data: rest } = await supabase
        .from("restaurants")
        .select("name")
        .eq("id", data.restaurant_id)
        .single();
      onLogin({
        id: data.id,
        name: data.full_name || email,
        email: authData.user.email,
        role: "waiter",
        restaurantId: data.restaurant_id,
        restaurantName: rest?.name || "Restaurant",
      });
    } catch {
      setError("Eroare la conectare.");
    }
    setLoading(false);
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
          animation: "slideUp .35s ease",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 24 }}>
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
            maxLength={100}
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
            maxLength={50}
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
      <style>{`@keyframes slideUp{from{transform:translateY(100%);}to{transform:translateY(0);}}`}</style>
    </div>
  );
}

export default WaiterLoginModal;
