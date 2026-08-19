import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import "./index.css";

import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { PresenceProvider } from "./context/PresenceContext";
import { NotificationProvider } from "./context/NotificationContext";
import { CallProvider } from "./context/CallContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <PresenceProvider>
          <NotificationProvider>
          <CallProvider>
        <MantineProvider
          theme={{
            fontFamily: "Inter, sans-serif",
            primaryColor: "indigo",
          }}
        >
          <App />
              </MantineProvider>
              </CallProvider>
            </NotificationProvider>
          </PresenceProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
