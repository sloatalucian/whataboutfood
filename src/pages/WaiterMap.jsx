export function WaiterMap({
  tables,
  tableStates,
  markPaid,
  restaurantId,
  activeMapFloor,
  setActiveMapFloor,
  dbFloors,
  mapDate,
  setMapDate,
  mapReservedTables,
  mapTime,
  setMapTime,
  mapZoom,
  setMapZoom,
  restProgram,
  mapHistorySessions,
  tab,
}) {
  const getAvailableHours = () => {
    if (!mapDate || !restProgram) return [];
    const date = new Date(mapDate);
    const ZILE_MAP = [
      "Duminică",
      "Luni",
      "Marți",
      "Miercuri",
      "Joi",
      "Vineri",
      "Sâmbătă",
    ];
    const zi = ZILE_MAP[date.getDay()];
    const dayProg = restProgram[zi];
    if (!dayProg || !dayProg.deschis) {
      // Fallback ore default daca ziua e inchisa sau programul nu e setat
      const defaultSlots = [];
      for (let h = 10; h <= 21; h++) {
        defaultSlots.push(`${String(h).padStart(2, "0")}:00`);
        if (h < 21) defaultSlots.push(`${String(h).padStart(2, "0")}:30`);
      }
      return defaultSlots;
    }
    const start = dayProg.start || "10:00";
    const end = dayProg.end || "22:00";
    const [startH, startM] = start.split(":").map(Number);
    const [endH, endM] = end.split(":").map(Number);
    let lastH = endH - 1,
      lastM = endM;
    if (lastM < 0) {
      lastH--;
      lastM += 60;
    }
    const slots = [];
    let h = startH,
      m = startM;
    while (h < lastH || (h === lastH && m <= lastM)) {
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
      h++;
    }
    return slots;
  };
  const availableHours = getAvailableHours();

  return (
    <div>
      {/* Selector dată/oră */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 14,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <input
          type="date"
          value={mapDate}
          onChange={(e) => {
            setMapDate(e.target.value);
            setMapTime("");
          }}
          style={{
            flex: 1,
            background: "#1e1a14",
            border: "1px solid #2a2218",
            borderRadius: 10,
            color: "#f0ebe3",
            padding: "8px 10px",
            fontSize: 12,
            fontFamily: "inherit",
          }}
        />
        <select
          value={mapTime}
          onChange={(e) => setMapTime(e.target.value)}
          style={{
            flex: 1,
            background: "#1e1a14",
            border: "1px solid #2a2218",
            borderRadius: 10,
            color: mapTime ? "#f0ebe3" : "#6b6050",
            padding: "8px 10px",
            fontSize: 12,
            fontFamily: "inherit",
          }}
        >
          <option value="">Toate orele</option>
          {availableHours.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      {/* Legenda */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 12,
          flexWrap: "wrap",
        }}
      >
        {[
          { color: "#4a6e4a", label: "Liberă" },
          { color: "#c0622f", label: "Ocupată" },
          { color: "#c8a97e", label: "Rezervată" },
          { color: "#5b8dd9", label: "Achitată" },
        ].map((s) => (
          <div
            key={s.label}
            style={{ display: "flex", alignItems: "center", gap: 5 }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: s.color,
              }}
            />
            <span style={{ fontSize: 10, color: "#6b6050" }}>{s.label}</span>
          </div>
        ))}
      </div>
      {/* Selector etaj */}
      {dbFloors.length > 1 && (
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 14,
            flexWrap: "wrap",
          }}
        >
          {dbFloors.map((fl, i) => (
            <button
              key={fl.id}
              onClick={() => setActiveMapFloor(i)}
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                fontSize: 12,
                cursor: "pointer",
                background: activeMapFloor === i ? "#c0622f" : "#1e1a14",
                border: `1px solid ${activeMapFloor === i ? "#c0622f" : "#2a2218"}`,
                color: activeMapFloor === i ? "#fff" : "#6b6050",
              }}
            >
              {fl.name}
            </button>
          ))}
        </div>
      )}
      {/* Canvas planșeu */}
      {dbFloors.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "40px 0",
            color: "#6b6050",
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 8 }}>🏗️</div>
          <div>Planșeul nu a fost configurat</div>
        </div>
      ) : (
        <div
          style={{
            position: "relative",
            width: "100%",
            overflowX: "auto",
          }}
        >
          <div
            style={{
              position: "relative",
              width: 900 * (mapZoom / 100),
              height: 700 * (mapZoom / 100),
              minWidth: "100%",
            }}
          >
            {/* Butoane zoom */}
            <div
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                zIndex: 10,
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <button
                onClick={() => setMapZoom((z) => Math.min(z + 10, 150))}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "#1e1a14",
                  border: "1px solid #2a2218",
                  color: "#c8a97e",
                  fontSize: 18,
                  cursor: "pointer",
                }}
              >
                +
              </button>
              <button
                onClick={() => setMapZoom((z) => Math.max(z - 10, 40))}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "#1e1a14",
                  border: "1px solid #2a2218",
                  color: "#c8a97e",
                  fontSize: 18,
                  cursor: "pointer",
                }}
              >
                −
              </button>
            </div>
            <div
              style={{
                position: "relative",
                width: 900,
                height: 700,
                transform: `scale(${mapZoom / 100})`,
                transformOrigin: "top left",
              }}
            >
              {/* Elemente decorative */}
              {(dbFloors[activeMapFloor]?.elements || []).map((el) => (
                <div
                  key={el.id}
                  style={{
                    position: "absolute",
                    left: el.x,
                    top: el.y,
                    width: el.w || 60,
                    height: el.h || 60,
                    borderRadius: 10,
                    background: `${el.color || "#2a2218"}22`,
                    border: `1px solid ${el.color || "#2a2218"}44`,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 2,
                    pointerEvents: "none",
                  }}
                >
                  <span style={{ fontSize: 18 }}>{el.icon}</span>
                  <span
                    style={{
                      fontSize: 9,
                      color: el.color || "#6b6050",
                      fontWeight: 700,
                    }}
                  >
                    {el.label}
                  </span>
                </div>
              ))}
              {/* Mese */}
              {(dbFloors[activeMapFloor]?.tables || []).map((table) => {
                const today = new Date().toISOString().split("T")[0];
                const isToday = mapDate === today;
                const rtStatus = isToday
                  ? tableStates[table.label] || "free"
                  : "free";
                const isMapReserved = mapReservedTables.includes(table.label);
                // Sesiune istorica pentru aceasta masa
                const histSession = (mapHistorySessions || []).find(
                  (s) => s.table_label === table.label,
                );
                const histStatus = histSession
                  ? histSession.status === "closed" || histSession.paid_at
                    ? "paid"
                    : "occupied"
                  : null;
                const status =
                  rtStatus !== "free"
                    ? rtStatus
                    : isMapReserved
                      ? "reserved"
                      : histStatus || "free";
                const colors = {
                  free: "#4a6e4a",
                  reserved: "#c8a97e",
                  occupied: "#c0622f",
                  paid: "#5b8dd9",
                };
                const bgs = {
                  free: "rgba(74,110,74,.15)",
                  reserved: "rgba(200,169,126,.15)",
                  occupied: "rgba(192,98,47,.15)",
                  paid: "rgba(91,141,217,.15)",
                };
                const w = table.seats <= 2 ? 52 : table.seats <= 4 ? 64 : 80;
                const h = table.seats <= 2 ? 52 : table.seats <= 4 ? 64 : 52;
                return (
                  <div
                    key={table.id}
                    style={{
                      position: "absolute",
                      left: table.x,
                      top: table.y,
                      width: w,
                      height: h,
                      borderRadius: 12,
                      background: bgs[status],
                      border: `2px solid ${colors[status]}`,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 1,
                      cursor: status === "occupied" ? "pointer" : "default",
                    }}
                    onClick={() => {
                      // Masa se eliberează DOAR prin "Confirmă plata", nu din hartă
                      if (status === "occupied") markPaid(table.label);
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "'Fraunces',serif",
                        fontSize: 13,
                        fontWeight: 700,
                        color: colors[status],
                      }}
                    >
                      {table.label}
                    </div>
                    <div
                      style={{
                        fontSize: 8,
                        color: colors[status],
                        opacity: 0.7,
                      }}
                    >
                      {table.seats}p
                    </div>
                    {status === "occupied" && (
                      <div
                        style={{
                          fontSize: 7,
                          color: "#5b8dd9",
                          fontWeight: 700,
                        }}
                      >
                        → Achitat
                      </div>
                    )}
                    {status === "paid" && (
                      <div
                        style={{
                          fontSize: 7,
                          color: "#6b9e6b",
                          fontWeight: 700,
                        }}
                      >
                        → Eliberează
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
