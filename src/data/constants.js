// ─── PLANS ───────────────────────────────────────────────────────────────────
export const PLANS = {
  free:     { label: "Gratuit",  color: "plan-free" },
  pro:      { label: "Pro",      color: "plan-pro" },
  business: { label: "Business", color: "plan-business" },
};

// ─── TIME SLOTS ──────────────────────────────────────────────────────────────
export const TIME_SLOTS = [
  "12:00","12:30","13:00","13:30","14:00","14:30",
  "18:00","18:30","19:00","19:30","20:00","20:30","21:00",
];

// ─── PLAN FEATURES (what each plan unlocks) ──────────────────────────────────
export const PLAN_FEATURES = {
  free: {
    maxTables:      8,
    maxFloors:      1,
    maxMenuItems:   10,
    maxReservations:50,
    orders:         false,
    waiter:         false,
    editorAdvanced: false,
    stats:          false,
  },
  pro: {
    maxTables:      999,
    maxFloors:      3,
    maxMenuItems:   999,
    maxReservations:999,
    orders:         true,
    waiter:         true,
    editorAdvanced: true,
    stats:          true,
  },
  business: {
    maxTables:      999,
    maxFloors:      999,
    maxMenuItems:   999,
    maxReservations:999,
    orders:         true,
    waiter:         true,
    editorAdvanced: true,
    stats:          true,
    customDomain:   true,
    branding:       true,
  },
};

// ─── HELPER ──────────────────────────────────────────────────────────────────
export const tableClass = (seats) =>
  seats >= 8 ? "s8" : seats <= 2 ? "s2" : "s4";
