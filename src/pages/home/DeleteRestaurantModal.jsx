// Modal de confirmare pentru stergerea (soft) a unui restaurant.
// Stergerea marcheaza restaurantul ca is_deleted; datele raman 90 zile.
// Props:
//  - restaurant: obiectul de sters (folosim .name si .id)
//  - onConfirm(restaurantId): apelat la confirmare
//  - onClose(): inchide modalul fara actiune
export default function DeleteRestaurantModal({
  restaurant,
  onConfirm,
  onClose,
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#1a1510",
          borderRadius: 20,
          padding: "28px 24px",
          maxWidth: 380,
          width: "100%",
          border: "1px solid #2c2419",
          boxShadow: "0 20px 60px rgba(0,0,0,.5)",
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: "rgba(208,85,69,.14)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 26,
            margin: "0 auto 18px",
          }}
        >
          🗑️
        </div>

        <h2
          style={{
            fontFamily: "'Fraunces',serif",
            fontWeight: 600,
            fontSize: 20,
            color: "#f0ebe3",
            textAlign: "center",
            margin: "0 0 10px",
          }}
        >
          Ștergi „{restaurant?.name || "acest restaurant"}"?
        </h2>

        <p
          style={{
            fontSize: 13.5,
            color: "#a09080",
            textAlign: "center",
            lineHeight: 1.6,
            margin: "0 0 22px",
          }}
        >
          Restaurantul nu va mai fi vizibil pentru clienți. Datele (rezervări,
          comenzi, statistici) se păstrează 90 de zile, apoi se șterg definitiv.
        </p>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              background: "transparent",
              color: "#c8a97e",
              border: "1px solid #2c2419",
              borderRadius: 12,
              padding: "13px 0",
              fontSize: 14.5,
              fontWeight: 600,
              fontFamily: "'DM Sans',sans-serif",
              cursor: "pointer",
            }}
          >
            Anulează
          </button>
          <button
            onClick={() => onConfirm(restaurant?.id)}
            style={{
              flex: 1,
              background: "linear-gradient(135deg,#d05545,#a23527)",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              padding: "13px 0",
              fontSize: 14.5,
              fontWeight: 700,
              fontFamily: "'DM Sans',sans-serif",
              cursor: "pointer",
            }}
          >
            Șterge restaurantul
          </button>
        </div>
      </div>
    </div>
  );
}
