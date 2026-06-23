import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import FloorPicker from "../components/FloorPicker";

// Modal pentru ospatar: adauga o rezervare TELEFONICA.
// Foloseste acelasi FloorPicker ca rezervarea clientului, dar:
//  - fara lock (ospatarul confirma direct, nu concureaza cu nimeni)
//  - status "confirmed" din start
//  - source "phone", user_id null
//  - campuri extra: nume + telefon client
//
// Props:
//  - restaurantId: id-ul restaurantului
//  - onClose: () => void - inchide modalul
//  - onSaved: () => void - apelat dupa salvare reusita (refresh lista)
export default function PhoneReservationModal({
  restaurantId,
  onClose,
  onSaved,
}) {
  const today = new Date().toISOString().split("T")[0];

  const [date, setDate] = useState(today);
  const [time, setTime] = useState("");
  const [persons, setPersons] = useState(2);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [tableId, setTableId] = useState(null);
  const [tableLabel, setTableLabel] = useState(null);

  const [floors, setFloors] = useState([]);
  const [floorIdx, setFloorIdx] = useState(0);
  const [reservedTables, setReservedTables] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const floor = floors[floorIdx] || floors[0] || null;

  // Incarca floors + tables (acelasi pattern ca Rezervare.jsx)
  useEffect(() => {
    if (!restaurantId) return;
    const load = async () => {
      const { data: floorsData } = await supabase
        .from("floors")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("floor_order");
      if (!floorsData || floorsData.length === 0) return;
      const floorsWithTables = await Promise.all(
        floorsData.map(async (fl) => {
          const { data: tables } = await supabase
            .from("tables")
            .select("*")
            .eq("floor_id", fl.id);
          const { data: elements } = await supabase
            .from("floor_elements")
            .select("*")
            .eq("floor_id", fl.id);
          return { ...fl, tables: tables || [], elements: elements || [] };
        }),
      );
      setFloors(floorsWithTables);
    };
    load();
  }, [restaurantId]);

  // Incarca mesele ocupate la data + ora aleasa (acelasi RPC ca Rezervare.jsx)
  useEffect(() => {
    if (!restaurantId || !date || !time) {
      setReservedTables([]);
      return;
    }
    const loadReserved = async () => {
      const { data } = await supabase.rpc("get_reserved_tables", {
        p_restaurant_id: restaurantId,
        p_date: date,
        p_time: time,
      });
      if (data) {
        setReservedTables(data.map((r) => r.table_label).filter(Boolean));
      }
    };
    loadReserved();
  }, [restaurantId, date, time]);

  // Cand se schimba data/ora, deselectam masa (poate nu mai e libera)
  useEffect(() => {
    setTableId(null);
    setTableLabel(null);
  }, [date, time]);

  const handleSelectTable = (tid) => {
    const t = (floor?.tables || []).find((x) => x.id === tid);
    setTableId(tid);
    setTableLabel(t?.label || null);
  };

  const canSave =
    date && time && persons >= 1 && customerName.trim() && tableId && !saving;

  const handleSave = async () => {
    if (!canSave) {
      if (!time) setError("Alege ora.");
      else if (!customerName.trim()) setError("Completează numele clientului.");
      else if (!tableId) setError("Selectează o masă.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const { error: insErr } = await supabase.from("reservations").insert({
        restaurant_id: restaurantId,
        user_id: null,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim() || null,
        date,
        time,
        persons,
        table_label: tableLabel,
        status: "confirmed",
        source: "phone",
      });
      if (insErr) throw insErr;
      onSaved?.();
      onClose?.();
    } catch {
      setError("Eroare la salvare. Încearcă din nou.");
      setSaving(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.8)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: 16,
        overflowY: "auto",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#1a1510",
          border: "1px solid #2c2419",
          borderRadius: 20,
          padding: 24,
          maxWidth: 420,
          width: "100%",
          marginTop: 20,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 18,
          }}
        >
          <h2
            style={{
              fontFamily: "'Fraunces',serif",
              fontSize: 20,
              fontWeight: 700,
              color: "#f0ebe3",
              margin: 0,
            }}
          >
            📞 Rezervare telefonică
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#8a7a6a",
              fontSize: 22,
              cursor: "pointer",
              lineHeight: 1,
            }}
            aria-label="Închide"
          >
            ✕
          </button>
        </div>

        {/* Data */}
        <div className="form-group">
          <label className="form-label">Data</label>
          <input
            className="form-input"
            type="date"
            value={date}
            min={today}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        {/* Ora */}
        <div className="form-group">
          <label className="form-label">Ora</label>
          <input
            className="form-input"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>

        {/* Persoane */}
        <div className="form-group">
          <label className="form-label">Număr persoane</label>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={() => setPersons((p) => Math.max(1, p - 1))}
              style={btnStep}
              aria-label="Mai puține persoane"
            >
              −
            </button>
            <span
              style={{
                fontFamily: "'Fraunces',serif",
                fontSize: 22,
                fontWeight: 700,
                color: "#f0ebe3",
                minWidth: 32,
                textAlign: "center",
              }}
            >
              {persons}
            </span>
            <button
              onClick={() => setPersons((p) => Math.min(20, p + 1))}
              style={btnStep}
              aria-label="Mai multe persoane"
            >
              +
            </button>
          </div>
        </div>

        {/* Nume client */}
        <div className="form-group">
          <label className="form-label">Nume client</label>
          <input
            className="form-input"
            type="text"
            value={customerName}
            placeholder="ex: Andrei Popescu"
            onChange={(e) => setCustomerName(e.target.value)}
          />
        </div>

        {/* Telefon client */}
        <div className="form-group">
          <label className="form-label">Telefon client (opțional)</label>
          <input
            className="form-input"
            type="tel"
            value={customerPhone}
            placeholder="ex: 07xx xxx xxx"
            onChange={(e) => setCustomerPhone(e.target.value)}
          />
        </div>

        {/* Selectorul de etaj (daca sunt mai multe) */}
        {floors.length > 1 && (
          <div className="form-group">
            <label className="form-label">Etaj / Zonă</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {floors.map((fl, idx) => (
                <button
                  key={fl.id}
                  onClick={() => setFloorIdx(idx)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 10,
                    border: `1px solid ${idx === floorIdx ? "#c0622f" : "#2c2419"}`,
                    background:
                      idx === floorIdx ? "rgba(192,98,47,.15)" : "transparent",
                    color: idx === floorIdx ? "#c0622f" : "#8a7a6a",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  {fl.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Planseul - acelasi FloorPicker ca la client, FARA lock */}
        <label className="form-label">
          {time ? "Selectează masa" : "Alege întâi ora pentru a vedea mesele"}
        </label>
        {time && floor && (
          <FloorPicker
            floor={floor}
            reservedTables={reservedTables}
            lockedTables={{}}
            selectedTableId={tableId}
            onSelectTable={handleSelectTable}
          />
        )}

        {tableLabel && (
          <div
            style={{
              fontSize: 13,
              color: "#c0622f",
              fontWeight: 700,
              marginBottom: 12,
            }}
          >
            Masă selectată: {tableLabel}
          </div>
        )}

        {error && (
          <div
            style={{
              fontSize: 13,
              color: "#e05050",
              marginBottom: 12,
            }}
          >
            {error}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={!canSave}
          style={{
            width: "100%",
            padding: "14px",
            borderRadius: 12,
            border: "none",
            background: canSave ? "#c0622f" : "#3a2f24",
            color: canSave ? "#fff" : "#6b6050",
            fontWeight: 700,
            fontSize: 15,
            cursor: canSave ? "pointer" : "not-allowed",
            fontFamily: "'DM Sans',sans-serif",
          }}
        >
          {saving ? "Se salvează..." : "Salvează rezervarea"}
        </button>
      </div>
    </div>
  );
}

const btnStep = {
  width: 40,
  height: 40,
  borderRadius: 10,
  border: "1px solid #2c2419",
  background: "transparent",
  color: "#c0622f",
  fontSize: 22,
  fontWeight: 700,
  cursor: "pointer",
  lineHeight: 1,
};
