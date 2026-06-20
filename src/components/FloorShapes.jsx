// ─────────────────────────────────────────────────────────────────────────────
//  FloorShapes.jsx
//  Componente vizuale comune pentru planseu (Directia A: flat colorat, vedere de
//  sus, blat lemn + scaune + umbra proprie). Folosite in TOATE planseele:
//  FloorEditor (proprietar), SelectTable (client), Restaurant (client),
//  WaiterMap (ospatar). Astfel un singur loc defineste aspectul, fara duplicare.
//
//  IMPORTANT (frontend only):
//   - Nu se ocupa de date, pozitionare, salvare sau logica de status. Primeste
//     doar `seats` / `type` ca sa stie CE sa deseneze.
//   - Culoarea de STATUS a mesei (free/occupied/reserved/paid) ramane controlata
//     de containerul parinte (border + fundal), EXACT ca pana acum. TableShape
//     aplica doar un voal subtil de culoare peste blat cand statusul nu e "free",
//     ca masa sa-si schimbe vizibil tonul, fara a inlocui semnalul din chenar.
// ─────────────────────────────────────────────────────────────────────────────

// Id-uri unice de gradient/pattern per instanta, ca sa nu se ciocneasca cand sunt
// multe forme pe acelasi ecran (mai multe <defs> cu acelasi id strica randarea).
let __shapeUid = 0;
const nextUid = () => `fs${++__shapeUid}`;

