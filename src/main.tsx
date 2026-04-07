import React from "react";
import ReactDOM from "react-dom/client";
import { isTauriEnvironment } from "@/desktop/api";
import { applyRuntimeHost } from "@/app/runtime-host";
import App from "./app/App";
import "./styles.css";

applyRuntimeHost(document.documentElement, isTauriEnvironment());

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
