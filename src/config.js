// src/config.js
const envApiUrl =
  process.env.REACT_APP_API_URL ?? process.env.VITE_API_URL ?? "http://localhost:8080";

const API_BASE_URL = envApiUrl.endsWith("/api")
  ? envApiUrl.replace(/\/+$/, "") // keep /api but remove extra slashes
  : envApiUrl.replace(/\/+$/, "") + "/api"; // ensure single trailing /api

export default API_BASE_URL;
