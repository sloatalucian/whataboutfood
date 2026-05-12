import React, { useState, useEffect, useRef, useCallback } from "react";
import { useApp } from "../context/AppContext";
import { supabase } from "../supabase";

const PIN_CSS = `
  .waf-owner-pin-gray { background:#3a3a3a; border:1.5px solid #666; border-radius:8px; padding:4px 10px; font-size:11px; font-weight:600; color:#ccc; font-family:sans-serif; white-space:nowrap; box-shadow:0 2px 8px rgba(0,0,0,.5); cursor:pointer; position:relative; display:inline-block; max-width:140px; overflow:hidden; text-overflow:ellipsis; transition:transform .25s, box-shadow .25s; }
  .waf-owner-pin-gray.selected { transform:scale(4); box-shadow:0 8px 24px rgba(0,0,0,.8); z-index:9999 !important; background:#555; border-color:#aaa; color:#fff; }
  .waf-owner-pin-gray::after { content:""; position:absolute; bottom:-6px; left:50%; transform:translateX(-50%); width:0; height:0; border-left:5px solid transparent; border-right:5px solid transparent; border-top:6px solid #3a3a3a; }
  .waf-owner-dot-gray { width:10px; height:10px; background:#555; border:1.5px solid #888; border-radius:50%; cursor:pointer; }
`;

const CITY_COORDS_MAP = {
  Iași: [47.1585, 27.6014],
  București: [44.4268, 26.1025],
  "Cluj-Napoca": [46.7712, 23.6236],
  Timișoara: [45.7489, 21.2087],
  Constanța: [44.1598, 28.6348],
  Brașov: [45.6427, 25.5887],
  Galați: [45.4353, 28.008],
  Craiova: [44.3302, 23.7949],
  Oradea: [47.0722, 21.9217],
  Sibiu: [45.7983, 24.1256],
  Bacău: [46.567, 26.9146],
  Suceava: [47.6514, 26.2556],
};

