import { useState, useEffect } from "react";
import RestaurantCard from "../components/RestaurantCard";
import { useApp } from "../context/AppContext";
import { supabase } from "../supabase";

export function Auth() {
  const { state, dispatch, navigate, showToast } = useApp();
  const { user } = state;
  const [tab, setTab] = useState("main"); // main | rezervari_viitoare | note | istoric_rez | favorite
  const [deleteModal, setDeleteModal] = useState(false); // false | "confirm" | "password"
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [rezervari, setRezervari] = useState([]);
  const [comenzi, setComenzi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [favorite, setFavorite] = useState([]);
  const [favLoading, setFavLoading] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  // Daca s-a cerut deschiderea unui tab anume (ex. din notificari -> rezervari
  // viitoare), il aplicam si resetam flag-ul ca sa nu ramana lipit data viitoare.
  useEffect(() => {
    if (state.authTab) {
      setTab(state.authTab);
      dispatch({ type: "SET_AUTH_TAB", payload: null });
    }
  }, [state.authTab, dispatch]);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    const load = async () => {
      setLoading(true);
      const { data: rez } = await supabase
        .from("reservations")
        .select("*, restaurants(name, emoji)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (rez) setRezervari(rez);

      const { data: ord } = await supabase
        .from("orders")
        .select("*, restaurants(name, emoji)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (ord) setComenzi(ord);

      // Favorite
      const { data: favData } = await supabase
        .from("favorites")
        .select(
          "restaurant_id, restaurants(id, name, emoji, type, cover, cover_image, rating, reviews, tags, city, plan)",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (favData)
        setFavorite(favData.map((f) => f.restaurants).filter(Boolean));

      setLoading(false);
    };
    load();
  }, [user?.id]);

  const removeFavorite = async (restaurantId) => {
    await supabase
      .from("favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("restaurant_id", restaurantId);
    setFavorite((prev) => prev.filter((r) => r.id !== restaurantId));
    showToast("Scos din favorite");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    dispatch({ type: "LOGOUT" });
    navigate("auth");
  };

  // Stergere cont
  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      // 1. Verificam parola
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: deletePassword,
      });
      if (authError) {
        showToast("❌ Parolă incorectă.");
        setDeleteLoading(false);
        return;
      }

      const uid = user.id;

      if (user.role === "owner") {
        // Proprietar: verificam daca are restaurante active
        const { data: activeRests } = await supabase
          .from("restaurants")
          .select("id")
          .eq("owner_id", uid)
          .eq("is_active", true);

        if (activeRests && activeRests.length > 0) {
          showToast(
            "⚠️ Ai restaurante active. Închide-le mai întâi din dashboard.",
          );
          setDeleteLoading(false);
          setDeleteModal(false);
          return;
        }

        // Dezactivam restaurantele inactive si anonimizam
        await supabase
          .from("restaurants")
          .update({ owner_id: null })
          .eq("owner_id", uid);
      } else {
        // Client: anonimizam rezervarile
        await supabase
          .from("reservations")
          .update({ customer_name: "Client șters", customer_phone: null })
          .eq("user_id", uid);

        // Anonimizam recenziile
        await supabase
          .from("restaurant_reviews")
          .update({ user_id: null })
          .eq("user_id", uid);
      }

      // Stergem notificarile
      await supabase.from("notifications").delete().eq("user_id", uid);

      // Stergem profilul
      await supabase.from("profiles").delete().eq("id", uid);

      // Logout
      await supabase.auth.signOut();
      dispatch({ type: "SET_USER", payload: null });
      showToast("✅ Contul a fost șters.");
    } catch (e) {
      showToast("❌ A apărut o eroare. Încearcă din nou.");
    }
    setDeleteLoading(false);
    setDeleteModal(false);
  };

  // Date derivate
  const STATUSE_FINALE = [
    "cancelled",
    "no_show",
    "completed",
    "rejected",
    "refused",
  ];
  const rezervariViitoare = rezervari.filter((r) => {
    if (STATUSE_FINALE.includes(r.status)) return false;
    const rezDateTime = new Date(`${r.date}T${r.time || "23:59"}:00`);
    return rezDateTime > new Date();
  });
  const istoricRezervari = rezervari.filter((r) => {
    if (STATUSE_FINALE.includes(r.status)) return true;
    const rezDateTime = new Date(`${r.date}T${r.time || "23:59"}:00`);
    return rezDateTime <= new Date();
  });

  // Note de plata - grupate pe sesiune
  const noteGroup = {};
  comenzi.forEach((o) => {
    const key = o.table_session_id || o.id;
    if (!noteGroup[key]) noteGroup[key] = { ...o, items: [] };
    if (o.items)
      noteGroup[key].items = [...(noteGroup[key].items || []), ...o.items];
  });
  const note = Object.values(noteGroup);

  // Statistici
  const totalRon = note.reduce((sum, n) => {
    const total = (n.items || []).reduce(
      (s, i) => s + (i.price || 0) * (i.qty || 1),
      0,
    );
    return sum + total;
  }, 0);

  if (!user) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 32,
          gap: 16,
        }}
      >
        <div style={{ fontSize: 48 }}>👤</div>
        <div
          style={{
            fontFamily: "'Fraunces',serif",
            fontSize: 22,
            fontWeight: 700,
            color: "var(--cream)",
            textAlign: "center",
          }}
        >
          Contul tău
        </div>
        <div
          style={{ fontSize: 14, color: "var(--muted)", textAlign: "center" }}
        >
          Loghează-te pentru a vedea rezervările și comenzile tale
        </div>
        <button
          onClick={() => navigate("auth")}
          style={{
            marginTop: 8,
            padding: "13px 32px",
            borderRadius: "var(--radius-pill)",
            background: "linear-gradient(135deg,#c0622f,#8b3a18)",
            border: "none",
            color: "#fff",
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Loghează-te
        </button>
      </div>
    );
  }

  // ── Sub-pagini ────────────────────────────────────────────────────────────

  if (tab !== "main") {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          background: "var(--bg)",
          overflowY: "auto",
          paddingBottom: 90,
        }}
      >
        {/* Header sub-pagina */}
        <div
          style={{
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            borderBottom: "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => setTab("main")}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "rgba(255,255,255,.06)",
              border: "none",
              color: "var(--cream)",
              fontSize: 18,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ←
          </button>
          <div
            style={{
              fontFamily: "'Fraunces',serif",
              fontSize: 17,
              fontWeight: 700,
              color: "var(--cream)",
            }}
          >
            {tab === "rezervari_viitoare" && "Rezervări viitoare"}
            {tab === "note" && "Note de plată"}
            {tab === "istoric_rez" && "Istoric rezervări"}
            {tab === "favorite" && "Restaurante favorite"}
            {tab === "parola" && "Schimbă parola"}
          </div>
        </div>

        {/* Continut sub-pagini */}
        <div style={{ padding: "16px 20px" }}>
          {/* Rezervări viitoare */}
          {tab === "rezervari_viitoare" &&
            (rezervariViitoare.length === 0 ? (
              <EmptyState
                icon="📅"
                title="Nicio rezervare viitoare"
                desc="Rezervă o masă și apare aici"
                action={() => navigate("reserve")}
                actionLabel="Rezervă acum"
              />
            ) : (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {rezervariViitoare.map((r) => (
                  <RezervareCard key={r.id} r={r} />
                ))}
              </div>
            ))}

          {/* Note de plata */}
          {tab === "note" &&
            (note.length === 0 ? (
              <EmptyState
                icon="🧾"
                title="Nicio notă de plată"
                desc="Comenzile tale finalizate apar aici"
              />
            ) : (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {note.map((n, i) => (
                  <NotaCard key={i} n={n} />
                ))}
              </div>
            ))}

          {/* Istoric rezervari */}
          {tab === "istoric_rez" &&
            (istoricRezervari.length === 0 ? (
              <EmptyState
                icon="🕐"
                title="Niciun istoric"
                desc="Rezervările trecute apar aici"
              />
            ) : (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {istoricRezervari.map((r) => (
                  <RezervareCard key={r.id} r={r} trecut />
                ))}
              </div>
            ))}

          {/* Favorite */}
          {tab === "favorite" &&
            (favLoading ? (
              <div
                style={{
                  textAlign: "center",
                  padding: 40,
                  color: "var(--muted)",
                }}
              >
                Se încarcă...
              </div>
            ) : favorite.length === 0 ? (
              <EmptyState
                icon="❤️"
                title="Niciun restaurant favorit"
                desc="Apasă inima pe pagina unui restaurant pentru a-l salva"
              />
            ) : (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {favorite.map((rest) => (
                  <div key={rest.id} style={{ position: "relative" }}>
                    <RestaurantCard restaurant={rest} hideTables />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFavorite(rest.id);
                      }}
                      style={{
                        position: "absolute",
                        top: 12,
                        right: 12,
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: "rgba(192,98,47,0.9)",
                        border: "none",
                        color: "#fff",
                        fontSize: 16,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 2,
                      }}
                      title="Scoate din favorite"
                    >
                      ♥
                    </button>
                  </div>
                ))}
              </div>
            ))}

          {/* Schimba parola */}
          {tab === "parola" && <SchimbaParola showToast={showToast} />}
        </div>
      </div>
    );
  }

  // ── Pagina principala Profil ──────────────────────────────────────────────
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        background: "var(--bg)",
        overflowY: "auto",
        paddingBottom: 90,
      }}
    >
      {/* Header */}
      <div style={{ padding: "16px 20px 0" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <button
            onClick={() => navigate("home")}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "rgba(255,255,255,.06)",
              border: "none",
              color: "var(--cream)",
              fontSize: 18,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ←
          </button>
          <div
            style={{
              fontFamily: "'Fraunces',serif",
              fontSize: 17,
              fontWeight: 700,
              color: "var(--cream)",
            }}
          >
            Contul meu
          </div>
          <div style={{ width: 36 }} />
        </div>

        {/* Avatar */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "linear-gradient(135deg,#c0622f,#8b3a18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              fontWeight: 700,
              color: "#fff",
              border: "3px solid var(--border)",
            }}
          >
            {(user.name || user.email || "?")[0].toUpperCase()}
          </div>
          {/* Scor cont */}
          {user.role === "client" &&
            user.rating !== undefined &&
            user.rating !== null && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "rgba(192,98,47,0.1)",
                  border: "1px solid rgba(192,98,47,0.25)",
                  borderRadius: 20,
                  padding: "4px 12px",
                  marginBottom: 6,
                }}
              >
                <span style={{ fontSize: 14 }}>
                  {"★".repeat(Math.round(Number(user.rating || 0)))}
                  {"☆".repeat(5 - Math.round(Number(user.rating || 0)))}
                </span>
                <span
                  style={{ fontSize: 13, fontWeight: 700, color: "#c0622f" }}
                >
                  {Number(user.rating || 0).toFixed(1)}
                </span>
                <span style={{ fontSize: 11, color: "#8a7a6a" }}>
                  scor cont
                </span>
              </div>
            )}
          <div
            style={{
              fontFamily: "'Fraunces',serif",
              fontSize: 18,
              fontWeight: 700,
              color: "var(--cream)",
            }}
          >
            {user.name || "Client"}
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>
            {user.email}
          </div>
        </div>

        {/* Statistici */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 8,
            marginBottom: 20,
          }}
        >
          {[
            { val: rezervari.length, label: "Rezervări" },
            { val: 0, label: "Favorite" },
            { val: Math.round(totalRon) + " RON", label: "Cheltuit" },
          ].map((s, i) => (
            <div
              key={i}
              style={{
                background: "rgba(255,255,255,.04)",
                border: "0.5px solid var(--border)",
                borderRadius: 12,
                padding: "10px 8px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "var(--terra)",
                  fontFamily: "'Fraunces',serif",
                }}
              >
                {s.val}
              </div>
              <div
                style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: "0 12px" }}>
        {/* Sectiunea Activitate */}
        <SectionLabel>Activitate</SectionLabel>
        <MenuList>
          <MenuItem
            icon="📅"
            iconBg="rgba(74,158,92,0.15)"
            title="Rezervări viitoare"
            sub={
              rezervariViitoare.length > 0
                ? `${rezervariViitoare.length} programate`
                : "Nicio rezervare viitoare"
            }
            badge={rezervariViitoare.length}
            onClick={() => setTab("rezervari_viitoare")}
          />
          <MenuItem
            icon="🧾"
            iconBg="rgba(192,98,47,0.15)"
            title="Note de plată"
            sub="Ultimele comenzi finalizate"
            onClick={() => setTab("note")}
          />
          <MenuItem
            icon="🕐"
            iconBg="rgba(74,110,200,0.15)"
            title="Istoric rezervări"
            sub={
              istoricRezervari.length > 0
                ? `${istoricRezervari.length} rezervări`
                : "Niciun istoric"
            }
            onClick={() => setTab("istoric_rez")}
          />
          <MenuItem
            icon="❤️"
            iconBg="rgba(150,74,200,0.15)"
            title="Restaurante favorite"
            sub="Vine în curând"
            onClick={() => setTab("favorite")}
            last
          />
        </MenuList>

        {/* Sectiunea Setari */}
        <SectionLabel style={{ marginTop: 12 }}>Setări</SectionLabel>
        <MenuList>
          <MenuItem
            icon="🔒"
            iconBg="rgba(255,255,255,0.05)"
            title="Schimbă parola"
            sub="Securitate cont"
            onClick={() => setTab("parola")}
          />
          <MenuItem
            icon="🗑️"
            iconBg="rgba(224,80,80,0.1)"
            title="Șterge cont"
            sub="Acțiune ireversibilă"
            onClick={() => setDeleteModal("confirm")}
            last
          />
        </MenuList>

        {/* Deconectare */}
        <button
          onClick={handleLogout}
          style={{
            width: "100%",
            marginTop: 20,
            marginBottom: 8,
            padding: 14,
            background: "rgba(224,80,80,0.08)",
            border: "0.5px solid rgba(224,80,80,0.2)",
            borderRadius: 14,
            color: "#e05050",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          ← Deconectare
        </button>
      </div>

      {/* Modal Șterge Cont */}
      {deleteModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px 16px",
          }}
          onClick={() => {
            setDeleteModal(false);
            setDeletePassword("");
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#1a1510",
              borderRadius: 20,
              padding: "24px 20px 28px",
              width: "100%",
              maxWidth: 360,
            }}
          >
            {deleteModal === "confirm" && (
              <>
                <div
                  style={{
                    fontSize: 32,
                    textAlign: "center",
                    marginBottom: 12,
                  }}
                >
                  ⚠️
                </div>
                <div
                  style={{
                    fontFamily: "'Fraunces',serif",
                    fontSize: 18,
                    fontWeight: 700,
                    textAlign: "center",
                    marginBottom: 8,
                  }}
                >
                  Ștergi contul?
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "#8a7a6a",
                    textAlign: "center",
                    marginBottom: 24,
                    lineHeight: 1.5,
                  }}
                >
                  {user?.role === "owner"
                    ? "Această acțiune este ireversibilă. Dacă ai restaurante active, ți se va cere să le închizi mai întâi."
                    : "Această acțiune este ireversibilă. Toate datele tale vor fi anonimizate."}
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => setDeleteModal(false)}
                    style={{
                      flex: 1,
                      padding: 12,
                      borderRadius: 12,
                      border: "1px solid #2a2218",
                      background: "transparent",
                      color: "#8a7a6a",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    Anulează
                  </button>
                  <button
                    onClick={() => setDeleteModal("password")}
                    style={{
                      flex: 1,
                      padding: 12,
                      borderRadius: 12,
                      border: "none",
                      background: "rgba(224,80,80,0.15)",
                      color: "#e05050",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    Continuă
                  </button>
                </div>
              </>
            )}
            {deleteModal === "password" && (
              <>
                <div
                  style={{
                    fontFamily: "'Fraunces',serif",
                    fontSize: 17,
                    fontWeight: 700,
                    marginBottom: 8,
                  }}
                >
                  🔒 Confirmă cu parola
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "#8a7a6a",
                    marginBottom: 16,
                    lineHeight: 1.5,
                  }}
                >
                  Introdu parola contului pentru a confirma ștergerea.
                </div>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Parola ta"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    background: "#161210",
                    border: "1px solid #2a2218",
                    borderRadius: 10,
                    padding: "10px 12px",
                    color: "#f0ebe3",
                    fontFamily: "inherit",
                    fontSize: 13,
                    outline: "none",
                    marginBottom: 16,
                  }}
                />
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => {
                      setDeleteModal("confirm");
                      setDeletePassword("");
                    }}
                    style={{
                      flex: 1,
                      padding: 12,
                      borderRadius: 12,
                      border: "1px solid #2a2218",
                      background: "transparent",
                      color: "#8a7a6a",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    Înapoi
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleteLoading || !deletePassword}
                    style={{
                      flex: 1,
                      padding: 12,
                      borderRadius: 12,
                      border: "none",
                      background: deletePassword
                        ? "rgba(224,80,80,0.8)"
                        : "#2a2218",
                      color: deletePassword ? "#fff" : "#6b6050",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: deletePassword ? "pointer" : "not-allowed",
                      fontFamily: "inherit",
                    }}
                  >
                    {deleteLoading ? "Se șterge..." : "🗑️ Șterge"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Componente helper ─────────────────────────────────────────────────────────

function SectionLabel({ children, style }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 1.5,
        textTransform: "uppercase",
        color: "var(--muted)",
        padding: "0 8px",
        marginBottom: 8,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function MenuList({ children }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,.03)",
        border: "0.5px solid var(--border)",
        borderRadius: 14,
        overflow: "hidden",
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  );
}

function MenuItem({ icon, iconBg, title, sub, badge, onClick, last }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "13px 14px",
        borderBottom: last ? "none" : "0.5px solid rgba(255,255,255,.04)",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: iconBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--cream)" }}>
          {title}
        </div>
        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>
          {sub}
        </div>
      </div>
      {badge > 0 && (
        <span
          style={{
            background: "var(--terra)",
            color: "#fff",
            fontSize: 10,
            fontWeight: 700,
            padding: "2px 7px",
            borderRadius: 20,
            marginRight: 4,
          }}
        >
          {badge}
        </span>
      )}
      <span style={{ color: "var(--muted)", fontSize: 16 }}>›</span>
    </div>
  );
}

