import { useState, useEffect, useRef, useCallback } from "react";
import { useApp } from "../context/AppContext";
import { supabase } from "../supabase";

// Coordonate centre orase Romania
const CITY_COORDS = {
  "Toate orașele": [45.9432, 24.9668], // centru Romania
  București: [44.4268, 26.1025],
  "Cluj-Napoca": [46.7712, 23.6236],
  Timișoara: [45.7489, 21.2087],
  Iași: [47.1585, 27.6014],
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

// Coordonate restaurante langa sensul giratoriu Podul Ros, Iasi
const RESTAURANT_COORDS = {
  "Mama Mia": [47.1578, 27.5885],
  "Sushi Zen": [47.1582, 27.5892],
  "Verde Bistro": [47.1575, 27.5898],
  "Burger Big": [47.1585, 27.5878],
  "Muu Bistro": [47.1572, 27.5905],
  "Pizza Nico": [47.1588, 27.587],
};

export default function HartaPage() {
  const { state, navigate } = useApp();
  const { selectedRest } = state;
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const markersLayer = useRef(null);
  const leafletLoaded = useRef(false);

  const [selectedCity, setSelectedCity] = useState("Iași");
  const [showCities, setShowCities] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [registeredRestaurants, setRegisteredRestaurants] = useState([]);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [overpassPOIs, setOverpassPOIs] = useState([]);
  const [mapReady, setMapReady] = useState(false);

  const ORASE = Object.keys(CITY_COORDS).filter((c) => c !== "Toate orașele");

  // Incarcam restaurantele inregistrate din DB
  useEffect(() => {
    const loadRegistered = async () => {
      const { data } = await supabase
        .from("restaurants")
        .select("id, name, address, city, rating, type");
      setRegisteredRestaurants(data || []);
    };
    loadRegistered();
  }, []);

  // Initializam Leaflet
  useEffect(() => {
    if (leafletLoaded.current) return;

    const linkCSS = document.createElement("link");
    linkCSS.rel = "stylesheet";
    linkCSS.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(linkCSS);

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => {
      leafletLoaded.current = true;
      initMap();
    };
    document.head.appendChild(script);

    return () => {};
  }, []);

  const initMap = useCallback(() => {
    if (!mapRef.current || leafletMap.current) return;
    const L = window.L;

    const coords = CITY_COORDS[selectedCity] || [47.158, 27.589];
    const zoom = selectedCity === "Toate orașele" ? 7 : 15;

    leafletMap.current = L.map(mapRef.current, {
      center: coords,
      zoom,
      zoomControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 19,
    }).addTo(leafletMap.current);

    L.control.zoom({ position: "bottomright" }).addTo(leafletMap.current);

    markersLayer.current = L.layerGroup().addTo(leafletMap.current);

    leafletMap.current.on("moveend", () => {
      loadOverpassPOIs();
    });

    setMapReady(true);
    // Afisam imediat restaurantele inregistrate din coordonatele demo
    renderRegisteredOnly();
    loadOverpassPOIs();
  }, [selectedCity]);

  // Incarcam POI-uri din Overpass API
  const loadOverpassPOIs = useCallback(async () => {
    if (!leafletMap.current || !window.L) return;
    const bounds = leafletMap.current.getBounds();
    const zoom = leafletMap.current.getZoom();
    if (zoom < 11) {
      renderMarkers([]);
      return;
    }

    const s = bounds.getSouth(),
      n = bounds.getNorth();
    const w = bounds.getWest(),
      e = bounds.getEast();

    const query = `[out:json][timeout:15];
(
  node["amenity"~"restaurant|cafe|bar|fast_food|pub|bistro|coffee_shop"](${s},${w},${n},${e});
  way["amenity"~"restaurant|cafe|bar|fast_food|pub|bistro|coffee_shop"](${s},${w},${n},${e});
);
out center 80;`;

    setLoading(true);
    try {
      const res = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: query,
      });
      const data = await res.json();
      const pois = (data.elements || [])
        .filter((el) => el.tags?.name)
        .map((el) => ({
          id: el.id,
          name: el.tags.name,
          lat: el.lat || el.center?.lat,
          lon: el.lon || el.center?.lon,
          type: el.tags.amenity,
          address: el.tags["addr:street"] || "",
        }))
        .filter((p) => p.lat && p.lon);
      setOverpassPOIs(pois);
      renderMarkers(pois);
    } catch (e) {
      renderMarkers([]);
    }
    setLoading(false);
  }, [registeredRestaurants]);

  // Randam doar restaurantele inregistrate cu coordonate demo
  const renderRegisteredOnly = useCallback(() => {
    if (!markersLayer.current || !window.L) return;
    const L = window.L;

    registeredRestaurants.forEach((rest) => {
      const coords = RESTAURANT_COORDS[rest.name];
      if (!coords) return;

      const icon = L.divIcon({
        className: "",
        html: `<div style="
          background:#c0622f;border:1.5px solid #8b3a18;
          border-radius:8px;padding:4px 8px;
          font-size:11px;font-weight:700;color:#fff;
          font-family:sans-serif;white-space:nowrap;
          box-shadow:0 2px 8px rgba(0,0,0,.4);
          max-width:140px;overflow:hidden;text-overflow:ellipsis;
          cursor:pointer;position:relative;
        ">${rest.name}<div style="
          position:absolute;bottom:-6px;left:50%;
          transform:translateX(-50%);width:0;height:0;
          border-left:5px solid transparent;border-right:5px solid transparent;
          border-top:6px solid #c0622f;
        "></div></div>`,
        iconAnchor: [0, 0],
      });

      const marker = L.marker(coords, { icon });
      marker.on("click", () => {
        setSelectedMarker({
          id: rest.id,
          name: rest.name,
          lat: coords[0],
          lon: coords[1],
          isRegistered: true,
          registeredData: rest,
        });
      });
      markersLayer.current.addLayer(marker);
    });
  }, [registeredRestaurants]);

  // Randam markerii pe harta
  const renderMarkers = useCallback(
    (pois) => {
      if (!markersLayer.current || !window.L) return;
      const L = window.L;
      markersLayer.current.clearLayers();

      const registeredNames = registeredRestaurants.map((r) =>
        r.name.toLowerCase(),
      );

      pois.forEach((poi) => {
        const isRegistered = registeredNames.includes(poi.name.toLowerCase());
        const color = isRegistered ? "#c0622f" : "#6b6050";
        const borderColor = isRegistered ? "#8b3a18" : "#3a3a3a";
        const textColor = isRegistered ? "#fff" : "#d0d0d0";

        const icon = L.divIcon({
          className: "",
          html: `<div style="
          background:${color};
          border:1.5px solid ${borderColor};
          border-radius:8px;
          padding:4px 8px;
          font-size:11px;
          font-weight:700;
          color:${textColor};
          font-family:sans-serif;
          white-space:nowrap;
          box-shadow:0 2px 8px rgba(0,0,0,.4);
          max-width:140px;
          overflow:hidden;
          text-overflow:ellipsis;
          cursor:pointer;
          position:relative;
        ">
          ${poi.name}
          <div style="
            position:absolute;
            bottom:-6px;left:50%;
            transform:translateX(-50%);
            width:0;height:0;
            border-left:5px solid transparent;
            border-right:5px solid transparent;
            border-top:6px solid ${color};
          "></div>
        </div>`,
          iconAnchor: [0, 0],
        });

        const registeredData = registeredRestaurants.find(
          (r) => r.name.toLowerCase() === poi.name.toLowerCase(),
        );

        const marker = L.marker([poi.lat, poi.lon], { icon });
        marker.on("click", () => {
          setSelectedMarker({
            ...poi,
            isRegistered,
            registeredData,
          });
        });
        markersLayer.current.addLayer(marker);
      });

      // Adaugam si restaurantele inregistrate care nu sunt in Overpass
      registeredRestaurants.forEach((rest) => {
        const coords = RESTAURANT_COORDS[rest.name];
        if (!coords) return;
        const alreadyShown = pois.some(
          (p) => p.name.toLowerCase() === rest.name.toLowerCase(),
        );
        if (alreadyShown) return;

        const icon = L.divIcon({
          className: "",
          html: `<div style="
          background:#c0622f;
          border:1.5px solid #8b3a18;
          border-radius:8px;
          padding:4px 8px;
          font-size:11px;
          font-weight:700;
          color:#fff;
          font-family:sans-serif;
          white-space:nowrap;
          box-shadow:0 2px 8px rgba(0,0,0,.4);
          max-width:140px;
          overflow:hidden;
          text-overflow:ellipsis;
          cursor:pointer;
          position:relative;
        ">
          ${rest.name}
          <div style="
            position:absolute;
            bottom:-6px;left:50%;
            transform:translateX(-50%);
            width:0;height:0;
            border-left:5px solid transparent;
            border-right:5px solid transparent;
            border-top:6px solid #c0622f;
          "></div>
        </div>`,
          iconAnchor: [0, 0],
        });

        const marker = L.marker(coords, { icon });
        marker.on("click", () => {
          setSelectedMarker({
            id: rest.id,
            name: rest.name,
            lat: coords[0],
            lon: coords[1],
            isRegistered: true,
            registeredData: rest,
          });
        });
        markersLayer.current.addLayer(marker);
      });
    },
    [registeredRestaurants],
  );

  // Schimbare oras
  useEffect(() => {
    if (!leafletMap.current || !mapReady) return;
    const coords = CITY_COORDS[selectedCity] || [47.158, 27.589];
    const zoom = selectedCity === "Toate orașele" ? 7 : 15;
    leafletMap.current.setView(coords, zoom);
  }, [selectedCity, mapReady]);

  // Cand se incarca restaurantele din DB, adaugam markerii
  useEffect(() => {
    if (registeredRestaurants.length > 0 && mapReady && markersLayer.current) {
      renderRegisteredOnly();
    }
  }, [registeredRestaurants, mapReady]);

  const handleSearchResult = (poi) => {
    if (!leafletMap.current) return;
    leafletMap.current.setView([poi.lat, poi.lon], 17);
    setSearchQuery("");
    setSelectedMarker(poi);
  };

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
      {/* Header fix cu buton înapoi */}
      <div
        style={{
          background: "#0a0805",
          borderBottom: "1px solid #2a2218",
          padding: "12px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          zIndex: 10,
          flexShrink: 0,
        }}
      >
        {/* Bara top: back + titlu + selector oras */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => navigate("home")}
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: "rgba(10,8,5,.85)",
              border: "1px solid rgba(200,169,126,.2)",
              color: "#f0ebe3",
              fontSize: 18,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(10px)",
              flexShrink: 0,
            }}
          >
            ←
          </button>

          <div
            style={{
              flex: 1,
              fontFamily: "'Fraunces',serif",
              fontSize: 18,
              fontWeight: 900,
              color: "#f0ebe3",
            }}
          >
            🗺️ Hartă restaurante
          </div>

          {/* Selector oras */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowCities(!showCities)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                background: "rgba(192,98,47,.9)",
                border: "none",
                borderRadius: 20,
                color: "#fff",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                backdropFilter: "blur(10px)",
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
                  borderRadius: 16,
                  width: 200,
                  maxHeight: 320,
                  overflowY: "auto",
                  zIndex: 9999,
                  boxShadow: "0 8px 32px rgba(0,0,0,.6)",
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
                    {oras}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bara search pe harta */}
        <div style={{ position: "relative" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(10,8,5,.9)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(200,169,126,.2)",
              borderRadius: 50,
              padding: "10px 16px",
            }}
          >
            <span style={{ fontSize: 14, color: "#6b6050" }}>🔍</span>
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
                  fontSize: 16,
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
                  onClick={() => handleSearchResult(r)}
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
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            background: "rgba(10,8,5,.8)",
            backdropFilter: "blur(10px)",
            padding: "6px 14px",
            borderRadius: 20,
            border: "1px solid rgba(255,255,255,.06)",
            alignSelf: "flex-start",
          }}
        >
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
                background: "#6b6050",
              }}
            ></div>
            <span style={{ fontSize: 11, color: "#6b6050" }}>
              Neînregistrat
            </span>
          </div>
        </div>
      </div>

      {/* Loading indicator */}
      {loading && (
        <div
          style={{
            position: "absolute",
            bottom: 80,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(10,8,5,.9)",
            border: "1px solid rgba(200,169,126,.2)",
            borderRadius: 20,
            padding: "8px 16px",
            zIndex: 10,
            fontSize: 12,
            color: "#c8a97e",
            backdropFilter: "blur(10px)",
          }}
        >
          Se încarcă restaurantele...
        </div>
      )}

      {/* Harta */}
      <div ref={mapRef} style={{ flex: 1, width: "100%" }} />

      {/* Popup marker selectat */}
      {selectedMarker && (
        <div
          style={{
            position: "absolute",
            bottom: 20,
            left: 16,
            right: 16,
            background: "#1a1510",
            border: `1px solid ${selectedMarker.isRegistered ? "rgba(192,98,47,.4)" : "#2a2218"}`,
            borderRadius: 20,
            padding: "18px 20px",
            boxShadow: "0 -4px 32px rgba(0,0,0,.5)",
            zIndex: 20,
            animation: "slideUp .3s ease",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              marginBottom: 10,
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
                fontSize: 20,
                cursor: "pointer",
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>

          {selectedMarker.isRegistered ? (
            <button
              onClick={() => {
                const rest = selectedMarker.registeredData;
                if (rest) {
                  // Navigam la restaurant
                  navigate("restaurant");
                }
              }}
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
                padding: "12px 16px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 20, marginBottom: 6 }}>😔</div>
              <div style={{ fontSize: 13, color: "#6b6050", lineHeight: 1.6 }}>
                Încă nu face parte din această aplicație
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .leaflet-container { background: #1a1510; }
        .leaflet-control-attribution { display: none; }
      `}</style>
    </div>
  );
}
