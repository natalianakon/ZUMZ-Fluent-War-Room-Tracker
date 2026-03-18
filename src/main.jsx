import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./fluent-war-room";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
