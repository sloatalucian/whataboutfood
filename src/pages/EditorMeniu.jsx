import { useState, useEffect, useCallback } from "react";
import { useApp } from "../context/AppContext";
import { supabase } from "../supabase";

// EDITOR MENIU — Pas 1: schelet care CITESTE si afiseaza meniul.
// Independent: isi incarca singur restaurantele proprietarului, selecteaza
// automat primul, are selector daca sunt mai multe.
// Pasii urmatori adauga: CRUD produse, poze, CRUD categorii, drag&drop.
export function EditorMeniu() {
  const { navigate, showToast } = useApp();
  const { state } = useApp();
  const user = state.user;

  const [myRestaurants, setMyRestaurants] = useState([]);
  const [restId, setRestId] = useState(null);
  const [categories, setCategories] = useState([]); // [{id, name, category_order, items: [...]}]
  const [activeCatId, setActiveCatId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modal editare/adaugare produs.
  // editingItem = produsul editat, sau {} pentru produs nou (null = modal inchis)
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // produsul de sters

  const activeRest = myRestaurants.find((r) => r.id === restId) || null;
  const activeCat =
    categories.find((c) => c.id === activeCatId) || categories[0] || null;

  // 1. Incarca restaurantele proprietarului
  useEffect(() => {
    if (!user?.id) return;
    const loadRestaurants = async () => {
      const { data } = await supabase
        .from("restaurants")
        .select("id, name, emoji")
        .eq("owner_id", user.id)
        .eq("is_deleted", false)
        .order("created_at", { ascending: true });
      const rests = data || [];
      setMyRestaurants(rests);
      if (rests.length > 0) setRestId(rests[0].id);
      else setLoading(false);
    };
    loadRestaurants();
  }, [user?.id]);

  // 2. Incarca meniul (categorii + produse) pentru restaurantul selectat
  // Incarca meniul (categorii + produse) - reutilizabil dupa modificari
  const loadMenu = useCallback(async () => {
    if (!restId) return;
    setLoading(true);
    try {
      const { data: cats } = await supabase
        .from("menu_categories")
        .select("*")
        .eq("restaurant_id", restId)
        .order("category_order");
      if (!cats || cats.length === 0) {
        setCategories([]);
        setActiveCatId(null);
        setLoading(false);
        return;
      }
      const catsWithItems = await Promise.all(
        cats.map(async (cat) => {
          const { data: items } = await supabase
            .from("menu_items")
            .select("*")
            .eq("category_id", cat.id)
            .order("item_order");
          return { ...cat, items: items || [] };
        }),
      );
      setCategories(catsWithItems);
      setActiveCatId((prev) =>
        catsWithItems.find((c) => c.id === prev)
          ? prev
          : catsWithItems[0]?.id || null,
      );
    } catch {
      showToast("❌ Eroare la încărcarea meniului.");
    }
    setLoading(false);
  }, [restId, showToast]);

  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

  // Deschide modal pentru produs NOU in categoria activa
  const openNewItem = () => {
    if (!activeCat) return;
    setEditingItem({
      _isNew: true,
      category_id: activeCat.id,
      name: "",
      description: "",
      price: "",
      emoji: "🍽️",
      is_vegetarian: false,
      is_available: true,
    });
  };

  // Deschide modal pentru editarea unui produs existent
  const openEditItem = (item) => {
    setEditingItem({ ...item, _isNew: false });
  };

  // Salveaza produsul (insert sau update)
  const saveItem = async () => {
    if (!editingItem) return;
    const name = (editingItem.name || "").trim();
    const priceNum = parseFloat(editingItem.price);
    if (!name) {
      showToast("⚠️ Completează numele produsului.");
      return;
    }
    if (isNaN(priceNum) || priceNum < 0) {
      showToast("⚠️ Completează un preț valid.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name,
        description: (editingItem.description || "").trim() || null,
        price: priceNum,
        emoji: (editingItem.emoji || "🍽️").trim() || "🍽️",
        is_vegetarian: !!editingItem.is_vegetarian,
        is_available: editingItem.is_available !== false,
      };
      if (editingItem._isNew) {
        // item_order = ultimul + 1 in categorie
        const maxOrder = (activeCat?.items || []).reduce(
          (m, it) => Math.max(m, it.item_order ?? 0),
          -1,
        );
        const { error } = await supabase.from("menu_items").insert({
          ...payload,
          category_id: editingItem.category_id,
          item_order: maxOrder + 1,
        });
        if (error) throw error;
        showToast("✅ Produs adăugat!");
      } else {
        const { error } = await supabase
          .from("menu_items")
          .update(payload)
          .eq("id", editingItem.id);
        if (error) throw error;
        showToast("✅ Produs actualizat!");
      }
      setEditingItem(null);
      await loadMenu();
    } catch {
      showToast("❌ Eroare la salvare. Încearcă din nou.");
    }
    setSaving(false);
  };

  // Sterge un produs (dupa confirmare)
  const deleteItem = async () => {
    if (!deleteConfirm) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("menu_items")
        .delete()
        .eq("id", deleteConfirm.id);
      if (error) throw error;
      showToast("🗑️ Produs șters.");
      setDeleteConfirm(null);
      await loadMenu();
    } catch {
      showToast("❌ Eroare la ștergere.");
    }
    setSaving(false);
  };

  // Helper: actualizeaza un camp din produsul editat
  const updateField = (key, value) =>
    setEditingItem((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="page fade-in">
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "16px 16px 0",
        }}
      >
        <button
          onClick={() => navigate("home")}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            border: "none",
            background: "#1a1510",
            color: "#f0ebe3",
            fontSize: 18,
            cursor: "pointer",
            flexShrink: 0,
          }}
          aria-label="Înapoi"
        >
          ←
        </button>
        <h1
          style={{
            fontFamily: "'Fraunces',serif",
            fontWeight: 900,
            fontSize: 24,
            letterSpacing: "-0.01em",
            margin: 0,
          }}
        >
          Editor meniu
        </h1>
      </div>

      <div className="inner" style={{ paddingBottom: 100 }}>
        {/* Selector de restaurant (doar daca are mai multe) */}
        {myRestaurants.length > 1 && (
          <div className="form-group" style={{ marginTop: 16 }}>
            <label className="form-label">Restaurant</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {myRestaurants.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setRestId(r.id)}
                  style={{
                    padding: "9px 14px",
                    borderRadius: 12,
                    border: `1px solid ${r.id === restId ? "#c0622f" : "#2a2218"}`,
                    background:
                      r.id === restId ? "rgba(192,98,47,.15)" : "transparent",
                    color: r.id === restId ? "#c0622f" : "#8a7a6a",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  {r.emoji} {r.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Numele restaurantului activ */}
        {activeRest && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              margin: "18px 0 16px",
            }}
          >
            <span style={{ fontSize: 26 }}>{activeRest.emoji}</span>
            <span
              style={{
                fontFamily: "'Fraunces',serif",
                fontWeight: 900,
                fontSize: 22,
              }}
            >
              {activeRest.name}
            </span>
          </div>
        )}

        {loading ? (
          <div
            style={{
              textAlign: "center",
              color: "#8a7a6a",
              padding: "40px 0",
            }}
          >
            Se încarcă meniul...
          </div>
        ) : myRestaurants.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              color: "#8a7a6a",
              padding: "40px 20px",
            }}
          >
            Nu ai niciun restaurant. Creează întâi un restaurant.
          </div>
        ) : categories.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              color: "#8a7a6a",
              padding: "40px 20px",
            }}
          >
            Acest restaurant nu are încă nicio categorie în meniu.
            <br />
            <span style={{ fontSize: 13, color: "#6b6050" }}>
              (În pasul următor vei putea adăuga categorii și produse.)
            </span>
          </div>
        ) : (
          <>
            {/* Tab-uri categorii (derulabile lateral, ca in meniul clientului) */}
            <div
              style={{
                display: "flex",
                gap: 9,
                overflowX: "auto",
                paddingBottom: 6,
                marginBottom: 18,
                scrollbarWidth: "none",
              }}
            >
              {categories.map((cat) => {
                const on = cat.id === activeCat?.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCatId(cat.id)}
                    style={{
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      padding: "10px 16px",
                      borderRadius: 99,
                      background: on ? "#c0622f" : "#1e1a14",
                      border: `1px solid ${on ? "#c0622f" : "#2a2218"}`,
                      color: on ? "#fff" : "#8a7a6a",
                      fontSize: 12.5,
                      fontWeight: 700,
                      letterSpacing: "0.02em",
                      textTransform: "uppercase",
                      whiteSpace: "nowrap",
                      cursor: "pointer",
                    }}
                  >
                    {cat.emoji && <span>{cat.emoji}</span>}
                    {cat.name}
                    <span style={{ opacity: 0.7, fontSize: 11 }}>
                      {(cat.items || []).length}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Produsele din categoria activa */}
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              {(activeCat?.items || []).length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    color: "#6b6050",
                    fontSize: 13,
                    padding: "24px 0",
                  }}
                >
                  Nicio produs în această categorie.
                </div>
              ) : (
                (activeCat?.items || []).map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "flex-start",
                      background: "#1e1a14",
                      border: "1px solid #2a2218",
                      borderRadius: 16,
                      padding: 11,
                      opacity: item.is_available === false ? 0.5 : 1,
                    }}
                  >
                    {/* Miniatura: poza sau emoji */}
                    <div
                      style={{
                        width: 58,
                        height: 58,
                        borderRadius: 12,
                        overflow: "hidden",
                        flexShrink: 0,
                        background: "linear-gradient(135deg,#4a3322,#2a1d13)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 26,
                      }}
                    >
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        item.emoji || "🍽️"
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: 14,
                          lineHeight: 1.25,
                          marginBottom: 3,
                        }}
                      >
                        {item.name}
                        {item.is_vegetarian && (
                          <span
                            style={{
                              fontSize: 9,
                              padding: "2px 6px",
                              borderRadius: 8,
                              background: "rgba(74,110,74,.2)",
                              color: "#6b9e6b",
                              marginLeft: 6,
                              whiteSpace: "nowrap",
                            }}
                          >
                            🌿 Veg
                          </span>
                        )}
                        {item.is_available === false && (
                          <span
                            style={{
                              color: "#c0392b",
                              fontSize: 11,
                              fontWeight: 400,
                            }}
                          >
                            {" "}
                            · indisponibil
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <div
                          style={{
                            fontSize: 12,
                            color: "#8a7a6a",
                            lineHeight: 1.4,
                            marginBottom: 5,
                          }}
                        >
                          {item.description}
                        </div>
                      )}
                      <div
                        style={{
                          fontFamily: "'Fraunces',serif",
                          fontWeight: 700,
                          fontSize: 15,
                          color: "#c8a97e",
                        }}
                      >
                        {item.price} lei
                      </div>
                    </div>

                    {/* Butoane editare / stergere */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                        flexShrink: 0,
                      }}
                    >
                      <button
                        onClick={() => openEditItem(item)}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 9,
                          border: "none",
                          background: "#252018",
                          color: "#c8a97e",
                          fontSize: 13,
                          cursor: "pointer",
                        }}
                        aria-label="Editează produs"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(item)}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 9,
                          border: "none",
                          background: "rgba(192,57,43,.15)",
                          color: "#e07060",
                          fontSize: 13,
                          cursor: "pointer",
                        }}
                        aria-label="Șterge produs"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Buton adauga produs */}
            <button
              onClick={openNewItem}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                width: "100%",
                marginTop: 14,
                padding: 14,
                border: "1px dashed rgba(192,98,47,.4)",
                borderRadius: 14,
                background: "rgba(192,98,47,.06)",
                color: "#e07a47",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
                fontFamily: "'Plus Jakarta Sans',sans-serif",
              }}
            >
              + Adaugă produs în „{activeCat?.name}"
            </button>
          </>
        )}
      </div>

      {/* MODAL editare/adaugare produs */}
      {editingItem && (
        <div
          onClick={() => !saving && setEditingItem(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            padding: 16,
            overflowY: "auto",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#1a1510",
              border: "1px solid #2c2419",
              borderRadius: 20,
              padding: 22,
              maxWidth: 400,
              width: "100%",
              marginTop: 20,
              marginBottom: 20,
            }}
          >
            <h3
              style={{
                fontFamily: "'Fraunces',serif",
                fontWeight: 700,
                fontSize: 20,
                margin: "0 0 18px",
              }}
            >
              {editingItem._isNew ? "Adaugă produs" : "Editează produs"}
            </h3>

            <div className="form-group">
              <label className="form-label">Nume produs</label>
              <input
                className="form-input"
                type="text"
                value={editingItem.name}
                placeholder="ex: Combo Burrito"
                onChange={(e) => updateField("name", e.target.value)}
              />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Preț (lei)</label>
                <input
                  className="form-input"
                  type="number"
                  inputMode="decimal"
                  value={editingItem.price}
                  placeholder="0"
                  onChange={(e) => updateField("price", e.target.value)}
                />
              </div>
              <div className="form-group" style={{ width: 90 }}>
                <label className="form-label">Emoji</label>
                <input
                  className="form-input"
                  type="text"
                  value={editingItem.emoji}
                  onChange={(e) => updateField("emoji", e.target.value)}
                  style={{ textAlign: "center" }}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Descriere</label>
              <textarea
                className="form-input"
                rows={3}
                value={editingItem.description}
                placeholder="Ingrediente, gramaj, detalii..."
                onChange={(e) => updateField("description", e.target.value)}
                style={{ resize: "vertical", fontFamily: "inherit" }}
              />
            </div>

            {/* Toggle-uri */}
            <div style={{ display: "flex", gap: 10, marginBottom: 4 }}>
              <button
                onClick={() =>
                  updateField(
                    "is_available",
                    editingItem.is_available === false,
                  )
                }
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  padding: "11px 13px",
                  background: "#161210",
                  border: "1px solid #2a2218",
                  borderRadius: 11,
                  cursor: "pointer",
                  color: "#f0ebe3",
                  fontFamily: "inherit",
                  fontSize: 13,
                }}
              >
                <Switch on={editingItem.is_available !== false} />
                Disponibil
              </button>
              <button
                onClick={() =>
                  updateField("is_vegetarian", !editingItem.is_vegetarian)
                }
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  padding: "11px 13px",
                  background: "#161210",
                  border: "1px solid #2a2218",
                  borderRadius: 11,
                  cursor: "pointer",
                  color: "#f0ebe3",
                  fontFamily: "inherit",
                  fontSize: 13,
                }}
              >
                <Switch on={!!editingItem.is_vegetarian} green />
                🌿 Veg
              </button>
            </div>

            {/* Butoane modal */}
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button
                onClick={() => setEditingItem(null)}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: 13,
                  borderRadius: 12,
                  border: "none",
                  background: "#252018",
                  color: "#8a7a6a",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Anulează
              </button>
              <button
                onClick={saveItem}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: 13,
                  borderRadius: 12,
                  border: "none",
                  background: "linear-gradient(135deg,#e07a47,#8b3a18)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: saving ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? "Se salvează..." : "Salvează"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMARE stergere */}
      {deleteConfirm && (
        <div
          onClick={() => !saving && setDeleteConfirm(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            background: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#1a1510",
              border: "1px solid #2c2419",
              borderRadius: 20,
              padding: 24,
              maxWidth: 340,
              width: "100%",
            }}
          >
            <h3
              style={{
                fontFamily: "'Fraunces',serif",
                fontWeight: 700,
                fontSize: 18,
                margin: "0 0 8px",
              }}
            >
              Ștergi produsul?
            </h3>
            <p
              style={{
                fontSize: 13.5,
                color: "#8a7a6a",
                margin: "0 0 20px",
                lineHeight: 1.5,
              }}
            >
              „{deleteConfirm.name}" va fi șters definitiv din meniu.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 11,
                  border: "none",
                  background: "#252018",
                  color: "#8a7a6a",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Anulează
              </button>
              <button
                onClick={deleteItem}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 11,
                  border: "none",
                  background: "#c0392b",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: saving ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? "Se șterge..." : "Șterge"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Mic switch vizual pentru toggle-uri
function Switch({ on, green }) {
  return (
    <span
      style={{
        width: 36,
        height: 21,
        borderRadius: 99,
        background: on ? (green ? "#6b9e6b" : "#c0622f") : "#252018",
        position: "relative",
        flexShrink: 0,
        transition: "background .2s",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: on ? 17 : 2,
          width: 17,
          height: 17,
          borderRadius: "50%",
          background: "#fff",
          transition: "left .2s",
        }}
      />
    </span>
  );
}
