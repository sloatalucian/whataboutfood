import { useState, useEffect, useCallback } from "react";
import imageCompression from "browser-image-compression";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Modal categorie: {_isNew, id?, name} sau null (inchis)
  const [editingCat, setEditingCat] = useState(null);
  const [deleteCatConfirm, setDeleteCatConfirm] = useState(null); // categoria de sters

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
        image_url: editingItem.image_url || null,
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

  // ─── Categorii ───
  const openNewCat = () => setEditingCat({ _isNew: true, name: "" });
  const openEditCat = (cat) =>
    setEditingCat({ _isNew: false, id: cat.id, name: cat.name });

  const saveCat = async () => {
    if (!editingCat) return;
    const name = (editingCat.name || "").trim();
    if (!name) {
      showToast("⚠️ Completează numele categoriei.");
      return;
    }
    setSaving(true);
    try {
      if (editingCat._isNew) {
        const maxOrder = categories.reduce(
          (m, c) => Math.max(m, c.category_order ?? 0),
          -1,
        );
        const { data, error } = await supabase
          .from("menu_categories")
          .insert({
            restaurant_id: restId,
            name,
            category_order: maxOrder + 1,
          })
          .select()
          .single();
        if (error) throw error;
        showToast("✅ Categorie adăugată!");
        setEditingCat(null);
        await loadMenu();
        if (data?.id) setActiveCatId(data.id); // sari pe categoria noua
        setSaving(false);
        return;
      } else {
        const { error } = await supabase
          .from("menu_categories")
          .update({ name })
          .eq("id", editingCat.id);
        if (error) throw error;
        showToast("✅ Categorie actualizată!");
      }
      setEditingCat(null);
      await loadMenu();
    } catch {
      showToast("❌ Eroare la salvare. Încearcă din nou.");
    }
    setSaving(false);
  };

  // Sterge categoria SI toate produsele din ea (cascada)
  const deleteCat = async () => {
    if (!deleteCatConfirm) return;
    setSaving(true);
    try {
      // 1. sterge produsele categoriei
      const { error: itemsErr } = await supabase
        .from("menu_items")
        .delete()
        .eq("category_id", deleteCatConfirm.id);
      if (itemsErr) throw itemsErr;
      // 2. sterge categoria
      const { error: catErr } = await supabase
        .from("menu_categories")
        .delete()
        .eq("id", deleteCatConfirm.id);
      if (catErr) throw catErr;
      showToast("🗑️ Categorie ștearsă.");
      setDeleteCatConfirm(null);
      // muta pe alta categorie daca am sters-o pe cea activa
      if (activeCatId === deleteCatConfirm.id) {
        const remaining = categories.filter(
          (c) => c.id !== deleteCatConfirm.id,
        );
        setActiveCatId(remaining[0]?.id || null);
      }
      await loadMenu();
    } catch {
      showToast("❌ Eroare la ștergere.");
    }
    setSaving(false);
  };

  const updateCatField = (value) =>
    setEditingCat((prev) => ({ ...prev, name: value }));

  // ─── Drag & drop ───
  // Sensori: pointer (mouse) + touch (telefon) + tastatura (accesibilitate).
  // activationConstraint previne declansarea accidentala la scroll/tap.
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Reordonare PRODUSE in categoria activa
  const handleProductDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !activeCat) return;
    const items = activeCat.items || [];
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(items, oldIndex, newIndex);
    // Update optimist in UI (instant)
    setCategories((prev) =>
      prev.map((c) => (c.id === activeCat.id ? { ...c, items: reordered } : c)),
    );
    // Salveaza noul item_order in DB
    try {
      await Promise.all(
        reordered.map((it, idx) =>
          supabase
            .from("menu_items")
            .update({ item_order: idx })
            .eq("id", it.id),
        ),
      );
    } catch {
      showToast("❌ Eroare la salvarea ordinii.");
      loadMenu(); // revine la starea din DB
    }
  };

  // Reordonare CATEGORII (tab-uri)
  const handleCategoryDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = categories.findIndex((c) => c.id === active.id);
    const newIndex = categories.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(categories, oldIndex, newIndex);
    setCategories(reordered); // optimist
    try {
      await Promise.all(
        reordered.map((c, idx) =>
          supabase
            .from("menu_categories")
            .update({ category_order: idx })
            .eq("id", c.id),
        ),
      );
    } catch {
      showToast("❌ Eroare la salvarea ordinii.");
      loadMenu();
    }
  };

  // Upload poza produs: comprima -> incarca in Storage -> seteaza image_url
  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite re-selectarea aceluiasi fisier
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.8,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
      });
      // nume unic de fisier (produsul nou n-are inca id)
      const ext = (file.name?.split(".").pop() || "jpg").toLowerCase();
      const baseId = editingItem.id || `new_${Date.now()}`;
      const path = `${restId}/${baseId}_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("menu-items")
        .upload(path, compressed, {
          upsert: true,
          contentType: compressed.type || file.type,
        });
      if (upErr) throw upErr;
      const {
        data: { publicUrl },
      } = supabase.storage.from("menu-items").getPublicUrl(path);
      updateField("image_url", publicUrl);
      showToast("✅ Poză încărcată!");
    } catch {
      showToast("❌ Eroare la încărcarea pozei.");
    }
    setUploadingPhoto(false);
  };

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
            <button
              onClick={openNewCat}
              style={{
                marginTop: 18,
                padding: "12px 22px",
                borderRadius: 14,
                border: "none",
                background: "linear-gradient(135deg,#e07a47,#8b3a18)",
                color: "#fff",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              + Adaugă prima categorie
            </button>
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
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleCategoryDragEnd}
              >
                <SortableContext
                  items={categories.map((c) => c.id)}
                  strategy={horizontalListSortingStrategy}
                >
                  {categories.map((cat) => (
                    <SortableTab
                      key={cat.id}
                      cat={cat}
                      active={cat.id === activeCat?.id}
                      onSelect={() => setActiveCatId(cat.id)}
                    />
                  ))}
                </SortableContext>
              </DndContext>

              {/* Buton adauga categorie */}
              <button
                onClick={openNewCat}
                style={{
                  flexShrink: 0,
                  padding: "10px 16px",
                  borderRadius: 99,
                  background: "transparent",
                  border: "1px dashed rgba(192,98,47,.45)",
                  color: "#e07a47",
                  fontSize: 12.5,
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                }}
              >
                + Categorie
              </button>
            </div>

            {/* Actiuni pentru categoria activa */}
            {activeCat && (
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginBottom: 16,
                  marginTop: -6,
                }}
              >
                <button
                  onClick={() => openEditCat(activeCat)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 12px",
                    borderRadius: 9,
                    border: "1px solid #2a2218",
                    background: "#1e1a14",
                    color: "#c8a97e",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  ✏️ Redenumește „{activeCat.name}"
                </button>
                <button
                  onClick={() => setDeleteCatConfirm(activeCat)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 12px",
                    borderRadius: 9,
                    border: "1px solid rgba(192,57,43,.3)",
                    background: "rgba(192,57,43,.1)",
                    color: "#e07060",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  🗑 Șterge categoria
                </button>
              </div>
            )}

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
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleProductDragEnd}
                >
                  <SortableContext
                    items={(activeCat?.items || []).map((i) => i.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {(activeCat?.items || []).map((item) => (
                      <SortableProduct
                        key={item.id}
                        item={item}
                        onEdit={() => openEditItem(item)}
                        onDelete={() => setDeleteConfirm(item)}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
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

            {/* Zona poza produs */}
            <label
              style={{
                position: "relative",
                display: "block",
                width: "100%",
                height: 150,
                borderRadius: 14,
                overflow: "hidden",
                marginBottom: 16,
                cursor: uploadingPhoto ? "wait" : "pointer",
                border: "1px solid #2a2218",
                background: editingItem.image_url
                  ? "transparent"
                  : "linear-gradient(135deg,#4a3322,#2a1d13)",
              }}
            >
              {editingItem.image_url ? (
                <img
                  src={editingItem.image_url}
                  alt="Poză produs"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    color: "#c8a97e",
                  }}
                >
                  <span style={{ fontSize: 32 }}>📷</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>
                    Adaugă o poză (opțional)
                  </span>
                </div>
              )}
              {/* overlay text cand exista poza */}
              {editingItem.image_url && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(to top, rgba(0,0,0,.6), transparent 50%)",
                    display: "flex",
                    alignItems: "flex-end",
                    padding: 12,
                  }}
                >
                  <span
                    style={{ fontSize: 12, fontWeight: 600, color: "#fff" }}
                  >
                    📷 Schimbă poza
                  </span>
                </div>
              )}
              {/* spinner la upload */}
              {uploadingPhoto && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(0,0,0,.6)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  Se încarcă...
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                disabled={uploadingPhoto}
                style={{ display: "none" }}
              />
            </label>

            {/* buton stergere poza */}
            {editingItem.image_url && !uploadingPhoto && (
              <button
                onClick={() => updateField("image_url", null)}
                style={{
                  display: "block",
                  margin: "-8px 0 14px auto",
                  padding: "4px 10px",
                  borderRadius: 8,
                  border: "none",
                  background: "transparent",
                  color: "#8a7a6a",
                  fontSize: 12,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                🗑 Elimină poza
              </button>
            )}

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

      {/* MODAL editare/adaugare categorie */}
      {editingCat && (
        <div
          onClick={() => !saving && setEditingCat(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
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
              padding: 22,
              maxWidth: 380,
              width: "100%",
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
              {editingCat._isNew ? "Adaugă categorie" : "Redenumește categoria"}
            </h3>

            <div className="form-group">
              <label className="form-label">Nume categorie</label>
              <input
                className="form-input"
                type="text"
                value={editingCat.name}
                placeholder="ex: Aperitivos, Deserturi..."
                onChange={(e) => updateCatField(e.target.value)}
                autoFocus
              />
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button
                onClick={() => setEditingCat(null)}
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
                onClick={saveCat}
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

      {/* CONFIRMARE stergere categorie (cu produsele ei) */}
      {deleteCatConfirm && (
        <div
          onClick={() => !saving && setDeleteCatConfirm(null)}
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
              maxWidth: 360,
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
              Ștergi categoria?
            </h3>
            <p
              style={{
                fontSize: 13.5,
                color: "#8a7a6a",
                margin: "0 0 8px",
                lineHeight: 1.5,
              }}
            >
              Categoria „{deleteCatConfirm.name}" va fi ștearsă definitiv.
            </p>
            {(deleteCatConfirm.items || []).length > 0 && (
              <p
                style={{
                  fontSize: 13,
                  color: "#e07060",
                  margin: "0 0 20px",
                  lineHeight: 1.5,
                  padding: "10px 12px",
                  background: "rgba(192,57,43,.1)",
                  borderRadius: 10,
                  border: "1px solid rgba(192,57,43,.25)",
                }}
              >
                ⚠️ Vor fi șterse și cele{" "}
                <b>{(deleteCatConfirm.items || []).length} produse</b> din ea.
                Această acțiune nu poate fi anulată.
              </p>
            )}
            {(deleteCatConfirm.items || []).length === 0 && (
              <div style={{ marginBottom: 12 }} />
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setDeleteCatConfirm(null)}
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
                onClick={deleteCat}
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
                {saving ? "Se șterge..." : "Șterge tot"}
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

// ─── Produs sortabil (drag & drop cu maner) ───
function SortableProduct({ item, onEdit, onDelete }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    display: "flex",
    gap: 10,
    alignItems: "flex-start",
    background: "#1e1a14",
    border: `1px solid ${isDragging ? "#c0622f" : "#2a2218"}`,
    borderRadius: 16,
    padding: 11,
    opacity: isDragging ? 0.85 : item.is_available === false ? 0.5 : 1,
    boxShadow: isDragging ? "0 12px 30px rgba(0,0,0,.5)" : "none",
    zIndex: isDragging ? 10 : "auto",
    position: "relative",
  };

  return (
    <div ref={setNodeRef} style={style}>
      {/* Maner de drag */}
      <button
        {...attributes}
        {...listeners}
        style={{
          flexShrink: 0,
          width: 28,
          alignSelf: "stretch",
          border: "none",
          background: "transparent",
          color: "#6b6050",
          fontSize: 18,
          cursor: "grab",
          touchAction: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
        }}
        aria-label="Trage pentru reordonare"
      >
        ⠿
      </button>

      {/* Miniatura: poza sau emoji */}
      <div
        style={{
          width: 110,
          height: 80,
          borderRadius: 12,
          overflow: "hidden",
          flexShrink: 0,
          background: "linear-gradient(135deg,#4a3322,#2a1d13)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 36,
        }}
      >
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
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
            <span style={{ color: "#c0392b", fontSize: 11, fontWeight: 400 }}>
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
          onClick={onEdit}
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
          onClick={onDelete}
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
  );
}

// ─── Tab categorie sortabil (drag & drop orizontal) ───
function SortableTab({ cat, active, onSelect }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: cat.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "10px 14px",
    borderRadius: 99,
    background: active ? "#c0622f" : "#1e1a14",
    border: `1px solid ${isDragging ? "#e07a47" : active ? "#c0622f" : "#2a2218"}`,
    color: active ? "#fff" : "#8a7a6a",
    fontSize: 12.5,
    fontWeight: 700,
    letterSpacing: "0.02em",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
    opacity: isDragging ? 0.85 : 1,
    boxShadow: isDragging ? "0 8px 20px rgba(0,0,0,.4)" : "none",
    zIndex: isDragging ? 10 : "auto",
  };

  return (
    <div ref={setNodeRef} style={style}>
      {/* Maner de drag */}
      <span
        {...attributes}
        {...listeners}
        style={{
          cursor: "grab",
          touchAction: "none",
          color: active ? "rgba(255,255,255,.6)" : "#6b6050",
          fontSize: 14,
          display: "flex",
          alignItems: "center",
        }}
        aria-label="Trage pentru reordonare"
      >
        ⠿
      </span>
      {/* Numele - click pentru selectare */}
      <button
        onClick={onSelect}
        style={{
          border: "none",
          background: "transparent",
          color: "inherit",
          font: "inherit",
          letterSpacing: "inherit",
          textTransform: "inherit",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: 0,
        }}
      >
        {cat.emoji && <span>{cat.emoji}</span>}
        {cat.name}
        <span style={{ opacity: 0.7, fontSize: 11 }}>
          {(cat.items || []).length}
        </span>
      </button>
    </div>
  );
}
