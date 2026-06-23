// Utilitar pentru generarea orelor disponibile la rezervare, pe baza
// programului restaurantului. Folosit de client (Rezervare.jsx) si de
// ospatar (PhoneReservationModal.jsx) - sursa unica, fara duplicare.

const ZILE = [
  "Duminică",
  "Luni",
  "Marți",
  "Miercuri",
  "Joi",
  "Vineri",
  "Sâmbătă",
];

// Returneaza lista de ORE intregi disponibile (ex: ["10","11",...,"21"])
// pe baza programului pentru ziua datei alese. Ultima rezervare cu 1h
// inainte de inchidere. Daca e inchis sau fara program -> [].
export function getAvailableHours(dateStr, program) {
  if (!dateStr || program == null) return [];

  const date = new Date(dateStr);
  const zi = ZILE[date.getDay()];
  const dayProg = program[zi];

  if (!dayProg || !dayProg.deschis) return [];

  const start = dayProg.start || "10:00";
  const end = dayProg.end || "22:00";
  const [startH] = start.split(":").map(Number);
  const [endH] = end.split(":").map(Number);

  // Ultima ora la care se poate rezerva = cu 1h inainte de inchidere
  const lastH = endH - 1;

  const hours = [];
  for (let h = startH; h <= lastH; h++) {
    hours.push(String(h).padStart(2, "0"));
  }
  return hours;
}

// Pentru compatibilitate cu codul vechi care folosea sloturi "HH:MM" la 1h.
// (folosit daca undeva mai e nevoie de lista completa de sloturi orare)
export function getAvailableSlots(dateStr, program) {
  return getAvailableHours(dateStr, program).map((h) => `${h}:00`);
}
