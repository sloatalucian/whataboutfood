import { useState } from "react";

function MiniDatePicker({ value, onChange }) {
  const selDate = value ? new Date(value + "T12:00:00") : new Date();
  const [pm, setPm] = useState(selDate.getMonth());
  const [py, setPy] = useState(selDate.getFullYear());
  const firstDay = new Date(py, pm, 1);
  const daysInMonth = new Date(py, pm + 1, 0).getDate();
  const startOffset = (firstDay.getDay() + 6) % 7;
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const LUNI = [
    "Ianuarie",
    "Februarie",
    "Martie",
    "Aprilie",
    "Mai",
    "Iunie",
    "Iulie",
    "August",
    "Septembrie",
    "Octombrie",
    "Noiembrie",
    "Decembrie",
  ];
  const getStr = (d) =>
    `${py}-${String(pm + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  return (
    <div
      style={{
        background: "#161210",
        border: "1px solid #2a2218",
        borderRadius: 12,
        padding: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <button
          onClick={() => {
            if (pm === 0) {
              setPm(11);
              setPy((y) => y - 1);
            } else setPm((m) => m - 1);
          }}
          style={{
            background: "none",
            border: "none",
            color: "#8a7a6a",
            fontSize: 18,
            cursor: "pointer",
            padding: "0 6px",
          }}
        >
          ‹
        </button>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#f0ebe3" }}>
          {LUNI[pm]} {py}
        </span>
        <button
          onClick={() => {
            if (pm === 11) {
              setPm(0);
              setPy((y) => y + 1);
            } else setPm((m) => m + 1);
          }}
          style={{
            background: "none",
            border: "none",
            color: "#8a7a6a",
            fontSize: 18,
            cursor: "pointer",
            padding: "0 6px",
          }}
        >
          ›
        </button>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7,1fr)",
          gap: 2,
          marginBottom: 4,
        }}
      >
        {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
          <div
            key={i}
            style={{
              textAlign: "center",
              fontSize: 9,
              color: "#6b6050",
              padding: "2px 0",
            }}
          >
            {d}
          </div>
        ))}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7,1fr)",
          gap: 2,
        }}
      >
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const str = getStr(d);
          const isSelected = value === str;
          const isToday = str === new Date().toISOString().split("T")[0];
          return (
            <div
              key={i}
              onClick={() => onChange(str)}
              style={{
                aspectRatio: "1",
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                cursor: "pointer",
                background: isSelected
                  ? "#c0622f"
                  : isToday
                    ? "rgba(192,98,47,0.15)"
                    : "transparent",
                color: isSelected ? "#fff" : isToday ? "#c0622f" : "#f0ebe3",
                fontWeight: isSelected || isToday ? 700 : 400,
                border:
                  isToday && !isSelected
                    ? "1px solid rgba(192,98,47,0.3)"
                    : "1px solid transparent",
              }}
            >
              {d}
            </div>
          );
        })}
      </div>
      {value && (
        <div
          style={{
            textAlign: "center",
            fontSize: 11,
            color: "#c0622f",
            marginTop: 8,
            fontWeight: 600,
          }}
        >
          ✅ {value.split("-").reverse().join(".")}
        </div>
      )}
    </div>
  );
}

export default MiniDatePicker;