// ─── MASA ────────────────────────────────────────────────────────────────────
// seats: numarul de locuri (2..16+). statusColor: culoarea de status pentru voal.
// Masa rotunda pentru 2p, dreptunghiulara (cu colturi rotunjite) pentru rest.
// Scaunele sunt desenate in jurul blatului, numarul lor crescand cu capacitatea.
export function TableShape({ seats = 4, statusColor = null }) {
  const uid = nextUid();
  const woodId = `${uid}_wood`;
  const grainId = `${uid}_grain`;

  // Numarul de scaune pe fiecare latura, derivat din capacitate.
  // Pentru masa rotunda (2p) tratam separat.
  const isRound = seats <= 2;

  // viewBox-ul si geometria se aleg in functie de capacitate, ca forma sa fie
  // proportionala (mese mari = mai late). Coordonate intr-un sistem 0..VBW x 0..VBH.
  let config;
  if (isRound) {
    config = { vbw: 58, vbh: 58, top: 0, bottom: 0, sides: 0, round: true };
  } else if (seats <= 4) {
    config = { vbw: 72, vbh: 72, top: 1, bottom: 1, sides: 1 };
  } else if (seats <= 6) {
    config = { vbw: 96, vbh: 72, top: 2, bottom: 2, sides: 1 };
  } else if (seats <= 8) {
    config = { vbw: 112, vbh: 76, top: 3, bottom: 3, sides: 1 };
  } else if (seats <= 12) {
    config = { vbw: 140, vbh: 80, top: 5, bottom: 5, sides: 1 };
  } else {
    config = { vbw: 172, vbh: 84, top: 6, bottom: 6, sides: 1 };
  }

  const { vbw, vbh } = config;

  // Dimensiunile scaunelor.
  const chairLong = 16; // latura de-a lungul mesei
  const chairShort = 11; // adancimea scaunului
  const chairGap = 2; // distanta scaun-blat

  // Blatul: lasam o rama in jur pentru scaune.
  const margin = 16;
  const topY = margin;
  const botY = vbh - margin;
  const leftX = margin;
  const rightX = vbw - margin;
  const tableW = rightX - leftX;
  const tableH = botY - topY;

  // Genereaza pozitiile scaunelor pe o latura orizontala (top/bottom).
  const horizChairs = (count, y, isTop) => {
    if (count <= 0) return [];
    const items = [];
    const span = tableW;
    const step = span / count;
    for (let i = 0; i < count; i++) {
      const cx = leftX + step * (i + 0.5);
      const x = cx - chairLong / 2;
      const cy = isTop ? topY - chairGap - chairShort : botY + chairGap;
      items.push(
        <rect
          key={`${isTop ? "t" : "b"}${i}`}
          x={x}
          y={cy}
          width={chairLong}
          height={chairShort}
          rx={4}
          fill={`url(#${uid}_chair)`}
        />,
      );
    }
    return items;
  };

  // Scaune pe lateralele verticale (stanga/dreapta).
  const vertChairs = (count) => {
    if (count <= 0) return [];
    const items = [];
    const span = tableH;
    const step = span / count;
    for (let i = 0; i < count; i++) {
      const cy = topY + step * (i + 0.5);
      const y = cy - chairLong / 2;
      items.push(
        <rect
          key={`l${i}`}
          x={leftX - chairGap - chairShort}
          y={y}
          width={chairShort}
          height={chairLong}
          rx={4}
          fill={`url(#${uid}_chair)`}
        />,
      );
      items.push(
        <rect
          key={`r${i}`}
          x={rightX + chairGap}
          y={y}
          width={chairShort}
          height={chairLong}
          rx={4}
          fill={`url(#${uid}_chair)`}
        />,
      );
    }
    return items;
  };

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${vbw} ${vbh}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ display: "block", overflow: "visible" }}
    >
      <defs>
        <linearGradient id={woodId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d9b483" />
          <stop offset="0.5" stopColor="#bd9059" />
          <stop offset="1" stopColor="#9c7444" />
        </linearGradient>
        <linearGradient id={`${uid}_chair`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4a4036" />
          <stop offset="1" stopColor="#2e271f" />
        </linearGradient>
        <pattern
          id={grainId}
          patternUnits="userSpaceOnUse"
          width="7"
          height="7"
          patternTransform="rotate(22)"
        >
          <rect width="7" height="7" fill={`url(#${woodId})`} />
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="7"
            stroke="#7a5226"
            strokeWidth="0.5"
            opacity="0.4"
          />
          <line
            x1="3.5"
            y1="0"
            x2="3.5"
            y2="7"
            stroke="#7a5226"
            strokeWidth="0.3"
            opacity="0.25"
          />
        </pattern>
        <filter id={`${uid}_sh`} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow
            dx="0"
            dy="2"
            stdDeviation="2"
            floodColor="#000"
            floodOpacity="0.45"
          />
        </filter>
      </defs>

      <g filter={`url(#${uid}_sh)`}>
        {/* Scaune */}
        {isRound ? (
          <>
            <rect
              x={vbw / 2 - chairLong / 2}
              y={2}
              width={chairLong}
              height={chairShort}
              rx={4}
              fill={`url(#${uid}_chair)`}
            />
            <rect
              x={vbw / 2 - chairLong / 2}
              y={vbh - 2 - chairShort}
              width={chairLong}
              height={chairShort}
              rx={4}
              fill={`url(#${uid}_chair)`}
            />
          </>
        ) : (
          <>
            {horizChairs(config.top, topY, true)}
            {horizChairs(config.bottom, botY, false)}
            {vertChairs(config.sides)}
          </>
        )}

        {/* Blatul */}
        {isRound ? (
          <>
            <circle
              cx={vbw / 2}
              cy={vbh / 2}
              r={tableW / 2}
              fill={`url(#${grainId})`}
              stroke="#6b4e2a"
              strokeWidth="1.5"
            />
            <circle
              cx={vbw / 2}
              cy={vbh / 2}
              r={tableW / 2 - 4}
              fill="none"
              stroke="#00000022"
              strokeWidth="1"
            />
            {statusColor && (
              <circle
                cx={vbw / 2}
                cy={vbh / 2}
                r={tableW / 2}
                fill={statusColor}
                opacity="0.28"
              />
            )}
          </>
        ) : (
          <>
            <rect
              x={leftX}
              y={topY}
              width={tableW}
              height={tableH}
              rx={6}
              fill={`url(#${grainId})`}
              stroke="#6b4e2a"
              strokeWidth="1.5"
            />
            <rect
              x={leftX + 6}
              y={topY + 6}
              width={tableW - 12}
              height={tableH - 12}
              rx={3}
              fill="none"
              stroke="#00000022"
              strokeWidth="1"
            />
            {statusColor && (
              <rect
                x={leftX}
                y={topY}
                width={tableW}
                height={tableH}
                rx={6}
                fill={statusColor}
                opacity="0.28"
              />
            )}
          </>
        )}
      </g>
    </svg>
  );
}

// ─── ELEMENTE FIXE ───────────────────────────────────────────────────────────
// Fiecare element fix e desenat ca o "scena" compusa, stroke colorat pe categorie.
// `type` vine din date (entrance, bar, kitchen, wc_f, wc_m, stairs, reception).
// `color` e culoarea categoriei (din date), folosita pentru accente.

