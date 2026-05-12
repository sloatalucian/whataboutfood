import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
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

function RestaurantLocationPicker({ city, onSelect, onClose, showToast }) {
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
      css.href = "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.min.css";
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
      leafletMap.current.on("zoomend", () => {
        const z = leafletMap.current.getZoom();
        if (allPOIs.current.length > 0) renderPOIs(allPOIs.current, z);
      });
      leafletMap.current.on("click", (e) => {
        if (!addingModeRef.current) return;
        const { lat, lng } = e.latlng;
        if (manualPinRef.current) leafletMap.current.removeLayer(manualPinRef.current);
        const pinIcon = L.divIcon({
          className: "",
          html: `<div style="width:24px;height:24px;background:#c0622f;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 14px rgba(192,98,47,.8);cursor:crosshair;"></div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });
        manualPinRef.current = L.marker([lat, lng], { icon: pinIcon, zIndexOffset: 9999 }).addTo(leafletMap.current);
        setPendingPin({ lat, lon: lng });
      });
      setTimeout(fetchPOIs, 200);
    };

    if (window.L) initMap();
    else {
      const js = document.createElement("script");
      js.src = "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.min.js";
      js.onload = initMap;
      document.head.appendChild(js);
    }
  }, []);

  const allPOIs = useRef([]);
  const loadedCity = useRef(null);

  const fetchPOIs = useCallback(async () => {
    if (!leafletMap.current || !window.L) return;
    const cityKey = mapCityRef.current;

    if (loadedCity.current === cityKey && allPOIs.current.length > 0) {
      const zoom = leafletMap.current.getZoom();
      renderPOIs(allPOIs.current, zoom);
      return;
    }

    const coords = CITY_COORDS_MAP[cityKey] || [47.1585, 27.6014];
    const r = 0.09;
    const s = coords[0] - r,
      n = coords[0] + r,
      w = coords[1] - r,
      e = coords[1] + r;
    const query = `[out:json][timeout:25];(node["amenity"~"restaurant|cafe|bar|fast_food|pub|bistro"](${s},${w},${n},${e}););out 300;`;

    const tryFetch = (url) =>
      fetch(url).then((r) => (r.ok ? r.json() : Promise.reject()));

    setLoading(true);
    try {
      const data = await Promise.any([
        tryFetch(
          `https://overpass.kumi.systems/api/interpreter?data=${encodeURIComponent(query)}`,
        ),
        tryFetch(
          `https://lz4.overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`,
        ),
      ]);

      const pois = (data.elements || [])
        .filter((el) => el.tags?.name && el.lat && el.lon)
        .map((el) => ({
          id: el.id,
          name: el.tags.name,
          lat: el.lat,
          lon: el.lon,
          address: el.tags["addr:street"] || "",
        }));

      allPOIs.current = pois;
      loadedCity.current = cityKey;
      const zoom = leafletMap.current.getZoom();
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
          if (addingModeRef.current) return;
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

  const searchTimer = useRef(null);
  const searchController = useRef(null);

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
      const cityHint = mapCity ? `, ${mapCity}` : "";
      const url =
        `https://nominatim.openstreetmap.org/search` +
        `?q=${encodeURIComponent(q + cityHint)}` +
        `&format=json&limit=6&countrycodes=ro&addressdetails=1`;

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

  const [showCityDrop, setShowCityDrop] = useState(false);
  const [mapCity, setMapCity] = useState(city || "Iași");
  const mapCityRef = useRef(city || "Iași");

  const [addingMode, setAddingMode] = useState(false);
  const [pendingPin, setPendingPin] = useState(null);
  const [pinName, setPinName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const addingModeRef = useRef(false);
  const manualPinRef = useRef(null);

  // Schimba orasul pe harta
  const changeCity = (newCity) => {
    mapCityRef.current = newCity;
    setMapCity(newCity);
    setShowCityDrop(false);
    loadedCity.current = null;
    allPOIs.current = [];
    if (leafletMap.current && CITY_COORDS_MAP[newCity]) {
      leafletMap.current.setView(CITY_COORDS_MAP[newCity], 15);
      setTimeout(fetchPOIs, 300);
    }
  };

  // Sync addingMode ref + cursor
  useEffect(() => {
    addingModeRef.current = addingMode;
    const container = leafletMap.current?.getContainer?.();
    if (container) container.style.cursor = addingMode ? "crosshair" : "";
    if (!addingMode) {
      setPendingPin(null);
      setPinName("");
      if (manualPinRef.current && leafletMap.current) {
        leafletMap.current.removeLayer(manualPinRef.current);
        manualPinRef.current = null;
      }
    }
  }, [addingMode]);

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
      const { error } = await supabase.from("map_pin_requests").insert({
        owner_id: session.user.id,
        owner_name:
          session.user.user_metadata?.full_name || session.user.email || "Proprietar",
        name: pinName.trim(),
        lat: pendingPin.lat,
        lon: pendingPin.lon,
        city: mapCityRef.current,
        status: "pending",
      });
      if (error) throw error;
      showToast?.("✅ Cererea a fost trimisă! Apare pe hartă după aprobare.");
      setAddingMode(false);
    } catch {
      showToast?.("❌ Eroare la trimitere. Încearcă din nou.");
    }
    setSubmitting(false);
  };

  return createPortal(
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
      {/* HEADER FIX SUS */}
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
          zIndex: 500,
        }}
      >
        {/* Rand 1: back + titlu + dropdown oras */}
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

          {/* Dropdown oras */}
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

          {/* Buton adauga restaurant manual */}
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

        {/* Rand 2: search */}
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
                      if (leafletMap.current)
                        leafletMap.current.setView([r.lat, r.lon], 17);
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

      {/* HARTA */}
      <div ref={mapRef} style={{ flex: 1, width: "100%", position: "relative" }} />

      {/* INSTRUCTIUNE plasare pin manual */}
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

      {/* PIN MANUAL - formular confirmare */}
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
          <div
            style={{ fontSize: 11, color: "#6b6050", marginBottom: 14 }}
          >
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
                cursor: pinName.trim() && !submitting ? "pointer" : "not-allowed",
                fontFamily: "inherit",
              }}
            >
              {submitting ? "Se trimite..." : "📨 Trimite cererea"}
            </button>
          </div>
        </div>
      )}

      {/* POPUP CONFIRMARE - fix jos */}
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
                marginBottom: 16,
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

      <style>{`.leaflet-container{background:#1a1510!important}.leaflet-control-attribution{display:none!important}.leaflet-control-zoom{margin-bottom:${confirming || (addingMode && pendingPin) ? "220px" : "20px"}!important}`}</style>
    </div>,
    document.body
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
