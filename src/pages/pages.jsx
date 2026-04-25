import { useState, useRef } from "react";
import { useApp } from "../context/AppContext";
import { TIME_SLOTS, tableClass, PLANS } from "../data/constants";
import { MENUS } from "../data/menu";
import CartBar from "../components/CartBar";

// ─── REZERVARE ────────────────────────────────────────────────────────────────
export function Rezervare() {
  const { state, dispatch, navigate, showToast } = useApp();
  const { selectedRest, resForm, reservations } = state;

  if (!selectedRest) {
    navigate("home");
    return null;
  }

  const floors = selectedRest.floors || [];
  const rsvp = reservations[selectedRest.id] || {};
  const taken = resForm.time ? rsvp[resForm.time] || [] : [];
  const floor = floors[resForm.floorIdx] || floors[0];
  const set = (patch) => dispatch({ type: "RES_FORM", payload: patch });

  const handleReserve = () => {
    dispatch({
      type: "RES_CONFIRM",
      payload: {
        restId: selectedRest.id,
        slot: resForm.time,
        tableId: resForm.tableId,
      },
    });
    showToast("📅 Rezervare trimisă! Ospătarul va confirma în scurt timp.");
  };

  if (resForm.done)
    return (
      <div className="page fade-in">
        <div style={{ padding: "60px 20px" }}>
          <div
            style={{
              background: "linear-gradient(135deg,#1a2010,#243020)",
              border: "1px solid rgba(200,169,126,.3)",
              borderRadius: 24,
              padding: "32px 24px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 56, marginBottom: 14 }}>⏳</div>
            <div
              style={{
                fontFamily: "'Fraunces',serif",
                fontSize: 24,
                fontWeight: 900,
                marginBottom: 10,
              }}
            >
              Rezervare trimisă!
            </div>
            <div
              style={{
                fontSize: 14,
                lineHeight: 1.8,
                color: "rgba(240,235,227,.75)",
                marginBottom: 16,
              }}
            >
              {selectedRest.emoji} {selectedRest.name}
              <br />
              📅 {resForm.date} • 🕐 {resForm.time}
              <br />
              {floor?.name}
              <br />
              👥 {resForm.persons} persoane
            </div>

            {/* Status așteptare confirmare */}
            <div
              style={{
                background: "rgba(200,169,126,.1)",
                border: "1px solid rgba(200,169,126,.25)",
                borderRadius: 14,
                padding: "14px 16px",
                marginBottom: 20,
                textAlign: "left",
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#c8a97e",
                  marginBottom: 6,
                }}
              >
                🧑‍🍳 În așteptarea confirmării ospătarului
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "rgba(240,235,227,.6)",
                  lineHeight: 1.6,
                }}
              >
                Rezervarea ta a fost primită. Un ospătar va confirma
                disponibilitatea în scurt timp. Vei fi notificat când rezervarea
                este confirmată.
              </div>
            </div>

            <button
              className="btn-primary"
              onClick={() => dispatch({ type: "RES_RESET" })}
            >
              Altă rezervare
            </button>
          </div>
        </div>
      </div>
    );

  return (
    <div className="page fade-in">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "20px 20px 0",
        }}
      >
        <button
          onClick={() => navigate("restaurant")}
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            background: "var(--card2)",
            border: "1px solid var(--border)",
            color: "var(--cream)",
            fontSize: 17,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ←
        </button>
        <span
          style={{
            fontFamily: "'Fraunces',serif",
            fontSize: 20,
            fontWeight: 700,
          }}
        >
          Rezervare — {selectedRest.name}
        </span>
      </div>

      <div className="inner">
        {/* Data */}
        <div className="form-group">
          <label className="form-label">Data</label>
          <input
            className="form-input"
            type="date"
            value={resForm.date}
            min={new Date().toISOString().split("T")[0]}
            onChange={(e) => set({ date: e.target.value })}
          />
        </div>

        {/* Persoane — max 20 */}
        <div className="form-group">
          <label className="form-label">Număr persoane (max. 20)</label>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => set({ persons: Math.max(1, resForm.persons - 1) })}
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "var(--card2)",
                border: "1px solid var(--border)",
                color: "var(--cream)",
                fontSize: 18,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              −
            </button>
            <div
              style={{
                flex: 1,
                background: "var(--card2)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "'Fraunces',serif",
                fontSize: 20,
                fontWeight: 700,
              }}
            >
              {resForm.persons} pers.
            </div>
            <button
              onClick={() =>
                set({ persons: Math.min(20, resForm.persons + 1) })
              }
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "var(--card2)",
                border: "1px solid var(--border)",
                color: "var(--cream)",
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
          {resForm.persons > 8 && (
            <div style={{ fontSize: 12, color: "#c8a97e", marginTop: 6 }}>
              💡 Pentru grupuri mari, te recomandăm să ne contactezi direct
              pentru aranjamente speciale.
            </div>
          )}
        </div>

        {/* Interval orar */}
        <div className="form-group">
          <label className="form-label">Interval orar</label>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3,1fr)",
              gap: 8,
            }}
          >
            {TIME_SLOTS.map((t) => (
              <div
                key={t}
                onClick={() => set({ time: t, tableId: null })}
                style={{
                  background:
                    resForm.time === t ? "var(--terra)" : "var(--card2)",
                  border: `1px solid ${resForm.time === t ? "var(--terra)" : "var(--border)"}`,
                  borderRadius: 12,
                  padding: "11px 4px",
                  textAlign: "center",
                  fontSize: 13,
                  cursor: "pointer",
                  color: resForm.time === t ? "#fff" : "var(--muted)",
                  fontWeight: resForm.time === t ? 700 : 400,
                }}
              >
                {t}
              </div>
            ))}
          </div>
        </div>

        {/* Etaj + harta */}
        {resForm.time && (
          <div className="form-group">
            <label className="form-label">Etaj / Zonă</label>
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                marginBottom: 12,
              }}
            >
              {floors.map((fl, i) => (
                <button
                  key={fl.id}
                  onClick={() => set({ floorIdx: i, tableId: null })}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 20,
                    background:
                      resForm.floorIdx === i ? "var(--terra)" : "var(--card2)",
                    border: `1px solid ${resForm.floorIdx === i ? "var(--terra)" : "var(--border)"}`,
                    color: resForm.floorIdx === i ? "#fff" : "var(--muted)",
                    fontSize: 13,
                    cursor: "pointer",
                    fontWeight: resForm.floorIdx === i ? 600 : 400,
                  }}
                >
                  {fl.name}
                </button>
              ))}
            </div>

            <label className="form-label">Selectează masa</label>
            <div className="legend">
              <div className="leg">
                <div className="leg-dot dot-free" />
                Liberă
              </div>
              <div className="leg">
                <div className="leg-dot dot-taken" />
                Ocupată
              </div>
              <div className="leg">
                <div className="leg-dot dot-sel" />
                Selectată
              </div>
            </div>
            <div
              className="floor-map"
              style={{ height: 360, marginBottom: 16 }}
            >
              <div className="fmap-grid" />
              <div className="fmap-label">{floor?.name}</div>
              {(floor?.tables || []).map((t) => {
                const isTaken = taken.includes(t.id);
                const isSel = resForm.tableId === t.id;
                return (
                  <div
                    key={t.id}
                    className={`tnode ${tableClass(t.seats)} ${isSel ? "selected" : isTaken ? "taken" : "free"}`}
                    style={{ left: t.x, top: t.y }}
                    onClick={() => !isTaken && set({ tableId: t.id })}
                  >
                    <span className="tnode-icon">🪑</span>
                    <span>{t.label}</span>
                    <span className="tnode-seats">{t.seats}p</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <button
          className="btn-primary"
          disabled={!resForm.date || !resForm.time || !resForm.tableId}
          onClick={handleReserve}
        >
          Trimite rezervarea
        </button>
      </div>
    </div>
  );
}

// ─── MENIU ────────────────────────────────────────────────────────────────────
export function Meniu() {
  const { state, dispatch, navigate, showToast } = useApp();
  const {
    selectedRest,
    cart,
    orderTableNum,
    activeMenuCat,
    showPayment,
    paid,
    payMethod,
    orders,
  } = state;

  if (!selectedRest) {
    navigate("home");
    return null;
  }

  const menu = MENUS[selectedRest.id] || {};
  const cats = Object.keys(menu);
  const activeCat =
    activeMenuCat && cats.includes(activeMenuCat) ? activeMenuCat : cats[0];
  const cartQty = (id) => cart.find((i) => i.id === id)?.qty || 0;

  // Verifică dacă clientul a selectat o masă
  // orderTableNum e setat când clientul vine din SelectTable
  // Dacă vine din "Vezi meniu" direct, e null sau numărul default
  const hasTableSelected = orderTableNum && orderTableNum !== 1;

  const placeOrder = (observations = "") => {
    if (!cart.length) return;
    if (!hasTableSelected) {
      showToast("⚠️ Selectează mai întâi masa la care stai!");
      navigate("selectTable");
      return;
    }
    dispatch({
      type: "PLACE_ORDER",
      payload: {
        id: Date.now(),
        table: orderTableNum,
        tableLabel: orderTableNum,
        restId: selectedRest.id,
        items: [...cart],
        observations,
        status: "cooking",
        time: new Date().toLocaleTimeString("ro-RO", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    });
    showToast("✅ Comanda trimisă la bucătărie!");
  };

  const handlePay = (method) => {
    dispatch({ type: "SET_PAID", payload: { paid: true, method } });
  };

  // ── Plată confirmată ──
  if (paid)
    return (
      <div className="page fade-in">
        <div style={{ textAlign: "center", padding: "60px 24px" }}>
          <div style={{ fontSize: 68, marginBottom: 16 }}>
            {payMethod === "cash" ? "💵" : "💳"}
          </div>
          <div
            style={{
              fontFamily: "'Fraunces',serif",
              fontSize: 28,
              fontWeight: 900,
              marginBottom: 8,
            }}
          >
            Grazie mille!
          </div>
          <div style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6 }}>
            Plata cu {payMethod === "cash" ? "numerar" : "cardul"} confirmată.
            <br />
            Vă așteptăm din nou! 🍝
          </div>
          <button
            className="btn-primary"
            style={{ marginTop: 32 }}
            onClick={() => {
              dispatch({
                type: "SET_PAID",
                payload: { paid: false, method: null },
              });
              dispatch({ type: "CART_CLEAR" });
              dispatch({ type: "SET_PAYMENT", payload: false });
              navigate("home");
            }}
          >
            Înapoi acasă
          </button>
        </div>
      </div>
    );

  // ── Notă de plată ──
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
      <div className="page fade-in">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "20px 20px 0",
          }}
        >
          <button
            onClick={() => dispatch({ type: "SET_PAYMENT", payload: false })}
            style={{
              background: "none",
              border: "none",
              color: "var(--muted)",
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            ← Înapoi la meniu
          </button>
        </div>
        <div className="inner">
          <div
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 20,
              padding: 20,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                fontFamily: "'Fraunces',serif",
                fontSize: 18,
                marginBottom: 14,
                paddingBottom: 12,
                borderBottom: "1px solid var(--border)",
              }}
            >
              🧾 Nota de plată — Masa {orderTableNum}
            </div>
            {allItems.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 14,
                  marginBottom: 8,
                  color: "var(--muted)",
                }}
              >
                <span>
                  {item.emoji} {item.name} ×{item.qty}
                </span>
                <span>{item.price * item.qty} lei</span>
              </div>
            ))}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 17,
                fontWeight: 700,
                borderTop: "1px solid var(--border)",
                marginTop: 10,
                paddingTop: 10,
              }}
            >
              <span>Total</span>
              <span>{total} lei</span>
            </div>
          </div>
          <label className="form-label" style={{ marginBottom: 12 }}>
            Metoda de plată
          </label>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            {[
              {
                method: "cash",
                icon: "💵",
                label: "Cash",
                border: "rgba(74,110,74,.5)",
              },
              {
                method: "card",
                icon: "💳",
                label: "Card",
                border: "rgba(200,169,126,.5)",
              },
            ].map((p) => (
              <button
                key={p.method}
                onClick={() => handlePay(p.method)}
                style={{
                  padding: "20px 14px",
                  borderRadius: 18,
                  border: `2px solid ${p.border}`,
                  background: "var(--card)",
                  color: "var(--cream)",
                  fontFamily: "'Fraunces',serif",
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: "pointer",
                  textAlign: "center",
                }}
              >
                <span
                  style={{ fontSize: 28, display: "block", marginBottom: 6 }}
                >
                  {p.icon}
                </span>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Meniu principal ──
  return (
    <div className="page fade-in">
      {/* Hero */}
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

          {/* Masa selectată sau buton selectare */}
          {hasTableSelected ? (
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
        <div
          style={{ fontSize: 12, color: "rgba(255,255,255,.5)", marginTop: 2 }}
        >
          {selectedRest.type}
        </div>
      </div>

      {/* Banner selectare masă dacă nu e selectată */}
      {!hasTableSelected && (
        <div
          style={{
            margin: "12px 20px 0",
            background: "rgba(192,98,47,.12)",
            border: "1px solid rgba(192,98,47,.3)",
            borderRadius: 14,
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span style={{ fontSize: 22 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#e07a47" }}>
              Selectează masa pentru a comanda
            </div>
            <div style={{ fontSize: 11, color: "#6b6050", marginTop: 2 }}>
              Poți explora meniul, dar comanda necesită o masă selectată.
            </div>
          </div>
          <button
            onClick={() => navigate("selectTable")}
            style={{
              padding: "8px 14px",
              background: "var(--terra)",
              border: "none",
              borderRadius: 20,
              color: "#fff",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Selectează
          </button>
        </div>
      )}

      <div
        className="inner"
        style={{ paddingBottom: cart.length > 0 ? 160 : 90 }}
      >
        {/* Categorii */}
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
          {cats.map((cat) => (
            <div
              key={cat}
              onClick={() => dispatch({ type: "SET_MENU_CAT", payload: cat })}
              style={{
                padding: "8px 16px",
                borderRadius: 20,
                whiteSpace: "nowrap",
                background: activeCat === cat ? "var(--terra)" : "var(--card2)",
                border: `1px solid ${activeCat === cat ? "var(--terra)" : "var(--border)"}`,
                fontSize: 13,
                cursor: "pointer",
                flexShrink: 0,
                color: activeCat === cat ? "#fff" : "var(--muted)",
                fontWeight: activeCat === cat ? 600 : 400,
              }}
            >
              {cat}
            </div>
          ))}
        </div>

        {/* Produse */}
        {(menu[activeCat] || []).map((item) => {
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
                }}
              >
                {item.emoji}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>
                  {item.name}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--muted)",
                    lineHeight: 1.4,
                    marginBottom: 6,
                  }}
                >
                  {item.desc}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
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
                    {item.veg && (
                      <div
                        style={{
                          fontSize: 10,
                          color: "var(--sage2)",
                          background: "rgba(74,110,74,.15)",
                          padding: "2px 7px",
                          borderRadius: 10,
                          display: "inline-block",
                        }}
                      >
                        🌿 Veg
                      </div>
                    )}
                  </div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 7 }}
                  >
                    {qty > 0 ? (
                      <>
                        <button
                          onClick={() =>
                            dispatch({ type: "CART_REMOVE", payload: item.id })
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

        {/* Buton notă plată */}
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

      <CartBar onOrder={placeOrder} />
    </div>
  );
}

// ─── WAITER stub ──────────────────────────────────────────────────────────────
export function Waiter() {
  const { navigate } = useApp();
  return (
    <div className="page fade-in">
      <div style={{ textAlign: "center", padding: "60px 24px" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🧑‍🍳</div>
        <button className="btn-primary" onClick={() => navigate("home")}>
          Mergi la Home
        </button>
      </div>
    </div>
  );
}

// ─── ADMIN ────────────────────────────────────────────────────────────────────
export function Admin() {
  const { state, dispatch, navigate, showToast, isLocked } = useApp();
  const { user, adminFloors, adminFloorIdx, selectedNode } = state;
  const canvasRef = useRef(null);
  const dragRef = useRef(null);

  const onNodeDown = (e, tableId) => {
    e.preventDefault();
    e.stopPropagation();
    dispatch({ type: "ADMIN_SET_NODE", payload: tableId });
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    const table = adminFloors[adminFloorIdx]?.tables.find(
      (t) => t.id === tableId,
    );
    if (!table) return;
    dragRef.current = {
      tableId,
      ox: cx - rect.left - table.x,
      oy: cy - rect.top - table.y,
    };
    const move = (ev) => {
      if (!dragRef.current || !canvasRef.current) return;
      const cr = canvasRef.current.getBoundingClientRect();
      const nx = Math.max(
        0,
        Math.min(
          cr.width - 100,
          (ev.touches ? ev.touches[0].clientX : ev.clientX) -
            cr.left -
            dragRef.current.ox,
        ),
      );
      const ny = Math.max(
        0,
        Math.min(
          cr.height - 80,
          (ev.touches ? ev.touches[0].clientY : ev.clientY) -
            cr.top -
            dragRef.current.oy,
        ),
      );
      dispatch({
        type: "ADMIN_MOVE_TABLE",
        payload: { tableId: dragRef.current.tableId, x: nx, y: ny },
      });
    };
    const up = () => {
      dragRef.current = null;
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", up);
  };

  const deleteFloor = (idx) => {
    if (adminFloors.length <= 1) {
      showToast("❌ Trebuie să ai cel puțin un etaj!");
      return;
    }
    const newFloors = adminFloors.filter((_, i) => i !== idx);
    dispatch({ type: "ADMIN_SET_FLOORS", payload: newFloors });
    dispatch({
      type: "ADMIN_SET_FLOOR_IDX",
      payload: Math.min(adminFloorIdx, newFloors.length - 1),
    });
  };

  const addFloor = () => {
    if (isLocked("multifloor") && adminFloors.length >= 1) {
      showToast("⬆️ Upgrade la Pro!");
      return;
    }
    dispatch({ type: "ADMIN_ADD_FLOOR" });
  };

  // Adaugă terasă
  const addTerrace = () => {
    if (isLocked("multifloor") && adminFloors.length >= 1) {
      showToast("⬆️ Upgrade la Pro!");
      return;
    }
    const newId = Math.max(...adminFloors.map((f) => f.id)) + 1;
    const terraceNum =
      adminFloors.filter((f) => f.name.includes("Terasă")).length + 1;
    const name = terraceNum === 1 ? "Terasă" : `Terasă ${terraceNum}`;
    dispatch({
      type: "ADMIN_SET_FLOORS",
      payload: [
        ...adminFloors,
        { id: newId, name, tables: [], type: "terrace" },
      ],
    });
    dispatch({ type: "ADMIN_SET_FLOOR_IDX", payload: adminFloors.length });
  };

  // Icon pentru tip etaj
  const floorIcon = (fl) => (fl?.type === "terrace" ? "☀️" : "🏢");

  return (
    <div className="page fade-in">
      <div
        style={{
          padding: "44px 20px 24px",
          background: "linear-gradient(135deg,#100a05,#0d0a07)",
          borderBottom: "1px solid var(--border)",
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
              border: "1px solid var(--border)",
              color: "var(--cream)",
              fontSize: 17,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ←
          </button>
        </div>
        <div
          style={{
            fontFamily: "'Fraunces',serif",
            fontSize: 26,
            fontWeight: 900,
          }}
        >
          🏗️ Editor Planșeu
        </div>
        <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
          {user?.restName || "Restaurantul meu"} • Plan{" "}
          {PLANS[user?.plan || "free"]?.label}
        </div>
      </div>

      <div className="inner">
        <label className="form-label">Etaje & Terase</label>
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 14,
          }}
        >
          {adminFloors.map((fl, i) => (
            <div
              key={fl.id}
              style={{ display: "flex", alignItems: "center", gap: 4 }}
            >
              <div
                onClick={() =>
                  dispatch({ type: "ADMIN_SET_FLOOR_IDX", payload: i })
                }
                style={{
                  padding: "7px 14px",
                  borderRadius: 20,
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                  background:
                    adminFloorIdx === i
                      ? fl.type === "terrace"
                        ? "#4a6e4a"
                        : "var(--terra)"
                      : "var(--card2)",
                  border: `1px solid ${adminFloorIdx === i ? (fl.type === "terrace" ? "#4a6e4a" : "var(--terra)") : "var(--border)"}`,
                  color: adminFloorIdx === i ? "#fff" : "var(--muted)",
                  fontWeight: adminFloorIdx === i ? 600 : 400,
                  fontSize: 13,
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                {floorIcon(fl)} {fl.name}
              </div>
              <button
                onClick={() => deleteFloor(i)}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: "rgba(192,57,43,.2)",
                  border: "1px solid rgba(192,57,43,.3)",
                  color: "#e05050",
                  fontSize: 11,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>
          ))}

          {/* Butoane adăugare */}
          <button
            onClick={addFloor}
            style={{
              padding: "7px 13px",
              borderRadius: 20,
              background: "none",
              border: "1px dashed var(--border)",
              color: "var(--muted)",
              fontSize: 12,
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            🏢 + Etaj
          </button>

          <button
            onClick={addTerrace}
            style={{
              padding: "7px 13px",
              borderRadius: 20,
              background: "none",
              border: "1px dashed rgba(74,110,74,.5)",
              color: "var(--sage2)",
              fontSize: 12,
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            ☀️ + Terasă
          </button>
        </div>

        {/* Toolbar mese */}
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 12,
          }}
        >
          {[
            { seats: 2, label: "+ ⭕ 2p" },
            { seats: 4, label: "+ ⬛ 4p" },
            { seats: 8, label: "+ ▬ 8p" },
          ].map((b) => (
            <button
              key={b.seats}
              onClick={() =>
                dispatch({
                  type: "ADMIN_ADD_TABLE",
                  payload: { seats: b.seats },
                })
              }
              style={{
                padding: "8px 14px",
                borderRadius: 12,
                background: "var(--card2)",
                border: "1px solid var(--border)",
                color: "var(--cream)",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {b.label}
            </button>
          ))}
          {selectedNode && (
            <button
              onClick={() => dispatch({ type: "ADMIN_DELETE_TABLE" })}
              style={{
                padding: "8px 14px",
                borderRadius: 12,
                background: "none",
                border: "1px solid rgba(192,57,43,.25)",
                color: "var(--red)",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              🗑️ Șterge masa
            </button>
          )}
        </div>

        {/* Canvas */}
        <div
          className="floor-map"
          style={{ height: 400, marginBottom: 12 }}
          ref={canvasRef}
        >
          <div className="fmap-grid" />
          {/* Label diferit pentru terase */}
          <div className="fmap-label">
            {floorIcon(adminFloors[adminFloorIdx])}{" "}
            {adminFloors[adminFloorIdx]?.name} —{" "}
            {adminFloors[adminFloorIdx]?.tables.length} mese
          </div>
          {/* Background special pentru terase */}
          {adminFloors[adminFloorIdx]?.type === "terrace" && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                background:
                  "radial-gradient(ellipse at top, rgba(74,110,74,.06) 0%, transparent 70%)",
              }}
            />
          )}
          {adminFloors[adminFloorIdx]?.tables.map((t) => (
            <div
              key={t.id}
              className={`tnode ${tableClass(t.seats)} draggable ${selectedNode === t.id ? "sel-node" : ""}`}
              style={{ left: t.x, top: t.y }}
              onMouseDown={(e) => onNodeDown(e, t.id)}
              onTouchStart={(e) => onNodeDown(e, t.id)}
              onClick={() =>
                dispatch({ type: "ADMIN_SET_NODE", payload: t.id })
              }
            >
              🪑<span>{t.label}</span>
              <span className="tnode-seats">{t.seats}p</span>
            </div>
          ))}
          {adminFloors[adminFloorIdx]?.tables.length === 0 && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--muted)",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 36 }}>
                {adminFloors[adminFloorIdx]?.type === "terrace" ? "☀️" : "🪑"}
              </span>
              <span style={{ fontSize: 13 }}>
                {adminFloors[adminFloorIdx]?.type === "terrace"
                  ? "Adaugă mese pentru terasă"
                  : "Adaugă mese folosind butoanele de sus"}
              </span>
            </div>
          )}
        </div>

        {selectedNode &&
          (() => {
            const t = adminFloors[adminFloorIdx]?.tables.find(
              (t) => t.id === selectedNode,
            );
            return t ? (
              <div
                style={{
                  background: "var(--card2)",
                  border: "1px solid var(--border)",
                  borderRadius: 14,
                  padding: "12px 16px",
                  marginBottom: 12,
                  fontSize: 13,
                  color: "var(--muted)",
                }}
              >
                Selectat: <b style={{ color: "var(--cream)" }}>{t.label}</b> •{" "}
                {t.seats} persoane • x={Math.round(t.x)}, y={Math.round(t.y)}
              </div>
            ) : null;
          })()}

        <button
          className="btn-primary"
          onClick={() => showToast("✅ Configurație salvată!")}
        >
          ✅ Salvează configurația
        </button>
      </div>
    </div>
  );
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
export function Auth() {
  const { dispatch, navigate, showToast } = useApp();
  const [mode, setMode] = useState("login");
  const [plan, setPlan] = useState("pro");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    restName: "",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = () => {
    dispatch({
      type: "SET_USER",
      payload: {
        name: mode === "login" ? "Admin Demo" : form.name,
        email: form.email,
        plan: mode === "login" ? "pro" : plan,
        restName: mode === "login" ? "Mama Mia" : form.restName,
      },
    });
    navigate("home");
    showToast("👋 Bine ai venit!");
  };

  const planOptions = [
    {
      key: "free",
      icon: "🆓",
      name: "Gratuit",
      desc: "Meniu digital + rezervări simple",
      price: "0 lei/lună",
    },
    {
      key: "pro",
      icon: "⭐",
      name: "Pro",
      desc: "Comenzi + tabletă ospătar + editor planșeu",
      price: "99 lei/lună",
    },
    {
      key: "business",
      icon: "👑",
      name: "Business",
      desc: "Etaje nelimitate + branding + rapoarte avansate",
      price: "249 lei/lună",
    },
  ];

  return (
    <div className="page fade-in">
      <div
        style={{
          padding: "60px 24px 32px",
          background: "linear-gradient(160deg,#1a0e05,#0d0a07)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            background: "linear-gradient(135deg,var(--terra),#8b3a18)",
            borderRadius: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
            margin: "0 auto 16px",
          }}
        >
          🍽️
        </div>
        <div
          style={{
            fontFamily: "'Fraunces',serif",
            fontSize: 28,
            fontWeight: 900,
            marginBottom: 6,
          }}
        >
          WhataboutFood
        </div>
        <div style={{ fontSize: 14, color: "var(--muted)" }}>
          Platforma pentru restaurante moderne
        </div>
      </div>
      <div className="inner">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
            marginBottom: 24,
          }}
        >
          {["login", "register"].map((m) => (
            <div
              key={m}
              onClick={() => setMode(m)}
              style={{
                padding: 11,
                borderRadius: 14,
                textAlign: "center",
                background: mode === m ? "var(--terra)" : "var(--card2)",
                border: `1px solid ${mode === m ? "var(--terra)" : "var(--border)"}`,
                color: mode === m ? "#fff" : "var(--muted)",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {m === "login" ? "Intră în cont" : "Înregistrare"}
            </div>
          ))}
        </div>

        {mode === "login" ? (
          <>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                className="form-input"
                type="email"
                placeholder="email@restaurant.ro"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Parolă</label>
              <input
                className="form-input"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
              />
            </div>
            <button
              className="btn-primary"
              style={{ marginBottom: 12 }}
              onClick={handleSubmit}
            >
              Intră în cont
            </button>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                margin: "16px 0",
              }}
            >
              <div
                style={{ flex: 1, height: 1, background: "var(--border)" }}
              />
              <span style={{ fontSize: 12, color: "var(--muted)" }}>sau</span>
              <div
                style={{ flex: 1, height: 1, background: "var(--border)" }}
              />
            </div>
            <button
              className="btn-secondary"
              onClick={() => {
                dispatch({
                  type: "SET_USER",
                  payload: {
                    name: "Demo Admin",
                    email: "demo@mamamia.ro",
                    plan: "pro",
                    restName: "Mama Mia",
                  },
                });
                navigate("home");
                showToast("🎯 Demo activat!");
              }}
            >
              🎯 Încearcă demo-ul
            </button>
          </>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
              <div className="form-group">
                <label className="form-label">Numele tău</label>
                <input
                  className="form-input"
                  placeholder="Ion Popescu"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Nume restaurant</label>
                <input
                  className="form-input"
                  placeholder="Mama Mia"
                  value={form.restName}
                  onChange={(e) => set("restName", e.target.value)}
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                className="form-input"
                type="email"
                placeholder="email@restaurant.ro"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Parolă</label>
              <input
                className="form-input"
                type="password"
                placeholder="Min. 8 caractere"
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
              />
            </div>
            <label className="form-label" style={{ marginBottom: 10 }}>
              Alege planul
            </label>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                marginBottom: 20,
              }}
            >
              {planOptions.map((p) => (
                <div
                  key={p.key}
                  onClick={() => setPlan(p.key)}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 14,
                    padding: 16,
                    background:
                      plan === p.key ? "rgba(192,98,47,.08)" : "var(--card2)",
                    border: `2px solid ${plan === p.key ? "var(--terra)" : "var(--border)"}`,
                    borderRadius: 16,
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontSize: 22, flexShrink: 0 }}>{p.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}
                    >
                      {p.name}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>
                      {p.desc}
                    </div>
                    <div
                      style={{
                        fontFamily: "'Fraunces',serif",
                        fontSize: 16,
                        fontWeight: 900,
                        color: "var(--warm)",
                        marginTop: 4,
                      }}
                    >
                      {p.price}
                    </div>
                  </div>
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      border: `2px solid ${plan === p.key ? "var(--terra)" : "var(--border)"}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      background:
                        plan === p.key ? "var(--terra)" : "transparent",
                      color: "#fff",
                    }}
                  >
                    {plan === p.key ? "✓" : ""}
                  </div>
                </div>
              ))}
            </div>
            <button className="btn-primary" onClick={handleSubmit}>
              Creează contul gratuit
            </button>
          </>
        )}
        <button
          style={{
            background: "none",
            border: "none",
            color: "var(--muted)",
            cursor: "pointer",
            fontSize: 13,
            marginTop: 16,
            width: "100%",
            textAlign: "center",
          }}
          onClick={() => navigate("home")}
        >
          ← Înapoi fără cont
        </button>
      </div>
    </div>
  );
}