function FixedSvg({ children, vbw, vbh }) {
  const uid = nextUid();
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${vbw} ${vbh}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ display: "block", overflow: "visible" }}
    >
      <defs>
        <filter id={`${uid}_sh`} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow
            dx="0"
            dy="2"
            stdDeviation="2"
            floodColor="#000"
            floodOpacity="0.45"
          />
        </filter>
      </defs>
      <g filter={`url(#${uid}_sh)`}>{children}</g>
    </svg>
  );
}

function Entrance({ color }) {
  return (
    <FixedSvg vbw={62} vbh={62}>
      <rect
        x="6"
        y="6"
        width="50"
        height="50"
        rx="6"
        fill="#2a2218"
        stroke={color}
        strokeWidth="2"
      />
      {/* arcul de deschidere a usii */}
      <path
        d="M14 56 A42 42 0 0 1 56 14"
        fill="none"
        stroke={color}
        strokeWidth="1.4"
        strokeDasharray="3 3"
        opacity="0.6"
      />
      {/* canatul usii */}
      <rect x="12" y="12" width="6" height="44" rx="2" fill={color} />
    </FixedSvg>
  );
}

function Bar({ color }) {
  const accent = "#e8a87e";
  return (
    <FixedSvg vbw={120} vbh={62}>
      {/* tejgheaua */}
      <rect
        x="2"
        y="2"
        width="116"
        height="32"
        rx="5"
        fill="#2a2218"
        stroke={color}
        strokeWidth="2"
      />
      <rect x="2" y="2" width="116" height="12" rx="5" fill={`${color}33`} />
      {/* pahare/sticla pe tejghea */}
      <circle
        cx="84"
        cy="18"
        r="4"
        fill="none"
        stroke={accent}
        strokeWidth="1.4"
      />
      <circle
        cx="96"
        cy="18"
        r="4"
        fill="none"
        stroke={accent}
        strokeWidth="1.4"
      />
      <rect x="104" y="11" width="4" height="14" rx="1" fill={accent} />
      {/* taburete de bar */}
      <circle
        cx="18"
        cy="48"
        r="7"
        fill="#33291f"
        stroke={accent}
        strokeWidth="1.5"
      />
      <circle
        cx="40"
        cy="48"
        r="7"
        fill="#33291f"
        stroke={accent}
        strokeWidth="1.5"
      />
      <circle
        cx="62"
        cy="48"
        r="7"
        fill="#33291f"
        stroke={accent}
        strokeWidth="1.5"
      />
      <circle
        cx="84"
        cy="48"
        r="7"
        fill="#33291f"
        stroke={accent}
        strokeWidth="1.5"
      />
    </FixedSvg>
  );
}

function Kitchen({ color }) {
  const accent = "#e8a87e";
  return (
    <FixedSvg vbw={150} vbh={62}>
      {/* blatul lung */}
      <rect
        x="2"
        y="2"
        width="146"
        height="58"
        rx="5"
        fill="#2a2218"
        stroke={color}
        strokeWidth="2"
      />
      {/* impartirea in module */}
      <line
        x1="40"
        y1="2"
        x2="40"
        y2="60"
        stroke={`${color}55`}
        strokeWidth="1.5"
      />
      <line
        x1="96"
        y1="2"
        x2="96"
        y2="60"
        stroke={`${color}55`}
        strokeWidth="1.5"
      />
      {/* frigider (manerul) */}
      <rect x="8" y="14" width="26" height="6" rx="2" fill="#9a8a6a" />
      {/* chiuveta cu robinet */}
      <rect
        x="50"
        y="12"
        width="36"
        height="38"
        rx="3"
        fill="#33291f"
        stroke={accent}
        strokeWidth="1.4"
      />
      <ellipse
        cx="68"
        cy="31"
        rx="11"
        ry="9"
        fill="#1c1610"
        stroke={accent}
        strokeWidth="1.2"
      />
      <line x1="68" y1="13" x2="68" y2="22" stroke={accent} strokeWidth="1.6" />
      <line x1="62" y1="13" x2="74" y2="13" stroke={accent} strokeWidth="1.6" />
      {/* plita cu 4 ochiuri */}
      <circle
        cx="112"
        cy="18"
        r="6.5"
        fill="none"
        stroke={accent}
        strokeWidth="1.3"
      />
      <circle cx="112" cy="18" r="2.4" fill={accent} />
      <circle
        cx="132"
        cy="18"
        r="6.5"
        fill="none"
        stroke={accent}
        strokeWidth="1.3"
      />
      <circle cx="132" cy="18" r="2.4" fill={accent} />
      <circle
        cx="112"
        cy="42"
        r="6.5"
        fill="none"
        stroke={accent}
        strokeWidth="1.3"
      />
      <circle cx="112" cy="42" r="2.4" fill={accent} />
      <circle
        cx="132"
        cy="42"
        r="6.5"
        fill="none"
        stroke={accent}
        strokeWidth="1.3"
      />
      <circle cx="132" cy="42" r="2.4" fill={accent} />
    </FixedSvg>
  );
}

