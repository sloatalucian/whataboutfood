import { useState, useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useApp } from "../context/AppContext";
import { supabase } from "../supabase";

const CITY_COORDS = {
  Iași: [47.1585, 27.6014],
  București: [44.4268, 26.1025],
  "Cluj-Napoca": [46.7712, 23.6236],
  Timișoara: [45.7489, 21.2087],
  Constanța: [44.1598, 28.6348],
  Brașov: [45.6427, 25.5887],
  Galați: [45.4353, 28.008],
  Craiova: [44.3302, 23.7949],
  Ploiești: [44.9326, 26.0143],
  Oradea: [47.0722, 21.9217],
  Brăila: [45.2692, 27.9575],
  Arad: [46.1866, 21.3123],
  Pitești: [44.8565, 24.8698],
  Sibiu: [45.7983, 24.1256],
  Bacău: [46.567, 26.9146],
  "Târgu Mureș": [46.5386, 24.5578],
  "Baia Mare": [47.6567, 23.585],
  Buzău: [45.15, 26.82],
  Botoșani: [47.7456, 26.6647],
  "Satu Mare": [47.7914, 22.8765],
  "Râmnicu Vâlcea": [45.0997, 24.3692],
  Suceava: [47.6514, 26.2556],
  "Piatra Neamț": [46.9232, 26.3717],
  Deva: [45.885, 22.9108],
};

const ORASE = Object.keys(CITY_COORDS);

const toLngLat = ([lat, lon]) => [lon, lat];

