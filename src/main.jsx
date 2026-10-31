import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/space-grotesk/700.css";
import "./styles/theme.css";
import "./index.css";
import App from "./App.jsx";
import { followSystemTheme } from "./lib/theme.js";

// If the theme is "System", keep following the device while the app is open.
followSystemTheme();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
