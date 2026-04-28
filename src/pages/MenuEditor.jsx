import { useState, useEffect, useCallback } from "react";
import { useApp } from "../context/AppContext";
import { supabase } from "../supabase";

// ─── EMOJI PICKER ─────────────────────────────────────────────────────────────
const EMOJIS = [
  "🍝",
  "🍕",
  "🍔",
  "🥗",
  "🍷",
  "🍺",
  "☕",
  "🍰",
  "🥩",
  "🍣",
  "🥘",
  "🍜",
  "🍛",
  "🥐",
  "🍞",
  "🧀",
  "🥚",
  "🥓",
  "🌮",
  "🌯",
  "🥙",
  "🧆",
  "🥜",
  "🍿",
  "🍦",
  "🍮",
  "🍧",
  "🍨",
  "🎂",
  "🍫",
  "🍬",
  "🍭",
  "🥤",
  "🧃",
  "🥛",
  "🍵",
  "🫖",
  "🧋",
  "🍶",
  "🥂",
  "🍾",
  "🍸",
  "🍹",
  "🧉",
  "🥃",
  "🍱",
  "🫕",
  "🥗",
];

function EmojiPicker({ selected, onSelect, onClose }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 400,
        background: "rgba(0,0,0,.7)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#1e1a14",
          borderRadius: "20px 20px 0 0",
          border: "1px solid #2a2218",
          width: "100%",
          maxWidth: 430,
          padding: 20,
          maxHeight: "50vh",
          overflowY: "auto",
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
          Alege emoji
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(8,1fr)",
            gap: 8,
          }}
        >
          {EMOJIS.map((e) => (
            <div
              key={e}
              onClick={() => {
                onSelect(e);
                onClose();
              }}
              style={{
                fontSize: 24,
                textAlign: "center",
                cursor: "pointer",
                padding: 6,
                borderRadius: 8,
                background:
                  selected === e ? "rgba(192,98,47,.3)" : "transparent",
              }}
            >
              {e}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── EDITOR MENIU ─────────────────────────────────────────────────────────────
export default function MenuEditor() {
  const { state, navigate, showToast } = useApp();
  const { user } = state;

  // ── Restaurante ──
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestId, setSelectedRestId] = useState(null);
  const [loadingRests, setLoadingRests] = useState(true);

  // ── Meniu ──
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── Modals ──
  const [showAddCat, setShowAddCat] = useState(false);
  const [showAddProd, setShowAddProd] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [emojiTarget, setEmojiTarget] = useState(null);

  // ── Formulare ──
  const [newCat, setNewCat] = useState({ name: "", emoji: "🍽️" });
  const [newProd, setNewProd] = useState({
    name: "",
    desc: "",
    price: "",
    emoji: "🍝",
    veg: false,
  });

  const activeCat = categories.find((c) => c.id === activeCategory);

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
          .order("created_at");
        if (data && data.length > 0) {
          setRestaurants(data);
          setSelectedRestId(data[0].id);
        }
      } catch (err) {
        console.log(err);
      }
      setLoadingRests(false);
    };
    loadRests();
  }, [user?.id]);

  // ── Încarcă meniul când se schimbă restaurantul ──
  const loadMenu = useCallback(async (restId) => {
    if (!restId) return;
    setLoading(true);
    try {
      const { data: cats, error } = await supabase
        .from("menu_categories")
        .select("*")
        .eq("restaurant_id", restId)
        .order("category_order");
      if (error) throw error;

      if (!cats || cats.length === 0) {
        setCategories([]);
        setActiveCategory(null);
        setLoading(false);
        return;
      }

      // Încarcă produsele pentru fiecare categorie
      const catsWithItems = await Promise.all(
        cats.map(async (cat) => {
          const { data: items } = await supabase
            .from("menu_items")
            .select("*")
            .eq("category_id", cat.id)
            .order("item_order");
          return { ...cat, products: items || [] };
        }),
      );

      setCategories(catsWithItems);
      setActiveCategory(catsWithItems[0]?.id || null);
    } catch (err) {
      console.log("Load menu error:", err);
      showToast("❌ Eroare la încărcarea meniului.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (selectedRestId) loadMenu(selectedRestId);
  }, [selectedRestId, loadMenu]);

  // ── Adaugă categorie în Supabase ──
  const addCategory = async () => {
    if (!newCat.name) {
      showToast("⚠️ Completează numele categoriei!");
      return;
    }
    if (!selectedRestId) {
      showToast("⚠️ Selectează un restaurant!");
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("menu_categories")
        .insert({
          restaurant_id: selectedRestId,
          name: newCat.name,
          emoji: newCat.emoji,
          category_order: categories.length,
        })
        .select()
        .single();
      if (error) throw error;
      const newCategory = { ...data, products: [] };
      setCategories((prev) => [...prev, newCategory]);
      setActiveCategory(newCategory.id);
      setNewCat({ name: "", emoji: "🍽️" });
      setShowAddCat(false);
      showToast("✅ Categorie adăugată!");
    } catch (err) {
      console.log("Add category error:", err);
      showToast("❌ Eroare la adăugare.");
    }
    setSaving(false);
  };

  // ── Șterge categorie din Supabase ──
  const deleteCategory = async (catId) => {
    if (categories.length <= 1) {
      showToast("❌ Trebuie să ai cel puțin o categorie!");
      return;
    }
    try {
      await supabase.from("menu_categories").delete().eq("id", catId);
      const remaining = categories.filter((c) => c.id !== catId);
      setCategories(remaining);
      setActiveCategory(remaining[0]?.id || null);
      showToast("🗑️ Categorie ștearsă");
    } catch (err) {
      showToast("❌ Eroare la ștergere.");
    }
  };

  // ── Adaugă produs în Supabase ──
  const addProduct = async () => {
    if (!newProd.name || !newProd.price) {
      showToast("⚠️ Completează numele și prețul!");
      return;
    }
    if (isNaN(parseFloat(newProd.price))) {
      showToast("⚠️ Prețul trebuie să fie un număr!");
      return;
    }
    if (!activeCategory) {
      showToast("⚠️ Selectează o categorie!");
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("menu_items")
        .insert({
          category_id: activeCategory,
          name: newProd.name,
          description: newProd.desc || null,
          price: parseFloat(newProd.price),
          emoji: newProd.emoji,
          is_vegetarian: newProd.veg,
          is_available: true,
          item_order: activeCat?.products?.length || 0,
        })
        .select()
        .single();
      if (error) throw error;
      setCategories((prev) =>
        prev.map((c) =>
          c.id === activeCategory
            ? { ...c, products: [...c.products, data] }
            : c,
        ),
      );
      setNewProd({ name: "", desc: "", price: "", emoji: "🍝", veg: false });
      setShowAddProd(false);
      showToast("✅ Produs adăugat!");
    } catch (err) {
      console.log("Add product error:", err);
      showToast("❌ Eroare la adăugare.");
    }
    setSaving(false);
  };

  // ── Salvează produs editat în Supabase ──
  const saveProduct = async () => {
    if (!editProduct.name || !editProduct.price) {
      showToast("⚠️ Completează numele și prețul!");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("menu_items")
        .update({
          name: editProduct.name,
          description: editProduct.desc || editProduct.description || null,
          price: parseFloat(editProduct.price),
          emoji: editProduct.emoji,
          is_vegetarian: editProduct.veg || editProduct.is_vegetarian || false,
        })
        .eq("id", editProduct.id);
      if (error) throw error;
      setCategories((prev) =>
        prev.map((c) => ({
          ...c,
          products: c.products.map((p) =>
            p.id === editProduct.id ? { ...p, ...editProduct } : p,
          ),
        })),
      );
      setEditProduct(null);
      showToast("✅ Produs salvat!");
    } catch (err) {
      console.log("Save product error:", err);
      showToast("❌ Eroare la salvare.");
    }
    setSaving(false);
  };

  // ── Șterge produs din Supabase ──
  const deleteProduct = async (prodId) => {
    try {
      await supabase.from("menu_items").delete().eq("id", prodId);
      setCategories((prev) =>
        prev.map((c) => ({
          ...c,
          products: c.products.filter((p) => p.id !== prodId),
        })),
      );
      showToast("🗑️ Produs șters");
    } catch (err) {
      showToast("❌ Eroare la ștergere.");
    }
  };

  const selectedRest = restaurants.find((r) => r.id === selectedRestId);
  const totalProducts = categories.reduce(
    (s, c) => s + (c.products?.length || 0),
    0,
  );

  return (
    <div className="page fade-in" style={{ paddingBottom: 100 }}>
      {/* ── EMOJI PICKER ── */}
      {showEmoji && (
        <EmojiPicker
          selected={
            emojiTarget === "cat"
              ? newCat.emoji
              : emojiTarget === "prod"
                ? newProd.emoji
                : editProduct?.emoji
          }
          onSelect={(e) => {
            if (emojiTarget === "cat") setNewCat((p) => ({ ...p, emoji: e }));
            if (emojiTarget === "prod") setNewProd((p) => ({ ...p, emoji: e }));
            if (emojiTarget === "edit")
              setEditProduct((p) => ({ ...p, emoji: e }));
          }}
          onClose={() => setShowEmoji(false)}
        />
      )}

      {/* ── MODAL ADAUGĂ CATEGORIE ── */}
      {showAddCat && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 300,
            background: "rgba(0,0,0,.7)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
          onClick={() => setShowAddCat(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#161210",
              borderRadius: "20px 20px 0 0",
              border: "1px solid #2a2218",
              width: "100%",
              maxWidth: 430,
              padding: "24px 20px 40px",
            }}
          >
            <div
              style={{
                fontFamily: "'Fraunces',serif",
                fontSize: 18,
                fontWeight: 700,
                marginBottom: 20,
              }}
            >
              Adaugă categorie
            </div>
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              <button
                onClick={() => {
                  setEmojiTarget("cat");
                  setShowEmoji(true);
                }}
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 12,
                  background: "#1e1a14",
                  border: "1px solid #2a2218",
                  fontSize: 26,
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                {newCat.emoji}
              </button>
              <input
                placeholder="Nume categorie (ex: Paste, Pizza...)"
                value={newCat.name}
                onChange={(e) =>
                  setNewCat((p) => ({ ...p, name: e.target.value }))
                }
                onKeyDown={(e) => e.key === "Enter" && addCategory()}
                style={{
                  flex: 1,
                  background: "#1e1a14",
                  border: "1px solid #2a2218",
                  borderRadius: 12,
                  padding: "12px 14px",
                  color: "#f0ebe3",
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  fontSize: 14,
                  outline: "none",
                }}
              />
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
              <button
                onClick={() => setShowAddCat(false)}
                style={{
                  padding: 12,
                  borderRadius: 12,
                  background: "none",
                  border: "1px solid #2a2218",
                  color: "#6b6050",
                  cursor: "pointer",
                }}
              >
                Anulează
              </button>
              <button
                onClick={addCategory}
                disabled={saving}
                style={{
                  padding: 12,
                  borderRadius: 12,
                  background: "linear-gradient(135deg,#c0622f,#8b3a18)",
                  border: "none",
                  color: "#fff",
                  fontFamily: "'Fraunces',serif",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? "Se salvează..." : "Adaugă"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL ADAUGĂ PRODUS ── */}
      {showAddProd && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 300,
            background: "rgba(0,0,0,.7)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
          onClick={() => setShowAddProd(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#161210",
              borderRadius: "20px 20px 0 0",
              border: "1px solid #2a2218",
              width: "100%",
              maxWidth: 430,
              padding: "24px 20px 40px",
              maxHeight: "85vh",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                fontFamily: "'Fraunces',serif",
                fontSize: 18,
                fontWeight: 700,
                marginBottom: 20,
              }}
            >
              Adaugă produs în {activeCat?.emoji} {activeCat?.name}
            </div>
            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              <button
                onClick={() => {
                  setEmojiTarget("prod");
                  setShowEmoji(true);
                }}
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 12,
                  background: "#1e1a14",
                  border: "1px solid #2a2218",
                  fontSize: 26,
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                {newProd.emoji}
              </button>
              <input
                placeholder="Numele produsului"
                value={newProd.name}
                onChange={(e) =>
                  setNewProd((p) => ({ ...p, name: e.target.value }))
                }
                style={{
                  flex: 1,
                  background: "#1e1a14",
                  border: "1px solid #2a2218",
                  borderRadius: 12,
                  padding: "12px 14px",
                  color: "#f0ebe3",
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  fontSize: 14,
                  outline: "none",
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
                Descriere (opțional)
              </label>
              <textarea
                placeholder="Ex: Guanciale, pecorino, ou..."
                value={newProd.desc}
                onChange={(e) =>
                  setNewProd((p) => ({ ...p, desc: e.target.value }))
                }
                rows={2}
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
                  resize: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
                marginBottom: 16,
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
                  Preț (lei) *
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={newProd.price}
                  onChange={(e) =>
                    setNewProd((p) => ({ ...p, price: e.target.value }))
                  }
                  style={{
                    width: "100%",
                    background: "#1e1a14",
                    border: "1px solid #2a2218",
                    borderRadius: 12,
                    padding: "12px 14px",
                    color: "#f0ebe3",
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                    fontSize: 14,
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
                  Vegetarian
                </label>
                <div
                  onClick={() => setNewProd((p) => ({ ...p, veg: !p.veg }))}
                  style={{
                    padding: "12px 14px",
                    background: newProd.veg ? "rgba(74,110,74,.2)" : "#1e1a14",
                    border: `1px solid ${newProd.veg ? "rgba(74,110,74,.5)" : "#2a2218"}`,
                    borderRadius: 12,
                    cursor: "pointer",
                    textAlign: "center",
                    fontSize: 13,
                    color: newProd.veg ? "#6b9e6b" : "#6b6050",
                    fontWeight: 600,
                  }}
                >
                  {newProd.veg ? "✅ Da" : "○ Nu"}
                </div>
              </div>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
              <button
                onClick={() => setShowAddProd(false)}
                style={{
                  padding: 12,
                  borderRadius: 12,
                  background: "none",
                  border: "1px solid #2a2218",
                  color: "#6b6050",
                  cursor: "pointer",
                }}
              >
                Anulează
              </button>
              <button
                onClick={addProduct}
                disabled={saving}
                style={{
                  padding: 12,
                  borderRadius: 12,
                  background: "linear-gradient(135deg,#c0622f,#8b3a18)",
                  border: "none",
                  color: "#fff",
                  fontFamily: "'Fraunces',serif",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? "Se salvează..." : "Adaugă"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL EDITARE PRODUS ── */}
      {editProduct && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 300,
            background: "rgba(0,0,0,.7)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
          onClick={() => setEditProduct(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#161210",
              borderRadius: "20px 20px 0 0",
              border: "1px solid #2a2218",
              width: "100%",
              maxWidth: 430,
              padding: "24px 20px 40px",
              maxHeight: "85vh",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                fontFamily: "'Fraunces',serif",
                fontSize: 18,
                fontWeight: 700,
                marginBottom: 20,
              }}
            >
              Editează produs
            </div>
            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              <button
                onClick={() => {
                  setEmojiTarget("edit");
                  setShowEmoji(true);
                }}
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 12,
                  background: "#1e1a14",
                  border: "1px solid #2a2218",
                  fontSize: 26,
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                {editProduct.emoji}
              </button>
              <input
                value={editProduct.name}
                onChange={(e) =>
                  setEditProduct((p) => ({ ...p, name: e.target.value }))
                }
                style={{
                  flex: 1,
                  background: "#1e1a14",
                  border: "1px solid #2a2218",
                  borderRadius: 12,
                  padding: "12px 14px",
                  color: "#f0ebe3",
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  fontSize: 14,
                  outline: "none",
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
                Descriere
              </label>
              <textarea
                value={editProduct.desc || editProduct.description || ""}
                onChange={(e) =>
                  setEditProduct((p) => ({
                    ...p,
                    desc: e.target.value,
                    description: e.target.value,
                  }))
                }
                rows={2}
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
                  resize: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
                marginBottom: 16,
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
                  Preț (lei)
                </label>
                <input
                  type="number"
                  value={editProduct.price}
                  onChange={(e) =>
                    setEditProduct((p) => ({ ...p, price: e.target.value }))
                  }
                  style={{
                    width: "100%",
                    background: "#1e1a14",
                    border: "1px solid #2a2218",
                    borderRadius: 12,
                    padding: "12px 14px",
                    color: "#f0ebe3",
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                    fontSize: 14,
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
                  Vegetarian
                </label>
                <div
                  onClick={() =>
                    setEditProduct((p) => ({
                      ...p,
                      veg: !p.veg,
                      is_vegetarian: !p.veg,
                    }))
                  }
                  style={{
                    padding: "12px 14px",
                    background:
                      editProduct.veg || editProduct.is_vegetarian
                        ? "rgba(74,110,74,.2)"
                        : "#1e1a14",
                    border: `1px solid ${editProduct.veg || editProduct.is_vegetarian ? "rgba(74,110,74,.5)" : "#2a2218"}`,
                    borderRadius: 12,
                    cursor: "pointer",
                    textAlign: "center",
                    fontSize: 13,
                    color:
                      editProduct.veg || editProduct.is_vegetarian
                        ? "#6b9e6b"
                        : "#6b6050",
                    fontWeight: 600,
                  }}
                >
                  {editProduct.veg || editProduct.is_vegetarian
                    ? "✅ Da"
                    : "○ Nu"}
                </div>
              </div>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
              <button
                onClick={() => setEditProduct(null)}
                style={{
                  padding: 12,
                  borderRadius: 12,
                  background: "none",
                  border: "1px solid #2a2218",
                  color: "#6b6050",
                  cursor: "pointer",
                }}
              >
                Anulează
              </button>
              <button
                onClick={saveProduct}
                disabled={saving}
                style={{
                  padding: 12,
                  borderRadius: 12,
                  background: "linear-gradient(135deg,#c0622f,#8b3a18)",
                  border: "none",
                  color: "#fff",
                  fontFamily: "'Fraunces',serif",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                {saving ? "Se salvează..." : "Salvează"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
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
            onClick={() => navigate("home")}
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
              🍽️ Editor Meniu
            </div>
            <div style={{ fontSize: 12, color: "#6b6050", marginTop: 2 }}>
              {selectedRest
                ? `${selectedRest.emoji} ${selectedRest.name} • ${totalProducts} produse`
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

      {loading ? (
        <div
          style={{ textAlign: "center", padding: "60px 0", color: "#6b6050" }}
        >
          <div style={{ fontSize: 36, marginBottom: 10 }}>🍽️</div>
          <div>Se încarcă meniul...</div>
        </div>
      ) : (
        <div style={{ padding: 16 }}>
          {/* Categorii */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
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
              Categorii
            </div>
            <button
              onClick={() => setShowAddCat(true)}
              style={{
                padding: "6px 12px",
                borderRadius: 10,
                background: "rgba(192,98,47,.2)",
                border: "1px solid rgba(192,98,47,.4)",
                color: "#e07a47",
                fontSize: 12,
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              + Categorie
            </button>
          </div>

          {categories.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px 0",
                color: "#6b6050",
              }}
            >
              <div style={{ fontSize: 36, marginBottom: 10 }}>🍽️</div>
              <div style={{ fontSize: 14, color: "#f0ebe3", marginBottom: 8 }}>
                Nicio categorie
              </div>
              <div style={{ fontSize: 12, marginBottom: 16 }}>
                Adaugă prima categorie pentru a începe meniul.
              </div>
              <button
                onClick={() => setShowAddCat(true)}
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
                + Adaugă categorie
              </button>
            </div>
          ) : (
            <>
              {/* Tabs categorii */}
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  overflowX: "auto",
                  scrollbarWidth: "none",
                  marginBottom: 20,
                  paddingBottom: 4,
                }}
              >
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      flexShrink: 0,
                    }}
                  >
                    <div
                      onClick={() => setActiveCategory(cat.id)}
                      style={{
                        padding: "8px 14px",
                        borderRadius: 20,
                        cursor: "pointer",
                        background:
                          activeCategory === cat.id ? "#c0622f" : "#1e1a14",
                        border: `1px solid ${activeCategory === cat.id ? "#c0622f" : "#2a2218"}`,
                        color: activeCategory === cat.id ? "#fff" : "#6b6050",
                        fontSize: 13,
                        fontWeight: activeCategory === cat.id ? 700 : 400,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <span>{cat.emoji}</span>
                      <span>{cat.name}</span>
                      <span style={{ fontSize: 10, opacity: 0.7 }}>
                        ({cat.products?.length || 0})
                      </span>
                    </div>
                    <button
                      onClick={() => deleteCategory(cat.id)}
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        background: "rgba(192,57,43,.2)",
                        border: "1px solid rgba(192,57,43,.3)",
                        color: "#e05050",
                        fontSize: 10,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              {/* Produse */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 12,
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
                  {activeCat?.emoji} {activeCat?.name} —{" "}
                  {activeCat?.products?.length || 0} produse
                </div>
                <button
                  onClick={() => setShowAddProd(true)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 10,
                    background: "rgba(74,110,74,.2)",
                    border: "1px solid rgba(74,110,74,.4)",
                    color: "#6b9e6b",
                    fontSize: 12,
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                >
                  + Produs
                </button>
              </div>

              {!activeCat?.products?.length ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px 0",
                    color: "#6b6050",
                  }}
                >
                  <div style={{ fontSize: 32, marginBottom: 10 }}>
                    {activeCat?.emoji}
                  </div>
                  <div style={{ fontSize: 14, marginBottom: 16 }}>
                    Niciun produs în această categorie
                  </div>
                  <button
                    onClick={() => setShowAddProd(true)}
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
                    + Adaugă primul produs
                  </button>
                </div>
              ) : (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  {activeCat.products.map((prod) => (
                    <div
                      key={prod.id}
                      style={{
                        background: "#161210",
                        border: "1px solid #2a2218",
                        borderRadius: 16,
                        padding: 14,
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 12,
                          background: "#1e1a14",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 24,
                          flexShrink: 0,
                        }}
                      >
                        {prod.emoji}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: 14,
                            marginBottom: 2,
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          {prod.name}
                          {(prod.is_vegetarian || prod.veg) && (
                            <span
                              style={{
                                fontSize: 9,
                                padding: "2px 6px",
                                borderRadius: 8,
                                background: "rgba(74,110,74,.2)",
                                color: "#6b9e6b",
                              }}
                            >
                              🌿 Veg
                            </span>
                          )}
                        </div>
                        {(prod.description || prod.desc) && (
                          <div
                            style={{
                              fontSize: 11,
                              color: "#6b6050",
                              marginBottom: 4,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {prod.description || prod.desc}
                          </div>
                        )}
                        <div
                          style={{
                            fontFamily: "'Fraunces',serif",
                            fontSize: 17,
                            fontWeight: 700,
                            color: "#c8a97e",
                          }}
                        >
                          {prod.price} lei
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        <button
                          onClick={() => setEditProduct({ ...prod })}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            background: "rgba(200,169,126,.15)",
                            border: "1px solid rgba(200,169,126,.3)",
                            color: "#c8a97e",
                            fontSize: 14,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => deleteProduct(prod.id)}
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
            </>
          )}
        </div>
      )}
    </div>
  );
}
