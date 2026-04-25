import { useApp } from "../context/AppContext";
import { PLANS } from "../data/constants";

export default function RestaurantCard({ restaurant }) {
  const { dispatch, navigate } = useApp();

  const handleClick = () => {
    dispatch({ type:"SET_REST", payload: restaurant });
    navigate("restaurant");
  };

  return (
    <div
      onClick={handleClick}
      style={{
        background:"var(--card)", border:"1px solid var(--border)",
        borderRadius:20, overflow:"hidden", cursor:"pointer",
        transition:"transform .2s",
      }}
      onMouseDown={e => e.currentTarget.style.transform="scale(.98)"}
      onMouseUp={e   => e.currentTarget.style.transform="scale(1)"}
      onTouchStart={e => e.currentTarget.style.transform="scale(.98)"}
      onTouchEnd={e   => e.currentTarget.style.transform="scale(1)"}
    >
      {/* Cover */}
      <div style={{
        height:80, background:restaurant.cover,
        display:"flex", alignItems:"flex-end", padding:12,
        position:"relative",
      }}>
        <span className={`plan-badge plan-${restaurant.plan}`}>
          {PLANS[restaurant.plan]?.label}
        </span>
        <span style={{ position:"absolute", top:12, right:14, fontSize:32 }}>
          {restaurant.emoji}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding:"14px 16px" }}>
        <div style={{ fontFamily:"'Fraunces',serif", fontSize:18, fontWeight:700, marginBottom:2 }}>
          {restaurant.name}
        </div>
        <div style={{ fontSize:12, color:"var(--muted)", marginBottom:8 }}>
          {restaurant.type}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:13, fontWeight:700, color:"var(--gold)" }}>
            ★ {restaurant.rating}
          </span>
          <span style={{ fontSize:12, color:"var(--muted)" }}>
            📍 {restaurant.address}
          </span>
        </div>
        <div style={{ display:"flex", gap:6, marginTop:8, flexWrap:"wrap" }}>
          {restaurant.tags.map(t => (
            <span key={t} style={{
              fontSize:11, padding:"3px 10px", borderRadius:20,
              background:"var(--card2)", border:"1px solid var(--border)", color:"var(--muted)",
            }}>
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
