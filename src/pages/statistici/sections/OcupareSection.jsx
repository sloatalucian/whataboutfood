import { ZILE } from "../utils";

export default function OcupareSection({
  occupancyData,
  occupancyTables,
  occupancyProgram,
  occupancyLoading,
  occupancyWeek,
  occupancyMonth,
  occupancyYear,
  setOccupancyWeek,
  setOccupancyMonth,
  setOccupancyYear,
}) {
  return (
    <div
      style={{
        background: "#111009",
        borderRadius: 16,
        padding: "16px",
        marginBottom: 16,
        border: "1px solid #1e1a14",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <div
          style={{
            fontFamily: "'Fraunces',serif",
            fontSize: 16,
            fontWeight: 700,
          }}
        >
          🪑 Ocupare mese
        </div>
        <div style={{ fontSize: 10, color: "#6b6050" }}>
          {occupancyTables.length} mese • luna curentă
        </div>
      </div>

      {/* Selector luna + an - doua dropdown-uri separate */}
      {(() => {
        const available = getAvailableMonths();
        const availableYears = [...new Set(available.map((m) => m.year))].sort(
          (a, b) => b - a,
        );
        const availableMonths = available.filter(
          (m) => m.year === occupancyYear,
        );
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
        return (
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <select
              value={occupancyMonth}
              onChange={(e) => {
                setOccupancyMonth(Number(e.target.value));
                setOccupancyWeek(1);
              }}
              style={{
                flex: 2,
                background: "#161210",
                border: "1px solid #2a2218",
                borderRadius: 10,
                padding: "8px 12px",
                color: "#f0ebe3",
                fontFamily: "inherit",
                fontSize: 13,
                outline: "none",
                cursor: "pointer",
              }}
            >
              {availableMonths.map((m) => (
                <option key={m.month} value={m.month}>
                  {LUNI[m.month]}
                </option>
              ))}
            </select>
            <select
              value={occupancyYear}
              onChange={(e) => {
                const newYear = Number(e.target.value);
                setOccupancyYear(newYear);
                // Verifica daca luna curenta e disponibila in noul an
                const monthsInYear = available
                  .filter((m) => m.year === newYear)
                  .map((m) => m.month);
                if (!monthsInYear.includes(occupancyMonth)) {
                  setOccupancyMonth(monthsInYear[0] ?? new Date().getMonth());
                }
                setOccupancyWeek(1);
              }}
              style={{
                flex: 1,
                background: "#161210",
                border: "1px solid #2a2218",
                borderRadius: 10,
                padding: "8px 12px",
                color: "#f0ebe3",
                fontFamily: "inherit",
                fontSize: 13,
                outline: "none",
                cursor: "pointer",
              }}
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        );
      })()}

      {/* Selector saptamana */}
      <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
        {[1, 2, 3, 4].map((w) => (
          <button
            key={w}
            onClick={() => setOccupancyWeek(w)}
            style={{
              flex: 1,
              padding: "5px 0",
              borderRadius: 20,
              border: "none",
              background: occupancyWeek === w ? "#c0622f" : "#161210",
              color: occupancyWeek === w ? "#fff" : "#6b6050",
              fontSize: 11,
              fontWeight: occupancyWeek === w ? 700 : 400,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Săpt. {w}
          </button>
        ))}
      </div>

      {occupancyLoading ? (
        <div
          style={{
            textAlign: "center",
            padding: "20px 0",
            color: "#6b6050",
            fontSize: 13,
          }}
        >
          Se încarcă...
        </div>
      ) : !occupancyData?.heatmap ? (
        <div
          style={{
            textAlign: "center",
            padding: "20px 0",
            color: "#6b6050",
            fontSize: 13,
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 8 }}>🪑</div>
          Nu există sesiuni în această perioadă
        </div>
      ) : (
        (() => {
          const { heatmap, hours } = occupancyData;
          const ZILE = [
            "Luni",
            "Marți",
            "Miercuri",
            "Joi",
            "Vineri",
            "Sâmbătă",
            "Duminică",
          ];
          const ZILE_SHORT = ["Lun", "Mar", "Mie", "Joi", "Vin", "Sâm", "Dum"];
          const totalTables = occupancyTables.length;

          const getCellColor = (pct) => {
            if (pct === 0)
              return {
                bg: "rgba(255,255,255,0.03)",
                color: "#3a3028",
              };
            if (pct >= 80) return { bg: "rgba(192,98,47,0.9)", color: "#fff" };
            if (pct >= 60) return { bg: "rgba(192,98,47,0.6)", color: "#fff" };
            if (pct >= 40)
              return { bg: "rgba(192,98,47,0.35)", color: "#f0ebe3" };
            if (pct >= 20)
              return { bg: "rgba(192,98,47,0.18)", color: "#c8a97e" };
            return { bg: "rgba(192,98,47,0.08)", color: "#8a7a6a" };
          };

          // Verifica daca ziua e deschisa
          const isOpen = (zi) => occupancyProgram?.[zi]?.deschis;
          const isHourOpen = (zi, h) => {
            const info = occupancyProgram?.[zi];
            if (!info?.deschis) return false;
            const startH = parseInt(info.start) || 0;
            // end "00:00" = miezul noptii = ora 24 = acopera si ora 23
            const endH = info.end === "00:00" ? 24 : parseInt(info.end) || 24;
            const hNum = parseInt(h);
            return hNum >= startH && hNum < endH;
          };
          // isOpen ramane pentru header zi

          return (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 11,
                }}
              >
                <thead>
                  <tr>
                    <th
                      style={{
                        width: 44,
                        color: "#6b6050",
                        fontWeight: 400,
                        paddingBottom: 6,
                        textAlign: "left",
                      }}
                    ></th>
                    {ZILE.map((zi, i) => (
                      <th
                        key={zi}
                        style={{
                          color: isOpen(zi) ? "#8a7a6a" : "#3a3028",
                          fontWeight: 600,
                          paddingBottom: 6,
                          textAlign: "center",
                          fontSize: 10,
                        }}
                      >
                        {ZILE_SHORT[i]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(hours || []).map((h) => (
                    <tr key={h}>
                      <td
                        style={{
                          color: "#6b6050",
                          fontSize: 10,
                          paddingRight: 6,
                          whiteSpace: "nowrap",
                          paddingBottom: 3,
                        }}
                      >
                        {h}
                      </td>
                      {ZILE.map((zi) => {
                        const cell = heatmap[zi]?.[h];
                        const hourOpen = isHourOpen(zi, h);
                        const pct =
                          cell && hourOpen && totalTables > 0
                            ? Math.round((cell.occupied / totalTables) * 100)
                            : 0;
                        const { bg, color } = getCellColor(pct);
                        return (
                          <td
                            key={zi}
                            style={{
                              paddingBottom: 3,
                              paddingLeft: 2,
                              paddingRight: 2,
                              textAlign: "center",
                            }}
                          >
                            <div
                              style={{
                                height: 22,
                                borderRadius: 4,
                                background: hourOpen
                                  ? bg
                                  : "rgba(255,255,255,0.01)",
                                color,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 9,
                                fontWeight: 600,
                              }}
                            >
                              {hourOpen && pct > 0
                                ? `${pct}%`
                                : hourOpen
                                  ? "—"
                                  : ""}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Legenda */}
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginTop: 12,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <span style={{ fontSize: 10, color: "#6b6050" }}>Ocupare:</span>
                {[
                  { bg: "rgba(192,98,47,0.08)", label: "< 20%" },
                  { bg: "rgba(192,98,47,0.35)", label: "40%" },
                  { bg: "rgba(192,98,47,0.6)", label: "60%" },
                  { bg: "rgba(192,98,47,0.9)", label: "80%+" },
                ].map((l) => (
                  <div
                    key={l.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 3,
                        background: l.bg,
                      }}
                    />
                    <span style={{ fontSize: 10, color: "#6b6050" }}>
                      {l.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()
      )}
    </div>
  );
}