function RestaurantLocationPicker({ city, onSelect, onClose }) {
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const markersLayer = useRef(null);
  const selectedMarkerRef = useRef(null);
  const scriptLoaded = useRef(false);

  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(null);

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = PIN_CSS;
    document.head.appendChild(style);
    return () => {
      try {
        document.head.removeChild(style);
      } catch (_) {}
    };
  }, []);

  useEffect(() => {
    if (scriptLoaded.current) return;
    scriptLoaded.current = true;

    if (!document.querySelector('link[href*="leaflet"]')) {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(css);
    }

    const initMap = () => {
      if (!mapRef.current || leafletMap.current) return;
      const L = window.L;
      const center = CITY_COORDS_MAP[city] || [47.1585, 27.6014];

      leafletMap.current = L.map(mapRef.current, {
        center,
        zoom: 15,
        zoomControl: false,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(leafletMap.current);
      L.control.zoom({ position: "bottomright" }).addTo(leafletMap.current);
      markersLayer.current = L.layerGroup().addTo(leafletMap.current);
      leafletMap.current.on("moveend zoomend", fetchPOIs);
      setTimeout(fetchPOIs, 600);
    };

    if (window.L) initMap();
    else {
      const js = document.createElement("script");
      js.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      js.onload = initMap;
      document.head.appendChild(js);
    }
  }, []);

  const fetchPOIs = useCallback(async () => {
    if (!leafletMap.current || !window.L) return;
    const zoom = leafletMap.current.getZoom();
    if (zoom < 13) return;
    const b = leafletMap.current.getBounds();
    const query = `[out:json][timeout:15];(node["amenity"~"restaurant|cafe|bar|fast_food|pub|bistro"](${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()}););out 80;`;
    setLoading(true);
    try {
      const res = await fetch(
        `https://overpass.kumi.systems/api/interpreter?data=${encodeURIComponent(query)}`,
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      const pois = (data.elements || [])
        .filter((el) => el.tags?.name && el.lat && el.lon)
        .map((el) => ({
          id: el.id,
          name: el.tags.name,
          lat: el.lat,
          lon: el.lon,
          address: el.tags["addr:street"] || "",
        }));
      renderPOIs(pois, zoom);
    } catch (e) {}
    setLoading(false);
  }, []);

  const renderPOIs = useCallback((pois, zoom) => {
    if (!markersLayer.current || !window.L) return;
    const L = window.L;
    markersLayer.current.clearLayers();
    selectedMarkerRef.current = null;
    const showLabel = zoom >= 14;

    pois.forEach((poi) => {
      const icon = showLabel
        ? L.divIcon({
            className: "",
            html: `<div class="waf-owner-pin-gray">${poi.name}</div>`,
            iconAnchor: [0, 0],
          })
        : L.divIcon({
            className: "",
            html: `<div class="waf-owner-dot-gray"></div>`,
            iconSize: [10, 10],
            iconAnchor: [5, 5],
          });

      L.marker([poi.lat, poi.lon], { icon })
        .on("click", (e) => {
          const marker = e.target;
          if (
            selectedMarkerRef.current &&
            selectedMarkerRef.current !== marker
          ) {
            const prev = selectedMarkerRef.current
              .getElement()
              ?.querySelector("div");
            if (prev) prev.classList.remove("selected");
          }
          const el = marker.getElement()?.querySelector("div");
          if (el) el.classList.add("selected");
          selectedMarkerRef.current = marker;
          if (leafletMap.current) leafletMap.current.panTo([poi.lat, poi.lon]);
          setConfirming(poi);
        })
        .addTo(markersLayer.current);
    });
  }, []);

  const searchOverpass = async (q) => {
    if (q.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setLoading(true);
    try {
      const query = `[out:json][timeout:10];node["name"~"${q}","i"]["amenity"~"restaurant|cafe|bar|fast_food|pub"](44.0,20.0,48.5,30.0);out 8;`;
      const res = await fetch(
        `https://overpass.kumi.systems/api/interpreter?data=${encodeURIComponent(query)}`,
      );
      const data = await res.json();
      setSearchResults(
        (data.elements || [])
          .filter((el) => el.tags?.name && el.lat && el.lon)
          .map((el) => ({
            id: el.id,
            name: el.tags.name,
            lat: el.lat,
            lon: el.lon,
            address: el.tags["addr:street"] || "",
          })),
      );
    } catch (e) {}
    setLoading(false);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        background: "#0a0805",
      }}
    >
      <div
        style={{
          background: "#0d0a07",
          borderBottom: "1px solid #2a2218",
          padding: "10px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          flexShrink: 0,
          position: "relative",
          overflow: "visible",
          zIndex: 100,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "#1a1510",
              border: "1px solid #2a2218",
              color: "#f0ebe3",
              fontSize: 18,
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
              fontSize: 16,
              fontWeight: 900,
              color: "#f0ebe3",
              flex: 1,
            }}
          >
            📍 Alege locația restaurantului
          </span>
          {loading && (
            <span style={{ fontSize: 11, color: "#c8a97e" }}>⏳</span>
          )}
        </div>

        <div style={{ position: "relative", zIndex: 9999 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "#1a1510",
              border: "1px solid #2a2218",
              borderRadius: 50,
              padding: "9px 16px",
            }}
          >
            <span style={{ color: "#6b6050" }}>🔍</span>
            <input
              type="text"
              placeholder="Caută restaurantul tău..."
              value={searchQ}
              onChange={(e) => {
                setSearchQ(e.target.value);
                searchOverpass(e.target.value);
              }}
              maxLength={60}
              style={{
                flex: 1,
                background: "none",
                border: "none",
                outline: "none",
                color: "#f0ebe3",
                fontSize: 16,
                fontFamily: "inherit",
              }}
            />
            {searchQ && (
              <button
                onClick={() => {
                  setSearchQ("");
                  setSearchResults([]);
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#6b6050",
                  cursor: "pointer",
                  fontSize: 18,
                }}
              >
                ×
              </button>
            )}
          </div>
          {searchResults.length > 0 && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                left: 0,
                right: 0,
                background: "#1a1510",
                border: "1px solid #2a2218",
                borderRadius: 14,
                overflow: "hidden",
                boxShadow: "0 8px 24px rgba(0,0,0,.7)",
                zIndex: 99999,
              }}
            >
              {searchResults.map((r, i) => (
                <div
                  key={i}
                  onClick={() => {
                    setSearchResults([]);
                    setSearchQ(r.name);
                    if (leafletMap.current)
                      leafletMap.current.setView([r.lat, r.lon], 17);
                    setConfirming(r);
                  }}
                  style={{
                    padding: "12px 16px",
                    cursor: "pointer",
                    borderBottom: "1px solid rgba(255,255,255,.04)",
                  }}
                >
                  <div
                    style={{ fontSize: 13, fontWeight: 600, color: "#f0ebe3" }}
                  >
                    {r.name}
                  </div>
                  {r.address && (
                    <div style={{ fontSize: 11, color: "#6b6050" }}>
                      📍 {r.address}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ fontSize: 11, color: "#6b6050", textAlign: "center" }}>
          Dă click pe un pin pentru a selecta restaurantul
        </div>
      </div>

      <div ref={mapRef} style={{ flex: 1 }} />

      {confirming && (
        <div
          style={{
            position: "absolute",
            bottom: 16,
            left: 16,
            right: 16,
            background: "#1a1510",
            border: "1px solid rgba(192,98,47,.4)",
            borderRadius: 20,
            padding: "18px 20px",
            boxShadow: "0 -4px 32px rgba(0,0,0,.6)",
            zIndex: 200,
          }}
        >
          <div
            style={{
              fontSize: 14,
              color: "#c8a97e",
              marginBottom: 8,
              textAlign: "center",
              fontWeight: 600,
            }}
          >
            Ești sigur că acesta este restaurantul dumneavoastră?
          </div>
          <div
            style={{
              fontFamily: "'Fraunces',serif",
              fontSize: 17,
              fontWeight: 900,
              color: "#f0ebe3",
              marginBottom: 4,
              textAlign: "center",
            }}
          >
            {confirming.name}
          </div>
          {confirming.address && (
            <div
              style={{
                fontSize: 12,
                color: "#6b6050",
                textAlign: "center",
                marginBottom: 14,
              }}
            >
              📍 {confirming.address}
            </div>
          )}
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => {
                if (selectedMarkerRef.current) {
                  const el = selectedMarkerRef.current
                    .getElement()
                    ?.querySelector("div");
                  if (el) el.classList.remove("selected");
                  selectedMarkerRef.current = null;
                }
                setConfirming(null);
              }}
              style={{
                flex: 1,
                padding: "12px",
                background: "#1e1a14",
                border: "1px solid #2a2218",
                borderRadius: 14,
                color: "#f0ebe3",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Nu
            </button>
            <button
              onClick={() =>
                onSelect({
                  lat: confirming.lat,
                  lon: confirming.lon,
                  name: confirming.name,
                })
              }
              style={{
                flex: 2,
                padding: "12px",
                background: "linear-gradient(135deg,#c0622f,#8b3a18)",
                border: "none",
                borderRadius: 14,
                color: "#fff",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Da, acesta este!
            </button>
          </div>
        </div>
      )}
      <style>{`.leaflet-container{background:#1a1510!important}.leaflet-control-attribution{display:none!important}`}</style>
    </div>
  );
}

const TIPURI = [
  "Ristorante Italian",
  "Restaurant Românesc",
  "Japonez / Sushi",
  "Fast Food",
  "Cafenea",
  "Pizzerie",
  "Grill / BBQ",
  "Vegetarian / Vegan",
  "Pub / Bar",
  "Internațional",
];

const ORASE = [
  "Alba Iulia",
  "Alexandria",
  "Arad",
  "Bacău",
  "Baia Mare",
  "Bistrița",
  "Botoșani",
  "Brăila",
  "Brașov",
  "București",
  "Buzău",
  "Călărași",
  "Cluj-Napoca",
  "Constanța",
  "Craiova",
  "Deva",
  "Drobeta-Turnu Severin",
  "Drobeta",
  "Focșani",
  "Galați",
  "Giurgiu",
  "Iași",
  "Miercurea Ciuc",
  "Oradea",
  "Piatra Neamț",
  "Pitești",
  "Ploiești",
  "Râmnicu Vâlcea",
  "Reșița",
  "Satu Mare",
  "Sfântu Gheorghe",
  "Sibiu",
  "Slatina",
  "Slobozia",
  "Suceava",
  "Târgoviște",
  "Târgu Jiu",
  "Târgu Mureș",
  "Timișoara",
  "Tulcea",
  "Vaslui",
  "Zalău",
  "Alexandria",
  "Alte orașe",
].sort();

const EMOJIS_REST = [
  "🍝",
  "🍕",
  "🍣",
  "🥩",
  "🍔",
  "🥗",
  "🍜",
  "🥘",
  "🫕",
  "🍱",
  "🥐",
  "☕",
  "🍺",
  "🍷",
];

export default function NewRestaurant() {
  const { navigate, showToast, state } = useApp();
  const { user } = state;

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [restLocation, setRestLocation] = useState(null);
  const [showLocationMap, setShowLocationMap] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "",
    emoji: "🍝",
    address: "",
    city: "",
    phone: "",
    email: "",
    website: "",
    description: "",
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleNext = () => {
    if (/\p{Emoji}/u.test(form.name)) {
      showToast("Numele restaurantului nu poate conține emoji.");
      return;
    }
    if (!form.name) {
      showToast("⚠️ Completează numele restaurantului!");
      return;
    }
    if (!form.type) {
      showToast("⚠️ Selectează tipul bucătăriei!");
      return;
    }
    if (!form.address) {
      showToast("⚠️ Completează adresa!");
      return;
    }
    if (!form.city) {
      showToast("⚠️ Selectează orașul!");
      return;
    }
    setStep(2);
  };

  const handleCreate = async () => {
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const userId = user?.id || session?.user?.id;

      if (!userId) {
        showToast("❌ Trebuie să fii logat!");
        setLoading(false);
        return;
      }

      const { error } = await supabase.from("restaurants").insert({
        owner_id: userId,
        name: form.name,
        type: form.type,
        emoji: form.emoji,
        address: form.address,
        city: form.city,
        phone: form.phone || null,
        email: form.email || null,
        website: form.website || null,
        description: form.description || null,
        plan: user?.plan || "free",
        is_active: true,
        latitude: restLocation?.lat || null,
        longitude: restLocation?.lon || null,
        location_name: restLocation?.name || null,
      });

      if (error) throw error;
      showToast(`🎉 Restaurantul „${form.name}" a fost creat!`);
      navigate("adminFloor");
    } catch (err) {
      console.log("Create restaurant error:", err);
      showToast("❌ Eroare la creare. Încearcă din nou.");
    }
    setLoading(false);
  };

  return (
    <div className="page fade-in" style={{ paddingBottom: 100 }}>
      {/* Header */}
      <div
        style={{
          padding: "44px 20px 24px",
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
            onClick={() => (step === 1 ? navigate("home") : setStep(1))}
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
              🏪 Restaurant Nou
            </div>
            <div style={{ fontSize: 12, color: "#6b6050", marginTop: 2 }}>
              Pasul {step} din 2
            </div>
          </div>
        </div>
        <div
          style={{
            height: 4,
            background: "#2a2218",
            borderRadius: 20,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: step === 1 ? "50%" : "100%",
              background: "linear-gradient(90deg,#c0622f,#e07a47)",
              borderRadius: 20,
              transition: "width .3s",
            }}
          />
        </div>
      </div>

      <div style={{ padding: 20 }}>
        {step === 1 ? (
          <>
            <div
              style={{
                fontSize: 11,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: "#6b6050",
                marginBottom: 16,
              }}
            >
              Informații de bază
            </div>

            {/* Emoji */}
            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  fontSize: 11,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                  color: "#6b6050",
                  marginBottom: 10,
                  display: "block",
                }}
              >
                Emoji reprezentativ
              </label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {EMOJIS_REST.map((e) => (
                  <div
                    key={e}
                    onClick={() => set("emoji", e)}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 24,
                      cursor: "pointer",
                      background:
                        form.emoji === e ? "rgba(192,98,47,.3)" : "#1e1a14",
                      border: `2px solid ${form.emoji === e ? "#c0622f" : "#2a2218"}`,
                    }}
                  >
                    {e}
                  </div>
                ))}
              </div>
            </div>

            {/* Nume */}
            <div style={{ marginBottom: 16 }}>
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
                Numele restaurantului *
              </label>
              <input
                placeholder="Ex: Mama Mia, La Fontana..."
                value={form.name}
                maxLength={80}
                onChange={(e) => set("name", e.target.value)}
                style={{
                  width: "100%",
                  background: "#1e1a14",
                  border: "1px solid #2a2218",
                  borderRadius: 14,
                  padding: "13px 16px",
                  color: "#f0ebe3",
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  fontSize: 14,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Tip bucătărie */}
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  fontSize: 11,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                  color: "#6b6050",
                  marginBottom: 10,
                  display: "block",
                }}
              >
                Tipul bucătăriei *
              </label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {TIPURI.map((t) => (
                  <div
                    key={t}
                    onClick={() => set("type", t)}
                    style={{
                      padding: "7px 14px",
                      borderRadius: 20,
                      cursor: "pointer",
                      background: form.type === t ? "#c0622f" : "#1e1a14",
                      border: `1px solid ${form.type === t ? "#c0622f" : "#2a2218"}`,
                      color: form.type === t ? "#fff" : "#6b6050",
                      fontSize: 12,
                      fontWeight: form.type === t ? 700 : 400,
                    }}
                  >
                    {t}
                  </div>
                ))}
              </div>
            </div>

            {/* Buton selectare locatie pe harta */}
            <div style={{ marginBottom: 16 }}>
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
                Locația pe hartă (opțional)
              </label>
              {restLocation ? (
                <div
                  style={{
                    background: "rgba(192,98,47,.08)",
                    border: "1px solid rgba(192,98,47,.3)",
                    borderRadius: 12,
                    padding: "12px 14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#f0ebe3",
                        marginBottom: 2,
                      }}
                    >
                      📍 {restLocation.name}
                    </div>
                    <div style={{ fontSize: 11, color: "#6b6050" }}>
                      {restLocation.lat?.toFixed(5)},{" "}
                      {restLocation.lon?.toFixed(5)}
                    </div>
                  </div>
                  <button
                    onClick={() => setShowLocationMap(true)}
                    style={{
                      background: "none",
                      border: "1px solid #2a2218",
                      borderRadius: 8,
                      padding: "6px 12px",
                      color: "#c8a97e",
                      fontSize: 12,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    Modifică
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowLocationMap(true)}
                  style={{
                    width: "100%",
                    padding: "12px",
                    background: "#1e1a14",
                    border: "1px dashed #2a2218",
                    borderRadius: 12,
                    color: "#6b6050",
                    fontSize: 13,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  🗺️ Alege locația pe hartă
                </button>
              )}
            </div>

            {/* Modal harta */}
            {showLocationMap && (
              <RestaurantLocationPicker
                city={form.city}
                onSelect={(loc) => {
                  setRestLocation(loc);
                  setShowLocationMap(false);
                }}
                onClose={() => setShowLocationMap(false)}
              />
            )}

            {/* Adresă */}
            <div style={{ marginBottom: 16 }}>
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
                Adresa *
              </label>
              <input
                placeholder="Ex: Str. Floreasca nr. 42"
                value={form.address}
                maxLength={120}
                onChange={(e) => set("address", e.target.value)}
                style={{
                  width: "100%",
                  background: "#1e1a14",
                  border: "1px solid #2a2218",
                  borderRadius: 14,
                  padding: "13px 16px",
                  color: "#f0ebe3",
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  fontSize: 14,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Oraș — dropdown cu 8 opțiuni vizibile */}
            <div style={{ marginBottom: 24 }}>
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
                Orașul *
              </label>
              <div style={{ position: "relative" }}>
                <select
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                  size={8}
                  style={{
                    width: "100%",
                    background: "#1e1a14",
                    border: `1px solid ${form.city ? "#c0622f" : "#2a2218"}`,
                    borderRadius: 14,
                    color: "#f0ebe3",
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                    fontSize: 14,
                    outline: "none",
                    cursor: "pointer",
                    padding: "4px 0",
                  }}
                >
                  <option
                    value=""
                    disabled
                    style={{ color: "#6b6050", padding: "10px 16px" }}
                  >
                    Selectează orașul...
                  </option>
                  {ORASE.map((oras) => (
                    <option
                      key={oras}
                      value={oras}
                      style={{
                        padding: "10px 16px",
                        background: form.city === oras ? "#c0622f" : "#1e1a14",
                        color: form.city === oras ? "#fff" : "#f0ebe3",
                      }}
                    >
                      {oras}
                    </option>
                  ))}
                </select>
              </div>
              {form.city && (
                <div
                  style={{
                    marginTop: 8,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span style={{ fontSize: 13, color: "#e07a47" }}>
                    📍 {form.city} selectat
                  </span>
                  <button
                    onClick={() => set("city", "")}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#6b6050",
                      fontSize: 11,
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={handleNext}
              style={{
                width: "100%",
                padding: 15,
                background: "linear-gradient(135deg,#c0622f,#8b3a18)",
                border: "none",
                borderRadius: 16,
                color: "#fff",
                fontFamily: "'Fraunces',serif",
                fontSize: 17,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Continuă →
            </button>
          </>
        ) : (
          <>
            {/* Preview */}
            <div
              style={{
                marginBottom: 20,
                background: "rgba(192,98,47,.08)",
                border: "1px solid rgba(192,98,47,.2)",
                borderRadius: 16,
                padding: 16,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <span style={{ fontSize: 36 }}>{form.emoji}</span>
              <div>
                <div
                  style={{
                    fontFamily: "'Fraunces',serif",
                    fontSize: 18,
                    fontWeight: 700,
                  }}
                >
                  {form.name}
                </div>
                <div style={{ fontSize: 12, color: "#6b6050" }}>
                  {form.type} • {form.city}
                </div>
                <div style={{ fontSize: 11, color: "#6b6050", marginTop: 2 }}>
                  📍 {form.address}
                </div>
              </div>
            </div>

            <div
              style={{
                fontSize: 11,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: "#6b6050",
                marginBottom: 16,
              }}
            >
              Date de contact (opțional)
            </div>

            {[
              {
                key: "phone",
                label: "Telefon",
                type: "tel",
                placeholder: "0721 234 567",
              },
              {
                key: "email",
                label: "Email restaurant",
                type: "email",
                placeholder: "contact@restaurant.ro",
              },
              {
                key: "website",
                label: "Website",
                type: "text",
                placeholder: "www.restaurantul-meu.ro",
              },
            ].map((f) => (
              <div key={f.key} style={{ marginBottom: 14 }}>
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
                  {f.label}
                </label>
                <input
                  type={f.type}
                  placeholder={f.placeholder}
                  value={form[f.key]}
                  onChange={(e) => set(f.key, e.target.value)}
                  maxLength={100}
                  style={{
                    width: "100%",
                    background: "#1e1a14",
                    border: "1px solid #2a2218",
                    borderRadius: 14,
                    padding: "13px 16px",
                    color: "#f0ebe3",
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                    fontSize: 14,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            ))}

            <div style={{ marginBottom: 24 }}>
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
                Descriere scurtă
              </label>
              <textarea
                placeholder="Ex: Restaurant cu specific italian, în inima orașului..."
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                maxLength={500}
                rows={3}
                style={{
                  width: "100%",
                  background: "#1e1a14",
                  border: "1px solid #2a2218",
                  borderRadius: 14,
                  padding: "13px 16px",
                  color: "#f0ebe3",
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  fontSize: 13,
                  outline: "none",
                  resize: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <button
              onClick={handleCreate}
              disabled={loading}
              style={{
                width: "100%",
                padding: 15,
                background: loading
                  ? "#2a2218"
                  : "linear-gradient(135deg,#4a6e4a,#2d4a2d)",
                border: "none",
                borderRadius: 16,
                color: loading ? "#6b6050" : "#fff",
                fontFamily: "'Fraunces',serif",
                fontSize: 17,
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                marginBottom: 12,
              }}
            >
              {loading ? "Se creează..." : "🎉 Creează restaurantul"}
            </button>
            <div
              style={{ fontSize: 11, color: "#6b6050", textAlign: "center" }}
            >
              Vei fi dus la <b style={{ color: "#c8a97e" }}>Editor Planșeu</b>{" "}
              după creare.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
