import { useState } from "react";
import { useApp } from "../context/AppContext";

// ─── EMOJI PICKER SIMPLU ──────────────────────────────────────────────────────
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
];

function EmojiPicker({ selected, onSelect, onClose }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 400,
        background: "rgba(0,0,0,.6)",
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
  const { navigate, showToast } = useApp();

  // State meniu — categorii cu produse
  const [categories, setCategories] = useState([
    { id: 1, name: "Antipasti", emoji: "🍅", products: [] },
    {
      id: 2,
      name: "Paste & Risotto",
      emoji: "🍝",
      products: [
        {
          id: 101,
          name: "Spaghetti Carbonara",
          desc: "Guanciale, pecorino, ou",
          price: 52,
          emoji: "🍝",
          veg: false,
        },
        {
          id: 102,
          name: "Penne Arrabbiata",
          desc: "Sos picant de roșii",
          price: 38,
          emoji: "🌶️",
          veg: true,
        },
      ],
    },
    { id: 3, name: "Băuturi", emoji: "🍷", products: [] },
  ]);

  const [activeCategory, setActiveCategory] = useState(1);
  const [showAddCat, setShowAddCat] = useState(false);
  const [showAddProd, setShowAddProd] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [emojiTarget, setEmojiTarget] = useState(null); // "cat" | "prod"

  const [newCat, setNewCat] = useState({ name: "", emoji: "🍽️" });
  const [newProd, setNewProd] = useState({
    name: "",
    desc: "",
    price: "",
    emoji: "🍝",
    veg: false,
  });

  const activeCat = categories.find((c) => c.id === activeCategory);

  // ── Categorii ──
  const addCategory = () => {
    if (!newCat.name) {
      showToast("⚠️ Completează numele categoriei!");
      return;
    }
    const cat = {
      id: Date.now(),
      name: newCat.name,
      emoji: newCat.emoji,
      products: [],
    };
    setCategories((prev) => [...prev, cat]);
    setActiveCategory(cat.id);
    setNewCat({ name: "", emoji: "🍽️" });
    setShowAddCat(false);
    showToast("✅ Categorie adăugată!");
  };

  const deleteCategory = (id) => {
    if (categories.length <= 1) {
      showToast("❌ Trebuie să ai cel puțin o categorie!");
      return;
    }
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setActiveCategory(categories.find((c) => c.id !== id)?.id);
    showToast("🗑️ Categorie ștearsă");
  };

  // ── Produse ──
  const addProduct = () => {
    if (!newProd.name || !newProd.price) {
      showToast("⚠️ Completează numele și prețul!");
      return;
    }
    if (isNaN(parseFloat(newProd.price))) {
      showToast("⚠️ Prețul trebuie să fie un număr!");
      return;
    }
    const prod = {
      id: Date.now(),
      name: newProd.name,
      desc: newProd.desc,
      price: parseFloat(newProd.price),
      emoji: newProd.emoji,
      veg: newProd.veg,
    };
    setCategories((prev) =>
      prev.map((c) =>
        c.id === activeCategory ? { ...c, products: [...c.products, prod] } : c,
      ),
    );
    setNewProd({ name: "", desc: "", price: "", emoji: "🍝", veg: false });
    setShowAddProd(false);
    showToast("✅ Produs adăugat!");
  };

  const saveProduct = () => {
    if (!editProduct.name || !editProduct.price) {
      showToast("⚠️ Completează numele și prețul!");
      return;
    }
    setCategories((prev) =>
      prev.map((c) => ({
        ...c,
        products: c.products.map((p) =>
          p.id === editProduct.id ? editProduct : p,
        ),
      })),
    );
    setEditProduct(null);
    showToast("✅ Produs salvat!");
  };

  const deleteProduct = (prodId) => {
    setCategories((prev) =>
      prev.map((c) => ({
        ...c,
        products: c.products.filter((p) => p.id !== prodId),
      })),
    );
    showToast("🗑️ Produs șters");
  };

  const handleSaveAll = () => {
    // În producție: salvăm în Supabase
    showToast("✅ Meniu salvat cu succes!");
  };

  return (
    <div className="page fade-in" style={{ paddingBottom: 100 }}>
      {/* Emoji picker */}
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

      {/* Modal adaugă categorie */}
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
            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
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
                placeholder="Ex: Paste, Pizza, Băuturi..."
                value={newCat.name}
                onChange={(e) =>
                  setNewCat((p) => ({ ...p, name: e.target.value }))
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
                style={{
                  padding: 12,
                  borderRadius: 12,
                  background: "linear-gradient(135deg,#c0622f,#8b3a18)",
                  border: "none",
                  color: "#fff",
                  fontFamily: "'Fraunces',serif",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Adaugă
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal adaugă produs */}
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
              Adaugă produs în {activeCat?.name}
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
                  Preț (lei)
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
                style={{
                  padding: 12,
                  borderRadius: 12,
                  background: "linear-gradient(135deg,#c0622f,#8b3a18)",
                  border: "none",
                  color: "#fff",
                  fontFamily: "'Fraunces',serif",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Adaugă
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal editare produs */}
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
                value={editProduct.desc}
                onChange={(e) =>
                  setEditProduct((p) => ({ ...p, desc: e.target.value }))
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
                  Preț (lei)
                </label>
                <input
                  type="number"
                  value={editProduct.price}
                  onChange={(e) =>
                    setEditProduct((p) => ({
                      ...p,
                      price: parseFloat(e.target.value) || 0,
                    }))
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
                  onClick={() => setEditProduct((p) => ({ ...p, veg: !p.veg }))}
                  style={{
                    padding: "12px 14px",
                    background: editProduct.veg
                      ? "rgba(74,110,74,.2)"
                      : "#1e1a14",
                    border: `1px solid ${editProduct.veg ? "rgba(74,110,74,.5)" : "#2a2218"}`,
                    borderRadius: 12,
                    cursor: "pointer",
                    textAlign: "center",
                    fontSize: 13,
                    color: editProduct.veg ? "#6b9e6b" : "#6b6050",
                    fontWeight: 600,
                  }}
                >
                  {editProduct.veg ? "✅ Da" : "○ Nu"}
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
                style={{
                  padding: 12,
                  borderRadius: 12,
                  background: "linear-gradient(135deg,#c0622f,#8b3a18)",
                  border: "none",
                  color: "#fff",
                  fontFamily: "'Fraunces',serif",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Salvează
              </button>
            </div>
          </div>
        </div>
      )}

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
            marginBottom: 14,
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
              {categories.reduce((s, c) => s + c.products.length, 0)} produse în{" "}
              {categories.length} categorii
            </div>
          </div>
        </div>
        <button
          onClick={handleSaveAll}
          style={{
            width: "100%",
            padding: 13,
            background: "linear-gradient(135deg,#4a6e4a,#2d4a2d)",
            border: "none",
            borderRadius: 14,
            color: "#fff",
            fontFamily: "'Fraunces',serif",
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          ✅ Salvează tot meniul
        </button>
      </div>

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
                  background: activeCategory === cat.id ? "#c0622f" : "#1e1a14",
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
                  ({cat.products.length})
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

        {/* Produse din categoria activă */}
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
            {activeCat?.emoji} {activeCat?.name} — {activeCat?.products?.length}{" "}
            produse
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

        {activeCat?.products?.length === 0 ? (
          <div
            style={{ textAlign: "center", padding: "40px 0", color: "#6b6050" }}
          >
            <div style={{ fontSize: 36, marginBottom: 10 }}>
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
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
                {/* Emoji */}
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
                {/* Info */}
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
                    {prod.veg && (
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
                  {prod.desc && (
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
                      {prod.desc}
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
                {/* Acțiuni */}
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
      </div>
    </div>
  );
}
