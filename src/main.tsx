import React from "react";
import ReactDOM from "react-dom/client";
import { installMissionAuthBootstrap } from "./mission-auth-bootstrap";
import "./styles.css";

installMissionAuthBootstrap();

const { App } = await import("./App");

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
