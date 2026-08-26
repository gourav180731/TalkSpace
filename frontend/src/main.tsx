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
import { GroupProvider } from "./context/GroupContext";
import { StatusProvider } from "./context/StatusContext";
import { SettingsProvider } from "./context/SettingsContext";
import { getTheme, setTheme } from "./utils/theme";

setTheme(getTheme());

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <PresenceProvider>
          <NotificationProvider>
          <CallProvider>
          <GroupProvider>
          <StatusProvider>
          <SettingsProvider>
        <MantineProvider
          theme={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            primaryColor: "orange",
          }}
        >
          <App />
              </MantineProvider>
          </SettingsProvider>
          </StatusProvider>
          </GroupProvider>
              </CallProvider>
            </NotificationProvider>
          </PresenceProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
