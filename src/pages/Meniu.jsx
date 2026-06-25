import { useState, useRef, useEffect } from "react";
import ActiveOrderCard from "../components/ActiveOrderCard";
import { useApp } from "../context/AppContext";
import { useTable } from "../context/TableContext";
import { supabase } from "../supabase";

export function Meniu() {
  const {
    state,
    dispatch,
    navigate,
    showToast,
    cartTotal,
    cartCount,
    placeOrderRef,
    requestBillRef,
    setPayNoteShow,
    setPayNoteActiveOrder,
    waiterCalled,
    waiterCooldown,
    callWaiter: callWaiterGlobal,
    setPaidTotal,
  } = useApp();
  const { reload: reloadTables } = useTable();
  const {
    selectedRest,
    cart,
    orderTableNum,
    tableSessionId,
    activeMenuCat,
    showPayment,
    paid,
    payMethod,
    orders,
    user,
  } = state;

  const [dbCategories, setDbCategories] = useState([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [activeOrder, setActiveOrder] = useState(null);
  const [showPayNote, setShowPayNote] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSent, setReviewSent] = useState(false);
  const [payNoteLoading, setPayNoteLoading] = useState(false);

  useEffect(() => {
    if (!selectedRest?.id) return;
    const loadMenu = async () => {
      setMenuLoading(true);
      try {
        const { data: cats, error: catsError } = await supabase
          .from("menu_categories")
          .select("*")
          .eq("restaurant_id", selectedRest.id)
          .order("category_order");
        if (!cats || cats.length === 0) {
          setDbCategories([]);
          setMenuLoading(false);
          return;
        }
        const catsWithItems = await Promise.all(
          cats.map(async (cat) => {
            const { data: items } = await supabase
              .from("menu_items")
              .select("*")
              .eq("category_id", cat.id)
              .eq("is_available", true)
              .order("item_order");
            return { ...cat, items: items || [] };
          }),
        );
        setDbCategories(catsWithItems);
        if (catsWithItems.length > 0) {
          dispatch({ type: "SET_MENU_CAT", payload: catsWithItems[0].id });
        }
      } catch (err) {}
      setMenuLoading(false);
    };
    loadMenu();
  }, [selectedRest?.id]);

  // Urmărește comanda activă a clientului în timp real
  useEffect(() => {
    if (!user?.id || !selectedRest?.id) return;
    const loadActiveOrder = async () => {
      // Filtrăm strict după tableSessionId - doar comenzile sesiunii curente
      let query = supabase
        .from("orders")
        .select("*")
        .eq("user_id", user.id)
        .eq("restaurant_id", selectedRest.id)
        .in("status", ["pending", "cooking", "ready", "paying"])
        .order("created_at", { ascending: false });

      if (tableSessionId) {
        query = query.eq("table_session_id", tableSessionId);
      }

      const { data } = await query;

      if (data && data.length > 0) {
        const statusPriority = { paying: 4, ready: 3, cooking: 2, pending: 1 };
        const latestOrder = data.reduce(
          (best, o) =>
            (statusPriority[o.status] || 0) > (statusPriority[best.status] || 0)
              ? o
              : best,
          data[0],
        );
        setActiveOrder(latestOrder);
      } else {
        // Comanda a disparut (ospatar a confirmat plata) -> resetam sesiunea
        setActiveOrder((prev) => {
          if (prev?.status === "paying") {
            // Plata confirmata - dispatch in setTimeout ca sa avem acces la prev
            const method = prev.payment_method;
            const restId = selectedRest?.id || null;
            const sessId = tableSessionId || null;
            setTimeout(() => {
              dispatch({
                type: "SET_PAID",
                payload: {
                  paid: true,
                  method,
                  restaurantId: restId,
                  sessionId: sessId,
                  total: activeOrder?.total || null,
                },
              });
              dispatch({ type: "RESET_TABLE_SESSION" });
            }, 0);
          }
          return null;
        });
      }
    };
    loadActiveOrder();

    // Polling la fiecare 5 secunde
    const interval = setInterval(loadActiveOrder, 5000);
    return () => clearInterval(interval);
  }, [user?.id, selectedRest?.id, tableSessionId]);

  const requestBill = async (method) => {
    if (!activeOrder) return;
    setPaidTotal(activeOrder.total || null);
    setPayNoteLoading(true);
    try {
      // Actualizează TOATE comenzile sesiunii curente la "paying"
      // Folosim table_session_id dacă există, altfel table_label
      let orderQuery = supabase
        .from("orders")
        .update({ status: "paying", payment_method: method })
        .eq("restaurant_id", selectedRest.id)
        .in("status", ["pending", "cooking", "ready"]);
      if (tableSessionId) {
        orderQuery = orderQuery.eq("table_session_id", tableSessionId);
      } else {
        orderQuery = orderQuery.eq("table_label", activeOrder.table_label);
      }
      const { error } = await orderQuery;
      if (error) throw error;

      // Actualizează statusul mesei la "paid" (albastru) — după table_session_id
      if (tableSessionId && selectedRest?.id) {
        await supabase
          .from("table_sessions")
          .update({ status: "paid", paid_at: new Date().toISOString() })
          .eq("restaurant_id", selectedRest.id)
          .eq("table_session_id", tableSessionId)
          .eq("status", "occupied");
      }

      setActiveOrder((prev) => ({
        ...prev,
        status: "paying",
        payment_method: method,
      }));
      setShowPayNote(false);
      reloadTables(); // Reîncarcă statusurile meselor
      showToast("🧾 Nota cerută! Ospătarul vine în curând.");
    } catch (err) {
      showToast("❌ Eroare. Încearcă din nou.");
    }
    setPayNoteLoading(false);
  };
  requestBillRef.current = requestBill;

  // Sync payNote state to global context
  useEffect(() => {
    setPayNoteShow(showPayNote);
  }, [showPayNote]);

  useEffect(() => {
    setPayNoteActiveOrder(activeOrder);
  }, [activeOrder]);

  if (!selectedRest) {
    navigate("home");
    return null;
  }

  const activeCatObj =
    dbCategories.find((c) => c.id === activeMenuCat) || dbCategories[0];
  const cartQty = (id) => cart.find((i) => i.id === id)?.qty || 0;
  const hasTable = orderTableNum && orderTableNum !== 1;

  const [orderLoading, setOrderLoading] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [cartObs, setCartObs] = useState("");
  const [menuSearch, setMenuSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const searchInputRef = useRef(null);

  const allMenuItems = dbCategories.flatMap((cat) =>
    (cat.items || []).map((item) => ({
      ...item,
      catName: cat.name,
      catEmoji: cat.emoji,
    })),
  );
  const searchResults =
    menuSearch.trim().length > 0
      ? allMenuItems.filter(
          (item) =>
            item.name.toLowerCase().includes(menuSearch.toLowerCase()) ||
            (item.description || "")
              .toLowerCase()
              .includes(menuSearch.toLowerCase()),
        )
      : [];

  const placeOrder = async (observations = "") => {
    if (!cart.length) return;
    if (!hasTable) {
      showToast("⚠️ Selectează mai întâi masa!");
      navigate("selectTable");
      return;
    }
    if (orderLoading) return;
    setOrderLoading(true);

    const newTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);

    try {
      // Dacă există comandă activă pe aceeași sesiune — adaugăm produsele la ea
      if (activeOrder?.id && tableSessionId) {
        const existingItems = (activeOrder.items || []).map((i) => ({
          ...i,
          is_new: false,
        }));
        const isConfirmed = ["cooking", "ready"].includes(activeOrder.status);
        // Produsele noi apar DISTINCT cu is_new: true - ospatarul vede clar ce e nou
        const newItems = cart.map((i) => ({ ...i, is_new: isConfirmed }));
        const mergedItems = [...existingItems, ...newItems];
        const mergedTotal = Number(activeOrder.total || 0) + newTotal;
        const updatePayload = {
          items: mergedItems,
          total: mergedTotal,
          observations: observations || activeOrder.observations || null,
        };
        if (isConfirmed) updatePayload.has_new_items = true;
        const { error } = await supabase
          .from("orders")
          .update(updatePayload)
          .eq("id", activeOrder.id);
        if (error) throw error;
        dispatch({ type: "CART_CLEAR" });
        showToast(
          isConfirmed ? "🆕 Produse noi trimise!" : "✅ Produse adaugate!",
        );
      } else {
        // Prima comandă a sesiunii — INSERT
        const { data, error } = await supabase
          .from("orders")
          .insert({
            restaurant_id: selectedRest.id,
            user_id: user?.id || null,
            table_label: orderTableNum,
            table_session_id: tableSessionId || null,
            items: cart,
            observations: observations || null,
            status: "pending",
            total: newTotal,
            payment_method: null,
          })
          .select()
          .single();
        if (error) throw error;
        dispatch({ type: "CART_CLEAR" });
        showToast("✅ Comanda trimisă!");
      }
    } catch (err) {
      showToast("❌ Eroare la trimiterea comenzii. Încearcă din nou.");
    } finally {
      setOrderLoading(false);
    }
  };
  placeOrderRef.current = placeOrder;

  if (paid) {
    navigate("home");
    return null;
  }

  if (showPayment) {
    const pastOrders = orders.filter(
      (o) => o.table === orderTableNum || o.tableLabel === orderTableNum,
    );
    const allItems = pastOrders
      .flatMap((o) => o.items)
      .reduce((acc, item) => {
        const ex = acc.find((i) => i.id === item.id);
        if (ex) ex.qty += item.qty;
        else acc.push({ ...item });
        return acc;
      }, []);
    const total = allItems.reduce((s, i) => s + i.price * i.qty, 0);
    return (
      <div
        className="page"
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(6px)",
          paddingBottom: 0,
        }}
      >
        <style>{`
          @keyframes paySheetUp {
            0%   { transform: translateY(100%); opacity: 0; }
            100% { transform: translateY(0); opacity: 1; }
          }
        `}</style>
        <div
          style={{ flex: 1 }}
          onClick={() => dispatch({ type: "SET_PAYMENT", payload: false })}
        />
        <div
          style={{
            background: "#111009",
            borderRadius: "24px 24px 0 0",
            borderTop: "1px solid #2a2218",
            padding: "0 20px 32px",
            animation: "paySheetUp 0.4s cubic-bezier(.23,1,.32,1) both",
            maxHeight: "85vh",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              width: 36,
              height: 3,
              borderRadius: 2,
              background: "#2a2218",
              margin: "12px auto 20px",
            }}
          />
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              marginBottom: 18,
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "'Fraunces',serif",
                  fontSize: 20,
                  fontWeight: 700,
                  color: "#f0ebe3",
                }}
              >
                Nota de plată
              </div>
              <div style={{ fontSize: 12, color: "#8a7a6a", marginTop: 3 }}>
                Masa {orderTableNum} • {allItems.reduce((s, i) => s + i.qty, 0)}{" "}
                produse
              </div>
            </div>
            <div
              style={{
                fontFamily: "'Fraunces',serif",
                fontSize: 26,
                fontWeight: 700,
                color: "#c0622f",
              }}
            >
              {total} lei
            </div>
          </div>
          <div
            style={{
              background: "#161210",
              border: "1px solid #2a2218",
              borderRadius: 16,
              padding: "12px 16px",
              marginBottom: 20,
            }}
          >
            {allItems.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 13,
                  color: "#8a7a6a",
                  marginBottom: 8,
                  alignItems: "center",
                }}
              >
                <span>
                  {item.emoji} {item.name} ×{item.qty}
                </span>
                <span style={{ color: "#f0ebe3", fontWeight: 500 }}>
                  {item.price * item.qty} lei
                </span>
              </div>
            ))}
            <div
              style={{
                borderTop: "1px solid #2a2218",
                marginTop: 8,
                paddingTop: 10,
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 600, color: "#f0ebe3" }}>
                Total
              </span>
              <span style={{ fontSize: 16, fontWeight: 700, color: "#c0622f" }}>
                {total} lei
              </span>
            </div>
          </div>
          <div
            style={{
              fontSize: 11,
              color: "#8a7a6a",
              letterSpacing: "1px",
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            Metoda de plată
          </div>
          <div style={{ display: "flex", gap: 12, marginBottom: 18 }}>
            {[
              { method: "cash", icon: "💵", label: "Cash", sub: "La casă" },
              { method: "card", icon: "💳", label: "Card", sub: "La POS" },
            ].map((p) => (
              <button
                key={p.method}
                onClick={() => {
                  setPaidTotal(total);
                  dispatch({
                    type: "SET_PAID",
                    payload: {
                      paid: true,
                      method: p.method,
                      restaurantId: selectedRest?.id || null,
                      sessionId: tableSessionId || null,
                    },
                  });
                }}
                onTouchStart={(e) =>
                  (e.currentTarget.style.background = "#221c14")
                }
                onTouchEnd={(e) =>
                  (e.currentTarget.style.background = "#1a1510")
                }
                style={{
                  flex: 1,
                  background: "#1a1510",
                  border: "1px solid #2a2218",
                  borderRadius: 16,
                  padding: "14px 12px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  cursor: "pointer",
                  transition: "background 0.2s",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: "#221a10",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 24,
                    flexShrink: 0,
                  }}
                >
                  {p.icon}
                </div>
                <div>
                  <div
                    style={{ fontSize: 15, fontWeight: 700, color: "#f0ebe3" }}
                  >
                    {p.label}
                  </div>
                  <div style={{ fontSize: 11, color: "#8a7a6a", marginTop: 2 }}>
                    {p.sub}
                  </div>
                </div>
              </button>
            ))}
          </div>
          <div style={{ textAlign: "center" }}>
            <button
              onClick={() => dispatch({ type: "SET_PAYMENT", payload: false })}
              style={{
                background: "none",
                border: "none",
                fontSize: 13,
                color: "#6b6050",
                cursor: "pointer",
                textDecoration: "underline",
                textUnderlineOffset: 3,
              }}
            >
              Anulează
            </button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="page fade-in">
      <div
        style={{ padding: "44px 20px 20px", background: selectedRest.cover }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <button
            onClick={() => navigate("restaurant")}
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: "rgba(0,0,0,.3)",
              border: "1px solid rgba(255,255,255,.15)",
              color: "#fff",
              fontSize: 17,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ←
          </button>
          {hasTable ? (
            <div
              style={{
                background: "rgba(255,255,255,.1)",
                padding: "7px 16px",
                borderRadius: 50,
                fontSize: 13,
                color: "#fff",
              }}
            >
              🪑 Masa <strong>{orderTableNum}</strong>
            </div>
          ) : (
            <button
              onClick={() => navigate("selectTable")}
              style={{
                background: "rgba(192,98,47,.3)",
                border: "1px solid rgba(192,98,47,.5)",
                padding: "7px 14px",
                borderRadius: 50,
                fontSize: 12,
                color: "#fff",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              ⚠️ Selectează masa
            </button>
          )}
        </div>
        <div
          style={{
            fontFamily: "'Fraunces',serif",
            fontSize: 26,
            fontWeight: 900,
          }}
        >
          {selectedRest.emoji} {selectedRest.name}
        </div>
      </div>
      <div
        className="inner"
        style={{ paddingBottom: cart.length > 0 ? 160 : 90 }}
      >
        {/* ── Status Bar Comandă Activă ── */}
        <ActiveOrderCard
          activeOrder={activeOrder}
          waiterCalled={waiterCalled}
          waiterCooldown={waiterCooldown}
          callWaiter={() => callWaiterGlobal(activeOrder)}
          onCereNota={() => setShowPayNote(true)}
        />

        {/* Loading */}
        {menuLoading ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px 0",
              color: "var(--muted)",
              fontSize: 13,
            }}
          >
            Se încarcă meniul...
          </div>
        ) : dbCategories.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🍽️</div>
            <div style={{ fontSize: 14, color: "var(--muted)" }}>
              Meniul nu este disponibil momentan.
            </div>
          </div>
        ) : (
          <>
            {/* Search bar */}
            <div style={{ position: "relative", marginBottom: 14 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: "var(--card2)",
                  border: `1px solid ${searchFocused ? "var(--terra)" : "var(--border)"}`,
                  borderRadius: 50,
                  padding: "10px 16px",
                  transition: "border-color .2s",
                }}
              >
                {searchFocused || menuSearch ? (
                  <button
                    onClick={() => {
                      setMenuSearch("");
                      setSearchFocused(false);
                      searchInputRef.current?.blur();
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--terra)",
                      fontSize: 18,
                      padding: 0,
                      display: "flex",
                      alignItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    ←
                  </button>
                ) : (
                  <span
                    style={{
                      color: "var(--muted)",
                      fontSize: 15,
                      flexShrink: 0,
                    }}
                  >
                    🔍
                  </span>
                )}
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Caută în meniu..."
                  value={menuSearch}
                  onChange={(e) => setMenuSearch(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => {
                    if (!menuSearch) setSearchFocused(false);
                  }}
                  maxLength={60}
                  style={{
                    flex: 1,
                    background: "none",
                    border: "none",
                    outline: "none",
                    color: "var(--cream)",
                    fontSize: 14,
                    fontFamily: "inherit",
                  }}
                />
                {menuSearch.length > 0 && (
                  <button
                    onClick={() => setMenuSearch("")}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--muted)",
                      fontSize: 16,
                      padding: 0,
                      display: "flex",
                      alignItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Sugestii search */}
              {searchResults.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 6px)",
                    left: 0,
                    right: 0,
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 16,
                    zIndex: 50,
                    overflow: "hidden",
                    boxShadow: "0 8px 24px rgba(0,0,0,.3)",
                  }}
                >
                  {searchResults.slice(0, 6).map((item) => {
                    const qty = cartQty(item.id);
                    return (
                      <div
                        key={item.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "12px 16px",
                          borderBottom: "1px solid var(--border)",
                          cursor: "pointer",
                        }}
                        onClick={() => {
                          const cat = dbCategories.find(
                            (c) => c.id === item.category_id,
                          );
                          if (cat)
                            dispatch({ type: "SET_MENU_CAT", payload: cat.id });
                          setMenuSearch("");
                          setSearchFocused(false);
                          searchInputRef.current?.blur();
                        }}
                      >
                        <span style={{ fontSize: 22 }}>
                          {item.emoji || "🍽️"}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: "var(--cream)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {item.name}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--muted)" }}>
                            {item.catEmoji} {item.catName} ·{" "}
                            {Number(item.price).toFixed(2)} lei
                          </div>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          {qty > 0 && (
                            <span
                              style={{
                                background: "var(--terra)",
                                color: "#fff",
                                borderRadius: 20,
                                padding: "2px 8px",
                                fontSize: 11,
                                fontWeight: 700,
                              }}
                            >
                              ×{qty}
                            </span>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              dispatch({
                                type: "CART_ADD",
                                payload: {
                                  id: item.id,
                                  name: item.name,
                                  price: item.price,
                                  emoji: item.emoji,
                                },
                              });
                            }}
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: 10,
                              background: "var(--terra)",
                              border: "none",
                              color: "#fff",
                              fontSize: 18,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {searchResults.length > 6 && (
                    <div
                      style={{
                        padding: "10px 16px",
                        fontSize: 12,
                        color: "var(--muted)",
                        textAlign: "center",
                      }}
                    >
                      + {searchResults.length - 6} rezultate — scrie mai
                      specific
                    </div>
                  )}
                </div>
              )}

              {/* Niciun rezultat */}
              {menuSearch.trim().length > 0 && searchResults.length === 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 6px)",
                    left: 0,
                    right: 0,
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 16,
                    padding: "16px",
                    textAlign: "center",
                    boxShadow: "0 8px 24px rgba(0,0,0,.3)",
                  }}
                >
                  <div style={{ fontSize: 24, marginBottom: 6 }}>🔍</div>
                  <div style={{ fontSize: 13, color: "var(--muted)" }}>
                    Niciun produs găsit pentru „{menuSearch}"
                  </div>
                </div>
              )}
            </div>

            {/* Tabs categorii */}
            <div
              style={{
                display: "flex",
                gap: 8,
                overflowX: "auto",
                margin: "0 -20px 16px",
                paddingLeft: 20,
                paddingRight: 20,
                scrollbarWidth: "none",
              }}
            >
              {dbCategories.map((cat) => (
                <div
                  key={cat.id}
                  onClick={() =>
                    dispatch({ type: "SET_MENU_CAT", payload: cat.id })
                  }
                  style={{
                    padding: "8px 16px",
                    borderRadius: 20,
                    whiteSpace: "nowrap",
                    background:
                      activeCatObj?.id === cat.id
                        ? "var(--terra)"
                        : "var(--card2)",
                    border: `1px solid ${activeCatObj?.id === cat.id ? "var(--terra)" : "var(--border)"}`,
                    fontSize: 13,
                    cursor: "pointer",
                    flexShrink: 0,
                    color:
                      activeCatObj?.id === cat.id ? "#fff" : "var(--muted)",
                    fontWeight: activeCatObj?.id === cat.id ? 600 : 400,
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <span>{cat.emoji}</span>
                  <span>{cat.name}</span>
                </div>
              ))}
            </div>

            {/* Produse */}
            {(activeCatObj?.items || []).map((item) => {
              const qty = cartQty(item.id);
              return (
                <div
                  key={item.id}
                  style={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 18,
                    padding: 14,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    marginBottom: 10,
                  }}
                >
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      background: "var(--card2)",
                      borderRadius: 13,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 24,
                      flexShrink: 0,
                      overflow: "hidden",
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
                      item.emoji
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}
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
                          }}
                        >
                          🌿 Veg
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--muted)",
                          lineHeight: 1.4,
                          marginBottom: 6,
                        }}
                      >
                        {item.description}
                      </div>
                    )}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div
                        style={{
                          fontFamily: "'Fraunces',serif",
                          fontSize: 18,
                          fontWeight: 700,
                          color: "var(--warm)",
                        }}
                      >
                        {item.price} lei
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 7,
                        }}
                      >
                        {qty > 0 ? (
                          <>
                            <button
                              onClick={() =>
                                dispatch({
                                  type: "CART_REMOVE",
                                  payload: item.id,
                                })
                              }
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: 8,
                                background: "var(--card2)",
                                border: "1px solid var(--border)",
                                color: "var(--cream)",
                                fontSize: 15,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              −
                            </button>
                            <span
                              style={{
                                fontSize: 14,
                                fontWeight: 700,
                                minWidth: 18,
                                textAlign: "center",
                              }}
                            >
                              {qty}
                            </span>
                            <button
                              onClick={() =>
                                dispatch({ type: "CART_ADD", payload: item })
                              }
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: 8,
                                background: "var(--card2)",
                                border: "1px solid var(--border)",
                                color: "var(--cream)",
                                fontSize: 15,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              +
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() =>
                              dispatch({ type: "CART_ADD", payload: item })
                            }
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 9,
                              background: "var(--terra)",
                              border: "none",
                              color: "#fff",
                              fontSize: 20,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            +
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {(activeCatObj?.items || []).length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  padding: "30px 0",
                  color: "var(--muted)",
                  fontSize: 13,
                }}
              >
                Niciun produs în această categorie.
              </div>
            )}
          </>
        )}
        {orders.filter(
          (o) => o.table === orderTableNum || o.tableLabel === orderTableNum,
        ).length > 0 && (
          <button
            className="btn-sage"
            style={{ marginTop: 16 }}
            onClick={() => dispatch({ type: "SET_PAYMENT", payload: true })}
          >
            💳 Solicită nota de plată
          </button>
        )}
      </div>
    </div>
  );
}

// ─── ADMIN — EDITOR PLANȘEU cu ZOOM ──────────────────────────────────────────
