// src/utils/api.js
import axios from "axios";
import API_BASE_URL from "../config";

/**
 * Axios instance used across the app.
 * - Keeps your existing interceptors and behavior.
 * - We attach small helper methods below for calendar/day endpoints used by dashboard.
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

/* ---------- request interceptor (attach token when appropriate) ---------- */
api.interceptors.request.use(
  (config) => {
    try {
      const url = config.url || "";

      if (isAuthEndpoint(url)) {
        return config;
      }

      if (isOurApiUrl(url)) {
        const token = localStorage.getItem("token");
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

/* ---------- response interceptor (preserve old 401 behavior) ---------- */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn("⚠️ Unauthorized request to:", error.config?.url, {
        status: error.response.status,
        data: error.response.data,
      });
      // Do not auto logout here — leave decision to caller
    }
    return Promise.reject(error);
  }
);

/* ---------- Small, safe API helper functions used by frontend pages ---------- */

/**
 * Fetch calendar summary for a month for a hall.
 * Back-end expected endpoint: GET /api/seminars/calendar?hallName=...&year=YYYY&month=M
 * Accepts:
 *    api.getCalendarMonth(hallName, year, month)
 * or api.getCalendarMonth({ hallName, year, month })
 */
api.getCalendarMonth = (hallOrOpts, maybeYear, maybeMonth) => {
  let hallName;
  let year;
  let month;

  if (typeof hallOrOpts === "object" && hallOrOpts !== null && !Array.isArray(hallOrOpts)) {
    hallName = hallOrOpts.hallName || hallOrOpts.hall || "";
    year = String(hallOrOpts.year || "");
    month = String(hallOrOpts.month || "");
  } else {
    hallName = hallOrOpts || "";
    year = String(maybeYear || "");
    month = String(maybeMonth || "");
  }

  const qHall = encodeURIComponent(hallName || "");
  const qYear = encodeURIComponent(year || "");
  const qMonth = encodeURIComponent(month || "");

  const url = `/seminars/calendar?hallName=${qHall}&year=${qYear}&month=${qMonth}`;
  return api.get(url);
};

/**
 * Fetch all seminars/bookings for a particular day and hall.
 * Back-end expected endpoint: GET /api/seminars/day/{date}?hallName=...
 * Usage:
 *   api.getSeminarsForDay("2025-10-25", "Main Hall")
 * or api.getSeminarsForDay({ date: "2025-10-25", hallName: "Main Hall" })
 */
api.getSeminarsForDay = (dateOrOpts, maybeHall) => {
  let date;
  let hallName;

  if (typeof dateOrOpts === "object" && dateOrOpts !== null && !Array.isArray(dateOrOpts)) {
    date = dateOrOpts.date || dateOrOpts.day || "";
    hallName = dateOrOpts.hallName || dateOrOpts.hall || "";
  } else {
    date = dateOrOpts || "";
    hallName = maybeHall || "";
  }

  // ensure date is URL-safe (if empty, backend may handle)
  const d = encodeURIComponent(String(date || ""));
  const qHall = encodeURIComponent(String(hallName || ""));
  const url = `/seminars/day/${d}?hallName=${qHall}`;
  return api.get(url);
};

/**
 * ===============================
 * ✅ Department-side calendar APIs
 * ===============================
 */

/**
 * Fetch department calendar summary for a month.
 * Backend: GET /api/departments/calendar?department=DEPT&year=YYYY&month=M
 * Usage:
 *   api.getDeptCalendar("CSE-1", 2025, 10)
 * or api.getDeptCalendar({ department: "CSE-1", year: 2025, month: 10 })
 */
api.getDeptCalendar = (deptOrOpts, maybeYear, maybeMonth) => {
  let department;
  let year;
  let month;

  if (typeof deptOrOpts === "object" && deptOrOpts !== null && !Array.isArray(deptOrOpts)) {
    department = deptOrOpts.department || deptOrOpts.dept || "";
    year = String(deptOrOpts.year || "");
    month = String(deptOrOpts.month || "");
  } else {
    department = deptOrOpts || "";
    year = String(maybeYear || "");
    month = String(maybeMonth || "");
  }

  const qDept = encodeURIComponent(department || "");
  const qYear = encodeURIComponent(year || "");
  const qMonth = encodeURIComponent(month || "");

  const url = `/departments/calendar?department=${qDept}&year=${qYear}&month=${qMonth}`;
  return api.get(url);
};

/**
 * Fetch all seminars for a department on a specific date.
 * Backend: GET /api/departments/day?department=DEPT&date=YYYY-MM-DD
 * Usage:
 *   api.getDeptSeminarsForDay("CSE-1", "2025-10-25")
 * or api.getDeptSeminarsForDay({ department: "CSE-1", date: "2025-10-25" })
 */
api.getDeptSeminarsForDay = (deptOrOpts, maybeDate) => {
  let department;
  let date;

  if (typeof deptOrOpts === "object" && deptOrOpts !== null && !Array.isArray(deptOrOpts)) {
    department = deptOrOpts.department || deptOrOpts.dept || "";
    date = deptOrOpts.date || "";
  } else {
    department = deptOrOpts || "";
    date = maybeDate || "";
  }

  const qDept = encodeURIComponent(department || "");
  const qDate = encodeURIComponent(date || "");
  const url = `/departments/day?department=${qDept}&date=${qDate}`;
  return api.get(url);
};

/* ---------- keep default export for existing code (unchanged) ---------- */
export default api;
