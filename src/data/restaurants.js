// ─── RESTAURANTS ─────────────────────────────────────────────────────────────
// În producție, această listă vine din Supabase.
// Acum e hardcodată pentru demo — zero request-uri la server.

export const RESTAURANTS = [
  {
    id: 1,
    name: "Mama Mia",
    type: "Ristorante Italian",
    emoji: "🍝",
    address: "Str. Floreasca 42, București",
    rating: 4.9,
    reviews: 312,
    tags: ["Italian", "Pizza", "Paste"],
    plan: "pro",
    cover: "linear-gradient(135deg,#2d1507,#1a0e05)",
    hours: "12:00 — 23:00",
    slug: "mama-mia",
    floors: [
      {
        id: 1,
        name: "Parter",
        tables: [
          { id: 1,  x: 50,  y: 50,  seats: 4, label: "T1" },
          { id: 2,  x: 170, y: 50,  seats: 4, label: "T2" },
          { id: 3,  x: 290, y: 50,  seats: 2, label: "T3" },
          { id: 4,  x: 50,  y: 170, seats: 8, label: "T4" },
          { id: 5,  x: 210, y: 170, seats: 8, label: "T5" },
          { id: 6,  x: 50,  y: 300, seats: 4, label: "T6" },
          { id: 7,  x: 180, y: 300, seats: 4, label: "T7" },
          { id: 8,  x: 310, y: 300, seats: 2, label: "T8" },
        ],
      },
      {
        id: 2,
        name: "Etaj 1 — Terasă",
        tables: [
          { id: 9,  x: 70,  y: 70,  seats: 4, label: "E1" },
          { id: 10, x: 240, y: 70,  seats: 4, label: "E2" },
          { id: 11, x: 70,  y: 220, seats: 8, label: "E3" },
          { id: 12, x: 260, y: 230, seats: 4, label: "E4" },
        ],
      },
    ],
  },
  {
    id: 2,
    name: "Sushi Zen",
    type: "Japonez",
    emoji: "🍣",
    address: "Calea Victoriei 88, București",
    rating: 4.7,
    reviews: 198,
    tags: ["Japonez", "Sushi", "Ramen"],
    plan: "free",
    cover: "linear-gradient(135deg,#0a1520,#051020)",
    hours: "11:00 — 22:30",
    slug: "sushi-zen",
    floors: [
      {
        id: 1,
        name: "Parter",
        tables: [
          { id: 1, x: 60,  y: 60,  seats: 4, label: "T1" },
          { id: 2, x: 200, y: 60,  seats: 4, label: "T2" },
          { id: 3, x: 60,  y: 200, seats: 4, label: "T3" },
          { id: 4, x: 200, y: 200, seats: 4, label: "T4" },
        ],
      },
    ],
  },
  {
    id: 3,
    name: "Verde Bistro",
    type: "Bio & Healthy",
    emoji: "🥗",
    address: "Str. Aviatorilor 15, București",
    rating: 4.8,
    reviews: 145,
    tags: ["Bio", "Vegan", "Healthy"],
    plan: "business",
    cover: "linear-gradient(135deg,#0d1a0d,#051005)",
    hours: "08:00 — 22:00",
    slug: "verde-bistro",
    floors: [
      {
        id: 1,
        name: "Interior",
        tables: [
          { id: 1, x: 50,  y: 50,  seats: 2, label: "B1" },
          { id: 2, x: 160, y: 50,  seats: 4, label: "B2" },
          { id: 3, x: 290, y: 50,  seats: 4, label: "B3" },
          { id: 4, x: 50,  y: 180, seats: 4, label: "B4" },
          { id: 5, x: 200, y: 180, seats: 8, label: "B5" },
        ],
      },
      {
        id: 2,
        name: "Grădină",
        tables: [
          { id: 6,  x: 60,  y: 60,  seats: 4, label: "G1" },
          { id: 7,  x: 200, y: 60,  seats: 4, label: "G2" },
          { id: 8,  x: 60,  y: 200, seats: 2, label: "G3" },
          { id: 9,  x: 200, y: 200, seats: 4, label: "G4" },
          { id: 10, x: 310, y: 130, seats: 8, label: "G5" },
        ],
      },
    ],
  },
];
