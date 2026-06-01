function LegalModal({ title, text, onClose }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.85)",
        zIndex: 9999,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: "0 0 0 0",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#1a1510",
          border: "1px solid #2a2218",
          borderRadius: "20px 20px 0 0",
          width: "100%",
          maxWidth: 480,
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: "20px 20px 12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
            borderBottom: "1px solid #2a2218",
          }}
        >
          <div
            style={{
              fontFamily: "'Fraunces',serif",
              fontSize: 17,
              fontWeight: 900,
              color: "#f0ebe3",
            }}
          >
            {title}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#f0ebe3",
              fontSize: 22,
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px 20px 24px",
            whiteSpace: "pre-wrap",
            fontSize: 12,
            color: "rgba(240,235,227,.7)",
            lineHeight: 1.8,
            fontFamily: "'Plus Jakarta Sans',sans-serif",
          }}
        >
          {text}
        </div>
      </div>
    </div>
  );
}

// Componenta checkbox legal
function LegalCheckbox({ checked, onChange, label, linkText, onLinkClick }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        marginBottom: 12,
      }}
    >
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: 20,
          height: 20,
          borderRadius: 5,
          flexShrink: 0,
          marginTop: 1,
          border: `2px solid ${checked ? "#c0622f" : "#3a2e22"}`,
          background: checked ? "#c0622f" : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "all .2s",
        }}
      >
        {checked && (
          <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>
            ✓
          </span>
        )}
      </div>
      <div style={{ fontSize: 12, color: "#a09070", lineHeight: 1.6 }}>
        {label}{" "}
        <span
          onClick={onLinkClick}
          style={{
            color: "#c0622f",
            textDecoration: "underline",
            cursor: "pointer",
          }}
        >
          {linkText}
        </span>
      </div>
    </div>
  );
}

export { LegalModal, LegalCheckbox };
