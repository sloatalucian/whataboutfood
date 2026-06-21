import React from "react";
import ReactDOM from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App";

Sentry.init({
  dsn: "https://c876983ef8aaad3a4d588e2877330d0e@o4511339075993600.ingest.de.sentry.io/4511339083071568",
  sendDefaultPii: false,
  environment: process.env.NODE_ENV || "production",
  beforeSend(event) {
    if (process.env.NODE_ENV === "development") return null;
    return event;
  },
});

// Ecranul afisat daca aplicatia intampina o eroare neasteptata care altfel ar
// duce la ecran alb. Mesaj prietenos in romana + buton de reincarcare.
function ErrorFallback() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "24px",
        background: "#120d09",
        color: "#f0ebe3",
        fontFamily: "'DM Sans',sans-serif",
      }}
    >
      <div style={{ fontSize: 44, marginBottom: 20 }}>🍽️</div>
      <h1
        style={{
          fontFamily: "'Fraunces',serif",
          fontWeight: 600,
          fontSize: 24,
          margin: "0 0 10px",
        }}
      >
        Ceva n-a mers cum trebuia
      </h1>
      <p
        style={{
          fontSize: 14,
          color: "#a09080",
          maxWidth: 340,
          lineHeight: 1.6,
          margin: "0 0 24px",
        }}
      >
        A apărut o eroare neașteptată. Echipa a fost notificată automat.
        Reîncarcă aplicația pentru a continua.
      </p>
      <button
        onClick={() => window.location.reload()}
        style={{
          background: "linear-gradient(135deg,#c0622f,#8b3a18)",
          color: "#fff",
          border: "none",
          borderRadius: 12,
          padding: "13px 28px",
          fontSize: 15,
          fontWeight: 700,
          fontFamily: "'DM Sans',sans-serif",
          cursor: "pointer",
          boxShadow: "0 6px 20px rgba(192,98,47,.3)",
        }}
      >
        Reîncarcă aplicația
      </button>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
    <App />
  </Sentry.ErrorBoundary>,
);
