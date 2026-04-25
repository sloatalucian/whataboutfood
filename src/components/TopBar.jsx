import { useApp } from "../context/AppContext";

export default function TopBar({ title, backTo, right, style = {} }) {
  const { navigate } = useApp();

  return (
    <div style={{
      display:"flex", alignItems:"center", gap:12,
      padding:"20px 20px 0",
      ...style,
    }}>
      {backTo && (
        <button
          onClick={() => navigate(backTo)}
          style={{
            width:38, height:38, borderRadius:12,
            background:"var(--card2)", border:"1px solid var(--border)",
            color:"var(--cream)", fontSize:17, cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center",
            flexShrink:0, transition:"all .15s",
          }}>
          ←
        </button>
      )}
      {title && (
        <span style={{ fontFamily:"'Fraunces',serif", fontSize:21, fontWeight:700 }}>
          {title}
        </span>
      )}
      {right && <div style={{ marginLeft:"auto" }}>{right}</div>}
    </div>
  );
}
