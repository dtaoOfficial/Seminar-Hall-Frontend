// src/components/AdminDashboard.js
// NOTE: Dtao theme colors are derived from :root.dark variables in GlobalStyles.js
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
import SeminarDetails from "../pages/Admin/SeminarDetails";
import ExportPage from "../pages/Admin/ExportPage";
import AdminCalendarPage from "../pages/Admin/AdminCalendarPage";

import { CSVLink } from "react-csv";
import api from "../utils/api";
import { useNotification } from "../components/NotificationsProvider";
import { useTheme } from "../contexts/ThemeContext";

/* ---------- helpers ---------- */
const localISODate = (d = new Date()) => {
  const dt = d instanceof Date ? d : new Date(String(d));
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

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

const normalizeSeminar = (s) => ({
  id: s._id ?? s.id ?? (s._key ?? null) ?? Math.random().toString(36).slice(2),
  hallName: s.hallName || (s.hall && (s.hall.name || s.hall)) || s.hall_id || s.room || "--",
  slotTitle: s.slotTitle || s.title || s.topic || s.name || s.bookingName || s.organizer || "Untitled Seminar",
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

  // Hall/day panel state
  const [selectedHall, setSelectedHall] = useState("");
  const [selectedDate, setSelectedDate] = useState(localISODate());
  const [hallDayBookings, setHallDayBookings] = useState([]);
  const [hallDayLoading, setHallDayLoading] = useState(false);

  // notifications feed
  const [requestsFeed, setRequestsFeed] = useState([]);

  /* fetchers */
  const fetchSeminars = useCallback(async () => {
    try {
      const res = await api.get("/seminars");
      const data = Array.isArray(res?.data) ? res.data : res?.data?.seminars || [];
      setSeminars(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("fetchSeminars", err);
      setSeminars([]);
      if (err?.response?.status === 401) setError("Unauthorized — please login.");
      else setError("Failed to fetch seminars.");
    }
  }, []);

  const fetchHalls = useCallback(async () => {
    try {
      const res = await api.get("/halls");
      const data = Array.isArray(res?.data) ? res.data : (res?.data?.halls || []);
      setHalls(Array.isArray(data) ? data : []);
      if ((!selectedHall || selectedHall === "") && Array.isArray(data) && data.length > 0) {
        const first = data[0];
        const key = first.hallName || first.name || first.title || first._id || first.id || "";
        setSelectedHall(key);
      }
    } catch (err) {
      console.error("fetchHalls", err);
      setHalls([]);
      if (err?.response?.status === 401) setError("Unauthorized — please login.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setError("");
    Promise.allSettled([fetchSeminars(), fetchHalls(), fetchUsers(), fetchDepartments()]).finally(() =>
      setLoading(false)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // fetch hall/day bookings
  const fetchHallDay = useCallback(async (hall, date) => {
    if (!hall || !date) {
      setHallDayBookings([]);
      return;
    }
    setHallDayLoading(true);
    try {
      const res = await api.get(`/seminars/day/${encodeURIComponent(date)}?hallName=${encodeURIComponent(hall)}`);
      setHallDayBookings(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      console.error("fetchHallDay", err);
      setHallDayBookings([]);
      if (err?.response?.status === 401) setError("Unauthorized — please login.");
    } finally {
      setHallDayLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedHall && selectedDate) fetchHallDay(selectedHall, selectedDate);
  }, [selectedHall, selectedDate, fetchHallDay]);

  // marquee-like poll for PENDING / CANCEL_REQUESTED (keeps original poll behavior)
  useEffect(() => {
    let cancelled = false;
    let timer = null;
    const poll = async () => {
      try {
        const res = await api.get("/seminars");
        if (cancelled) return;
        const arr = Array.isArray(res?.data) ? res.data : [];
        const feed = (arr || [])
          .filter((s) => {
            const st = String((s.status || "").toUpperCase());
            return st === "PENDING" || st === "CANCEL_REQUESTED";
          })
          .map((s) => {
            const st = String((s.status || "").toUpperCase());
            return {
              id: s._id ?? s.id,
              title: s.slotTitle || s.title || s.slot || "Booking",
              hall: s.hallName || (s.hall && s.hall.name) || s.hall || "—",
              date: safeDate(s.date || s.startDate || s.appliedAt),
              type: st === "PENDING" ? "Booking Request" : "Cancel Request",
            };
          });
        
        // Fix 7: Use functional update with shallow compare to prevent re-renders
        setRequestsFeed((prevFeed) => {
          const newFeedStr = JSON.stringify(feed);
          if (newFeedStr !== JSON.stringify(prevFeed)) {
            return feed;
          }
          return prevFeed;
        });

      } catch (err) {
        // ignore
      } finally {
        if (!cancelled) timer = setTimeout(poll, 10000);
      }
    };
    poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  const handleLogout = () => {
    if (typeof setUser === "function") setUser(null);
    localStorage.clear();
    navigate("/");
  };

  const recentSeminars = useMemo(() => {
    if (!seminars || seminars.length === 0) return [];
    return seminars.map(normalizeSeminar).reverse().slice(0, 8);
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

  if (!user) return null;

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-700 ${isDtao ? "text-slate-100" : "text-slate-900"}`}>
      <Navbar user={user} handleLogout={handleLogout} />

      <main className="flex-1 max-w-7xl mx-auto px-4 pt-20 pb-8 w-full">
        <Routes>
          <Route path="add-user" element={<AddUserPage />} />
          <Route path="add-seminar" element={<AddSeminarPage halls={halls} />} />
          <Route path="requests" element={<RequestsPage />} />
          <Route path="seminars" element={<AllSeminarsPage seminars={seminars} />} />
          <Route path="departments" element={<AllDepartmentsPage />} />
          <Route path="manage-departments" element={<ManageDepartmentsPage />} />
          <Route path="operators" element={<ManageOperatorsPage />} />
          <Route path="seminar-details" element={<SeminarDetails />} />
          <Route path="halls" element={<ManageHallsPage fetchHalls={fetchHalls} halls={halls} />} />
          <Route path="export" element={<ExportPage />} />

          {/* NEW: calendar route */}
          <Route path="calendar" element={<AdminCalendarPage />} />

          <Route
            path="*"
            element={
              <>
                {/* Top ticker notifications (replaces deprecated <marquee>) */}
                <div className="mb-4">
                  {requestsFeed && requestsFeed.length > 0 ? (
                    <div className={`${isDtao ? "bg-black/40 border border-violet-900 text-slate-100" : "bg-white shadow-sm"} rounded-md p-2 overflow-hidden`}>
                      {/* Inline styles + accessible animation that respects prefers-reduced-motion */}
                      <style>{`
                        .ticker-wrap { position: relative; overflow: hidden; width: 100%; }
                        .ticker-inner { display: inline-flex; gap: 32px; white-space: nowrap; will-change: transform; }
                        @keyframes tickerScroll {
                          0% { transform: translateX(0); }
                          100% { transform: translateX(-50%); }
                        }
                        /* duplicate content so scroll appears continuous */
                        .ticker-play { animation: tickerScroll linear infinite; animation-duration: 18s; }
                        /* pause animation on hover/focus */
                        .ticker-wrap:hover .ticker-play,
                        .ticker-wrap:focus-within .ticker-play { animation-play-state: paused; }
                        /* reduce motion support */
                        @media (prefers-reduced-motion: reduce) {
                          .ticker-play { animation: none; transform: translateX(0); }
                        }
                      `}</style>

                      <div className="ticker-wrap" tabIndex={0} aria-live="polite" aria-atomic="true" role="status">
                        {/* duplicate nodes: render feed twice to create continuous loop effect */}
                        <div className="ticker-play">
                          <div className="ticker-inner">
                            {requestsFeed.map((it, idx) => (
                              // Fix 5: Ticker text color
                              <span key={`a-${it.id || idx}`} className={`text-sm ${isDtao ? "text-violet-300" : "text-slate-700"}`}>
                                <strong>{it.type}:</strong> {it.title} — <em>{it.hall}</em> ({it.date})
                              </span>
                            ))}
                          </div>
                          <div className="ticker-inner" aria-hidden>
                            {requestsFeed.map((it, idx) => (
                              // Fix 5: Ticker text color
                              <span key={`b-${it.id || idx}`} className={`text-sm ${isDtao ? "text-violet-300" : "text-slate-700"}`}>
                                <strong>{it.type}:</strong> {it.title} — <em>{it.hall}</em> ({it.date})
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-0" />
                  )}
                </div>

                {/* SUMMARY */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
                  {Object.entries(summaryCounts).map(([key, val]) => (
                    <div
                      key={key}
                      // DROPDOWN BUG FIX: Removed 'transform' and 'hover:-translate-y-1'
                      className={`rounded-xl p-4 text-center transition-all transition-colors duration-700 ${isDtao ? "bg-black/40 border border-violet-800 shadow-lg" : "bg-white shadow"}`}
                    >
                      <p className={`${isDtao ? "text-slate-300" : "text-gray-600"} font-medium`}>
                        {key.charAt(0).toUpperCase() + key.slice(1)}
                      </p>
                      <p className={`${isDtao ? "text-violet-300" : "text-blue-600"} text-2xl font-bold`}>{val}</p>
                    </div>
                  ))}
                </div>

                {/* MAIN GRID: Left — Hall/Date panel | Right — Recent Seminars */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                  
                  {/* LEFT: Hall & Day panel
                    DROPDOWN/CALENDAR BUG FIX: Added 'isolation-isolate' 
                    This creates a new stacking context, which stops the ticker's 'transform' 
                    animation from messing up the position of native popups (select/date).
                  */}
                  <div className={`${isDtao ? "bg-black/50 border border-violet-900 text-slate-100" : "bg-white"} rounded-xl p-6 shadow transition-colors duration-700 isolation-isolate`}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className={`${isDtao ? "text-slate-100" : "text-gray-800"} text-lg font-semibold`}>Hall — Day View</h3>
                        <p className={`${isDtao ? "text-slate-300" : "text-gray-500"} text-sm mt-1`}>Choose a hall and date to see bookings for that day</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center mb-4">
                      <select
                        // Fix 4: Inline style for dark mode options
                        style={isDtao ? { backgroundColor: "#0b0b10", color: "#f3e8ff" } : {}}
                        // Fix 1: Conditional classes for Dtao theme
                        className={`rounded-md border px-3 py-2 col-span-1 sm:col-span-2 transition ${
                          isDtao
                            ? "bg-black/60 text-slate-100 border-violet-800 focus:border-violet-500"
                            : "bg-white text-gray-800 border-gray-300 focus:border-blue-500"
                        }`}
                        value={selectedHall}
                        onChange={(e) => setSelectedHall(e.target.value)}
                      >
                        {halls && halls.length > 0 ? halls.map((h, idx) => {
                          const label = h.hallName || h.name || h.title || h._id || h.id || "";
                          return <option key={idx} value={label}>{label}</option>;
                        }) : <option value="">No halls</option>}
                      </select>

                      <input
                        type="date"
                        // Fix 1: Conditional classes for Dtao theme
                        className={`rounded-md border px-3 py-2 transition ${
                          isDtao
                            ? "bg-black/60 text-slate-100 border-violet-800 focus:border-violet-500"
                            : "bg-white text-gray-800 border-gray-300 focus:border-blue-500"
                        }`}
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                      />
                    </div>

                    {/* Fix 2 & 3: Conditional classes and transitions */}
                    <div className={`border border-dashed rounded-lg p-4 min-h-[120px] transition-colors duration-700 ${
                      isDtao ? "bg-black/40 border-violet-800 text-slate-100" : "bg-gray-50 border-gray-200 text-gray-700"
                    }`}>
                      {hallDayLoading ? (
                        // Fix 8: Centered loading indicator
                        <div className="flex justify-center items-center text-sm text-gray-400 h-20">
                          <span className="animate-pulse">Loading…</span>
                        </div>
                      ) : hallDayBookings && hallDayBookings.length > 0 ? (
                        <ul className="space-y-2">
                          {hallDayBookings.map((b, i) => {
                            const n = normalizeSeminar(b);
                            return (
                              // Fix 2: Conditional styling for list items
                              <li key={n.id || i} className={`p-2 rounded-md flex justify-between items-start ${isDtao ? "bg-black/20" : "bg-gray-50"}`}>
                                <div className="min-w-0">
                                  <div className={`font-semibold text-sm ${isDtao ? "text-slate-100" : "text-slate-800"}`}>{n.slotTitle}</div>
                                  <div className={`text-xs ${isDtao ? "text-slate-400" : "text-slate-500"}`}>{n.bookingName}{n.department ? ` • ${n.department}` : ""}</div>
                                </div>
                                <div className={`text-right text-xs ${isDtao ? "text-slate-400" : "text-slate-500"}`}>
                                  {n.startTime && n.endTime ? `${n.startTime} — ${n.endTime}` : "Full day"}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        // Fix 2: Conditional text color
                        <div className={`text-center text-sm ${isDtao ? "text-slate-400" : "text-gray-500"}`}>No bookings for this hall on selected date.</div>
                      )}
                    </div>

                    <div className="mt-4 flex gap-3">
                      <button
                        onClick={() => navigate("calendar")}
                        // DROPDOWN BUG FIX: Removed 'transform' and 'hover:-translate-y-0.5'
                        className={`px-4 py-2 rounded-lg font-semibold transition-all duration-500 ${isDtao ? "bg-violet-600 hover:bg-violet-500 text-white shadow-sm" : "bg-blue-600 hover:bg-blue-700 text-white shadow"}`}
                      >
                        Open Full Calendar
                      </button>

                      <button
                        onClick={() => notify && notify("Use full calendar to inspect day-wise bookings", "info", 2000)}
                        // DROPDOWN BUG FIX: Removed 'transform' and 'hover:-translate-y-0.5'
                        className={`px-4 py-2 rounded-lg border transition-all duration-500 ${isDtao ? "border-violet-700 bg-transparent text-slate-100" : "border-gray-200 bg-white text-gray-800"}`}
                      >
                        Help
                      </button>
                    </div>

                    <div className="mt-3 text-xs text-gray-500">Click a booked day in the full calendar to inspect bookings.</div>
                  </div>

                  {/* RIGHT: Recent Seminars */}
                  {/* Fix 3: Added transitions */}
                  <aside className={`${isDtao ? "bg-black/50 border border-violet-900 text-slate-100" : "bg-white"} rounded-xl shadow p-4 transition-colors duration-700`}>
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
                          // DROPDOWN BUG FIX: Removed 'transform' and 'hover:-translate-y-0.5'
                          className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all duration-500 ${
                            isDtao
                              ? "bg-violet-600 hover:bg-violet-500 text-white shadow-sm"
                              : "bg-blue-600 hover:bg-blue-700 text-white shadow"
                          }`}
                        >
                          Export CSV
                        </CSVLink>
                      </div>
                    </div>

                    <div className="mt-4">
                      {loading ? (
                        // Fix 8: Centered loading indicator
                        <div className="flex justify-center items-center text-sm text-gray-400 h-20">
                          <span className="animate-pulse">Loading…</span>
                        </div>
                      ) : error ? (
                        <div className="text-sm text-rose-600">{error}</div>
                      ) : recentSeminars.length === 0 ? (
                        <div className={`${isDtao ? "text-slate-300" : "text-gray-500"} text-sm`}>No recent seminars.</div>
                      ) : (
                        <div className="space-y-3">
                          {recentSeminars.map((s, i) => (
                            // Fix 2 & 3: Conditional card styling and transitions
                            <div key={s.id ?? i} className={`rounded-lg shadow p-4 flex justify-between items-start transition-all transition-colors duration-700 hover:shadow-md ${
                              isDtao ? "bg-black/40 border border-violet-800 text-slate-100" : "bg-white text-gray-800"
                            }`}>
                              <div className="min-w-0">
                                <div className={`${isDtao ? "text-violet-200" : "text-blue-700"} text-sm font-semibold truncate`}>{s.hallName}</div>
                                <div className={`${isDtao ? "text-slate-100" : "text-gray-800"} text-sm`} >{s.slotTitle}</div>
                                <div className={`${isDtao ? "text-slate-300" : "text-xs text-gray-500"} mt-1`}>{s.bookingName}</div>
                              </div>

                              <div className="text-right text-sm">
                                <div className={`${isDtao ? "text-slate-300" : "text-gray-700"}`}>{safeDate(s.date)}</div>
                                <div className="mt-2 flex gap-2 justify-end">
                                  {/* DROPDOWN BUG FIX: Removed 'transform' and 'hover:-translate-y-0.5' */}
                                  <button onClick={() => navigate("/admin/seminars")} className="px-3 py-1 rounded-md bg-blue-600 text-white text-xs font-semibold transition-all duration-500">Details</button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
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
              </>
            }
          />
        </Routes>
      </main>
    </div>
  );
};

export default AdminDashboard;