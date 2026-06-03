import { useState, useEffect, useRef } from "react";
import { useApp } from "../context/AppContext";
import { supabase } from "../supabase";

function TableAvailability({ restaurantId }) {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (!restaurantId) return;
    const load = async () => {
      const { data: floors } = await supabase
        .from("floors")
        .select("id")
        .eq("restaurant_id", restaurantId);
      if (!floors?.length) return;
      const floorIds = floors.map((f) => f.id);
      const { data: tables } = await supabase
        .from("tables")
        .select("id")
        .in("floor_id", floorIds);
      if (!tables?.length) return;
      const tableIds = tables.map((t) => t.id);
      const { data: sessions } = await supabase
        .from("table_sessions")
        .select("table_id")
        .in("table_id", tableIds)
        .in("status", ["occupied", "reserved"]);
      const total = tables.length;
      const occupied = sessions?.length || 0;
      setStatus({ free: total - occupied, total });
    };
    load();
  }, [restaurantId]);

  if (!status || status.total === 0) return null;
  const pct = (status.free / status.total) * 100;
  const color = pct >= 70 ? "#4adf7c" : pct >= 30 ? "#e07a47" : "#e05050";
  const label =
    pct >= 70 ? "Mese libere acum" : pct >= 30 ? "Aproape plin" : "Câteva mese";

  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        gap: 4,
        color,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: color,
          display: "inline-block",
        }}
      />
      {label}
    </span>
  );
}

// Detecteaza luminozitatea medie a imaginii
function useBrightness(src) {
  const [dark, setDark] = useState(true);
  useEffect(() => {
    if (!src) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 50;
        canvas.height = 50;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, 50, 50);
        const d = ctx.getImageData(0, 0, 50, 50).data;
        let sum = 0;
        for (let i = 0; i < d.length; i += 4) {
          sum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        }
        setDark(sum / (d.length / 4) < 128);
      } catch (e) {
        setDark(true);
      }
    };
    img.src = src;
  }, [src]);
  return dark;
}

export default function RestaurantCard({ restaurant, hideTables }) {
  const { dispatch, navigate } = useApp();
  const coverImg = restaurant.cover_image || restaurant.cover || null;
  const isDark = useBrightness(coverImg);

  const colors = [
    "linear-gradient(135deg,#2d1507,#1a0e05)",
    "linear-gradient(135deg,#071a2d,#050e1a)",
    "linear-gradient(135deg,#1a1507,#0e0a05)",
    "linear-gradient(135deg,#1a0714,#0e0508)",
    "linear-gradient(135deg,#071a0e,#050e07)",
  ];
  const colorIdx = (restaurant.name?.charCodeAt(0) || 0) % colors.length;
  const tags = Array.isArray(restaurant.tags)
    ? restaurant.tags
    : restaurant.type
      ? [restaurant.type]
      : [];

  const textColor = coverImg ? (isDark ? "#fff" : "#1a1410") : "#fff";
  const overlayBg = coverImg
    ? isDark
      ? "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 60%, rgba(0,0,0,0) 100%)"
      : "linear-gradient(to top, rgba(255,255,255,0.88) 0%, rgba(255,255,255,0.2) 60%, rgba(255,255,255,0) 100%)"
    : "none";

  const tagBg =
    isDark || !coverImg ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.08)";
  const tagBorder =
    isDark || !coverImg ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.15)";
  const ratingColor = isDark || !coverImg ? "#f5c842" : "#8b5e10";

  return (
    <div
      onClick={() => {
        dispatch({ type: "SET_REST", payload: restaurant });
        navigate("restaurant");
      }}
      style={{
        position: "relative",
        height: 180,
        borderRadius: 20,
        overflow: "hidden",
        cursor: "pointer",
        background: coverImg
          ? `url(${coverImg}) center/cover no-repeat`
          : colors[colorIdx],
        marginBottom: 0,
      }}
      onTouchStart={(e) => (e.currentTarget.style.transform = "scale(.99)")}
      onTouchEnd={(e) => (e.currentTarget.style.transform = "scale(1)")}
    >
      {/* Overlay */}
      {coverImg && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: overlayBg,
          }}
        />
      )}

      {/* Content */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          padding: "12px 16px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          color: textColor,
        }}
      >
        {/* Top row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          {restaurant.plan && restaurant.plan !== "free" ? (
            <span
              style={{
                fontSize: 9,
                fontWeight: 800,
                letterSpacing: 1.5,
                textTransform: "uppercase",
                padding: "3px 8px",
                borderRadius: 8,
                background: "rgba(192,98,47,.85)",
                color: "#fff",
              }}
            >
              {restaurant.plan.toUpperCase()}
            </span>
          ) : (
            <span />
          )}
          <span style={{ fontSize: 30 }}>{restaurant.emoji || "🍽️"}</span>
        </div>

        {/* Bottom */}
        <div>
          <div
            style={{
              fontFamily: "'Fraunces',serif",
              fontSize: 20,
              fontWeight: 700,
              lineHeight: 1.2,
              marginBottom: 2,
            }}
          >
            {restaurant.name}
          </div>
          <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 6 }}>
            {restaurant.type || "Restaurant"}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 6,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {restaurant.rating && (
                <span
                  style={{ fontSize: 13, fontWeight: 700, color: ratingColor }}
                >
                  ★ {restaurant.rating}
                </span>
              )}
              <span style={{ fontSize: 11, opacity: 0.8 }}>
                📍 {restaurant.city || restaurant.address || ""}
              </span>
            </div>
            {!hideTables && <TableAvailability restaurantId={restaurant.id} />}
          </div>
          {tags.length > 0 && (
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {tags.slice(0, 4).map((t) => (
                <span
                  key={t}
                  style={{
                    fontSize: 10,
                    padding: "2px 9px",
                    borderRadius: 20,
                    background: tagBg,
                    border: `0.5px solid ${tagBorder}`,
                    color: textColor,
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
