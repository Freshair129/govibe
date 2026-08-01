import React from "react";
import ReactDOM from "react-dom/client";
import "./styles.css";
import { installMissionEventFirewall } from "./security/browser-event-firewall";

async function bootstrap() {
  const restoreAddEventListener = installMissionEventFirewall(window);
  try {
    const { App } = await import("./App");
    ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
  } finally {
    restoreAddEventListener();
  }
}

void bootstrap();
