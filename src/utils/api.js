// src/utils/api.js
import axios from "axios";
import API_BASE_URL from "../config";

// Create axios instance (same as your old working config)
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: { "Content-Type": "application/json" },
});

/**
 * Helper to detect auth endpoints (we DON'T attach token to these).
 * Accepts relative ("/auth/...") or absolute ("http://.../api/auth/...").
 */
function isAuthEndpoint(url = "") {
  const u = String(url || "");
  return (
    u.startsWith("/auth") ||
    u.startsWith("/api/auth") ||
    u.includes("/api/auth/") ||
    u.includes("/auth/")
  );
}

/**
 * Helper to decide whether a request is targeting your backend API.
 * - Relative paths (starting with "/") are considered your API.
 * - Absolute URLs containing API_BASE_URL are considered yours.
 */
function isOurApiUrl(url = "") {
  const u = String(url || "");
  if (!u) return false;
  if (u.startsWith("/")) return true; // relative => our API
  try {
    return u.startsWith(API_BASE_URL) || u.includes(API_BASE_URL);
  } catch {
    return false;
  }
}

// 🔑 Attach token automatically (preserve old behavior but be defensive)
api.interceptors.request.use(
  (config) => {
    try {
      const url = config.url || "";

      // If this is an auth endpoint, don't attach token (forgot/verify/reset/login)
      if (isAuthEndpoint(url)) {
        return config;
      }

      // If targeting our API (relative or absolute to API_BASE_URL), attach token
      if (isOurApiUrl(url)) {
        const token = localStorage.getItem("token");
        if (token) {
          config.headers = config.headers || {};
          config.headers["Authorization"] = `Bearer ${token}`;
        }
      } else {
        // Not our API (third-party) — leave headers alone
      }
    } catch (err) {
      console.error("api request interceptor error:", err);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 🚨 Handle 401 - warn but don't auto-logout (preserves old "working" behavior)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Helpful logging for debugging — won't wipe localStorage or redirect
      console.warn("⚠️ Unauthorized request to:", error.config?.url, {
        status: error.response.status,
        data: error.response.data,
      });
      // Keep old behavior: do NOT automatically clear token or redirect here.
      // Let components decide how to handle 401 (they already do in your code).
    }
    return Promise.reject(error);
  }
);

export default api;
