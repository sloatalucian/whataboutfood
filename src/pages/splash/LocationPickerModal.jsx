import React, { useState, useEffect } from "react";

// Modal pentru selectarea locatiei restaurantului pe harta
function LocationPickerModal({ onSelect, onClose }) {
  const mapRef = React.useRef(null);
  const leafletMap = React.useRef(null);
  const markerRef = React.useRef(null);
  const scriptLoaded = React.useRef(false);
  const [searchQ, setSearchQ] = React.useState("");
  const [searchResults, setSearchResults] = React.useState([]);
  const [pinLocation, setPinLocation] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
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
      leafletMap.current = L.map(mapRef.current, {
        center: [47.1585, 27.6014],
        zoom: 14,
        zoomControl: true,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(leafletMap.current);

      leafletMap.current.on("click", (e) => {
        const { lat, lng } = e.latlng;
        setPinLocation({ lat, lon: lng, name: "Locație personalizată" });
        if (markerRef.current) markerRef.current.setLatLng([lat, lng]);
        else {
          markerRef.current = L.marker([lat, lng], {
            icon: L.divIcon({
              className: "",
              html: '<div style="background:#c0622f;width:16px;height:16px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.5);"></div>',
              iconAnchor: [8, 8],
            }),
          }).addTo(leafletMap.current);
        }
      });
    };

    if (window.L) {
      initMap();
    } else {
      const js = document.createElement("script");
      js.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      js.onload = initMap;
      document.head.appendChild(js);
    }
  }, []);

  const searchOverpass = async (q) => {
    if (q.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setLoading(true);
    try {
      const query = `[out:json][timeout:10];node["name"~"${q}","i"]["amenity"~"restaurant|cafe|bar|fast_food|pub"](46.0,20.0,48.5,30.0);out 8;`;
      const res = await fetch(
        `https://overpass.kumi.systems/api/interpreter?data=${encodeURIComponent(query)}`,
      );
      const data = await res.json();
      setSearchResults(
        (data.elements || [])
          .filter((el) => el.tags?.name && el.lat && el.lon)
          .map((el) => ({
            name: el.tags.name,
            lat: el.lat,
            lon: el.lon,
            address: el.tags["addr:street"] || "",
          })),
      );
    } catch (e) {}
    setLoading(false);
  };

  const selectFromSearch = (result) => {
    setPinLocation(result);
    setSearchResults([]);
    setSearchQ(result.name);
    if (leafletMap.current && window.L) {
      leafletMap.current.setView([result.lat, result.lon], 17);
      if (markerRef.current)
        markerRef.current.setLatLng([result.lat, result.lon]);
      else {
        const L = window.L;
        markerRef.current = L.marker([result.lat, result.lon], {
          icon: L.divIcon({
            className: "",
            html: `<div style="background:#c0622f;padding:4px 10px;border-radius:8px;font-size:11px;font-weight:700;color:#fff;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.4);">${result.name}</div>`,
            iconAnchor: [0, 0],
          }),
        }).addTo(leafletMap.current);
      }
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,.9)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "#0d0a07",
          padding: "12px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          borderBottom: "1px solid #2a2218",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "1px solid #2a2218",
              borderRadius: 8,
              padding: "6px 10px",
              color: "#f0ebe3",
              cursor: "pointer",
              fontSize: 14,
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
          {pinLocation && (
            <button
              onClick={() => onSelect(pinLocation)}
              style={{
                background: "#c0622f",
                border: "none",
                borderRadius: 10,
                padding: "8px 16px",
                color: "#fff",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Confirmă
            </button>
          )}
        </div>

        {/* Search */}
        <div style={{ position: "relative", zIndex: 100 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "#1a1510",
              border: "1px solid #2a2218",
              borderRadius: 50,
              padding: "8px 14px",
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
            {loading && (
              <span style={{ fontSize: 12, color: "#6b6050" }}>...</span>
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
                borderRadius: 12,
                overflow: "hidden",
                boxShadow: "0 8px 24px rgba(0,0,0,.6)",
                zIndex: 99999,
              }}
            >
              {searchResults.map((r, i) => (
                <div
                  key={i}
                  onClick={() => selectFromSearch(r)}
                  style={{
                    padding: "12px 16px",
                    cursor: "pointer",
                    borderBottom: "1px solid rgba(255,255,255,.04)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
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
          Caută restaurantul sau apasă pe hartă pentru a pune un pin manual
        </div>
      </div>

      {/* Harta */}
      <div ref={mapRef} style={{ flex: 1 }} />

      {/* Info pin selectat */}
      {pinLocation && (
        <div
          style={{
            position: "absolute",
            bottom: 16,
            left: 16,
            right: 16,
            background: "#1a1510",
            border: "1px solid rgba(192,98,47,.3)",
            borderRadius: 14,
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            zIndex: 20,
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#f0ebe3" }}>
              📍 {pinLocation.name}
            </div>
            <div style={{ fontSize: 11, color: "#6b6050", marginTop: 2 }}>
              {pinLocation.lat?.toFixed(5)}, {pinLocation.lon?.toFixed(5)}
            </div>
          </div>
          <button
            onClick={() => onSelect(pinLocation)}
            style={{
              background: "linear-gradient(135deg,#c0622f,#8b3a18)",
              border: "none",
              borderRadius: 10,
              padding: "10px 20px",
              color: "#fff",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Confirmă locația
          </button>
        </div>
      )}
    </div>
  );
}

export default LocationPickerModal;