function distMeters(lat1, lon1, lat2, lon2) {
  const dLat = lat2 - lat1;
  const dLon = (lon2 - lon1) * Math.cos((lat1 * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLon * dLon) * 111000;
}

function dedup(pois) {
  const kept = [];
  for (const poi of pois) {
    const dupe = kept.find(
      (k) =>
        k.name.toLowerCase() === poi.name.toLowerCase() &&
        distMeters(k.lat, k.lon, poi.lat, poi.lon) < 200,
    );
    if (!dupe) kept.push(poi);
  }
  return kept;
}

const PIN_CSS = `
  .waf-pin-o {
    background: #c0622f;
    border: 2px solid #8b3a18;
    border-radius: 10px;
    padding: 4px 10px;
    font-size: 12px;
    font-weight: 700;
    color: #fff;
    font-family: sans-serif;
    white-space: nowrap;
    box-shadow: 0 3px 12px rgba(192,98,47,.6);
    cursor: pointer;
    position: relative;
    max-width: 150px;
    overflow: hidden;
    text-overflow: ellipsis;
    user-select: none;
  }
  .waf-pin-o::after {
    content: '';
    position: absolute;
    bottom: -7px; left: 50%;
    transform: translateX(-50%);
    width: 0; height: 0;
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-top: 7px solid #c0622f;
  }
  .waf-pin-g {
    background: #2a2a2a;
    border: 1.5px solid #555;
    border-radius: 8px;
    padding: 3px 8px;
    font-size: 11px;
    font-weight: 500;
    color: #aaa;
    font-family: sans-serif;
    white-space: nowrap;
    box-shadow: 0 2px 6px rgba(0,0,0,.5);
    cursor: pointer;
    position: relative;
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    user-select: none;
  }
  .waf-pin-g::after {
    content: '';
    position: absolute;
    bottom: -6px; left: 50%;
    transform: translateX(-50%);
    width: 0; height: 0;
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
    border-top: 6px solid #2a2a2a;
  }
  .waf-dot-o {
    width: 14px; height: 14px;
    background: #c0622f;
    border: 2px solid #fff;
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(192,98,47,.7);
    user-select: none;
  }
  .waf-dot-g {
    width: 10px; height: 10px;
    background: #555;
    border: 1.5px solid #888;
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 1px 4px rgba(0,0,0,.4);
    user-select: none;
  }
  .maplibregl-ctrl-bottom-right { margin-bottom: 80px !important; }
  .maplibregl-ctrl-attrib { display: none !important; }
`;

export default function HartaPage() {
  const { navigate, dispatch } = useApp();
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  // Store {marker, el, isReg} so we can update DOM on zoom without recreating markers
  const regMarkersRef = useRef([]);
  const ovpMarkersRef = useRef([]);

  // Always-fresh data refs (updated synchronously in render body before any effect runs)
  const registeredRestaurantsRef = useRef([]);
  const approvedPinsRef = useRef([]);
  const overpassPOIsRef = useRef([]);

  const [mapReady, setMapReady] = useState(false);
  const [selectedCity, setSelectedCity] = useState("Iași");
  const [showCities, setShowCities] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [registeredRestaurants, setRegisteredRestaurants] = useState([]);
  const [approvedPins, setApprovedPins] = useState([]);
  const [overpassPOIs, setOverpassPOIs] = useState([]);
  const [selectedMarker, setSelectedMarker] = useState(null);

  // Keep refs in sync — runs on every render before effects
  registeredRestaurantsRef.current = registeredRestaurants;
  approvedPinsRef.current = approvedPins;
  overpassPOIsRef.current = overpassPOIs;

  // Inject CSS once
  useEffect(() => {
    const s = document.createElement("style");
    s.textContent = PIN_CSS;
    document.head.appendChild(s);
    return () => { try { document.head.removeChild(s); } catch (_) {} };
  }, []);

  // Load DB data
  useEffect(() => {
    supabase
      .from("restaurants")
      .select("id, name, address, city, rating, type, latitude, longitude")
      .eq("is_active", true)
      .then(({ data }) => setRegisteredRestaurants(data || []));

    supabase
      .from("map_pin_requests")
      .select("id, name, lat, lon, city")
      .eq("status", "approved")
      .then(({ data }) => setApprovedPins(data || []));
  }, []);

  function makeEl(name, isReg, isLabel) {
    const el = document.createElement("div");
    el.dataset.name = name;
    if (isLabel) {
      el.className = isReg ? "waf-pin-o" : "waf-pin-g";
      el.textContent = name;
    } else {
      el.className = isReg ? "waf-dot-o" : "waf-dot-g";
    }
    return el;
  }

  function clearReg() {
    regMarkersRef.current.forEach(({ marker }) => marker.remove());
    regMarkersRef.current = [];
  }
  function clearOvp() {
    ovpMarkersRef.current.forEach(({ marker }) => marker.remove());
    ovpMarkersRef.current = [];
  }

  function renderRegistered(zoom) {
    if (!mapRef.current) return;
    clearReg();
    const isLabel = zoom >= 14;
    const regs = registeredRestaurantsRef.current;
    const apins = approvedPinsRef.current;

    regs.forEach((rest) => {
      if (!rest.latitude || !rest.longitude) return;
      const el = makeEl(rest.name, true, isLabel);
      el.addEventListener("click", () =>
        setSelectedMarker({
          id: rest.id,
          name: rest.name,
          lat: rest.latitude,
          lon: rest.longitude,
          isRegistered: true,
          registeredData: rest,
        }),
      );
      const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([rest.longitude, rest.latitude])
        .addTo(mapRef.current);
      regMarkersRef.current.push({ marker, el, isReg: true });
    });

    apins.forEach((pin) => {
      if (!pin.lat || !pin.lon) return;
      const match = regs.find((r) => r.name.toLowerCase() === pin.name.toLowerCase());
      const el = makeEl(pin.name, true, isLabel);
      el.addEventListener("click", () =>
        setSelectedMarker({
          id: match ? match.id : `pin_${pin.id}`,
          name: pin.name,
          lat: pin.lat,
          lon: pin.lon,
          isRegistered: true,
          registeredData: match || { name: pin.name, city: pin.city },
        }),
      );
      const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([pin.lon, pin.lat])
        .addTo(mapRef.current);
      regMarkersRef.current.push({ marker, el, isReg: true });
    });
  }

  function renderOverpass(pois, zoom) {
    if (!mapRef.current) return;
    clearOvp();
    const isLabel = zoom >= 14;
    const regNames = new Set(registeredRestaurantsRef.current.map((r) => r.name.toLowerCase()));
    pois
      .filter((p) => !regNames.has(p.name.toLowerCase()))
      .forEach((poi) => {
        const el = makeEl(poi.name, false, isLabel);
        el.addEventListener("click", () => setSelectedMarker({ ...poi, isRegistered: false }));
        const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
          .setLngLat([poi.lon, poi.lat])
          .addTo(mapRef.current);
        ovpMarkersRef.current.push({ marker, el, isReg: false });
      });
  }

  async function fetchForCity(city) {
    const key = `pois_v2_${city}`;
    let pois = null;
    try {
      const raw = localStorage.getItem(key);
      if (raw) pois = JSON.parse(raw);
    } catch (_) {}

    if (!pois) {
      const coords = CITY_COORDS[city];
      if (!coords) return;
      setLoading(true);
      const r = 0.09;
      const [clat, clon] = coords;
      const query = `[out:json][timeout:20];(node["amenity"~"restaurant|cafe|bar|fast_food|pub|bistro"](${clat - r},${clon - r},${clat + r},${clon + r}););out 500;`;

      // Fetch with 10s client-side timeout to prevent infinite loading
      const fetchWithTimeout = (url) => {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 10000);
        return fetch(url, { signal: ctrl.signal })
          .then((res) => { clearTimeout(tid); return res.ok ? res.json() : Promise.reject(); })
          .catch((e) => { clearTimeout(tid); throw e; });
      };

      try {
        const data = await Promise.any([
          fetchWithTimeout(`https://overpass.kumi.systems/api/interpreter?data=${encodeURIComponent(query)}`),
          fetchWithTimeout(`https://lz4.overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`),
        ]);
        const raw2 = (data.elements || [])
          .filter((el) => el.tags?.name && el.lat && el.lon)
          .map((el) => ({
            id: el.id,
            name: el.tags.name,
            lat: el.lat,
            lon: el.lon,
            address: el.tags["addr:street"] || "",
          }));
        pois = dedup(raw2);
        try { localStorage.setItem(key, JSON.stringify(pois)); } catch (_) {}
      } catch (_) {
        pois = [];
      }
      setLoading(false);
    }

    setOverpassPOIs(pois);
    renderOverpass(pois, mapRef.current?.getZoom() ?? 15);
  }

  // Init map — zoom handler updates DOM directly, zero React re-renders
  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://tiles.openfreemap.org/styles/bright",
      center: toLngLat(CITY_COORDS["Iași"]),
      zoom: 15,
      attributionControl: false,
    });
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "bottom-right",
    );
    map.on("load", () => {
      mapRef.current = map;
      setMapReady(true);
    });
    // Update marker classes during zoom animation — fires only when crossing zoom=14 threshold
    // Using 'zoom' (not 'zoomend') so changes happen in real time; MapLibre recalculates anchor
    // offsets on the next render frame automatically
    let prevIsLabel = map.getZoom() >= 14;
    map.on("zoom", () => {
      const isLabel = map.getZoom() >= 14;
      if (isLabel === prevIsLabel) return; // only act when crossing threshold
      prevIsLabel = isLabel;
      [...regMarkersRef.current, ...ovpMarkersRef.current].forEach(({ el, isReg }) => {
        const name = el.dataset.name;
        el.className = isLabel
          ? (isReg ? "waf-pin-o" : "waf-pin-g")
          : (isReg ? "waf-dot-o" : "waf-dot-g");
        el.textContent = isLabel ? name : "";
      });
    });
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // On map ready + DB data: (re-)render registered markers
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const zoom = mapRef.current.getZoom();
    renderRegistered(zoom);
    if (overpassPOIsRef.current.length > 0) renderOverpass(overpassPOIsRef.current, zoom);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, registeredRestaurants, approvedPins]);

  // On map ready: initial Overpass fetch
  useEffect(() => {
    if (!mapReady) return;
    fetchForCity(selectedCity);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady]);

  // On city change: clear overpass, fly, fetch
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    const coords = CITY_COORDS[selectedCity];
    if (!coords) return;
    clearOvp();
    overpassPOIsRef.current = [];
    setOverpassPOIs([]);
    mapRef.current.flyTo({ center: toLngLat(coords), zoom: 14 });
    fetchForCity(selectedCity);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCity]);

  const searchResults =
    searchQuery.trim().length > 1
      ? overpassPOIs
          .filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
          .slice(0, 6)
      : [];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#f8f4ef",
        display: "flex",
        flexDirection: "column",
        zIndex: 1000,
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
          zIndex: 9999,
          position: "relative",
        }}
      >
        {/* Row 1 */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => navigate("home")}
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: "#1a1510", border: "1px solid #2a2218",
              color: "#f0ebe3", fontSize: 18, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
          >
            ←
          </button>
          <span
            style={{
              fontFamily: "'Fraunces',serif", fontSize: 16,
              fontWeight: 900, color: "#f0ebe3", flex: 1,
            }}
          >
            🗺️ Hartă restaurante
          </span>

          {/* City selector */}
          <div style={{ position: "relative", zIndex: 500 }}>
            <button
              onClick={() => setShowCities(!showCities)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 14px", background: "#c0622f",
                border: "none", borderRadius: 20, color: "#fff",
                fontSize: 12, fontWeight: 700, cursor: "pointer",
              }}
            >
              <span>📍</span>
              <span style={{ maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {selectedCity}
              </span>
              <span style={{ fontSize: 10 }}>▾</span>
            </button>
            {showCities && (
              <div
                style={{
                  position: "fixed", top: 55, right: 16,
                  background: "#1a1510", border: "1px solid #2a2218",
                  borderRadius: 14, width: 200, maxHeight: 320,
                  overflowY: "auto", zIndex: 9999,
                  boxShadow: "0 8px 32px rgba(0,0,0,.9)",
                }}
              >
                {ORASE.map((oras) => (
                  <div
                    key={oras}
                    onClick={() => { setSelectedCity(oras); setShowCities(false); }}
                    style={{
                      padding: "10px 16px", cursor: "pointer", fontSize: 13,
                      color: oras === selectedCity ? "#c0622f" : "#c8a97e",
                      fontWeight: oras === selectedCity ? 700 : 400,
                      borderBottom: "1px solid rgba(255,255,255,.04)",
                    }}
                  >
                    {oras === selectedCity ? "✓ " : ""}{oras}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Row 2: search */}
        <div style={{ position: "relative", zIndex: 9999 }}>
          <div
            style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "#1a1510", border: "1px solid #2a2218",
              borderRadius: 50, padding: "9px 16px",
            }}
          >
            <span style={{ color: "#6b6050", fontSize: 14 }}>🔍</span>
            <input
              type="text"
              placeholder="Caută restaurant pe hartă..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              maxLength={60}
              style={{
                flex: 1, background: "none", border: "none",
                outline: "none", color: "#f0ebe3", fontSize: 16,
                fontFamily: "inherit",
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                style={{ background: "none", border: "none", color: "#6b6050", cursor: "pointer", fontSize: 18 }}
              >
                ×
              </button>
            )}
          </div>
          {searchResults.length > 0 && (
            <div
              style={{
                position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
                background: "#1a1510", border: "1px solid #2a2218",
                borderRadius: 14, overflow: "hidden",
                boxShadow: "0 8px 24px rgba(0,0,0,.7)", zIndex: 99999,
              }}
            >
              {searchResults.map((r) => (
                <div
                  key={r.id}
                  onClick={() => {
                    if (mapRef.current) mapRef.current.flyTo({ center: [r.lon, r.lat], zoom: 17 });
                    setSearchQuery("");
                    setSelectedMarker({ ...r, isRegistered: false });
                  }}
                  style={{
                    padding: "12px 16px", cursor: "pointer",
                    borderBottom: "1px solid rgba(255,255,255,.04)",
                    display: "flex", alignItems: "center", gap: 10,
                  }}
                >
                  <span
                    style={{
                      width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                      background: registeredRestaurants.some(
                        (rr) => rr.name.toLowerCase() === r.name.toLowerCase(),
                      ) ? "#c0622f" : "#555",
                    }}
                  />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#f0ebe3" }}>{r.name}</div>
                    {r.address && <div style={{ fontSize: 11, color: "#6b6050" }}>{r.address}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: "#c0622f" }} />
            <span style={{ fontSize: 11, color: "#c8a97e", fontWeight: 600 }}>Pe WhataboutFood</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: "#555" }} />
            <span style={{ fontSize: 11, color: "#6b6050" }}>Neînregistrat</span>
          </div>
          {loading && (
            <span style={{ fontSize: 11, color: "#c8a97e", marginLeft: "auto" }}>⏳ Se încarcă...</span>
          )}
        </div>
      </div>

      {/* Map */}
      <div ref={containerRef} style={{ flex: 1, width: "100%" }} />

      {/* Popup */}
      {selectedMarker && (
        <div
          style={{
            position: "absolute", bottom: 16, left: 16, right: 16,
            background: "#1a1510",
            border: `1px solid ${selectedMarker.isRegistered ? "rgba(192,98,47,.5)" : "#2a2218"}`,
            borderRadius: 20, padding: "18px 20px",
            boxShadow: "0 -4px 32px rgba(0,0,0,.6)", zIndex: 500,
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              <div style={{ fontFamily: "'Fraunces',serif", fontSize: 18, fontWeight: 900, color: "#f0ebe3", marginBottom: 4 }}>
                {selectedMarker.name}
              </div>
              {selectedMarker.address && (
                <div style={{ fontSize: 12, color: "#6b6050" }}>📍 {selectedMarker.address}</div>
              )}
              {selectedMarker.registeredData?.rating && (
                <div style={{ fontSize: 12, color: "#c8a97e", marginTop: 4 }}>
                  ★ {Number(selectedMarker.registeredData.rating).toFixed(1)}
                </div>
              )}
            </div>
            <button
              onClick={() => setSelectedMarker(null)}
              style={{ background: "none", border: "none", color: "#6b6050", fontSize: 22, cursor: "pointer" }}
            >
              ×
            </button>
          </div>

          {selectedMarker.isRegistered && selectedMarker.registeredData?.id ? (
            <button
              onClick={() => dispatch({ type: "SET_REST", payload: selectedMarker.registeredData })}
              style={{
                width: "100%", padding: "12px",
                background: "linear-gradient(135deg,#c0622f,#8b3a18)",
                border: "none", borderRadius: 14, color: "#fff",
                fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              🍽️ Vezi locația în aplicație
            </button>
          ) : selectedMarker.isRegistered ? (
            <div style={{ background: "rgba(255,255,255,.04)", borderRadius: 12, padding: "12px", textAlign: "center" }}>
              <div style={{ fontSize: 13, color: "#c8a97e" }}>📍 Locație înregistrată pe WhataboutFood</div>
            </div>
          ) : (
            <div style={{ background: "rgba(255,255,255,.04)", borderRadius: 12, padding: "12px", textAlign: "center" }}>
              <div style={{ fontSize: 13, color: "#6b6050" }}>😔 Încă nu face parte din această aplicație</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
