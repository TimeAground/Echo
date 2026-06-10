import React from "react";
import ReactDOM from "react-dom/client";
import FloatingWindow from "./FloatingWindow";
import "@/i18n";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <FloatingWindow />
  </React.StrictMode>,
);
