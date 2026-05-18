import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { supabase } from "../supabase";

// Indicator disponibilitate mese
function TableAvailability({ restaurantId }) {
  const [status, setStatus] = useState(null); // { free, total }

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
      const free = total - occupied;
      setStatus({ free, total });
    };
    load();
  }, [restaurantId]);

  if (!status || status.total === 0) return null;

  const pct = (status.free / status.total) * 100;
  const color = pct >= 70 ? "#4a9e5c" : pct >= 30 ? "#e07a47" : "#e05050";
  const label =
    pct >= 70
      ? "Mese libere acum"
      : pct >= 30
        ? "Aproape plin"
        : "Mai sunt câteva mese";
  const dot = pct >= 70 ? "●" : "●";

  return (
    <span
      style={{
        fontSize: 11,
        color,
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        gap: 4,
      }}
    >
      <span
        style={{
          fontSize: 8,
          animation: pct >= 70 ? "pulse 2s infinite" : "none",
        }}
      >
        {dot}
      </span>
      {label}
    </span>
  );
}

export default function RestaurantCard({ restaurant }) {
  const { dispatch, navigate } = useApp();

  const handleClick = () => {
    dispatch({ type: "SET_REST", payload: restaurant });
    navigate("restaurant");
  };

  const colors = [
    "linear-gradient(135deg,#2d1507,#1a0e05)",
    "linear-gradient(135deg,#071a2d,#050e1a)",
    "linear-gradient(135deg,#1a1507,#0e0a05)",
    "linear-gradient(135deg,#1a0714,#0e0508)",
    "linear-gradient(135deg,#071a0e,#050e07)",
  ];
  const colorIdx = (restaurant.name?.charCodeAt(0) || 0) % colors.length;
  const hasCover = restaurant.cover_image || restaurant.cover;
  const coverImg = restaurant.cover_image || restaurant.cover;

  // Tipologie restaurant
  const tags = Array.isArray(restaurant.tags)
    ? restaurant.tags
    : restaurant.type
      ? [restaurant.type]
      : [];

  return (
    <div
      onClick={handleClick}
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 20,
        overflow: "hidden",
        cursor: "pointer",
        transition: "transform .2s",
      }}
      onTouchStart={(e) => (e.currentTarget.style.transform = "scale(.98)")}
      onTouchEnd={(e) => (e.currentTarget.style.transform = "scale(1)")}
    >
      {/* Cover */}
      <div
        style={{
          height: 160,
          background: hasCover
            ? `url(${coverImg}) center/cover no-repeat`
            : colors[colorIdx],
          position: "relative",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          padding: 12,
        }}
      >
        {/* Badge plan */}
        {restaurant.plan && restaurant.plan !== "free" && (
          <span
            style={{
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              padding: "3px 8px",
              borderRadius: 8,
              background: "rgba(192,98,47,.85)",
              border: "1px solid rgba(192,98,47,.5)",
              color: "#fff",
            }}
          >
            {restaurant.plan.toUpperCase()}
          </span>
        )}
        {/* Emoji colt dreapta */}
        <span style={{ fontSize: 32, marginLeft: "auto" }}>
          {restaurant.emoji || "🍽️"}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: "14px 16px" }}>
        <div
          style={{
            fontFamily: "'Fraunces',serif",
            fontSize: 18,
            fontWeight: 700,
            marginBottom: 2,
          }}
        >
          {restaurant.name}
        </div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>
          {restaurant.type || "Restaurant"}
        </div>

        {/* Rating + Adresa */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 8,
          }}
        >
          {restaurant.rating && (
            <span
              style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)" }}
            >
              ★ {restaurant.rating}
            </span>
          )}
          <span style={{ fontSize: 12, color: "var(--muted)" }}>
            📍 {restaurant.city || restaurant.address || ""}
          </span>
        </div>

        {/* Tags + Disponibilitate */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 6,
          }}
        >
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {tags.slice(0, 3).map((t) => (
              <span
                key={t}
                style={{
                  fontSize: 11,
                  padding: "3px 10px",
                  borderRadius: 20,
                  background: "var(--card2)",
                  border: "1px solid var(--border)",
                  color: "var(--muted)",
                }}
              >
                {t}
              </span>
            ))}
          </div>
          <TableAvailability restaurantId={restaurant.id} />
        </div>
      </div>
    </div>
  );
}
