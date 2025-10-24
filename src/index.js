// src/index.js
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { BrowserRouter } from "react-router-dom";
import { NotificationsProvider } from "./components/NotificationsProvider";
import { ThemeProvider } from "./contexts/ThemeContext"; // <-- ensure path

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <NotificationsProvider>
          <App />
        </NotificationsProvider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);

reportWebVitals();
