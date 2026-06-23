import { useRef, useEffect } from "react";

// Selector de ora tip "roata" (ca alarma iPhone), cu 2 roti: ora + minute.
// Derulare cu degetul (touch) sau scroll (desktop), cu snap pe valoare.
//
// Props:
//  - hours: string[] - orele disponibile (ex: ["10","11",...,"22"]) - din program
//  - value: string - ora curenta "HH:MM" (ex: "19:30")
//  - onChange: (time: string) => void - apelat cand se schimba ora
//  - minuteStep: numai pentru afisare; folosim 00/15/30/45
const MINUTES = ["00", "15", "30", "45"];
const ITEM_H = 40; // inaltimea unui rand
const PAD = 80; // padding sus/jos (2 randuri goale) ca sa se centreze primul/ultimul

export default function TimeWheelPicker({ hours = [], value = "", onChange }) {
  const wheelHRef = useRef(null);
  const wheelMRef = useRef(null);
  const scrollTimerH = useRef(null);
  const scrollTimerM = useRef(null);
  // pastram valorile curente intern ca sa nu pierdem selectia la re-render
  const selH = useRef(null);
  const selM = useRef(null);

  // Initializare: pozitionam rotile pe valoarea curenta
  useEffect(() => {
    if (!hours.length) return;
    const [vh, vm] = (value || "").split(":");
    // ora: daca value e valid si exista in lista, altfel prima ora
    let hIdx = hours.indexOf(vh);
    if (hIdx < 0) hIdx = 0;
    // minute: cel mai apropiat slot de 15
    let mIdx = MINUTES.indexOf(vm);
    if (mIdx < 0) {
      const m = parseInt(vm, 10);
      mIdx = isNaN(m) ? 0 : Math.round(m / 15) % 4;
    }
    selH.current = hours[hIdx];
    selM.current = MINUTES[mIdx];

    // pozitionam scroll-ul (fara animatie la init)
    if (wheelHRef.current) wheelHRef.current.scrollTop = hIdx * ITEM_H;
    if (wheelMRef.current) wheelMRef.current.scrollTop = mIdx * ITEM_H;

    highlight(wheelHRef.current, "opt-h", hours, true);
    highlight(wheelMRef.current, "opt-m", MINUTES, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hours.length]);

  const emit = () => {
    if (selH.current && selM.current) {
      onChange?.(`${selH.current}:${selM.current}`);
    }
  };

  const highlight = (wheel, optClass, values, isHour) => {
    if (!wheel) return;
    const opts = wheel.querySelectorAll("." + optClass);
    const center = wheel.scrollTop + 100;
    let closest = 0;
    let minDist = Infinity;
    opts.forEach((opt, i) => {
      const optCenter = opt.offsetTop + ITEM_H / 2;
      const dist = Math.abs(optCenter - center);
      if (dist < minDist) {
        minDist = dist;
        closest = i;
      }
    });
    opts.forEach((opt, i) => {
      if (i === closest) {
        opt.style.color = "#c0622f";
        opt.style.fontWeight = "600";
      } else {
        opt.style.color = "#6b6050";
        opt.style.fontWeight = "400";
      }
    });
    if (isHour) selH.current = values[closest];
    else selM.current = values[closest];
    emit();
  };

  const onScrollH = () => {
    clearTimeout(scrollTimerH.current);
    scrollTimerH.current = setTimeout(
      () => highlight(wheelHRef.current, "opt-h", hours, true),
      60,
    );
  };
  const onScrollM = () => {
    clearTimeout(scrollTimerM.current);
    scrollTimerM.current = setTimeout(
      () => highlight(wheelMRef.current, "opt-m", MINUTES, false),
      60,
    );
  };

  const wheelStyle = {
    width: 80,
    height: 200,
    overflowY: "scroll",
    scrollSnapType: "y mandatory",
    scrollbarWidth: "none",
    msOverflowStyle: "none",
    position: "relative",
  };
  const optStyle = {
    height: ITEM_H,
    scrollSnapAlign: "center",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 22,
    color: "#6b6050",
    fontFamily: "'Fraunces',serif",
  };

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        justifyContent: "center",
        gap: 6,
        height: 200,
      }}
    >
      {/* Banda de selectie (centrul) */}
      <div
        style={{
          position: "absolute",
          top: 80,
          left: 8,
          right: 8,
          height: ITEM_H,
          background: "rgba(192,98,47,0.12)",
          borderTop: "1px solid rgba(192,98,47,0.4)",
          borderBottom: "1px solid rgba(192,98,47,0.4)",
          borderRadius: 8,
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      {/* Roata ore */}
      <div
        ref={wheelHRef}
        onScroll={onScrollH}
        style={wheelStyle}
        className="time-wheel"
      >
        <div style={{ height: PAD }} />
        {hours.map((h) => (
          <div key={h} className="opt-h" style={optStyle}>
            {h}
          </div>
        ))}
        <div style={{ height: PAD }} />
      </div>

      {/* Separator */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          fontSize: 24,
          color: "#c0622f",
          zIndex: 2,
          fontFamily: "'Fraunces',serif",
        }}
      >
        :
      </div>

      {/* Roata minute */}
      <div
        ref={wheelMRef}
        onScroll={onScrollM}
        style={wheelStyle}
        className="time-wheel"
      >
        <div style={{ height: PAD }} />
        {MINUTES.map((m) => (
          <div key={m} className="opt-m" style={optStyle}>
            {m}
          </div>
        ))}
        <div style={{ height: PAD }} />
      </div>

      {/* Ascundem scrollbar-ul pe webkit */}
      <style>{`
        .time-wheel::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
