// src/config.js
// Single source of truth for frontend → backend URL
const RAW = process.env.REACT_APP_API_URL;

const trimTrailing = (s = "") => s.replace(/\/+$/, "");

export const API_BASE_URL = trimTrailing(RAW);   // e.g. http://localhost:8080
export const API_BASE = `${API_BASE_URL}/api`;    // e.g. http://localhost:8080/api

export default API_BASE;
