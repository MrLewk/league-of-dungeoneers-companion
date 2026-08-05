import React from "react";
import ReactDOM from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import App from "./App.jsx";
import { storage } from "./storage.js";
import "./index.css";

// The app talks to `window.storage` (the API shape Claude.ai artifacts provide).
// Here we back that same interface with localStorage so it works standalone.
window.storage = storage;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
    <Analytics />
  </React.StrictMode>
);
