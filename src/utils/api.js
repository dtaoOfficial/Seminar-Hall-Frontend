// src/utils/api.js
import axios from "axios";
import API_BASE_URL from "../config";
import AuthService from "./AuthService";

/**
 * Axios instance used across the app.
 */
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: { "Content-Type": "application/json" },
});

/* ---------- helper detection (unchanged) ---------- */
function isAuthEndpoint(url = "") {
  const u = String(url || "");
  return (
    u.startsWith("/auth") ||
    u.startsWith("/api/auth") ||
    u.includes("/api/auth/") ||
    u.includes("/auth/")
  );
}

function isOurApiUrl(url = "") {
  const u = String(url || "");
  if (!u) return false;
  if (u.startsWith("/")) return true;
  try {
    return u.startsWith(API_BASE_URL) || u.includes(API_BASE_URL);
  } catch {
    return false;
  }
}

/* ---------- ✅ Updated request interceptor ---------- */
api.interceptors.request.use(
  (config) => {
    try {
      const url = config.url || "";

      if (isAuthEndpoint(url)) return config;

      if (isOurApiUrl(url)) {
        const token = AuthService.getActiveToken();
        if (token) {
          config.headers = config.headers || {};
          config.headers["Authorization"] = `Bearer ${token}`;
        }
      }
    } catch (err) {
      console.error("api request interceptor error:", err);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/* ---------- response interceptor (unchanged) ---------- */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn("⚠️ Unauthorized request to:", error.config?.url, {
        status: error.response.status,
        data: error.response.data,
      });
    }
    return Promise.reject(error);
  }
);

/* ---------- rest of your helper functions unchanged ---------- */
export default api;
