import { useRef, useEffect } from "react";

// Selector de durata pentru o rezervare. 3 optiuni exclusive:
//  1. "Stau cel mult o ora"        -> 60 min
//  2. "Stau aproximativ 2-3 ore"   -> 165 min (2h45)
//  3. "Eveniment special (>3 ore)" -> roata cu nr de ore (4-8h) -> N*60 min
//
// Props:
//  - value: number - durata curenta in minute (60 / 165 / 240..480)
//  - onChange: (minutes: number) => void
//
// Reutilizabil la client (Rezervare) si la ospatar (PhoneReservationModal).

const SPECIAL_HOURS = [4, 5, 6, 7, 8]; // optiuni pentru eveniment special
const ITEM_H = 40;
const PAD = 80;

// Determina ce optiune e activa pe baza valorii in minute
function activeOption(minutes) {
  if (minutes === 60) return "scurt";
  if (minutes === 165) return "mediu";
  if (minutes >= 240) return "special"; // 4h+ = eveniment special
  return "mediu"; // fallback
}

export default function DurationPicker({ value = 165, onChange }) {
  const active = activeOption(value);
  const wheelRef = useRef(null);

  // ore curente la eveniment special (din value daca e >=240, altfel 4)
  const specialHours = value >= 240 ? Math.round(value / 60) : 4;

  // Pozitioneaza roata pe valoarea curenta cand devine activ "special"
  useEffect(() => {
    if (active !== "special" || !wheelRef.current) return;
    const idx = Math.max(0, SPECIAL_HOURS.indexOf(specialHours));
    wheelRef.current.scrollTop = idx * ITEM_H;
  }, [active, specialHours]);

  const handleWheelScroll = () => {
    const el = wheelRef.current;
    if (!el) return;
    clearTimeout(el._t);
    el._t = setTimeout(() => {
      const center = el.scrollTop + 100;
      const idx = Math.round((center - PAD - ITEM_H / 2) / ITEM_H);
      const clamped = Math.max(0, Math.min(SPECIAL_HOURS.length - 1, idx));
      const hours = SPECIAL_HOURS[clamped];
      onChange?.(hours * 60);
    }, 80);
  };

  const optStyle = (isActive) => ({
    width: "100%",
    textAlign: "left",
    padding: "14px 16px",
    borderRadius: 12,
    border: `1px solid ${isActive ? "#c0622f" : "#2c2419"}`,
    background: isActive ? "rgba(192,98,47,.12)" : "transparent",
    color: isActive ? "#f0ebe3" : "#8a7a6a",
    fontSize: 14,
    fontWeight: isActive ? 700 : 400,
    cursor: "pointer",
    marginBottom: 8,
    fontFamily: "'DM Sans',sans-serif",
    display: "flex",
    alignItems: "center",
    gap: 10,
    transition: "all .12s",
  });

  const radioStyle = (isActive) => ({
    width: 18,
    height: 18,
    borderRadius: "50%",
    border: `2px solid ${isActive ? "#c0622f" : "#6b6050"}`,
    flexShrink: 0,
    position: "relative",
    background: isActive ? "#c0622f" : "transparent",
    boxShadow: isActive ? "inset 0 0 0 3px #1a1510" : "none",
  });

  return (
    <div style={{ marginBottom: 8 }}>
      <button
        type="button"
        onClick={() => onChange?.(60)}
        style={optStyle(active === "scurt")}
      >
        <span style={radioStyle(active === "scurt")} />
        Stau cel mult o oră
      </button>

      <button
        type="button"
        onClick={() => onChange?.(165)}
        style={optStyle(active === "mediu")}
      >
        <span style={radioStyle(active === "mediu")} />
        Stau aproximativ 2-3 ore
      </button>

      <button
        type="button"
        onClick={() => onChange?.(SPECIAL_HOURS[0] * 60)}
        style={optStyle(active === "special")}
      >
        <span style={radioStyle(active === "special")} />
        Eveniment special (peste 3 ore)
      </button>

      {/* Roata cu numarul de ore - apare doar la eveniment special */}
      {active === "special" && (
        <div
          style={{
            background: "#120d09",
            borderRadius: 16,
            padding: 16,
            marginTop: 4,
            marginBottom: 8,
          }}
        >
          <div
            style={{
              textAlign: "center",
              fontSize: 12,
              color: "#8a7a6a",
              marginBottom: 8,
            }}
          >
            Câte ore va dura evenimentul?
          </div>
          <div
            style={{
              position: "relative",
              display: "flex",
              justifyContent: "center",
              height: 200,
            }}
          >
            {/* Banda centrala */}
            <div
              style={{
                position: "absolute",
                top: 80,
                left: 40,
                right: 40,
                height: ITEM_H,
                background: "rgba(192,98,47,0.12)",
                borderTop: "1px solid rgba(192,98,47,0.4)",
                borderBottom: "1px solid rgba(192,98,47,0.4)",
                borderRadius: 8,
                pointerEvents: "none",
                zIndex: 1,
              }}
            />
            <div
              ref={wheelRef}
              onScroll={handleWheelScroll}
              style={{
                width: 120,
                height: 200,
                overflowY: "scroll",
                scrollSnapType: "y mandatory",
                scrollbarWidth: "none",
                msOverflowStyle: "none",
                position: "relative",
              }}
            >
              <div style={{ height: PAD }} />
              {SPECIAL_HOURS.map((h) => (
                <div
                  key={h}
                  style={{
                    height: ITEM_H,
                    scrollSnapAlign: "center",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                    fontFamily: "'Fraunces',serif",
                    fontWeight: h === specialHours ? 700 : 400,
                    color: h === specialHours ? "#c0622f" : "#6b6050",
                  }}
                >
                  {h} ore
                </div>
              ))}
              <div style={{ height: PAD }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
