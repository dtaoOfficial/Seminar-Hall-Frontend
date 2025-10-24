// src/components/AdminDashboard.js
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import AddUserPage from "../pages/Admin/AddUserPage";
import AddSeminarPage from "../pages/Admin/AddSeminarPage";
import RequestsPage from "../pages/Admin/RequestsPage";
import AllSeminarsPage from "../pages/Admin/AllSeminarsPage";
import AllDepartmentsPage from "../pages/Admin/AllDepartmentsPage";
import ManageDepartmentsPage from "../pages/Admin/ManageDepartmentsPage";
import ManageHallsPage from "../pages/Admin/ManageHallsPage.js";
import ManageOperatorsPage from "../pages/ManageOperators";
// UpdateSeminarPage import removed on purpose to avoid referencing a removed page
import SeminarDetails from "../pages/Admin/SeminarDetails";
import ExportPage from "../pages/Admin/ExportPage";

import { CSVLink } from "react-csv";
import api from "../utils/api";
import { useNotification } from "../components/NotificationsProvider";
import { useTheme } from "../contexts/ThemeContext";

/* ---------- helpers ---------- */
// produce local YYYY-MM-DD (browser local timezone)
const localISODate = (d = new Date()) => {
  const dt = d instanceof Date ? d : new Date(String(d));
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

// safe date printing (prefer local date part)
const safeDate = (d) => {
  if (!d) return "";
  try {
    if (d instanceof Date) return localISODate(d);
    const dt = new Date(String(d));
    if (!isNaN(dt.getTime())) return localISODate(dt);
    const s = String(d);
    if (s.includes("T")) return s.split("T")[0];
    return s;
  } catch {
    return String(d);
  }
};

const parseTime = (t) => {
  if (!t) return null;
  const m = String(t).trim().match(/^(\d{1,2}):(\d{2})/);
  return m ? { h: parseInt(m[1], 10), m: parseInt(m[2], 10) } : null;
};
const formatTime12 = (hhmm) => {
  if (!hhmm) return "";
  const [hh, mm] = hhmm.split(":").map(Number);
  const period = hh >= 12 ? "PM" : "AM";
  const h12 = ((hh + 11) % 12) + 1;
  return `${String(h12).padStart(2, "0")}:${String(mm).padStart(2, "0")} ${period}`;
};
const minutesOfDay = (t) => {
  const p = parseTime(t);
  if (!p) return null;
  return p.h * 60 + p.m;
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// normalize seminar shape — supports multiple possible backend field names
const normalizeSeminar = (s) => ({
  id: s._id ?? s.id ?? (s._key ?? null) ?? Math.random().toString(36).slice(2),
  hallName: s.hallName || (s.hall && (s.hall.name || s.hall)) || s.hall_id || s.room || "--",
  slotTitle: s.slotTitle || s.title || s.topic || s.name || "Untitled Seminar",
  bookingName: s.bookingName || s.organizer || s.requesterName || s.userName || s.createdBy || "--",
  department: s.department || s.dept || s.departmentName || "",
  date: s.date ?? s.appliedAt ?? s.createdAt ?? s.startDate ?? null,
  startTime: s.startTime || s.start_time || s.from || "",
  endTime: s.endTime || s.end_time || s.to || "",
  startDate: s.startDate ?? s.date ?? null,
  endDate: s.endDate ?? s.date ?? null,
  status: (s.status || "APPROVED").toString(),
  type: s.type || (s.startTime && s.endTime ? "time" : "day"),
  raw: s,
});

/* ---------- small Modal for hall/day details ---------- */
const HallDayModal = ({ open, onClose, hallName, dateStr, seminars }) => {
  const { theme } = useTheme() || {};
  const isDtao = theme === "dtao";

  if (!open) return null;
  const relevant = (seminars || []).filter((s) => {
    const hn = (s.hallName || (s.hall && s.hall.name) || s.hall || "").toString();
    const hid = (s.hallId || s.hall?._id || s.hall?.id || "").toString();
    if (!(hn === hallName || hid === String(hallName))) return false;
    const sStartDate = safeDate(s.startDate || s.date || s.appliedAt || s.createdAt);
    const sEndDate = safeDate(s.endDate || s.date || s.appliedAt || s.createdAt);
    if (sStartDate && sEndDate) {
      try {
        const ds = new Date(sStartDate); ds.setHours(0,0,0,0);
        const de = new Date(sEndDate); de.setHours(0,0,0,0);
        const dd = new Date(dateStr); dd.setHours(0,0,0,0);
        return dd >= ds && dd <= de;
      } catch { /* continue */ }
    }
    return safeDate(s.date || s.startDate || s.appliedAt) === dateStr;
  });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className={`w-full max-w-2xl rounded-lg shadow-lg p-5 ${isDtao ? "bg-[#0b0710] border border-violet-900 text-slate-100" : "bg-white border border-gray-100 text-slate-900"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className={`text-lg font-semibold ${isDtao ? "text-slate-100" : "text-slate-800"}`}>{hallName} — {dateStr}</h3>
            <p className={`text-sm ${isDtao ? "text-slate-300" : "text-slate-500"} mt-1`}>Booked items on selected day</p>
          </div>
          <button onClick={onClose} className={`${isDtao ? "text-slate-300" : "text-slate-400"} text-2xl leading-none`}>×</button>
        </div>

        <div className="mt-4 space-y-3 max-h-72 overflow-auto">
          {relevant.length === 0 ? (
            <div className={`text-sm ${isDtao ? "text-slate-300" : "text-slate-500"}`}>No bookings on this date.</div>
          ) : relevant.map((r, i) => {
            const n = normalizeSeminar(r);
            return (
              <div key={n.id || i} className={`${isDtao ? "bg-black/40 border border-violet-800" : "bg-slate-50 border border-gray-100"} p-3 rounded-md`}>
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <div className={`font-semibold ${isDtao ? "text-slate-100" : "text-slate-800"}`}>{n.slotTitle}</div>
                    <div className={`text-xs ${isDtao ? "text-slate-300" : "text-slate-600"} mt-1`}>{n.bookingName}{n.department ? ` • ${n.department}` : ""}</div>
                  </div>
                  <div className={`text-xs ${isDtao ? "text-slate-300" : "text-slate-500"} text-right`}>
                    {n.startTime && n.endTime ? `${formatTime12(n.startTime)} — ${formatTime12(n.endTime)}` : "Full day"}
                  </div>
                </div>
                {n.raw?.remarks && <div className={`text-xs mt-2 ${isDtao ? "text-slate-300" : "text-slate-500"}`}>Notes: {n.raw.remarks}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* ---------- main component ---------- */
const AdminDashboard = ({ user, setUser }) => {
  const navigate = useNavigate();
  const { notify } = useNotification();
  const { theme } = useTheme() || {};
  const isDtao = theme === "dtao";

  const [seminars, setSeminars] = useState([]);
  const [halls, setHalls] = useState([]);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  const [selectedDate, setSelectedDate] = useState(() => localISODate());
  const [selectedHallModal, setSelectedHallModal] = useState(null);

  /* fetchers */
  const fetchSeminars = useCallback(async () => {
    try {
      const res = await api.get("/seminars");
      const data = Array.isArray(res?.data) ? res.data : res?.data?.seminars || [];
      setSeminars(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("fetchSeminars", err);
      setSeminars([]);
      setError("Failed to fetch seminars.");
    }
  }, []);

  const fetchHalls = useCallback(async () => {
    try {
      const res = await api.get("/halls");
      setHalls(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      console.error("fetchHalls", err);
      setHalls([]);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get("/users");
      setUsers(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      console.error("fetchUsers", err);
      setUsers([]);
    }
  }, []);

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await api.get("/departments");
      setDepartments(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      console.error("fetchDepartments", err);
      setDepartments([]);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([fetchSeminars(), fetchHalls(), fetchUsers(), fetchDepartments()]).finally(() =>
      setLoading(false)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const handleLogout = () => {
    if (typeof setUser === "function") setUser(null);
    localStorage.clear();
    navigate("/");
  };

  // recent and pending
  const recentSeminars = useMemo(() => {
    if (!seminars || seminars.length === 0) return [];
    return seminars.map(normalizeSeminar).reverse().slice(0, 5);
  }, [seminars]);

  const pendingRequests = useMemo(() => {
    const list = (seminars || [])
      .filter((s) => ["PENDING", "CANCEL_REQUESTED"].includes((s.status || "").toUpperCase()))
      .map(normalizeSeminar);
    list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    return list.slice(0, 5);
  }, [seminars]);

  const summaryCounts = useMemo(
    () => ({
      users: users.length,
      requests: (seminars || []).filter((s) => ["PENDING", "CANCEL_REQUESTED"].includes((s.status || "").toUpperCase())).length,
      seminars: seminars.length,
      halls: halls.length,
      departments: departments.length,
      approved: seminars.filter((s) => (s.status || "").toUpperCase() === "APPROVED").length,
      rejected: seminars.filter((s) => (s.status || "").toUpperCase() === "REJECTED").length,
    }),
    [users, seminars, halls, departments]
  );

  // ---------- Day-wise availability logic ----------
  const DAY_START_MIN = 8 * 60;
  const DAY_END_MIN = 18 * 60;

  const bookedIntervalsForHallOnDate = (hallKey, dateStr) => {
    const arr = (seminars || []).filter((s) => {
      if (String((s.status || "").toUpperCase()) !== "APPROVED") return false;
      const hn = (s.hallName || (s.hall && s.hall.name) || s.hall || "").toString();
      const hid = (s.hallId || s.hall?._id || s.hall?.id || "").toString();
      if (!(hn === hallKey || hid === String(hallKey))) return false;

      const sStartDate = safeDate(s.startDate || s.date || s.appliedAt || s.createdAt);
      const sEndDate = safeDate(s.endDate || s.date || s.appliedAt || s.createdAt);
      if (sStartDate && sEndDate) {
        try {
          const ds = new Date(sStartDate); ds.setHours(0,0,0,0);
          const de = new Date(sEndDate); de.setHours(0,0,0,0);
          const dd = new Date(dateStr); dd.setHours(0,0,0,0);
          if (dd >= ds && dd <= de) return true;
        } catch {}
      }
      const sDate = safeDate(s.date || s.startDate || s.appliedAt || s.createdAt);
      return sDate === dateStr;
    });

    const intervals = [];
    let fullDay = false;
    arr.forEach((s) => {
      const n = normalizeSeminar(s);
      if (!n.startTime || !n.endTime || n.type === "day") {
        fullDay = true;
        return;
      }
      const stMin = minutesOfDay(n.startTime);
      const enMin = minutesOfDay(n.endTime);
      if (stMin == null || enMin == null) { fullDay = true; return; }
      const from = clamp(stMin, DAY_START_MIN, DAY_END_MIN);
      const to = clamp(enMin, DAY_START_MIN, DAY_END_MIN);
      if (to <= from) return;
      intervals.push([from, to, n]);
    });

    if (fullDay) return { fullDay: true, merged: [[DAY_START_MIN, DAY_END_MIN]] };

    intervals.sort((a,b) => a[0] - b[0]);
    const merged = [];
    for (let i=0;i<intervals.length;i++){
      const [s0,e0,meta] = intervals[i];
      if (!merged.length) merged.push([s0,e0,[meta]]);
      else {
        const last = merged[merged.length-1];
        if (s0 <= last[1]) {
          last[1] = Math.max(last[1], e0);
          last[2].push(meta);
        } else {
          merged.push([s0,e0,[meta]]);
        }
      }
    }
    const mergedSimple = merged.map(([a,b,meta]) => [a,b,meta]);
    return { fullDay: false, merged: mergedSimple };
  };

  const freeRangesFromMerged = (merged) => {
    const free = [];
    let cursor = DAY_START_MIN;
    if (!merged || merged.length === 0) {
      free.push([DAY_START_MIN, DAY_END_MIN]);
      return free;
    }
    merged.forEach(([s,e]) => {
      if (s > cursor) free.push([cursor, s]);
      cursor = Math.max(cursor, e);
    });
    if (cursor < DAY_END_MIN) free.push([cursor, DAY_END_MIN]);
    return free;
  };

  const percentFree = (merged) => {
    const total = DAY_END_MIN - DAY_START_MIN;
    if (!merged || merged.length === 0) return 100;
    let booked = 0;
    merged.forEach(([s,e]) => { booked += Math.max(0, e - s); });
    const free = Math.max(0, total - booked);
    return Math.round((free / total) * 100);
  };

  const dayAvailability = useMemo(() => {
    const dt = selectedDate || localISODate();
    return (halls || []).map((h) => {
      const key = h.name || h._id || h.id || "";
      const { fullDay, merged } = bookedIntervalsForHallOnDate(key, dt);
      const mergedSimple = merged.map(([a,b]) => [a,b]);
      const free = fullDay ? [] : freeRangesFromMerged(mergedSimple);
      const pct = fullDay ? 0 : percentFree(mergedSimple);
      let color = "green";
      if (fullDay || pct < 30) color = "red";
      else if (pct < 70) color = "orange";
      return {
        hall: h,
        key,
        fullDay,
        merged: mergedSimple,
        free,
        percentFree: pct,
        indicator: color,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [halls, seminars, selectedDate]);

  // modal helpers
  const [hallModalOpen, setHallModalOpen] = useState(false);
  const openHallModal = (hallKey) => {
    setSelectedHallModal(hallKey);
    setHallModalOpen(true);
  };

  // ---------- NEW: quick approve/reject handlers for dashboard pending items ----------
  const quickApprove = async (seminarId) => {
    try {
      await api.put(`/seminars/${seminarId}`, { status: "APPROVED", remarks: "Approved from dashboard" });
      notify("✅ Approved", "success", 2000);
      await fetchSeminars();
    } catch (err) {
      console.error("approve err", err);
      notify(err?.response?.data?.message || "Failed to approve", "error", 3500);
    }
  };

  const quickReject = async (seminarId) => {
    try {
      const reason = window.prompt("Enter rejection remark (this will be saved):", "Rejected by Admin");
      if (reason === null) return; // cancelled
      await api.put(`/seminars/${seminarId}`, { status: "REJECTED", remarks: reason });
      notify("Rejected", "success", 2000);
      await fetchSeminars();
    } catch (err) {
      console.error("reject err", err);
      notify(err?.response?.data?.message || "Failed to reject", "error", 3500);
    }
  };

  if (!user) return null;

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-700 ${isDtao ? "text-slate-100" : "text-slate-900"}`}>
      <Navbar user={user} handleLogout={handleLogout} />

      <main className="flex-1 max-w-7xl mx-auto px-4 pt-20 pb-8 w-full">
        <Routes>
          <Route path="add-user" element={<AddUserPage />} />
          <Route path="add-seminar" element={<AddSeminarPage halls={halls} />} />
          <Route path="requests" element={<RequestsPage />} />
          {/* Update route removed (page intentionally removed) */}
          <Route path="seminars" element={<AllSeminarsPage seminars={seminars} />} />
          <Route path="departments" element={<AllDepartmentsPage />} />
          <Route path="manage-departments" element={<ManageDepartmentsPage />} />
          <Route path="operators" element={<ManageOperatorsPage />} />
          <Route path="seminar-details" element={<SeminarDetails />} />
          <Route path="halls" element={<ManageHallsPage fetchHalls={fetchHalls} halls={halls} />} />
          <Route path="export" element={<ExportPage />} />

          <Route
            path="*"
            element={
              <>
                {/* SUMMARY */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
                  {Object.entries(summaryCounts).map(([key, val]) => (
                    <div
                      key={key}
                      className={`rounded-xl p-4 text-center transform transition hover:-translate-y-1 ${
                        isDtao
                          ? "bg-black/40 border border-violet-800 shadow-lg"
                          : "bg-white shadow"
                      }`}
                    >
                      <p className={`${isDtao ? "text-slate-300" : "text-gray-600"} font-medium`}>
                        {key.charAt(0).toUpperCase() + key.slice(1)}
                      </p>
                      <p className={`${isDtao ? "text-violet-300" : "text-blue-600"} text-2xl font-bold`}>{val}</p>
                    </div>
                  ))}
                </div>

                {/* MAIN GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                  {/* LEFT: Day-wise availability */}
                  <div className="space-y-6">
                    <div className={`${isDtao ? "bg-black/50 border border-violet-900 text-slate-100" : "bg-white"} rounded-xl p-6 shadow`}>
                      <div className="flex items-center justify-between gap-4 mb-4">
                        <div>
                          <h3 className={`${isDtao ? "text-slate-100" : "text-gray-800"} text-lg font-semibold`}>Day-wise Availability</h3>
                          <p className={`${isDtao ? "text-slate-300" : "text-gray-500"} text-sm mt-1`}>Select a date to inspect halls for that day</p>
                        </div>

                        <div className="flex items-center gap-3">
                          <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className={`rounded-md border px-3 py-2 ${isDtao ? "bg-transparent border-violet-700 text-slate-100" : "border-gray-200 bg-white text-slate-800"}`}
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        {loading ? (
                          <div className={`${isDtao ? "text-slate-300" : "text-gray-500"} text-sm`}>Loading halls & seminars…</div>
                        ) : (dayAvailability.length === 0) ? (
                          <div className={`${isDtao ? "text-slate-300" : "text-gray-500"} text-sm`}>No halls configured</div>
                        ) : (
                          dayAvailability.map((d) => {
                            const pct = d.percentFree;
                            const statusLabel = d.fullDay ? "Blocked (full-day)" : (pct === 100 ? "All free" : `${pct}% free`);
                            const indicatorStyle = d.indicator === "green" ? "bg-gradient-to-r from-emerald-400 to-teal-400" :
                                                    d.indicator === "orange" ? "bg-gradient-to-r from-orange-400 to-amber-400" :
                                                    "bg-gradient-to-r from-rose-500 to-red-500";

                            return (
                              <div key={d.key} className={`${isDtao ? "bg-black/40 border border-violet-800" : "bg-white"} rounded-lg p-4 shadow-sm transition transform hover:scale-[1.01]`}>
                                <div className="flex items-start justify-between gap-4">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-3">
                                      <div className={`w-3 h-3 rounded-full ${d.indicator === "green" ? "bg-emerald-500" : d.indicator === "orange" ? "bg-orange-500" : "bg-rose-600"} transition`} />
                                      <div className={`${isDtao ? "text-slate-100" : "text-slate-800"} text-sm font-semibold truncate`}>{d.hall.name || d.hall.title || d.hallName || d.key}</div>
                                    </div>
                                    <div className={`${isDtao ? "text-slate-300" : "text-slate-500"} text-xs mt-1`}>{statusLabel}</div>

                                    {/* free ranges */}
                                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                                      {d.fullDay ? (
                                        <div className={`col-span-1 sm:col-span-3 text-sm font-semibold ${isDtao ? "text-rose-400" : "text-rose-600"}`}>Full-day booked — Not available</div>
                                      ) : d.free.length === 0 ? (
                                        <div className={`col-span-1 sm:col-span-3 text-sm font-semibold ${isDtao ? "text-rose-400" : "text-rose-600"}`}>No free slots (day fully occupied)</div>
                                      ) : (
                                        d.free.map(([s,e], idx) => (
                                          <div key={idx} className={`rounded-lg border p-2 ${isDtao ? "border-violet-800 bg-black/30" : "border-gray-100 bg-white/60"} shadow-sm flex items-center justify-between`}>
                                            <div className={`${isDtao ? "text-slate-100" : "text-slate-800"} text-sm font-medium`}>{formatMinutesLabel(s)} — {formatMinutesLabel(e)}</div>
                                            <div className={`${isDtao ? "text-slate-300" : "text-slate-500"} text-xs`}>{Math.round(((e-s)/(DAY_END_MIN-DAY_START_MIN))*100)}%</div>
                                          </div>
                                        ))
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex flex-col items-end gap-2">
                                    <div className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${indicatorStyle}`}>{d.indicator === "green" ? "Available" : d.indicator === "orange" ? "Partially" : "Blocked"}</div>
                                    <div className="flex gap-2">
                                      <button onClick={() => openHallModal(d.key)} className={`${isDtao ? "bg-transparent border border-violet-700 text-slate-100 hover:bg-black/40" : "bg-white border text-xs hover:bg-gray-50"} px-3 py-1 rounded-md text-xs`}>View Bookings</button>
                                      <button onClick={() => { setSelectedDate(localISODate()); }} className={`${isDtao ? "bg-violet-600 hover:bg-violet-500 text-white" : "bg-indigo-600 text-white hover:bg-indigo-700"} px-3 py-1 rounded-md text-xs`}>Today</button>
                                    </div>
                                  </div>
                                </div>

                                {/* tiny heatmap */}
                                <div className="mt-4">
                                  <div className={`${isDtao ? "bg-black/30" : "bg-gray-100"} h-3 rounded-md overflow-hidden`}>
                                    <div className="h-full transition-all" style={{ width: `${d.percentFree}%`, background: d.indicator === "green" ? "linear-gradient(90deg,#34d399,#06b6d4)" : d.indicator === "orange" ? "linear-gradient(90deg,#fb923c,#f59e0b)" : "linear-gradient(90deg,#fb7185,#ef4444)" }} />
                                  </div>
                                  <div className={`${isDtao ? "text-slate-300" : "text-slate-500"} mt-2 text-xs`}>Green → free, Orange → partial, Red → blocked</div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Pending requests */}
                    <div className={`${isDtao ? "bg-black/50 border border-violet-900 text-slate-100" : "bg-white"} rounded-xl p-6 shadow`}>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className={`${isDtao ? "text-slate-100" : "text-gray-800"} text-md font-semibold`}>Top 5 Pending Requests</h4>
                        <button onClick={() => navigate("/admin/requests")} className={`${isDtao ? "text-violet-300" : "text-blue-600"} text-sm font-semibold`}>View all</button>
                      </div>

                      {!isMobile ? (
                        pendingRequests.length === 0 ? <div className={`${isDtao ? "text-slate-300" : "text-gray-500"} text-sm`}>No pending requests</div> : (
                          <ul className="space-y-3">
                            {pendingRequests.map((p, idx) => (
                              <li key={p.id ?? idx} className={`${isDtao ? "bg-black/30 border border-violet-800" : "bg-gray-50"} flex items-center justify-between rounded-md p-3`}>
                                <div className="min-w-0">
                                  <div className={`${isDtao ? "text-violet-200" : "text-blue-700"} text-sm font-semibold truncate`}>{p.hallName || "--"}</div>
                                  <div className={`${isDtao ? "text-slate-100" : "text-gray-700"} text-sm truncate`}>{p.slotTitle || "--"}</div>
                                </div>

                                <div className={`text-right text-sm ${isDtao ? "text-slate-300" : "text-gray-500"}`}>
                                  <div>{safeDate(p.date)}</div>
                                  <div>{p.bookingName || "--"}</div>
                                  <div className="mt-2 flex gap-2 justify-end">
                                    <button onClick={() => quickApprove(p.id)} className="px-3 py-1 rounded-md bg-green-600 text-white text-xs font-semibold hover:bg-green-700">Approve</button>
                                    <button onClick={() => quickReject(p.id)} className="px-3 py-1 rounded-md bg-red-600 text-white text-xs font-semibold hover:bg-red-700">Reject</button>
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )
                      ) : (
                        pendingRequests.length === 0 ? <div className={`${isDtao ? "text-slate-300" : "text-gray-500"} text-sm`}>No pending requests</div> : (
                          <div className="space-y-3">
                            {pendingRequests.map((p, idx) => (
                              <div key={p.id ?? idx} className={`${isDtao ? "bg-black/30 border border-violet-800" : "bg-gray-50"} rounded-lg p-3 shadow-sm`}>
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className={`${isDtao ? "text-violet-200" : "text-blue-700"} text-sm font-semibold truncate`}>{p.hallName || "--"}</div>
                                    <div className={`${isDtao ? "text-slate-100" : "text-gray-700"} text-sm truncate`}>{p.slotTitle || "--"}</div>
                                    <div className={`${isDtao ? "text-slate-300" : "text-xs text-gray-500"} mt-1`}>{p.bookingName || "--"}</div>
                                  </div>
                                  <div className={`${isDtao ? "text-slate-300" : "text-xs text-gray-500"} text-right`}>{safeDate(p.date)}</div>
                                </div>
                                <div className="mt-2 flex gap-2">
                                  <button onClick={() => quickApprove(p.id)} className="px-3 py-1 rounded-md bg-green-600 text-white text-xs font-semibold">Approve</button>
                                  <button onClick={() => quickReject(p.id)} className="px-3 py-1 rounded-md bg-red-600 text-white text-xs font-semibold">Reject</button>
                                  <button onClick={() => navigate("/admin/requests")} className="px-3 py-1 rounded-md bg-blue-600 text-white text-xs font-semibold">Open</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  {/* RIGHT: recent seminars */}
                  <aside className="space-y-4">
                    <div className={`${isDtao ? "bg-black/50 border border-violet-900 text-slate-100" : "bg-white"} rounded-xl shadow p-4`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className={`${isDtao ? "text-slate-100" : "text-gray-800"} text-lg font-semibold`}>Recent Seminars</h3>
                          <p className={`${isDtao ? "text-slate-300" : "text-xs text-gray-500"} mt-1`}>Latest bookings & activity</p>
                        </div>

                        <div className="flex gap-2 items-center ml-4">
                          <CSVLink
                            data={recentSeminars}
                            headers={[
                              { label: "Hall", key: "hallName" },
                              { label: "Title", key: "slotTitle" },
                              { label: "Booked By", key: "bookingName" },
                              { label: "Date", key: "date" },
                            ]}
                            filename="recent_seminars.csv"
                            className={`${isDtao ? "px-3 py-1.5 rounded-md bg-violet-600 text-white text-sm font-semibold" : "px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm font-semibold"}`}
                          >
                            Export CSV
                          </CSVLink>
                        </div>
                      </div>

                      <div className="mt-4">
                        {loading ? (
                          <div className={`${isDtao ? "text-slate-300" : "text-gray-500"} text-sm`}>Loading…</div>
                        ) : error ? (
                          <div className={`${isDtao ? "text-rose-400" : "text-rose-600"} text-sm`}>{error}</div>
                        ) : recentSeminars.length === 0 ? (
                          <div className={`${isDtao ? "text-slate-300" : "text-gray-500"} text-sm`}>No recent seminars.</div>
                        ) : (
                          <>
                            {!isMobile && (
                              <div className="overflow-x-auto">
                                <table className={`w-full text-sm table-fixed ${isDtao ? "bg-transparent" : ""}`}>
                                  <thead>
                                    <tr className={`${isDtao ? "bg-violet-900 text-violet-100" : "bg-blue-800 text-white"}`}>
                                      <th className="p-2 text-left w-1/5">Hall</th>
                                      <th className="p-2 text-left w-2/5">Title</th>
                                      <th className="p-2 text-left w-1/5">Booked By</th>
                                      <th className="p-2 text-left w-1/5">Date</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {recentSeminars.map((s, i) => (
                                      <tr key={s.id ?? i} className="border-b last:border-b-0">
                                        <td className="p-2 align-top max-w-[160px]">
                                          <div className={`${isDtao ? "text-slate-100" : "text-gray-800"} text-sm truncate`}>{s.hallName}</div>
                                        </td>
                                        <td className="p-2 align-top">
                                          <div className={`${isDtao ? "text-slate-100" : "font-semibold text-gray-800"} font-semibold line-clamp-2`}>{s.slotTitle}</div>
                                          <div className={`${isDtao ? "text-slate-300" : "text-xs text-gray-500"} mt-1`}>{s.bookingName ? `${s.bookingName}${s.department ? ` • ${s.department}` : ""}` : ""}</div>
                                        </td>
                                        <td className="p-2 align-top">
                                          <div className={`${isDtao ? "text-slate-100" : "text-gray-800"} text-sm`}>{s.bookingName}</div>
                                        </td>
                                        <td className="p-2 align-top">
                                          <div className={`${isDtao ? "text-slate-300" : "text-gray-700"} text-sm`}>{safeDate(s.date)}</div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            {isMobile && (
                              <div className="space-y-3">
                                {recentSeminars.map((s, i) => (
                                  <div key={s.id ?? i} className={`${isDtao ? "bg-black/30 border border-violet-800" : "bg-gray-50"} rounded-lg shadow p-4 flex flex-col gap-2`}>
                                    <div className="flex justify-between items-center">
                                      <div className={`${isDtao ? "text-violet-200" : "text-blue-700"} font-semibold truncate`}>{s.hallName}</div>
                                      <div className={`${isDtao ? "text-slate-300" : "text-gray-500"} text-xs`}>{safeDate(s.date)}</div>
                                    </div>
                                    <div className={`${isDtao ? "text-slate-100" : "text-gray-800"} text-sm font-semibold line-clamp-2`}>{s.slotTitle}</div>
                                    <div className={`${isDtao ? "text-slate-300" : "text-gray-600"} text-xs`}>{s.bookingName} {s.department ? `• ${s.department}` : ""}</div>
                                    <div className="mt-2 flex gap-2">
                                      <button onClick={() => navigate("/admin/seminar-details", { state: { seminarId: s.id } })} className="px-3 py-1 rounded-md bg-blue-600 text-white text-xs font-semibold">Details</button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </aside>
                </div>

                <div className="h-6" />

                {/* Footer */}
                <footer className={`${isDtao ? "text-slate-400" : "text-gray-600"} mt-8 text-center text-sm`}>
                  <div>Created by DTAOofficial</div>
                  <div className="mt-1">
                    <a href="https://dtaoofficial.netlify.app/" target="_blank" rel="noreferrer" className={`${isDtao ? "text-violet-300" : "text-blue-600"} hover:underline`}>
                      https://dtaoofficial.netlify.app/
                    </a>
                  </div>
                  <div className="mt-1">&copy; All rights reserved by DTAOofficial</div>
                </footer>

                {/* Hall modal */}
                <HallDayModal
                  open={hallModalOpen}
                  onClose={() => setHallModalOpen(false)}
                  hallName={selectedHallModal}
                  dateStr={selectedDate}
                  seminars={seminars}
                />
              </>
            }
          />
        </Routes>
      </main>
    </div>
  );
};

/* ---------- small util used in render (placed after component to keep code tidy) ---------- */
function formatMinutesLabel(mins) {
  const hh = Math.floor(mins / 60);
  const mm = mins % 60;
  const period = hh >= 12 ? "PM" : "AM";
  const h12 = ((hh + 11) % 12) + 1;
  return `${String(h12).padStart(2, "0")}:${String(mm).padStart(2, "0")} ${period}`;
}

export default AdminDashboard;