// Toaletele folosesc pictogramele originale ale aplicatiei (emoji 🚺 / 🚹),
// randate prin EmojiShape (vezi mai jos).

function Stairs({ color }) {
  return (
    <FixedSvg vbw={62} vbh={62}>
      <rect
        x="6"
        y="6"
        width="50"
        height="50"
        rx="6"
        fill="#2a2620"
        stroke={color}
        strokeWidth="2"
      />
      {/* trepte */}
      <rect x="12" y="11" width="38" height="7" rx="1.5" fill="#3a352c" />
      <rect x="12" y="20" width="38" height="7" rx="1.5" fill="#352f27" />
      <rect x="12" y="29" width="38" height="7" rx="1.5" fill="#302a22" />
      <rect x="12" y="38" width="38" height="7" rx="1.5" fill="#2b261f" />
      <rect x="12" y="47" width="38" height="6" rx="1.5" fill="#26211b" />
      {/* sageata directie urcare */}
      <path d="M44 14 L50 22 L38 22 Z" fill={color} />
      <line x1="44" y1="22" x2="44" y2="50" stroke={color} strokeWidth="1.5" />
    </FixedSvg>
  );
}

function Reception({ color }) {
  return (
    <FixedSvg vbw={100} vbh={62}>
      {/* tejgheaua curbata */}
      <path
        d="M6 40 v-6 a6 6 0 0 1 6 -6 h76 a6 6 0 0 1 6 6 v6 a4 4 0 0 1 -4 4 h-80 a4 4 0 0 1 -4 -4 z"
        fill="#2e2630"
        stroke={color}
        strokeWidth="2"
      />
      <rect x="20" y="32" width="60" height="6" rx="2" fill={`${color}33`} />
      {/* persoana la receptie */}
      <circle
        cx="50"
        cy="18"
        r="8"
        fill="#2e2630"
        stroke={color}
        strokeWidth="1.6"
      />
      <path d="M44 21 q6 4 12 0" fill="none" stroke={color} strokeWidth="1.3" />
      {/* clopotel */}
      <circle cx="50" cy="50" r="3" fill={color} />
    </FixedSvg>
  );
}

// Afiseaza un emoji centrat, scalat sa umple zona ca celelalte forme.
// Folosit pentru elementele unde se prefera pictograma originala a aplicatiei
// (ex. toaletele 🚺 🚹), nu un SVG desenat.
function EmojiShape({ emoji }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "clamp(18px, 60%, 30px)",
        lineHeight: 1,
      }}
    >
      <span style={{ fontSize: "min(2.2em, 30px)" }}>{emoji}</span>
    </div>
  );
}

export function FixedShape({ type, color = "#6b6050" }) {
  switch (type) {
    case "entrance":
      return <Entrance color={color} />;
    case "bar":
      return <Bar color={color} />;
    case "kitchen":
      return <Kitchen color={color} />;
    case "wc_f":
      return <EmojiShape emoji="🚺" />;
    case "wc_m":
      return <EmojiShape emoji="🚹" />;
    case "stairs":
      return <Stairs color="#a89c8a" />;
    case "reception":
      return <Reception color="#c9a3c8" />;
    default:
      // Fallback pentru type necunoscut: un patrat simplu cu culoarea elementului.
      return (
        <FixedSvg vbw={60} vbh={60}>
          <rect
            x="6"
            y="6"
            width="48"
            height="48"
            rx="6"
            fill="#2a2218"
            stroke={color}
            strokeWidth="2"
          />
        </FixedSvg>
      );
  }
}
