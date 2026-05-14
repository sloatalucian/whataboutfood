import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useApp } from "../context/AppContext";
import { supabase } from "../supabase";

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

// [lat, lon] → [lon, lat] for MapLibre
const ll = ([lat, lon]) => [lon, lat];

function distMeters(lat1, lon1, lat2, lon2) {
  const dLat = lat2 - lat1;
  const dLon = (lon2 - lon1) * Math.cos((lat1 * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLon * dLon) * 111000;
}

function dedup(pois) {
  const kept = [];
  for (const p of pois) {
    const dupe = kept.find(
      (k) =>
        k.name.toLowerCase() === p.name.toLowerCase() &&
        distMeters(k.lat, k.lon, p.lat, p.lon) < 200,
    );
    if (!dupe) kept.push(p);
  }
  return kept;
}

const PICKER_CSS = `
  .waf-pp {
    background: #3a3a3a;
    border: 1.5px solid #666;
    border-radius: 8px;
    padding: 4px 10px;
    font-size: 11px;
    font-weight: 600;
    color: #ccc;
    font-family: sans-serif;
    white-space: nowrap;
    box-shadow: 0 2px 8px rgba(0,0,0,.5);
    cursor: pointer;
    position: relative;
    max-width: 140px;
    overflow: hidden;
    text-overflow: ellipsis;
    user-select: none;
    transition: background .15s, color .15s;
  }
  .waf-pp::after {
    content: '';
    position: absolute;
    bottom: -6px; left: 50%;
    transform: translateX(-50%);
    width: 0; height: 0;
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
    border-top: 6px solid #3a3a3a;
  }
  .waf-pp.sel {
    background: #c0622f;
    border-color: #8b3a18;
    color: #fff;
    box-shadow: 0 4px 16px rgba(192,98,47,.7);
    z-index: 9999 !important;
  }
  .waf-pp.sel::after { border-top-color: #c0622f; }
  .waf-pd {
    width: 10px; height: 10px;
    background: #555; border: 1.5px solid #888;
    border-radius: 50%; cursor: pointer; user-select: none;
  }
  .maplibregl-ctrl-attrib { display: none !important; }
`;

function RestaurantLocationPicker({ city, onSelect, onClose, showToast }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const poiMarkersRef = useRef([]);
  const manualMarkerRef = useRef(null);
  const selectedElRef = useRef(null);
  const addingModeRef = useRef(false);
  const mapCityRef = useRef(city || "Iași");
  const searchTimer = useRef(null);
  const searchController = useRef(null);

  const [mapCity, setMapCity] = useState(city || "Iași");
  const [showCityDrop, setShowCityDrop] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(null);
  const [addingMode, setAddingMode] = useState(false);
  const [pendingPin, setPendingPin] = useState(null);
  const [pinName, setPinName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Inject CSS
  useEffect(() => {
    const s = document.createElement("style");
    s.textContent = PICKER_CSS;
    document.head.appendChild(s);
    return () => {
      try {
        document.head.removeChild(s);
      } catch (_) {}
    };
  }, []);

  // Render POI markers — called only on initial load or city change
  const renderPOIsRef = useRef(null);
  renderPOIsRef.current = (pois, zoom) => {
    if (!mapRef.current) return;
    poiMarkersRef.current.forEach(({ marker }) => marker.remove());
    poiMarkersRef.current = [];
    selectedElRef.current = null;
    const isLabel = zoom >= 14;

    pois.forEach((poi) => {
      // Wrapper 0x0 - ancorare stabila la orice zoom
      const wrapper = document.createElement("div");
      wrapper.style.cssText =
        "width:0;height:0;position:relative;overflow:visible;";

      const el = document.createElement("div");
      el.dataset.name = poi.name;
      el.className = isLabel ? "waf-pp" : "waf-pd";
      if (isLabel) {
        el.textContent = poi.name;
        el.style.cssText =
          "position:absolute;bottom:4px;left:50%;transform:translateX(-50%);";
      } else {
        el.style.cssText = "position:absolute;top:-5px;left:-5px;";
      }
      wrapper.appendChild(el);

      wrapper.addEventListener("click", () => {
        if (addingModeRef.current) return;
        if (selectedElRef.current)
          selectedElRef.current.classList.remove("sel");
        el.classList.add("sel");
        selectedElRef.current = el;
        mapRef.current?.flyTo({ center: [poi.lon, poi.lat], speed: 1.5 });
        setConfirming(poi);
      });

      const marker = new maplibregl.Marker({
        element: wrapper,
        anchor: "center",
      })
        .setLngLat([poi.lon, poi.lat])
        .addTo(mapRef.current);
      poiMarkersRef.current.push({ marker, el });
    });
  };

  const allPOIsRef = useRef([]);

  const fetchPOIs = useCallback(async () => {
    if (!mapRef.current) return;
    const cityKey = mapCityRef.current;
    const cKey = `waf_pois_v3_${cityKey}`;
    let pois = null;

    // 1. Verificam localStorage - instant
    try {
      const raw = localStorage.getItem(cKey);
      if (raw) pois = JSON.parse(raw);
    } catch (_) {}

    if (!pois) {
      // 2. Descarcam din Supabase Storage
      const cityFileMap = {
        Iași: "iasi",
        București: "bucuresti",
        "Cluj-Napoca": "cluj-napoca",
        Timișoara: "timisoara",
        Constanța: "constanta",
        Brașov: "brasov",
        Galați: "galati",
        Craiova: "craiova",
        Ploiești: "ploiesti",
        Oradea: "oradea",
        Brăila: "braila",
        Arad: "arad",
        Pitești: "pitesti",
        Sibiu: "sibiu",
        Bacău: "bacau",
        "Târgu Mureș": "targu-mures",
        "Baia Mare": "baia-mare",
        Buzău: "buzau",
        Botoșani: "botosani",
        "Satu Mare": "satu-mare",
        "Râmnicu Vâlcea": "ramnicu-valcea",
        Suceava: "suceava",
        "Piatra Neamț": "piatra-neamt",
        Deva: "deva",
      };
      const fileKey = cityFileMap[cityKey];
      setLoading(true);
      try {
        if (fileKey) {
          const url = `https://dsqkqqaojwxouimcacgy.supabase.co/storage/v1/object/public/maps/pois_${fileKey}.json`;
          const res = await fetch(url);
          if (res.ok) {
            pois = await res.json();
            try {
              localStorage.setItem(cKey, JSON.stringify(pois));
            } catch (_) {}
          }
        }
        if (!pois) pois = [];
      } catch (_) {
        pois = [];
      }
      setLoading(false);
    }

    allPOIsRef.current = pois;
    renderPOIsRef.current(pois, mapRef.current?.getZoom() ?? 15);
  }, []);

  // Init map
  useEffect(() => {
    if (!containerRef.current) return;
    const center = CITY_COORDS_MAP[mapCityRef.current] || [47.1585, 27.6014];
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://tiles.openfreemap.org/styles/bright",
      center: ll(center),
      zoom: 15,
      attributionControl: false,
    });
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "bottom-right",
    );

    map.on("load", () => {
      mapRef.current = map;
      fetchPOIs();
    });

    // Update classes during animation when crossing zoom=14 threshold
    let prevIsLabel = map.getZoom() >= 14;
    map.on("zoom", () => {
      const isLabel = map.getZoom() >= 14;
      if (isLabel === prevIsLabel) return;
      prevIsLabel = isLabel;
      poiMarkersRef.current.forEach(({ el }) => {
        const name = el.dataset.name;
        el.className = isLabel ? "waf-pp" : "waf-pd";
        el.textContent = isLabel ? name : "";
        if (selectedElRef.current === el && isLabel) el.classList.add("sel");
      });
    });

    map.on("click", (e) => {
      if (!addingModeRef.current) return;
      const { lat, lng } = e.lngLat;

      if (manualMarkerRef.current) {
        manualMarkerRef.current.remove();
        manualMarkerRef.current = null;
      }

      const el = document.createElement("div");
      el.style.cssText =
        "width:24px;height:24px;background:#c0622f;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 14px rgba(192,98,47,.8);cursor:crosshair;";
      manualMarkerRef.current = new maplibregl.Marker({
        element: el,
        anchor: "center",
      })
        .setLngLat([lng, lat])
        .addTo(map);
      setPendingPin({ lat, lon: lng });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync addingMode ref + cursor
  useEffect(() => {
    addingModeRef.current = addingMode;
    const container = mapRef.current?.getContainer?.();
    if (container) container.style.cursor = addingMode ? "crosshair" : "";
    if (!addingMode) {
      setPendingPin(null);
      setPinName("");
      if (manualMarkerRef.current) {
        manualMarkerRef.current.remove();
        manualMarkerRef.current = null;
      }
    }
  }, [addingMode]);

  const changeCity = (newCity) => {
    mapCityRef.current = newCity;
    setMapCity(newCity);
    setShowCityDrop(false);
    const coords = CITY_COORDS_MAP[newCity];
    if (mapRef.current && coords) {
      mapRef.current.flyTo({ center: ll(coords), zoom: 15 });
      poiMarkersRef.current.forEach(({ marker }) => marker.remove());
      poiMarkersRef.current = [];
      allPOIsRef.current = [];
      setTimeout(fetchPOIs, 300);
    }
  };

  const searchNominatim = async (q) => {
    if (q.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    await new Promise((r) => {
      searchTimer.current = setTimeout(r, 400);
    });
    if (searchController.current) searchController.current.abort();
    searchController.current = new AbortController();
    setLoading(true);
    try {
      const hint = mapCityRef.current ? `, ${mapCityRef.current}` : "";
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q + hint)}&format=json&limit=6&countrycodes=ro&addressdetails=1`;
      const res = await fetch(url, {
        signal: searchController.current.signal,
        headers: { "Accept-Language": "ro" },
      });
      const data = await res.json();
      setSearchResults(
        data.map((el) => ({
          id: el.place_id,
          name: el.name || el.display_name.split(",")[0],
          lat: parseFloat(el.lat),
          lon: parseFloat(el.lon),
          address: el.display_name,
        })),
      );
    } catch (e) {
      if (e.name !== "AbortError") setSearchResults([]);
    }
    setLoading(false);
  };

  const submitPinRequest = async () => {
    if (!pinName.trim() || !pendingPin || submitting) return;
    setSubmitting(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        showToast?.("❌ Trebuie să fii autentificat!");
        setSubmitting(false);
        return;
      }

      // Salvam locatia in profiles.rest_location ca JSON
      const locationData = {
        name: pinName.trim(),
        lat: pendingPin.lat,
        lon: pendingPin.lon,
        city: mapCityRef.current,
        isManualPin: true,
      };

      const { error } = await supabase
        .from("profiles")
        .update({ rest_location: JSON.stringify(locationData) })
        .eq("id", session.user.id);

      if (error) throw error;
      showToast?.("✅ Cererea a fost trimisă! Apare pe hartă după aprobare.");
      setAddingMode(false);
      // Informam componenta parinte despre locatia selectata
      onSelect({
        lat: pendingPin.lat,
        lon: pendingPin.lon,
        name: pinName.trim(),
      });
    } catch {
      showToast?.("❌ Eroare la trimitere. Încearcă din nou.");
    }
    setSubmitting(false);
  };

  const hasBottomSheet = confirming || (addingMode && pendingPin);

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        background: "#f8f4ef",
      }}
    >
      {/* Header */}
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
          zIndex: 500,
        }}
      >
        {/* Row 1 */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
              flexShrink: 0,
            }}
          >
            ←
          </button>
          <span
            style={{
              fontFamily: "'Fraunces',serif",
              fontSize: 15,
              fontWeight: 900,
              color: "#f0ebe3",
              flex: 1,
            }}
          >
            📍 Alege locația
          </span>
          {loading && (
            <span style={{ fontSize: 11, color: "#c8a97e", flexShrink: 0 }}>
              ⏳
            </span>
          )}

          {/* City dropdown */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <button
              onClick={() => setShowCityDrop(!showCityDrop)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "7px 12px",
                background: "#c0622f",
                border: "none",
                borderRadius: 20,
                color: "#fff",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <span>📍</span>
              <span
                style={{
                  maxWidth: 70,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {mapCity}
              </span>
              <span style={{ fontSize: 9 }}>▾</span>
            </button>
            {showCityDrop && (
              <div
                style={{
                  position: "fixed",
                  top: 60,
                  right: 16,
                  background: "#1a1510",
                  border: "1px solid #2a2218",
                  borderRadius: 14,
                  width: 200,
                  maxHeight: 300,
                  overflowY: "auto",
                  zIndex: 99999,
                  boxShadow: "0 8px 32px rgba(0,0,0,.9)",
                }}
              >
                {Object.keys(CITY_COORDS_MAP).map((oras) => (
                  <div
                    key={oras}
                    onClick={() => changeCity(oras)}
                    style={{
                      padding: "10px 16px",
                      cursor: "pointer",
                      fontSize: 13,
                      color: oras === mapCity ? "#c0622f" : "#c8a97e",
                      fontWeight: oras === mapCity ? 700 : 400,
                      borderBottom: "1px solid rgba(255,255,255,.04)",
                    }}
                  >
                    {oras === mapCity ? "✓ " : ""}
                    {oras}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add mode toggle */}
          <button
            onClick={() => {
              setConfirming(null);
              setAddingMode((v) => !v);
            }}
            style={{
              padding: "7px 11px",
              background: addingMode
                ? "rgba(192,57,43,.2)"
                : "rgba(74,110,74,.15)",
              border: `1px solid ${addingMode ? "rgba(192,57,43,.5)" : "rgba(74,110,74,.35)"}`,
              borderRadius: 20,
              color: addingMode ? "#e05050" : "#6b9e6b",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              flexShrink: 0,
              whiteSpace: "nowrap",
              fontFamily: "inherit",
            }}
          >
            {addingMode ? "✕ Anulează" : "📍 Adaugă"}
          </button>
        </div>

        {/* Row 2: search */}
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
                searchNominatim(e.target.value);
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
                boxShadow: "0 8px 24px rgba(0,0,0,.8)",
                zIndex: 99999,
              }}
            >
              {searchResults.map((r, i) => {
                const addrParts = r.address
                  ? r.address.split(",").slice(1, 3).join(",").trim()
                  : "";
                return (
                  <div
                    key={i}
                    onClick={() => {
                      setSearchResults([]);
                      setSearchQ(r.name);
                      if (mapRef.current)
                        mapRef.current.flyTo({
                          center: [r.lon, r.lat],
                          zoom: 17,
                        });
                      setConfirming(r);
                    }}
                    style={{
                      padding: "11px 16px",
                      cursor: "pointer",
                      borderBottom: "1px solid rgba(255,255,255,.04)",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <span style={{ fontSize: 15, flexShrink: 0 }}>📍</span>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#f0ebe3",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {r.name}
                      </div>
                      {addrParts && (
                        <div
                          style={{
                            fontSize: 11,
                            color: "#6b6050",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {addrParts}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Map */}
      <div
        ref={containerRef}
        style={{ flex: 1, width: "100%", position: "relative" }}
      />

      {/* Instruction overlay when in adding mode */}
      {addingMode && !pendingPin && (
        <div
          style={{
            position: "fixed",
            bottom: 30,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(10,8,5,.92)",
            border: "1px solid rgba(192,98,47,.5)",
            borderRadius: 20,
            padding: "11px 22px",
            fontSize: 13,
            color: "#c8a97e",
            fontWeight: 600,
            whiteSpace: "nowrap",
            zIndex: 1000,
            pointerEvents: "none",
            boxShadow: "0 4px 20px rgba(0,0,0,.6)",
          }}
        >
          👇 Apasă pe hartă pentru a plasa restaurantul
        </div>
      )}

      {/* Manual pin form */}
      {addingMode && pendingPin && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            background: "#1a1510",
            border: "1px solid rgba(192,98,47,.4)",
            borderRadius: "20px 20px 0 0",
            padding: "20px 20px 36px",
            boxShadow: "0 -8px 40px rgba(0,0,0,.7)",
            zIndex: 99999,
          }}
        >
          <div
            style={{
              fontSize: 14,
              color: "#c8a97e",
              marginBottom: 12,
              fontWeight: 700,
            }}
          >
            📍 Confirmă locația restaurantului
          </div>
          <input
            placeholder="Numele restaurantului tău..."
            value={pinName}
            onChange={(e) => setPinName(e.target.value)}
            maxLength={80}
            autoFocus
            style={{
              width: "100%",
              background: "#1e1a14",
              border: "1px solid #2a2218",
              borderRadius: 12,
              padding: "12px 16px",
              color: "#f0ebe3",
              fontFamily: "inherit",
              fontSize: 14,
              outline: "none",
              boxSizing: "border-box",
              marginBottom: 8,
            }}
          />
          <div style={{ fontSize: 11, color: "#6b6050", marginBottom: 14 }}>
            📍 {pendingPin.lat.toFixed(5)}, {pendingPin.lon.toFixed(5)} ·{" "}
            {mapCity}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => setPendingPin(null)}
              style={{
                flex: 1,
                padding: 13,
                background: "#1e1a14",
                border: "1px solid #2a2218",
                borderRadius: 12,
                color: "#f0ebe3",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              ← Repoziționează
            </button>
            <button
              onClick={submitPinRequest}
              disabled={!pinName.trim() || submitting}
              style={{
                flex: 2,
                padding: 13,
                background:
                  pinName.trim() && !submitting
                    ? "linear-gradient(135deg,#c0622f,#8b3a18)"
                    : "#2a2218",
                border: "none",
                borderRadius: 12,
                color: pinName.trim() && !submitting ? "#fff" : "#6b6050",
                fontSize: 13,
                fontWeight: 700,
                cursor:
                  pinName.trim() && !submitting ? "pointer" : "not-allowed",
                fontFamily: "inherit",
              }}
            >
              {submitting ? "Se trimite..." : "📨 Trimite cererea"}
            </button>
          </div>
        </div>
      )}

      {/* Confirming popup */}
      {!addingMode && confirming && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            background: "#1a1510",
            border: "1px solid rgba(192,98,47,.4)",
            borderRadius: "20px 20px 0 0",
            padding: "20px 20px 32px",
            boxShadow: "0 -8px 40px rgba(0,0,0,.7)",
            zIndex: 99999,
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
              fontSize: 18,
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
                marginBottom: 12,
              }}
            >
              📍 {confirming.address}
            </div>
          )}
          <div
            style={{
              fontSize: 11,
              color: "#c8a97e",
              textAlign: "center",
              marginBottom: 14,
              padding: "8px 12px",
              background: "rgba(192,98,47,.08)",
              borderRadius: 10,
            }}
          >
            ⏳ Locația va fi vizibilă pe hartă după aprobare SuperAdmin
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => {
                if (selectedElRef.current) {
                  selectedElRef.current.classList.remove("sel");
                  selectedElRef.current = null;
                }
                setConfirming(null);
              }}
              style={{
                flex: 1,
                padding: "14px",
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
                padding: "14px",
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

      <style>{`.maplibregl-ctrl-bottom-right{margin-bottom:${hasBottomSheet ? "220px" : "20px"}!important}`}</style>
    </div>,
    document.body,
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

      // Restaurantul porneste inactiv — devine activ dupa aprobare SuperAdmin
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
        is_active: false,
        latitude: restLocation?.lat || null,
        longitude: restLocation?.lon || null,
        location_name: restLocation?.name || null,
      });

      if (error) throw error;

      // Daca a ales o locatie pe harta, salvam in profiles pentru aprobare
      if (restLocation) {
        await supabase
          .from("profiles")
          .update({
            rest_location: JSON.stringify({
              name: form.name,
              lat: restLocation.lat,
              lon: restLocation.lon,
              city: form.city,
              isManualPin: false,
            }),
          })
          .eq("id", userId);
        showToast(
          `🎉 Restaurantul creat! Locația va apărea pe hartă după aprobare.`,
        );
      } else {
        showToast(`🎉 Restaurantul „${form.name}" a fost creat!`);
      }

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

            {/* Locație hartă */}
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
                    <div
                      style={{ fontSize: 11, color: "#c8a97e", marginTop: 4 }}
                    >
                      ⏳ Necesită aprobare SuperAdmin
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

            {showLocationMap && (
              <RestaurantLocationPicker
                city={form.city}
                showToast={showToast}
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

            {/* Oraș */}
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
