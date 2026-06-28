import { useState, useRef, useEffect, useCallback } from "react";
import { useApp } from "../../context/AppContext";
import { supabase } from "../../supabase";
import imageCompression from "browser-image-compression";
import { ProgramEditorModal } from "../Restaurant";
import { RestaurantLocationPicker } from "../NewRestaurant";
import MiniDatePicker from "./MiniDatePicker";
import QrModal from "./QrModal";
import DeleteRestaurantModal from "./DeleteRestaurantModal";

function HomeOwner({ onLogout }) {
  const { state, navigate, dispatch, showToast } = useApp();
  const { user } = state;

  const [myRestaurants, setMyRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState(null);
  const [photoModal, setPhotoModal] = useState(null); // restaurantul pentru care uploadam poza
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const photoInputRef = useRef(null);
  const [locationEditRest, setLocationEditRest] = useState(null);

  const [showProgramModal, setShowProgramModal] = useState(false);
  const [programRestId, setProgramRestId] = useState(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrRestaurant, setQrRestaurant] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [localEvents, setLocalEvents] = useState([]);
  const [publicHolidays, setPublicHolidays] = useState([]);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: "",
    date: "",
    type: "festival",
    description: "",
  });
  const [calendarRestId, setCalendarRestId] = useState(null);
  const [currentProgram, setCurrentProgram] = useState(null);

  // Încarcă restaurantele proprietarului din Supabase
  const loadRestaurants = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("restaurants")
        .select("*")
        .eq("owner_id", user.id)
        .eq("is_deleted", false)
        .order("created_at");
      if (error) {
        console.error(
          "Supabase error:",
          error.message,
          error.details,
          error.hint,
        );
        console.error("user.id folosit:", user.id);
      }
      if (data) setMyRestaurants(data);
    } catch (err) {}
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    loadRestaurants();
  }, [loadRestaurants]);

  // Realtime + polling: reîncarcă restaurantele când SuperAdmin aprobă locația
  useEffect(() => {
    if (!user?.id) return;

    // Realtime fără filtru — mai fiabil decât filtrul pe coloană
    const channel = supabase
      .channel(`owner-restaurants-${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "restaurants" },
        () => {
          loadRestaurants();
        },
      )
      .subscribe();

    // Polling fallback la fiecare 10 secunde (prinde și cazurile când Realtime nu e activat)
    const interval = setInterval(() => {
      loadRestaurants();
    }, 10000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [user?.id, loadRestaurants]);

  // ── Calendar events ──
  useEffect(() => {
    if (user?.plan !== "business") return;
    if (myRestaurants.length === 0) return;
    const restId = myRestaurants[0]?.id;
    if (!restId) return;
    setCalendarRestId(restId);

    // 1. Incarca evenimentele locale din Supabase
    const loadEvents = async () => {
      const { data } = await supabase
        .from("events")
        .select("*")
        .eq("restaurant_id", restId)
        .order("date", { ascending: true });
      setLocalEvents(data || []);
    };
    loadEvents();

    // 2. Incarca sarbatorile legale din API - anul curent + precedent + urmator
    const loadHolidays = async () => {
      try {
        const year = new Date().getFullYear();
        const [r1, r2, r3] = await Promise.all([
          fetch(`https://date.nager.at/api/v3/PublicHolidays/${year - 1}/RO`),
          fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/RO`),
          fetch(`https://date.nager.at/api/v3/PublicHolidays/${year + 1}/RO`),
        ]);
        const [d1, d2, d3] = await Promise.all([
          r1.json(),
          r2.json(),
          r3.json(),
        ]);
        setPublicHolidays([...(d1 || []), ...(d2 || []), ...(d3 || [])]);
      } catch {
        setPublicHolidays([]);
      }
    };
    loadHolidays();
  }, [user?.plan, myRestaurants]);

  const handleAddEvent = async () => {
    if (!newEvent.title || !newEvent.date) {
      showToast("⚠️ Completează titlul și data!");
      return;
    }
    const restId = calendarRestId || myRestaurants[0]?.id;
    if (!restId) return;
    const { data, error } = await supabase
      .from("events")
      .insert({
        restaurant_id: restId,
        title: newEvent.title,
        date: newEvent.date,
        type: newEvent.type,
        description: newEvent.description,
        created_by: "owner",
      })
      .select()
      .single();
    if (!error && data) {
      setLocalEvents((prev) =>
        [...prev, data].sort((a, b) => a.date.localeCompare(b.date)),
      );
      setNewEvent({ title: "", date: "", type: "festival", description: "" });
      setShowAddEvent(false);
      showToast("✅ Eveniment adăugat!");
    }
  };

  const handleDeleteEvent = async (id) => {
    await supabase.from("events").delete().eq("id", id);
    setLocalEvents((prev) => prev.filter((e) => e.id !== id));
    showToast("🗑️ Eveniment șters.");
  };

  // Șterge restaurant din Supabase
  // ── Upload poza restaurant ──
  const handlePhotoSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.8,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
      });
      setPhotoFile(compressed);
      setPhotoPreview(URL.createObjectURL(compressed));
    } catch (err) {
      showToast("❌ Eroare la procesarea imaginii.");
    }
  };

  const handlePhotoSave = async () => {
    if (!photoFile || !photoModal) return;
    setPhotoLoading(true);
    try {
      const ext = photoFile.name?.split(".").pop() || "jpg";
      const path = `${photoModal.id}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("restaurant-covers")
        .upload(path, photoFile, { upsert: true, contentType: photoFile.type });
      if (uploadError) throw uploadError;
      const {
        data: { publicUrl },
      } = supabase.storage.from("restaurant-covers").getPublicUrl(path);
      const { error: updateError } = await supabase
        .from("restaurants")
        .update({ cover_image: publicUrl })
        .eq("id", photoModal.id);
      if (updateError) throw updateError;
      setMyRestaurants((prev) =>
        prev.map((r) =>
          r.id === photoModal.id ? { ...r, cover_image: publicUrl } : r,
        ),
      );
      setPhotoModal(null);
      setPhotoPreview(null);
      setPhotoFile(null);
      showToast("✅ Fotografia a fost salvată!");
    } catch (err) {
      showToast("❌ Eroare la salvarea fotografiei.");
    }
    setPhotoLoading(false);
  };

  const handleDeleteRestaurant = async (restaurantId) => {
    try {
      const { error } = await supabase
        .from("restaurants")
        .update({
          is_deleted: true,
          is_active: false,
          deleted_at: new Date().toISOString(),
        })
        .eq("id", restaurantId);
      if (error) throw error;
      setMyRestaurants((prev) => prev.filter((r) => r.id !== restaurantId));
      setDeleteModal(null);
      showToast("🗑️ Restaurantul a fost șters. Datele sunt păstrate 90 zile.");
    } catch (err) {
      showToast("❌ Eroare la ștergere. Încearcă din nou.");
      setDeleteModal(null);
    }
  };

  return (
    <>
      {deleteModal && (
        <DeleteRestaurantModal
          restaurant={deleteModal}
          onConfirm={handleDeleteRestaurant}
          onClose={() => setDeleteModal(null)}
        />
      )}

      {/* Modal upload fotografie */}
      {photoModal && (
        <div
          onClick={() => {
            setPhotoModal(null);
            setPhotoPreview(null);
            setPhotoFile(null);
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 500,
            background: "rgba(0,0,0,.85)",
            backdropFilter: "blur(10px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#161210",
              border: "1px solid #2a2218",
              borderRadius: 24,
              padding: 24,
              width: "100%",
              maxWidth: 400,
              animation: "fadeInUp .3s ease",
            }}
          >
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "#f0ebe3",
                marginBottom: 16,
              }}
            >
              📷 Fotografie restaurant
            </div>

            {/* Preview */}
            <div
              onClick={() => photoInputRef.current?.click()}
              style={{
                width: "100%",
                height: 200,
                borderRadius: 16,
                marginBottom: 16,
                background: photoPreview
                  ? "transparent"
                  : "rgba(255,255,255,.05)",
                border: `2px dashed ${photoPreview ? "#c0622f" : "#2a2218"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                overflow: "hidden",
                position: "relative",
              }}
            >
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="preview"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <div style={{ textAlign: "center", color: "#6b6050" }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🖼️</div>
                  <div style={{ fontSize: 13 }}>
                    Apasă pentru a alege o fotografie
                  </div>
                  <div style={{ fontSize: 11, marginTop: 4, color: "#4a3a28" }}>
                    JPG, PNG, WebP • Max 10MB
                  </div>
                </div>
              )}
            </div>

            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handlePhotoSelect}
            />

            {photoPreview && (
              <button
                onClick={() => photoInputRef.current?.click()}
                style={{
                  width: "100%",
                  padding: 10,
                  borderRadius: 12,
                  marginBottom: 10,
                  background: "rgba(255,255,255,.05)",
                  border: "1px solid #2a2218",
                  color: "#c8a97e",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Alege altă fotografie
              </button>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
              <button
                onClick={() => {
                  setPhotoModal(null);
                  setPhotoPreview(null);
                  setPhotoFile(null);
                }}
                style={{
                  padding: 13,
                  borderRadius: 12,
                  background: "none",
                  border: "1px solid #2a2218",
                  color: "#6b6050",
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Anulează
              </button>
              <button
                onClick={handlePhotoSave}
                disabled={!photoFile || photoLoading}
                style={{
                  padding: 13,
                  borderRadius: 12,
                  cursor: photoFile ? "pointer" : "not-allowed",
                  background: photoFile
                    ? "linear-gradient(135deg,#c0622f,#8b3a18)"
                    : "#2a2218",
                  border: "none",
                  color: photoFile ? "#fff" : "#6b6050",
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                {photoLoading ? "Se salvează..." : "✅ Salvează"}
              </button>
            </div>
          </div>
        </div>
      )}

      {locationEditRest && (
        <RestaurantLocationPicker
          city={locationEditRest.city}
          restaurantId={locationEditRest.id}
          showToast={showToast}
          onSelect={async (loc) => {
            try {
              const {
                data: { session },
              } = await supabase.auth.getSession();
              await supabase.from("location_requests").insert({
                owner_id: session?.user?.id,
                restaurant_id: locationEditRest.id,
                restaurant_name: locationEditRest.name,
                lat: loc.lat,
                lon: loc.lon,
                city: locationEditRest.city,
                type: "update",
                status: "pending",
              });
              showToast(
                "✅ Cerere de modificare locație trimisă! Vei fi notificat după aprobare.",
              );
            } catch (e) {
              showToast("❌ Eroare la trimitere.");
            }
            setLocationEditRest(null);
          }}
          onClose={() => setLocationEditRest(null)}
        />
      )}

      <div className="page fade-in">
        {/* Hero */}
        <div
          style={{
            padding: "52px 20px 28px",
            background: "linear-gradient(160deg,#1a0e05 0%,#0d0a07 60%)",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              background:
                "radial-gradient(ellipse 100% 60% at 50% 0%,rgba(192,98,47,.08),transparent 70%)",
            }}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 20,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <img
                src={`${process.env.PUBLIC_URL}/logo.png`}
                alt="WhataboutFood"
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 11,
                  display: "block",
                  objectFit: "cover",
                }}
              />
              <div
                style={{
                  fontFamily: "'Fraunces',serif",
                  fontSize: 22,
                  fontWeight: 900,
                }}
              >
                Whatabout<span style={{ color: "var(--terra)" }}>Food</span>
              </div>
            </div>
            <button
              onClick={onLogout}
              style={{
                padding: "6px 12px",
                borderRadius: 10,
                background: "rgba(192,57,43,.15)",
                border: "1px solid rgba(192,57,43,.3)",
                color: "#e05050",
                fontSize: 11,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Ieși
            </button>
          </div>
          {/* Profile card */}
          <div
            style={{
              background: "#161210",
              border: "1px solid #2a2218",
              borderRadius: 16,
              padding: "14px 16px",
              marginTop: 16,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: "50%",
                background: "#c0622f",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "'Fraunces',serif",
                fontSize: 20,
                fontWeight: 700,
                color: "#fff",
              }}
            >
              {(user?.name || "?")[0].toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: "#6b6050", marginBottom: 2 }}>
                Bun venit înapoi, 👑
              </div>
              <div
                style={{
                  fontFamily: "'Fraunces',serif",
                  fontSize: 17,
                  fontWeight: 900,
                  color: "#f0ebe3",
                  marginBottom: 4,
                }}
              >
                {user?.name}
              </div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  background: "rgba(192,98,47,0.12)",
                  border: "1px solid rgba(192,98,47,0.25)",
                  borderRadius: 20,
                  padding: "2px 10px",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#c0622f",
                }}
              >
                {user?.plan === "business"
                  ? "👑"
                  : user?.plan === "pro"
                    ? "⭐"
                    : "🆓"}{" "}
                {user?.plan === "business"
                  ? "Business"
                  : user?.plan === "pro"
                    ? "Pro"
                    : "Free"}
              </div>
            </div>
          </div>
        </div>

        <div className="inner" style={{ paddingTop: 20 }}>
          {/* Acțiuni rapide */}
          <div
            style={{
              fontSize: 10,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "#6b6050",
              marginBottom: 12,
            }}
          >
            Acțiuni rapide
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              marginBottom: 24,
            }}
          >
            {[
              {
                icon: "🏗️",
                label: "Editor Planșeu",
                desc: "Configurează mesele",
                screen: "adminFloor",
                color: "rgba(192,98,47,.2)",
                border: "rgba(192,98,47,.3)",
              },
              {
                icon: "📡",
                label: "Dashboard Live",
                desc: "Activitate în timp real",
                screen: "dashboardLive",
                color: "rgba(107,158,107,.2)",
                border: "rgba(107,158,107,.3)",
              },
              {
                icon: "📊",
                label: "Statistici",
                desc: "Venituri și rapoarte",
                screen: "statistici",
                color: "rgba(91,141,217,.2)",
                border: "rgba(91,141,217,.3)",
              },
              {
                icon: "🍽️",
                label: "Editor Meniu",
                desc: "Adaugă produse",
                screen: "menuEditor",
                color: "rgba(74,110,74,.2)",
                border: "rgba(74,110,74,.3)",
              },
              {
                icon: "🕐",
                label: "Program",
                desc: "Ore funcționare",
                screen: "programEditor",
                color: "rgba(91,141,217,.2)",
                border: "rgba(91,141,217,.3)",
              },
              {
                icon: "🤵",
                label: "Gestionare Ospătari",
                desc: "Adaugă / modifică",
                screen: "admin",
                color: "rgba(200,169,126,.2)",
                border: "rgba(200,169,126,.3)",
              },
              {
                icon: "👨‍🍳",
                label: "Gestionare Bucătari",
                desc: "Adaugă / modifică",
                screen: "kitchenManagement",
                color: "rgba(224,122,71,.2)",
                border: "rgba(224,122,71,.3)",
              },
            ].map((btn) => (
              <div
                key={btn.screen}
                onClick={() => {
                  if (btn.screen === "qrCode") {
                    const rest = myRestaurants[0];
                    setQrRestaurant(rest);
                    setShowQrModal(true);
                    return;
                  }
                  if (btn.screen === "programEditor") {
                    // Dacă are un singur restaurant, îl selectăm automat
                    if (myRestaurants.length === 1) {
                      setProgramRestId(myRestaurants[0].id);
                      supabase
                        .from("restaurants")
                        .select("program")
                        .eq("id", myRestaurants[0].id)
                        .single()
                        .then(({ data }) => {
                          setCurrentProgram(data?.program || null);
                          setShowProgramModal(true);
                        });
                    } else {
                      setShowProgramModal(true);
                    }
                    return;
                  }
                  navigate(btn.screen);
                }}
                style={{
                  background: `linear-gradient(135deg,${btn.color},transparent)`,
                  border: `1px solid ${btn.border}`,
                  borderRadius: 16,
                  padding: 16,
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: 26, marginBottom: 8 }}>{btn.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>
                  {btn.label}
                </div>
                <div style={{ fontSize: 10, color: "var(--muted)" }}>
                  {btn.desc}
                </div>
              </div>
            ))}
          </div>
          {user?.role === "superadmin" && (
            <div
              onClick={() => navigate("superAdmin")}
              style={{
                background:
                  "linear-gradient(135deg,rgba(91,141,217,.2),rgba(60,100,180,.1))",
                border: "1px solid rgba(91,141,217,.3)",
                borderRadius: 16,
                padding: 16,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 14,
                marginBottom: 10,
              }}
            >
              <div style={{ fontSize: 26 }}>⚙️</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>
                  Super Admin
                </div>
                <div style={{ fontSize: 10, color: "var(--muted)" }}>
                  Gestionează platforma
                </div>
              </div>
            </div>
          )}
          {/* QR Card - full width */}
          <div
            onClick={() => {
              const rest = myRestaurants[0];
              setQrRestaurant(rest);
              setShowQrModal(true);
            }}
            style={{
              background: "rgba(192,98,47,0.06)",
              border: "1px solid rgba(192,98,47,0.25)",
              borderRadius: 14,
              padding: "14px 16px",
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 12,
              cursor: "pointer",
            }}
          >
            <div style={{ fontSize: 24 }}>📲</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#f0ebe3" }}>
                Cod QR Restaurant
              </div>
              <div style={{ fontSize: 11, color: "#8a7a6a", marginTop: 2 }}>
                Generează & descarcă codul pentru clienți
              </div>
            </div>
            <div style={{ color: "#c0622f", fontSize: 16 }}>›</div>
          </div>

          {/* Restaurantele mele */}
          <div
            style={{
              fontSize: 10,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "#6b6050",
              marginBottom: 12,
            }}
          >
            Restaurantele mele
          </div>

          {loading ? (
            <div
              style={{
                textAlign: "center",
                padding: "20px 0",
                color: "#6b6050",
                fontSize: 13,
              }}
            >
              Se încarcă...
            </div>
          ) : myRestaurants.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "24px 0",
                color: "#6b6050",
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 8 }}>🏪</div>
              <div style={{ fontSize: 14, color: "#f0ebe3", marginBottom: 6 }}>
                Niciun restaurant creat
              </div>
              <div style={{ fontSize: 12, marginBottom: 16 }}>
                Adaugă primul tău restaurant pentru a începe.
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                marginBottom: 12,
              }}
            >
              {myRestaurants.map((r) => (
                <div
                  key={r.id}
                  style={{
                    background: r.is_active
                      ? "#161210"
                      : "rgba(224,122,71,.04)",
                    border: `1px solid ${r.is_active ? "#2a2218" : "rgba(224,122,71,.3)"}`,
                    borderRadius: 16,
                    padding: "14px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                  }}
                >
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 13,
                      background: r.cover_image
                        ? `url(${r.cover_image}) center/cover no-repeat`
                        : "linear-gradient(135deg,#2d1507,#1a0e05)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 26,
                      flexShrink: 0,
                    }}
                  >
                    {!r.cover_image && (r.emoji || "🍽️")}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>
                      {r.name}
                    </div>
                    <div
                      style={{ fontSize: 11, color: "#6b6050", marginTop: 2 }}
                    >
                      {r.city}
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 3,
                          marginLeft: 6,
                          color: r.is_active ? "#6b9e6b" : "#e07a47",
                          fontWeight: 600,
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: r.is_active ? "#6b9e6b" : "#e07a47",
                            display: "inline-block",
                          }}
                        />
                        {r.is_active ? "Activ" : "În așteptare"}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => navigate("adminFloor")}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: "rgba(192,98,47,.15)",
                        border: "1px solid rgba(192,98,47,.3)",
                        color: "#e07a47",
                        fontSize: 16,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => {
                        setPhotoModal(r);
                        setPhotoPreview(r.cover_image || null);
                        setPhotoFile(null);
                      }}
                      title="Adaugă fotografie"
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: "rgba(74,110,74,.1)",
                        border: "1px solid rgba(74,110,74,.25)",
                        color: "#6b9e6b",
                        fontSize: 14,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      📷
                    </button>
                    <button
                      onClick={() => setLocationEditRest(r)}
                      title="Modifică locația pe hartă"
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: "rgba(200,169,126,.1)",
                        border: "1px solid rgba(200,169,126,.25)",
                        color: "#c8a97e",
                        fontSize: 14,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      📍
                    </button>
                    <button
                      onClick={() => setDeleteModal(r)}
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

          {/* Adaugă restaurant - cu limita per plan */}
          {(() => {
            const maxRests = user?.plan === "business" ? 5 : 1;
            const atLimit = myRestaurants.length >= maxRests;
            return (
              <div
                onClick={() => {
                  if (atLimit) {
                    showToast(
                      user?.plan === "business"
                        ? "❌ Ai atins limita de 5 restaurante pentru planul Business."
                        : "❌ Planul tău permite un singur restaurant. Upgradează la Business pentru mai multe.",
                    );
                    return;
                  }
                  navigate("newRestaurant");
                }}
                style={{
                  border: `1px dashed ${atLimit ? "#3a2218" : "#2a2218"}`,
                  borderRadius: 16,
                  padding: 16,
                  cursor: atLimit ? "not-allowed" : "pointer",
                  textAlign: "center",
                  color: atLimit ? "#3a2a20" : "#6b6050",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  opacity: atLimit ? 0.5 : 1,
                }}
              >
                <span style={{ fontSize: 20 }}>{atLimit ? "🔒" : "+"}</span>
                <div>
                  <div style={{ fontSize: 13 }}>
                    {atLimit ? "Limită atinsă" : "Adaugă restaurant nou"}
                  </div>
                  <div style={{ fontSize: 10, marginTop: 2 }}>
                    {myRestaurants.length}/{maxRests} restaurante
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* ── CALENDAR EVENIMENTE (Business) ── */}
      {user?.plan === "business" && (
        <div style={{ marginTop: 0, padding: "0 16px 100px" }}>
          <div
            style={{
              fontSize: 10,
              letterSpacing: "1.5px",
              textTransform: "uppercase",
              color: "#6b6050",
              marginBottom: 10,
            }}
          >
            📅 Evenimente & Sărbători
          </div>
          <div
            style={{
              background: "#111009",
              border: "1px solid #1e1a14",
              borderRadius: 16,
              padding: 16,
            }}
          >
            {/* Header calendar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  fontFamily: "'Fraunces',serif",
                  fontSize: 15,
                  fontWeight: 700,
                }}
              >
                {
                  [
                    "Ianuarie",
                    "Februarie",
                    "Martie",
                    "Aprilie",
                    "Mai",
                    "Iunie",
                    "Iulie",
                    "August",
                    "Septembrie",
                    "Octombrie",
                    "Noiembrie",
                    "Decembrie",
                  ][calendarMonth]
                }{" "}
                {calendarYear}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={() => {
                    if (calendarMonth === 0) {
                      setCalendarMonth(11);
                      setCalendarYear((y) => y - 1);
                    } else setCalendarMonth((m) => m - 1);
                  }}
                  style={{
                    background: "#161210",
                    border: "1px solid #2a2218",
                    color: "#8a7a6a",
                    borderRadius: 8,
                    width: 28,
                    height: 28,
                    cursor: "pointer",
                    fontSize: 14,
                  }}
                >
                  ‹
                </button>
                <button
                  onClick={() => {
                    if (calendarMonth === 11) {
                      setCalendarMonth(0);
                      setCalendarYear((y) => y + 1);
                    } else setCalendarMonth((m) => m + 1);
                  }}
                  style={{
                    background: "#161210",
                    border: "1px solid #2a2218",
                    color: "#8a7a6a",
                    borderRadius: 8,
                    width: 28,
                    height: 28,
                    cursor: "pointer",
                    fontSize: 14,
                  }}
                >
                  ›
                </button>
              </div>
            </div>

            {/* Zile saptamana */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7,1fr)",
                gap: 2,
                marginBottom: 6,
              }}
            >
              {["Lun", "Mar", "Mie", "Joi", "Vin", "Sâm", "Dum"].map((d) => (
                <div
                  key={d}
                  style={{
                    textAlign: "center",
                    fontSize: 9,
                    color: "#6b6050",
                    padding: "3px 0",
                  }}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Grid zile */}
            {(() => {
              const firstDay = new Date(calendarYear, calendarMonth, 1);
              const lastDay = new Date(calendarYear, calendarMonth + 1, 0);
              const startOffset = (firstDay.getDay() + 6) % 7;
              const daysInMonth = lastDay.getDate();
              const today = new Date();
              const cells = [];
              for (let i = 0; i < startOffset; i++) cells.push(null);
              for (let d = 1; d <= daysInMonth; d++) cells.push(d);
              const getDateStr = (d) =>
                `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
              const hasHoliday = (d) =>
                publicHolidays.some((h) => h.date === getDateStr(d));
              const hasEvent = (d) =>
                localEvents.some(
                  (e) =>
                    e.date === getDateStr(d) && e.created_by !== "superadmin",
                );
              const hasAppEvent = (d) =>
                localEvents.some(
                  (e) =>
                    e.date === getDateStr(d) && e.created_by === "superadmin",
                );
              const isToday = (d) =>
                today.getDate() === d &&
                today.getMonth() === calendarMonth &&
                today.getFullYear() === calendarYear;
              return (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(7,1fr)",
                    gap: 3,
                    marginBottom: 14,
                  }}
                >
                  {cells.map((d, i) => {
                    if (!d) return <div key={i} />;
                    const h = hasHoliday(d),
                      e = hasEvent(d),
                      a = hasAppEvent(d),
                      t = isToday(d);
                    let bg = "#161210",
                      border = "transparent",
                      color = "#6b6050";
                    if (t) {
                      bg = "#c0622f";
                      color = "#fff";
                    } else if (h && (e || a)) {
                      bg = "rgba(91,141,217,0.15)";
                      border = "rgba(91,141,217,0.3)";
                      color = "#f0ebe3";
                    } else if (h) {
                      bg = "rgba(224,80,80,0.12)";
                      border = "rgba(224,80,80,0.3)";
                      color = "#f0ebe3";
                    } else if (a) {
                      bg = "rgba(107,158,107,0.12)";
                      border = "rgba(107,158,107,0.3)";
                      color = "#f0ebe3";
                    } else if (e) {
                      bg = "rgba(192,98,47,0.12)";
                      border = "rgba(192,98,47,0.3)";
                      color = "#f0ebe3";
                    }
                    return (
                      <div
                        key={i}
                        style={{
                          aspectRatio: "1",
                          borderRadius: 7,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 11,
                          background: bg,
                          border: `1px solid ${border}`,
                          color,
                          position: "relative",
                          fontWeight: t ? 700 : 400,
                        }}
                      >
                        {d}
                        {(h || e || a) && !t && (
                          <div
                            style={{
                              position: "absolute",
                              bottom: 2,
                              display: "flex",
                              gap: 2,
                            }}
                          >
                            {h && (
                              <div
                                style={{
                                  width: 3,
                                  height: 3,
                                  borderRadius: "50%",
                                  background: "#e05050",
                                }}
                              />
                            )}
                            {e && (
                              <div
                                style={{
                                  width: 3,
                                  height: 3,
                                  borderRadius: "50%",
                                  background: "#c0622f",
                                }}
                              />
                            )}
                            {a && (
                              <div
                                style={{
                                  width: 3,
                                  height: 3,
                                  borderRadius: "50%",
                                  background: "#6b9e6b",
                                }}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* Legenda */}
            <div
              style={{
                display: "flex",
                gap: 12,
                marginBottom: 14,
                flexWrap: "wrap",
              }}
            >
              {[
                {
                  bg: "rgba(224,80,80,0.3)",
                  border: "#e05050",
                  label: "Sărbătoare legală",
                },
                {
                  bg: "rgba(192,98,47,0.3)",
                  border: "#c0622f",
                  label: "Eveniment local",
                },
                {
                  bg: "rgba(107,158,107,0.3)",
                  border: "#6b9e6b",
                  label: "Eveniment din App",
                },
                {
                  bg: "rgba(91,141,217,0.3)",
                  border: "#5b8dd9",
                  label: "Ambele",
                },
              ].map((l) => (
                <div
                  key={l.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 10,
                    color: "#6b6050",
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 2,
                      background: l.bg,
                      border: `1px solid ${l.border}`,
                    }}
                  />
                  {l.label}
                </div>
              ))}
            </div>

            {/* Lista evenimente */}
            {(() => {
              const monthStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}`;
              const monthHolidays = publicHolidays.filter((h) =>
                h.date?.startsWith(monthStr),
              );
              const monthLocalEvents = localEvents.filter((e) =>
                e.date?.startsWith(monthStr),
              );
              const all = [
                ...monthHolidays.map((h) => ({
                  date: h.date,
                  title: h.localName,
                  isHoliday: true,
                })),
                ...monthLocalEvents.map((e) => ({ ...e, isHoliday: false })),
              ].sort((a, b) => a.date.localeCompare(b.date));
              const LUNI_SHORT = [
                "Ian",
                "Feb",
                "Mar",
                "Apr",
                "Mai",
                "Iun",
                "Iul",
                "Aug",
                "Sep",
                "Oct",
                "Nov",
                "Dec",
              ];
              return all.length > 0 ? (
                <div style={{ marginBottom: 12 }}>
                  <div
                    style={{
                      fontSize: 10,
                      letterSpacing: "1px",
                      textTransform: "uppercase",
                      color: "#6b6050",
                      marginBottom: 8,
                    }}
                  >
                    Evenimente luna aceasta
                  </div>
                  {all.map((ev, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        background: "#161210",
                        borderRadius: 10,
                        padding: "9px 12px",
                        marginBottom: 6,
                        borderLeft: `3px solid ${ev.isHoliday ? "#e05050" : "#c0622f"}`,
                      }}
                    >
                      <div
                        style={{ fontSize: 10, color: "#6b6050", minWidth: 40 }}
                      >
                        {ev.date?.split("-")[2]} {LUNI_SHORT[calendarMonth]}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: 12,
                            color: "#f0ebe3",
                            fontWeight: 500,
                          }}
                        >
                          {ev.title}
                        </div>
                        <div
                          style={{
                            fontSize: 10,
                            color: "#8a7a6a",
                            marginTop: 1,
                          }}
                        >
                          {ev.isHoliday
                            ? "🔴 Sărbătoare legală"
                            : ev.created_by === "superadmin"
                              ? `🟢 ${ev.type} • Eveniment din App`
                              : `🟠 ${ev.type}`}
                        </div>
                      </div>
                      {!ev.isHoliday && (
                        <button
                          onClick={() => handleDeleteEvent(ev.id)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#e05050",
                            cursor: "pointer",
                            fontSize: 14,
                            padding: 4,
                          }}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    color: "#6b6050",
                    fontSize: 12,
                    padding: "10px 0",
                    marginBottom: 12,
                  }}
                >
                  Niciun eveniment în această lună
                </div>
              );
            })()}

            {/* Buton adauga */}
            <button
              onClick={() => setShowAddEvent(true)}
              style={{
                width: "100%",
                padding: 10,
                background: "rgba(192,98,47,0.08)",
                border: "1px dashed rgba(192,98,47,0.3)",
                borderRadius: 10,
                color: "#c0622f",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              + Adaugă eveniment
            </button>
          </div>
        </div>
      )}

      {/* Modal adauga eveniment */}

      {/* Modal QR Restaurant */}
      {showQrModal && qrRestaurant && (
        <QrModal
          restaurant={qrRestaurant}
          restaurants={myRestaurants}
          onRestChange={(rest) => setQrRestaurant(rest)}
          onClose={() => {
            setShowQrModal(false);
            setQrRestaurant(null);
          }}
        />
      )}

      {/* Modal Editor Program */}
      {showProgramModal && (
        <ProgramEditorModal
          restaurants={myRestaurants}
          initialRestId={programRestId}
          initialProgram={currentProgram}
          onClose={() => setShowProgramModal(false)}
          onSave={async (restId, newProgram) => {
            const { error } = await supabase
              .from("restaurants")
              .update({ program: newProgram })
              .eq("id", restId);
            if (!error) {
              showToast("✅ Programul a fost salvat!");
              setShowProgramModal(false);
            } else {
              showToast("❌ Eroare la salvare.");
            }
          }}
        />
      )}

      {/* Modal Adaugă Eveniment */}
      {showAddEvent && (
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
          onClick={() => setShowAddEvent(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#1a1510",
              borderRadius: 20,
              padding: "24px 20px 28px",
              width: "100%",
              maxWidth: 480,
            }}
          >
            <div
              style={{
                fontFamily: "'Fraunces',serif",
                fontSize: 17,
                fontWeight: 700,
                marginBottom: 16,
              }}
            >
              📅 Adaugă eveniment
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: "#6b6050", marginBottom: 6 }}>
                Titlu *
              </div>
              <input
                value={newEvent.title}
                onChange={(e) =>
                  setNewEvent((p) => ({ ...p, title: e.target.value }))
                }
                placeholder="Ex: Festival Iași 2026"
                style={{
                  width: "100%",
                  background: "#161210",
                  border: "1px solid #2a2218",
                  borderRadius: 10,
                  padding: "9px 12px",
                  color: "#f0ebe3",
                  fontFamily: "inherit",
                  fontSize: 13,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: "#6b6050", marginBottom: 6 }}>
                Dată *
              </div>
              <MiniDatePicker
                value={newEvent.date}
                onChange={(d) => setNewEvent((p) => ({ ...p, date: d }))}
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: "#6b6050", marginBottom: 6 }}>
                Tip eveniment
              </div>
              <select
                value={newEvent.type}
                onChange={(e) =>
                  setNewEvent((p) => ({ ...p, type: e.target.value }))
                }
                style={{
                  width: "100%",
                  background: "#161210",
                  border: "1px solid #2a2218",
                  borderRadius: 10,
                  padding: "9px 12px",
                  color: "#f0ebe3",
                  fontFamily: "inherit",
                  fontSize: 13,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              >
                <option value="festival">🎪 Festival</option>
                <option value="concert">🎵 Concert</option>
                <option value="meci">⚽ Meci sportiv</option>
                <option value="targ">🛍️ Târg</option>
                <option value="altele">📌 Altele</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setShowAddEvent(false)}
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
                onClick={handleAddEvent}
                style={{
                  flex: 2,
                  padding: 12,
                  borderRadius: 12,
                  border: "none",
                  background: "linear-gradient(135deg,#c0622f,#8b3a18)",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                ✅ Salvează
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── EXPORT ───────────────────────────────────────────────────────────────────

export default HomeOwner;