function EmptyState({ icon, title, desc, action, actionLabel }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 24px" }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>{icon}</div>
      <div
        style={{
          fontFamily: "'Fraunces',serif",
          fontSize: 18,
          fontWeight: 700,
          color: "var(--cream)",
          marginBottom: 6,
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: 13, color: "var(--muted)" }}>{desc}</div>
      {action && (
        <button
          onClick={action}
          style={{
            marginTop: 16,
            padding: "10px 24px",
            borderRadius: "var(--radius-pill)",
            background: "linear-gradient(135deg,#c0622f,#8b3a18)",
            border: "none",
            color: "#fff",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function RezervareCard({ r, trecut }) {
  const statusColor =
    {
      confirmed: "#4a9e5c",
      pending: "#c8a97e",
      cancelled: "#e05050",
      refused: "#e05050",
    }[r.status] || "#6b6050";

  const statusLabel =
    {
      confirmed: "Confirmată",
      pending: "În așteptare",
      cancelled: "Anulată",
      refused: "Refuzată",
    }[r.status] || r.status;

  return (
    <div
      style={{
        background: "var(--card)",
        border: "0.5px solid var(--border)",
        borderRadius: 16,
        padding: "14px 16px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <div
          style={{
            fontFamily: "'Fraunces',serif",
            fontSize: 15,
            fontWeight: 700,
            color: "var(--cream)",
          }}
        >
          {r.restaurants?.emoji}{" "}
          {r.restaurants?.name || r.restaurant_name || "Restaurant"}
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: statusColor,
            background: `${statusColor}22`,
            padding: "3px 9px",
            borderRadius: 20,
          }}
        >
          {statusLabel}
        </span>
      </div>
      <div
        style={{
          fontSize: 12,
          color: "var(--muted)",
          display: "flex",
          gap: 16,
        }}
      >
        <span>📅 {r.date}</span>
        <span>🕐 {r.time}</span>
        <span>👥 {r.persons} pers.</span>
      </div>
      {r.table_label && (
        <div style={{ marginTop: 6, fontSize: 12, color: "var(--muted)" }}>
          🪑 Masa {r.table_label}
        </div>
      )}
    </div>
  );
}

function NotaCard({ n }) {
  const total = (n.items || []).reduce(
    (s, i) => s + (i.price || 0) * (i.qty || 1),
    0,
  );
  const date = new Date(n.created_at).toLocaleDateString("ro-RO");

  return (
    <div
      style={{
        background: "var(--card)",
        border: "0.5px solid var(--border)",
        borderRadius: 16,
        padding: "14px 16px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <div
          style={{
            fontFamily: "'Fraunces',serif",
            fontSize: 15,
            fontWeight: 700,
            color: "var(--cream)",
          }}
        >
          {n.restaurants?.emoji} {n.restaurants?.name || "Restaurant"}
        </div>
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--terra)" }}>
          {total.toFixed(2)} RON
        </span>
      </div>
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>
        📅 {date} · Masa {n.table_label}
      </div>
      {(n.items || []).slice(0, 3).map((item, i) => (
        <div
          key={i}
          style={{
            fontSize: 12,
            color: "var(--muted)",
            display: "flex",
            justifyContent: "space-between",
            paddingTop: 4,
            borderTop: "0.5px solid var(--border)",
          }}
        >
          <span>
            {item.qty}x {item.name}
          </span>
          <span>{((item.price || 0) * (item.qty || 1)).toFixed(2)} RON</span>
        </div>
      ))}
      {(n.items || []).length > 3 && (
        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
          +{n.items.length - 3} produse
        </div>
      )}
    </div>
  );
}

function SchimbaParola({ showToast }) {
  const [parola, setParola] = useState("");
  const [confirmare, setConfirmare] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!parola || parola.length < 6) {
      showToast("⚠️ Parola trebuie să aibă minim 6 caractere.");
      return;
    }
    if (parola !== confirmare) {
      showToast("⚠️ Parolele nu coincid.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: parola });
    if (error) showToast("❌ Eroare la schimbarea parolei.");
    else showToast("✅ Parola a fost schimbată!");
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>
          Parolă nouă
        </div>
        <input
          type="password"
          value={parola}
          onChange={(e) => setParola(e.target.value)}
          placeholder="Minim 6 caractere"
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: 12,
            background: "var(--card)",
            border: "1px solid var(--border)",
            color: "var(--cream)",
            fontSize: 14,
            outline: "none",
          }}
        />
      </div>
      <div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>
          Confirmă parola
        </div>
        <input
          type="password"
          value={confirmare}
          onChange={(e) => setConfirmare(e.target.value)}
          placeholder="Repetă parola nouă"
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: 12,
            background: "var(--card)",
            border: "1px solid var(--border)",
            color: "var(--cream)",
            fontSize: 14,
            outline: "none",
          }}
        />
      </div>
      <button
        onClick={handleSave}
        disabled={loading}
        style={{
          padding: 14,
          borderRadius: 14,
          background: "linear-gradient(135deg,#c0622f,#8b3a18)",
          border: "none",
          color: "#fff",
          fontSize: 14,
          fontWeight: 700,
          cursor: "pointer",
          marginTop: 4,
        }}
      >
        {loading ? "Se salvează..." : "Salvează parola"}
      </button>
    </div>
  );
}
