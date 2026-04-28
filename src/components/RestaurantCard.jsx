import { useApp } from "../context/AppContext";

export default function RestaurantCard({ restaurant }) {
  const { dispatch, navigate } = useApp();

  const handleClick = () => {
    dispatch({ type: "SET_REST", payload: restaurant });
    navigate("restaurant");
  };

  const tags = Array.isArray(restaurant.tags) ? restaurant.tags : [];

  // Culoare de fundal generată din numele restaurantului dacă nu există cover
  const colors = [
    "linear-gradient(135deg,#2d1507,#1a0e05)",
    "linear-gradient(135deg,#071a2d,#050e1a)",
    "linear-gradient(135deg,#1a1507,#0e0a05)",
    "linear-gradient(135deg,#1a0714,#0e0508)",
    "linear-gradient(135deg,#071a0e,#050e07)",
  ];
  const colorIdx = (restaurant.name?.charCodeAt(0) || 0) % colors.length;
  const cover = restaurant.cover || colors[colorIdx];

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
          height: 80,
          background: cover,
          display: "flex",
          alignItems: "flex-end",
          padding: 12,
          position: "relative",
        }}
      >
        {restaurant.plan && restaurant.plan !== "free" && (
          <span
            style={{
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              padding: "3px 8px",
              borderRadius: 8,
              background: "rgba(192,98,47,.3)",
              border: "1px solid rgba(192,98,47,.5)",
              color: "#e07a47",
            }}
          >
            {restaurant.plan.toUpperCase()}
          </span>
        )}
        <span
          style={{ position: "absolute", top: 12, right: 14, fontSize: 32 }}
        >
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
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
        {tags.length > 0 && (
          <div
            style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}
          >
            {tags.map((t) => (
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
        )}
      </div>
    </div>
  );
}
