import React from "react";
import ReactDOM from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App";

Sentry.init({
  dsn: "https://c876983ef8aaad3a4d588e2877330d0e@o4511339075993600.ingest.de.sentry.io/4511339083071568",
  sendDefaultPii: false,
  environment: process.env.NODE_ENV || "production",
  beforeSend(event) {
    // Nu trimitem erori in development
    if (process.env.NODE_ENV === "development") return null;
    return event;
  },
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
