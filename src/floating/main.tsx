import React from "react";
import ReactDOM from "react-dom/client";
import FloatingWindow from "./FloatingWindow";
import "@/i18n";
import "@/App.css";
import { platform } from "@tauri-apps/plugin-os";

document.documentElement.dataset.platform = platform();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <FloatingWindow />
  </React.StrictMode>,
);
