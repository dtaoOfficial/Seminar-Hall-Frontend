// src/utils/api.js
import axios from "axios";
import API_BASE_URL from "../config";
import AuthService from "./AuthService";

/**
 * Axios instance (stable)
 */
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

/* ---------- helper detection ---------- */
function isAuthEndpoint(url = "") {
  const u = String(url || "");
  return (
    u.includes("/api/auth/") ||
    u.includes("/auth/") ||
    u.includes("/users/login")
  );
}

/* ---------- ✅ Request Interceptor ---------- */
api.interceptors.request.use(
  (config) => {
    try {
      const url = (config.url || "").trim();

      // Skip OPTIONS or login/auth endpoints
      if (config.method?.toUpperCase() === "OPTIONS" || isAuthEndpoint(url))
        return config;

      // Detect current role context
      let role = null;
      const path = window.location.pathname || "";
      if (path.startsWith("/admin")) role = "ADMIN";
      else if (path.startsWith("/dept")) role = "DEPARTMENT";

      // Get appropriate token
      const token = AuthService.getToken(role) || AuthService.getActiveToken();
      if (token) {
        config.headers = config.headers || {};
        config.headers["Authorization"] = `Bearer ${token}`;
      }
    } catch (err) {
      console.error("API request interceptor error:", err);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/* ---------- ✅ Response Interceptor (safe logout) ---------- */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || "";

    if (status === 401 && !isAuthEndpoint(url)) {
      console.warn("⚠️ Token expired or unauthorized request, clearing session...");

      // Always fully clear both roles — prevents cross-role conflict
      AuthService.logout();

      // Soft redirect (no crash)
      window.dispatchEvent(new Event("logout"));
      setTimeout(() => {
        if (window.location.pathname !== "/") {
          window.location.replace("/");
        }
      }, 300);
    }

    return Promise.reject(error);
  }
);

export default api;
