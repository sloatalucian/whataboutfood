import { useState, useEffect } from "react";
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
  useEffect(() => {
    if (!restId) return;
    const loadMenu = async () => {
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
    };
    loadMenu();
  }, [restId, showToast]);

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
                  </div>
                ))
              )}
            </div>

            <div
              style={{
                textAlign: "center",
                color: "#6b6050",
                fontSize: 12,
                marginTop: 20,
              }}
            >
              Pasul 1: vizualizare. Editarea, pozele și reordonarea vin în pașii
              următori.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
