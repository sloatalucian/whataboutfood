import { useState, useEffect, useRef, useCallback } from "react";
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

// Coordonate demo - Podul Ros, Iasi
const RESTAURANT_COORDS = {
  "Mama Mia": [47.1578, 27.5885],
  "Sushi Zen": [47.1582, 27.5892],
  "Verde Bistro": [47.1575, 27.5898],
  "Burger Big": [47.1585, 27.5878],
  "Muu Bistro": [47.1572, 27.5905],
  "Pizza Nico": [47.1588, 27.587],
};

const ORASE = Object.keys(CITY_COORDS);

export default function HartaPage() {
  const { navigate } = useApp();
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const markersLayer = useRef(null);
  const scriptLoaded = useRef(false);

  const [selectedCity, setSelectedCity] = useState("Iași");
  const [showCities, setShowCities] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [registeredRestaurants, setRegisteredRestaurants] = useState([]);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [overpassPOIs, setOverpassPOIs] = useState([]);
  const [mapReady, setMapReady] = useState(false);

  // Incarca restaurante din DB
  useEffect(() => {
    supabase
      .from("restaurants")
      .select("id, name, address, city, rating, type")
      .then(({ data }) => setRegisteredRestaurants(data || []));
  }, []);

  // Initializeaza Leaflet
  useEffect(() => {
    if (scriptLoaded.current) return;
    scriptLoaded.current = true;

    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(css);

    const js = document.createElement("script");
    js.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    js.onload = () => {
      if (!mapRef.current || leafletMap.current) return;
      const L = window.L;
      const center = CITY_COORDS["Iași"];

      leafletMap.current = L.map(mapRef.current, {
        center,
        zoom: 16,
        zoomControl: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(leafletMap.current);

      L.control.zoom({ position: "bottomright" }).addTo(leafletMap.current);
      markersLayer.current = L.layerGroup().addTo(leafletMap.current);

      leafletMap.current.on("moveend", fetchOverpass);
      setMapReady(true);
    };
    document.head.appendChild(js);
  }, []);

  // Adauga markeri cand restaurantele sunt incarcate si harta e gata
  useEffect(() => {
    if (!mapReady || !markersLayer.current || !window.L) return;
    addRegisteredMarkers();
    fetchOverpass();
  }, [mapReady, registeredRestaurants]);

  const addRegisteredMarkers = useCallback(() => {
    if (!markersLayer.current || !window.L) return;
    const L = window.L;

    registeredRestaurants.forEach((rest) => {
      const coords = RESTAURANT_COORDS[rest.name];
      if (!coords) return;

      const icon = L.divIcon({
        className: "",
        html: `<div style="
          background:#c0622f;border:2px solid #8b3a18;
          border-radius:10px;padding:5px 10px;
          font-size:12px;font-weight:700;color:#fff;
          font-family:sans-serif;white-space:nowrap;
          box-shadow:0 3px 10px rgba(0,0,0,.5);
          cursor:pointer;position:relative;
        ">${rest.name}<div style="
          position:absolute;bottom:-7px;left:50%;
          transform:translateX(-50%);
          width:0;height:0;
          border-left:6px solid transparent;
          border-right:6px solid transparent;
          border-top:7px solid #c0622f;
        "></div></div>`,
        iconAnchor: [50, 0],
      });

      L.marker(coords, { icon })
        .on("click", () =>
          setSelectedMarker({
            id: rest.id,
            name: rest.name,
            lat: coords[0],
            lon: coords[1],
            isRegistered: true,
            registeredData: rest,
          }),
        )
        .addTo(markersLayer.current);
    });
  }, [registeredRestaurants]);

  const fetchOverpass = useCallback(async () => {
    if (!leafletMap.current || !window.L) return;
    const zoom = leafletMap.current.getZoom();
    if (zoom < 13) {
      return;
    }

    const b = leafletMap.current.getBounds();
    const query = `[out:json][timeout:10];(node["amenity"~"restaurant|cafe|bar|fast_food|pub"](${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()}););out 60;`;

    setLoading(true);
    try {
      const res = await fetch(
        `https://overpass.kumi.systems/api/interpreter?data=${encodeURIComponent(query)}`,
      );
      const data = await res.json();
      const pois = (data.elements || [])
        .filter((el) => el.tags?.name && el.lat && el.lon)
        .map((el) => ({
          id: el.id,
          name: el.tags.name,
          lat: el.lat,
          lon: el.lon,
          type: el.tags.amenity,
          address: el.tags["addr:street"] || "",
        }));

      setOverpassPOIs(pois);
      addOverpassMarkers(pois);
    } catch (e) {}
    setLoading(false);
  }, [registeredRestaurants]);

  const addOverpassMarkers = useCallback(
    (pois) => {
      if (!markersLayer.current || !window.L) return;
      const L = window.L;
      const registeredNames = registeredRestaurants.map((r) =>
        r.name.toLowerCase(),
      );

      // Stergem markerii vechi Overpass (nu pe cei inregistrati)
      markersLayer.current.clearLayers();
      addRegisteredMarkers();

      pois.forEach((poi) => {
        const isReg = registeredNames.includes(poi.name.toLowerCase());
        if (isReg) return; // deja afisat ca portocaliu

        const icon = L.divIcon({
          className: "",
          html: `<div style="
          background:#3a3a3a;border:2px solid #555;
          border-radius:10px;padding:5px 10px;
          font-size:11px;font-weight:600;color:#ccc;
          font-family:sans-serif;white-space:nowrap;
          box-shadow:0 3px 10px rgba(0,0,0,.4);
          cursor:pointer;position:relative;
          max-width:130px;overflow:hidden;text-overflow:ellipsis;
        ">${poi.name}<div style="
          position:absolute;bottom:-7px;left:50%;
          transform:translateX(-50%);
          width:0;height:0;
          border-left:6px solid transparent;
          border-right:6px solid transparent;
          border-top:7px solid #3a3a3a;
        "></div></div>`,
          iconAnchor: [50, 0],
        });

        L.marker([poi.lat, poi.lon], { icon })
          .on("click", () => setSelectedMarker({ ...poi, isRegistered: false }))
          .addTo(markersLayer.current);
      });
    },
    [registeredRestaurants, addRegisteredMarkers],
  );

  // Schimba orasul
  useEffect(() => {
    if (!leafletMap.current || !mapReady) return;
    const coords = CITY_COORDS[selectedCity];
    if (coords) leafletMap.current.setView(coords, 15);
  }, [selectedCity, mapReady]);

  const searchResults =
    searchQuery.trim().length > 1
      ? overpassPOIs
          .filter((p) =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase()),
          )
          .slice(0, 6)
      : [];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#0a0805",
        display: "flex",
        flexDirection: "column",
        zIndex: 1000,
      }}
    >
      {/* Header fix */}
      <div
        style={{
          background: "#0d0a07",
          borderBottom: "1px solid #2a2218",
          padding: "10px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          flexShrink: 0,
          zIndex: 10,
        }}
      >
        {/* Rand 1: back + titlu + oras */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => navigate("home")}
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
              fontSize: 16,
              fontWeight: 900,
              color: "#f0ebe3",
              flex: 1,
            }}
          >
            🗺️ Hartă restaurante
          </span>

          {/* Selector oras */}
          <div style={{ position: "relative", zIndex: 9999 }}>
            <button
              onClick={() => setShowCities(!showCities)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 14px",
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
              <span>{selectedCity}</span>
              <span style={{ fontSize: 10 }}>▾</span>
            </button>
            {showCities && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  right: 0,
                  background: "#1a1510",
                  border: "1px solid #2a2218",
                  borderRadius: 14,
                  width: 200,
                  maxHeight: 300,
                  overflowY: "auto",
                  zIndex: 9999,
                  boxShadow: "0 8px 32px rgba(0,0,0,.8)",
                }}
              >
                {ORASE.map((oras) => (
                  <div
                    key={oras}
                    onClick={() => {
                      setSelectedCity(oras);
                      setShowCities(false);
                    }}
                    style={{
                      padding: "10px 16px",
                      cursor: "pointer",
                      fontSize: 13,
                      color: oras === selectedCity ? "#c0622f" : "#c8a97e",
                      fontWeight: oras === selectedCity ? 700 : 400,
                      borderBottom: "1px solid rgba(255,255,255,.04)",
                    }}
                  >
                    {oras === selectedCity ? "✓ " : ""}
                    {oras}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Rand 2: search */}
        <div style={{ position: "relative" }}>
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
            <span style={{ color: "#6b6050", fontSize: 14 }}>🔍</span>
            <input
              type="text"
              placeholder="Caută restaurant pe hartă..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              maxLength={60}
              style={{
                flex: 1,
                background: "none",
                border: "none",
                outline: "none",
                color: "#f0ebe3",
                fontSize: 13,
                fontFamily: "inherit",
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
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
                boxShadow: "0 8px 24px rgba(0,0,0,.5)",
                zIndex: 9999,
              }}
            >
              {searchResults.map((r) => (
                <div
                  key={r.id}
                  onClick={() => {
                    if (leafletMap.current)
                      leafletMap.current.setView([r.lat, r.lon], 17);
                    setSearchQuery("");
                    setSelectedMarker({ ...r, isRegistered: false });
                  }}
                  style={{
                    padding: "12px 16px",
                    cursor: "pointer",
                    borderBottom: "1px solid rgba(255,255,255,.04)",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      flexShrink: 0,
                      background: registeredRestaurants.some(
                        (rr) => rr.name.toLowerCase() === r.name.toLowerCase(),
                      )
                        ? "#c0622f"
                        : "#6b6050",
                    }}
                  ></span>
                  <div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#f0ebe3",
                      }}
                    >
                      {r.name}
                    </div>
                    {r.address && (
                      <div style={{ fontSize: 11, color: "#6b6050" }}>
                        {r.address}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Legenda */}
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                background: "#c0622f",
              }}
            ></div>
            <span style={{ fontSize: 11, color: "#c8a97e", fontWeight: 600 }}>
              Pe WhataboutFood
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                background: "#555",
              }}
            ></div>
            <span style={{ fontSize: 11, color: "#6b6050" }}>
              Neînregistrat
            </span>
          </div>
          {loading && (
            <span
              style={{ fontSize: 11, color: "#c8a97e", marginLeft: "auto" }}
            >
              Se încarcă...
            </span>
          )}
        </div>
      </div>

      {/* Harta */}
      <div ref={mapRef} style={{ flex: 1, width: "100%" }} />

      {/* Popup marker selectat */}
      {selectedMarker && (
        <div
          style={{
            position: "absolute",
            bottom: 16,
            left: 16,
            right: 16,
            background: "#1a1510",
            border: `1px solid ${selectedMarker.isRegistered ? "rgba(192,98,47,.4)" : "#2a2218"}`,
            borderRadius: 20,
            padding: "18px 20px",
            boxShadow: "0 -4px 32px rgba(0,0,0,.5)",
            zIndex: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "'Fraunces',serif",
                  fontSize: 18,
                  fontWeight: 900,
                  color: "#f0ebe3",
                  marginBottom: 4,
                }}
              >
                {selectedMarker.name}
              </div>
              {selectedMarker.address && (
                <div style={{ fontSize: 12, color: "#6b6050" }}>
                  📍 {selectedMarker.address}
                </div>
              )}
              {selectedMarker.registeredData?.rating && (
                <div style={{ fontSize: 12, color: "#c8a97e", marginTop: 4 }}>
                  ★ {Number(selectedMarker.registeredData.rating).toFixed(1)}
                </div>
              )}
            </div>
            <button
              onClick={() => setSelectedMarker(null)}
              style={{
                background: "none",
                border: "none",
                color: "#6b6050",
                fontSize: 22,
                cursor: "pointer",
              }}
            >
              ×
            </button>
          </div>

          {selectedMarker.isRegistered ? (
            <button
              onClick={() => navigate("restaurant")}
              style={{
                width: "100%",
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
              🍽️ Vezi locația în aplicație
            </button>
          ) : (
            <div
              style={{
                background: "rgba(255,255,255,.04)",
                borderRadius: 12,
                padding: "12px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 13, color: "#6b6050" }}>
                😔 Încă nu face parte din această aplicație
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        .leaflet-container { background: #1a1510 !important; }
        .leaflet-control-attribution { display: none !important; }
      `}</style>
    </div>
  );
}
