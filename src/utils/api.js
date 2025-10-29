// src/utils/api.js
import axios from "axios";
import API_BASE_URL from "../config";
import AuthService from "./AuthService";

/**
 * Axios instance (unchanged)
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

/* ---------- ✅ Smart Request Interceptor ---------- */
api.interceptors.request.use(
  (config) => {
    try {
      const url = (config.url || "").trim();

      // Skip OPTIONS & login/auth endpoints
      if (config.method?.toUpperCase() === "OPTIONS" || isAuthEndpoint(url))
        return config;

      // ✅ Detect role context based on current route
      let role = null;
      const currentPath = window.location.pathname || "";
      if (currentPath.startsWith("/admin")) role = "ADMIN";
      else if (currentPath.startsWith("/dept")) role = "DEPARTMENT";

      // ✅ Get correct token based on active tab’s role
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

/* ---------- ✅ Response Interceptor ---------- */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || "";

    if (status === 401 && !isAuthEndpoint(url)) {
      console.warn("⚠️ Token expired or invalid, logging out...");

      // Determine which role to logout
      const path = window.location.pathname || "";
      const role = path.startsWith("/admin")
        ? "ADMIN"
        : path.startsWith("/dept")
        ? "DEPARTMENT"
        : null;

      AuthService.logout(role);
      window.location.href = "/";
    }

    return Promise.reject(error);
  }
);

/* ---------- Export API ---------- */
export default api;
