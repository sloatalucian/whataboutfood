import { useState, useEffect, useCallback } from "react";
import { useApp } from "../context/AppContext";
import { supabase, SUPABASE_ANON_KEY } from "../supabase";

export function KitchenManagement({ onBack }) {
  const { state, navigate, showToast } = useApp();
  const { user } = state;
  const handleBack = onBack || (() => navigate("home"));

  // ── Restaurante ──
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestId, setSelectedRestId] = useState(null);
  const [loadingRests, setLoadingRests] = useState(true);

  // ── Bucătari ──
  const [waiters, setWaiters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newWaiter, setNewWaiter] = useState({
    name: "",
    email: "",
    password: "",
  });

  const set = (k, v) => setNewWaiter((w) => ({ ...w, [k]: v }));

  // ── Încarcă restaurantele ──
  useEffect(() => {
    const loadRests = async () => {
      if (!user?.id) {
        setLoadingRests(false);
        return;
      }
      try {
        const { data } = await supabase
          .from("restaurants")
          .select("id, name, emoji")
          .eq("owner_id", user.id)
          .eq("is_deleted", false)
          .order("created_at");
        if (data && data.length > 0) {
          setRestaurants(data);
          // Setam restaurantul doar daca nu e deja selectat
          setSelectedRestId((prev) => prev || data[0].id);
        }
      } catch {}
      setLoadingRests(false);
    };
    loadRests();
  }, [user?.id]);

  // ── Încarcă bucătarii când se schimbă restaurantul ──
  const loadWaiters = useCallback(async (restId) => {
    if (!restId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, role, restaurant_id, status, created_at")
        .eq("restaurant_id", restId)
        .eq("role", "kitchen")
        .order("created_at");
      if (error) throw error;
      setWaiters(
        (data || []).map((w) => ({
          ...w,
          name: w.full_name,
          is_active: w.status === "approved",
          email: "",
        })),
      );
    } catch {
      showToast("❌ Eroare la încărcarea bucătarilor.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (selectedRestId) loadWaiters(selectedRestId);
  }, [selectedRestId, loadWaiters]);

  // ── Adaugă bucătar în Supabase ──
  const handleAdd = async () => {
    if (/\p{Emoji}/u.test(newWaiter.name)) {
      showToast("Numele bucătarului nu poate conține emoji.");
      return;
    }
    if (!newWaiter.name || !newWaiter.email || !newWaiter.password) {
      showToast("⚠️ Completează toate câmpurile!");
      return;
    }
    if (newWaiter.password.length < 4) {
      showToast("⚠️ Parola trebuie să aibă minim 4 caractere!");
      return;
    }
    if (!selectedRestId) {
      showToast("⚠️ Selectează un restaurant!");
      return;
    }

    // Verifică dacă emailul există deja
    const exists = waiters.find(
      (w) => w.email.toLowerCase() === newWaiter.email.toLowerCase(),
    );
    if (exists) {
      showToast("⚠️ Există deja un cont cu acest email!");
      return;
    }

    setSaving(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const response = await fetch(
        "https://dsqkqqaojwxouimcacgy.supabase.co/functions/v1/create-kitchen",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            name: newWaiter.name,
            email: newWaiter.email.toLowerCase().trim(),
            password: newWaiter.password,
            restaurant_id: selectedRestId,
          }),
        },
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Eroare necunoscută");

      setWaiters((prev) => [
        ...prev,
        {
          id: result.id,
          name: result.name,
          email: result.email,
          restaurant_id: selectedRestId,
          is_active: true,
        },
      ]);
      setNewWaiter({ name: "", email: "", password: "" });
      setShowAdd(false);
      showToast("✅ Bucătar adăugat! Se poate loga cu datele setate.");
    } catch (err) {
      showToast(`❌ ${err.message || "Eroare la adăugare. Verifică datele."}`);
    }
    setSaving(false);
  };

  // ── Activează / Dezactivează bucătar ──
  const toggleActive = async (id, currentStatus) => {
    try {
      await supabase
        .from("profiles")
        .update({ status: !currentStatus ? "approved" : "suspended" })
        .eq("id", id);
      setWaiters((prev) =>
        prev.map((w) =>
          w.id === id ? { ...w, is_active: !currentStatus } : w,
        ),
      );
      showToast(!currentStatus ? "✅ Cont activat" : "🔒 Cont dezactivat");
    } catch {
      showToast("❌ Eroare la actualizare.");
    }
  };

  // ── Șterge bucătar ──
  const deleteWaiter = async (id) => {
    try {
      await supabase.auth.admin;
      // Stergem din profiles - userul ramane in Auth dar fara rol waiter
      await supabase
        .from("profiles")
        .update({ role: "client", restaurant_id: null })
        .eq("id", id);
      setWaiters((prev) => prev.filter((w) => w.id !== id));
      showToast("🗑️ Bucătar șters");
    } catch {
      showToast("❌ Eroare la ștergere.");
    }
  };

  const selectedRest = restaurants.find((r) => r.id === selectedRestId);
  const activeCount = waiters.filter((w) => w.is_active).length;

  return (
    <div className="page fade-in" style={{ paddingBottom: 100 }}>
      {/* Header */}
      <div
        style={{
          padding: "44px 20px 20px",
          background: "linear-gradient(135deg,#100a05,#0d0a07)",
          borderBottom: "1px solid #2a2218",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <button
            onClick={handleBack}
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
              👨‍🍳 Gestionare Bucătari
            </div>
            <div style={{ fontSize: 12, color: "#6b6050", marginTop: 2 }}>
              {selectedRest
                ? `${selectedRest.emoji} ${selectedRest.name} • ${activeCount} activi din ${waiters.length}`
                : "Selectează un restaurant"}
            </div>
          </div>
        </div>

        {/* Selector restaurant */}
        {loadingRests ? (
          <div style={{ fontSize: 13, color: "#6b6050" }}>Se încarcă...</div>
        ) : restaurants.length === 0 ? (
          <div
            style={{
              background: "rgba(192,98,47,.1)",
              border: "1px solid rgba(192,98,47,.3)",
              borderRadius: 12,
              padding: "12px 16px",
              fontSize: 13,
              color: "#e07a47",
            }}
          >
            ⚠️ Nu ai niciun restaurant.{" "}
            <span
              onClick={() => navigate("newRestaurant")}
              style={{ textDecoration: "underline", cursor: "pointer" }}
            >
              Creează unul →
            </span>
          </div>
        ) : (
          <div style={{ position: "relative" }}>
            <select
              value={selectedRestId || ""}
              onChange={(e) => setSelectedRestId(e.target.value)}
              style={{
                width: "100%",
                background: "#1e1a14",
                border: "1px solid #2a2218",
                borderRadius: 12,
                padding: "11px 16px",
                color: "#f0ebe3",
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                fontSize: 14,
                outline: "none",
                cursor: "pointer",
                appearance: "none",
              }}
            >
              {restaurants.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.emoji} {r.name}
                </option>
              ))}
            </select>
            <span
              style={{
                position: "absolute",
                right: 14,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#6b6050",
                pointerEvents: "none",
              }}
            >
              ▾
            </span>
          </div>
        )}
      </div>

      <div style={{ padding: 16 }}>
        {/* Buton adaugă */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
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
            Bucătari{waiters.length > 0 ? ` (${waiters.length})` : ""}
          </div>
          <button
            onClick={() => setShowAdd(!showAdd)}
            style={{
              padding: "8px 16px",
              borderRadius: 12,
              background: showAdd ? "#1e1a14" : "var(--terra,#c0622f)",
              border: `1px solid ${showAdd ? "#2a2218" : "transparent"}`,
              color: showAdd ? "#6b6050" : "#fff",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {showAdd ? "✕ Anulează" : "+ Adaugă bucătar"}
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
              Adaugă bucătar nou
            </div>

            <div style={{ marginBottom: 12 }}>
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
                Nume complet *
              </label>
              <input
                placeholder="Ion Popescu"
                value={newWaiter.name}
                maxLength={60}
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

            <div style={{ marginBottom: 12 }}>
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
                Email *
              </label>
              <input
                type="email"
                placeholder="ion@restaurant.ro"
                value={newWaiter.email}
                maxLength={100}
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
                Parolă *
              </label>
              <input
                type="password"
                placeholder="Min. 4 caractere"
                value={newWaiter.password}
                maxLength={50}
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
                💡 Bucătarul se va loga cu aceste date pe tableta sa.
              </div>
            </div>

            <button
              onClick={handleAdd}
              disabled={saving}
              style={{
                width: "100%",
                padding: 13,
                background: saving
                  ? "#2a2218"
                  : "linear-gradient(135deg,#c0622f,#8b3a18)",
                border: "none",
                borderRadius: 12,
                color: saving ? "#6b6050" : "#fff",
                fontFamily: "'Fraunces',serif",
                fontSize: 15,
                fontWeight: 700,
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "Se creează..." : "✅ Creează cont bucătar"}
            </button>
          </div>
        )}

        {/* Lista ospătari */}
        {loading ? (
          <div
            style={{ textAlign: "center", padding: "40px 0", color: "#6b6050" }}
          >
            <div style={{ fontSize: 32, marginBottom: 10 }}>🤵</div>
            <div>Se încarcă bucătarii...</div>
          </div>
        ) : waiters.length === 0 ? (
          <div
            style={{ textAlign: "center", padding: "40px 0", color: "#6b6050" }}
          >
            <div style={{ fontSize: 40, marginBottom: 10 }}>🤵</div>
            <div style={{ fontSize: 15, color: "#f0ebe3", marginBottom: 6 }}>
              Niciun bucătar
            </div>
            <div style={{ fontSize: 13, marginBottom: 16 }}>
              Adaugă primul bucătar pentru acest restaurant.
            </div>
            <button
              onClick={() => setShowAdd(true)}
              style={{
                padding: "10px 24px",
                borderRadius: 12,
                background: "var(--terra)",
                border: "none",
                color: "#fff",
                fontFamily: "'Fraunces',serif",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              + Adaugă bucătar
            </button>
          </div>
        ) : (
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
                  opacity: w.is_active ? 1 : 0.6,
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    flexShrink: 0,
                    background: w.is_active
                      ? "rgba(200,169,126,.15)"
                      : "rgba(255,255,255,.05)",
                    border: `1px solid ${w.is_active ? "rgba(200,169,126,.3)" : "#2a2218"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "'Fraunces',serif",
                    fontSize: 18,
                    fontWeight: 700,
                    color: w.is_active ? "#c8a97e" : "#6b6050",
                  }}
                >
                  {w.name.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}
                  >
                    {w.name}
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
                    {w.email}
                  </div>
                  <div style={{ fontSize: 10, color: "#6b6050", marginTop: 2 }}>
                    Din{" "}
                    {new Date(w.created_at).toLocaleDateString("ro-RO", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                </div>

                {/* Status */}
                <div
                  style={{
                    fontSize: 9,
                    fontWeight: 800,
                    letterSpacing: 1,
                    textTransform: "uppercase",
                    padding: "3px 8px",
                    borderRadius: 20,
                    flexShrink: 0,
                    background: w.is_active
                      ? "rgba(74,110,74,.2)"
                      : "rgba(255,255,255,.05)",
                    color: w.is_active ? "#6b9e6b" : "#6b6050",
                  }}
                >
                  {w.is_active ? "● Activ" : "○ Inactiv"}
                </div>

                {/* Butoane */}
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => toggleActive(w.id, w.is_active)}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: w.is_active
                        ? "rgba(192,57,43,.15)"
                        : "rgba(74,110,74,.15)",
                      border: `1px solid ${w.is_active ? "rgba(192,57,43,.3)" : "rgba(74,110,74,.3)"}`,
                      color: w.is_active ? "#e05050" : "#6b9e6b",
                      fontSize: 14,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {w.is_active ? "🔒" : "✅"}
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
        )}
      </div>
    </div>
  );
}
