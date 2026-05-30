import { useState, useRef, useEffect } from "react";

function QrModal({ restaurant, restaurants, onRestChange, onClose }) {
  const canvasRef = useRef(null);
  const BASE_URL = "https://whataboutfood.vercel.app/r";
  const qrUrl = `${BASE_URL}/${restaurant.slug || restaurant.id}`;

  useEffect(() => {
    // Incarca qrcode lib dinamic si genereaza QR pe canvas
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
    script.onload = () => {
      if (canvasRef.current) {
        canvasRef.current.innerHTML = "";
        new window.QRCode(canvasRef.current, {
          text: qrUrl,
          width: 220,
          height: 220,
          colorDark: "#0d0a07",
          colorLight: "#f0ebe3",
          correctLevel: window.QRCode.CorrectLevel.H,
        });
      }
    };
    document.head.appendChild(script);
    return () => {
      if (document.head.contains(script)) document.head.removeChild(script);
    };
  }, [qrUrl]);

  const handleDownload = () => {
    const canvas = canvasRef.current?.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `qr-${restaurant.slug || restaurant.id}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

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
          padding: "24px 20px 28px",
          width: "100%",
          maxWidth: 360,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            width: "100%",
            marginBottom: restaurants.length > 1 ? 12 : 16,
          }}
        >
          <div
            style={{
              fontFamily: "'Fraunces',serif",
              fontSize: 17,
              fontWeight: 700,
            }}
          >
            📲 Cod QR Restaurant
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#8a7a6a",
              fontSize: 18,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {/* Selector restaurant - apare doar daca sunt mai multe */}
        {restaurants.length > 1 && (
          <div style={{ width: "100%", marginBottom: 16 }}>
            <select
              value={restaurant.id}
              onChange={(e) => {
                const rest = restaurants.find((r) => r.id === e.target.value);
                if (rest) onRestChange(rest);
              }}
              style={{
                width: "100%",
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
              {restaurants.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* QR Code */}
        <div
          style={{
            background: "#f0ebe3",
            borderRadius: 16,
            padding: 16,
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div ref={canvasRef} />
        </div>

        {/* URL */}
        <div
          style={{
            fontSize: 11,
            color: "#6b6050",
            marginBottom: 16,
            background: "#161210",
            borderRadius: 8,
            padding: "6px 12px",
            wordBreak: "break-all",
            textAlign: "center",
          }}
        >
          {qrUrl}
        </div>

        {/* Instructiuni */}
        <div
          style={{
            fontSize: 12,
            color: "#8a7a6a",
            textAlign: "center",
            marginBottom: 20,
            lineHeight: 1.6,
          }}
        >
          Clienții scanează codul QR și sunt duși direct la restaurantul tău în
          aplicație.
        </div>

        {/* Butoane */}
        <div style={{ display: "flex", gap: 10, width: "100%" }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: 12,
              border: "1px solid #2a2218",
              background: "transparent",
              color: "#8a7a6a",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Închide
          </button>
          <button
            onClick={handleDownload}
            style={{
              flex: 2,
              padding: "12px",
              borderRadius: 12,
              border: "none",
              background: "linear-gradient(135deg,#c0622f,#8b3a18)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            ⬇️ Descarcă QR
          </button>
        </div>
      </div>
    </div>
  );
}

export default QrModal;
