import { TableShape, FixedShape } from "./FloorShapes";

// Planseul de selectie a mesei, extras din Rezervare.jsx ca sa fie refolosit
// si de ospatar (rezervare telefonica). Componenta e PUR vizuala:
//  - primeste etajul + starea meselor + ce sa faca la tap, prin props
//  - NU stie nimic despre lock, resForm sau rezervari (logica ramane in parinte)
//
// Props:
//  - floor: { name, tables[], elements[] } - etajul curent
//  - reservedTables: string[] - label-urile meselor rezervate (rosu, blocate)
//  - lockedTables: { [tableId]: locked_until } - mese blocate temporar (maro + 🔒)
//                  pentru client; pentru ospatar se paseaza {} (fara lock)
//  - selectedTableId: id-ul mesei selectate curent (terra)
//  - onSelectTable: (tableId) => void - apelat la tap pe o masa libera
//                   client: face set + lock; ospatar: doar set (fara lock)
export default function FloorPicker({
  floor,
  reservedTables = [],
  lockedTables = {},
  selectedTableId = null,
  onSelectTable,
}) {
  const allTables = floor?.tables || [];
  const allElements = floor?.elements || [];
  const allItems = [
    ...allTables.map((t) => ({ x: t.x + 80, y: t.y + 80 })),
    ...allElements.map((e) => ({
      x: e.x + (e.w || 60),
      y: e.y + (e.h || 60),
    })),
  ];
  const maxX = Math.max(300, ...allItems.map((i) => i.x));
  const maxY = Math.max(200, ...allItems.map((i) => i.y));
  const containerH = 320;
  const containerW = 340;
  const autoZoom = Math.min(containerW / maxX, containerH / maxY, 1) * 0.92;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: containerH,
        background: "#0d0a07",
        borderRadius: 16,
        border: "1px solid #2a2218",
        overflow: "hidden",
        marginBottom: 16,
      }}
    >
      <div
        style={{
          position: "absolute",
          fontSize: 9,
          top: 6,
          left: 8,
          color: "#6b6050",
          letterSpacing: 1,
          textTransform: "uppercase",
        }}
      >
        {floor?.name}
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `scale(${autoZoom})`,
          transformOrigin: "top left",
          width: maxX / autoZoom,
          height: maxY / autoZoom,
        }}
      >
        {/* Elemente decorative */}
        {allElements.map((el) => (
          <div
            key={el.id}
            style={{
              position: "absolute",
              left: el.x,
              top: el.y,
              width: el.w || 60,
              height: el.h || 60,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              pointerEvents: "none",
              transform: el.rotation ? `rotate(${el.rotation}deg)` : "none",
            }}
          >
            <div style={{ width: "100%", flex: 1, minHeight: 0 }}>
              <FixedShape type={el.type} color={el.color} />
            </div>
            <span
              style={{
                fontSize: 8,
                color: el.color || "#6b6050",
                fontWeight: 700,
                whiteSpace: "nowrap",
              }}
            >
              {el.label}
            </span>
          </div>
        ))}
        {/* Mese */}
        {allTables.map((t) => {
          const isTaken = reservedTables.includes(t.label);
          const isSel = selectedTableId === t.id;
          const isLocked = !isSel && !!lockedTables[t.id];
          const isDisabled = isTaken || isLocked;
          const statusCol = isSel
            ? "#c0622f"
            : isTaken
              ? "#e05050"
              : isLocked
                ? "#a0785a"
                : "#4a6e4a";
          const w = t.seats <= 2 ? 56 : t.seats <= 4 ? 70 : 90;
          const h = t.seats <= 2 ? 56 : t.seats <= 4 ? 70 : 64;
          return (
            <div
              key={t.id}
              onClick={() => {
                if (isDisabled) return;
                onSelectTable(t.id);
              }}
              style={{
                position: "absolute",
                left: t.x,
                top: t.y,
                width: w,
                height: h,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                cursor: isDisabled ? "not-allowed" : "pointer",
                transform: `rotate(${t.rotation || 0}deg) scale(${isSel ? 1.08 : 1})`,
                transition: "transform .15s",
                filter: isSel
                  ? "drop-shadow(0 0 5px rgba(192,98,47,.6))"
                  : "none",
              }}
            >
              <div
                style={{
                  width: "100%",
                  flex: 1,
                  minHeight: 0,
                  position: "relative",
                  pointerEvents: "none",
                }}
              >
                <TableShape
                  seats={t.seats}
                  statusColor={isSel || isDisabled ? statusCol : null}
                />
                {isLocked && (
                  <span
                    style={{
                      position: "absolute",
                      top: 0,
                      right: 2,
                      fontSize: 10,
                    }}
                  >
                    🔒
                  </span>
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 4,
                  lineHeight: 1,
                  marginTop: 1,
                  pointerEvents: "none",
                }}
              >
                <span
                  style={{
                    fontFamily: "'Fraunces',serif",
                    fontSize: 12,
                    fontWeight: 700,
                    color: statusCol,
                  }}
                >
                  {t.label}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: statusCol,
                    opacity: 0.8,
                  }}
                >
                  {t.seats}p
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
