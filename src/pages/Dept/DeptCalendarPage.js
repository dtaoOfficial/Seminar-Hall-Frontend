import React, { useEffect, useState, useCallback } from "react";
import api from "../../utils/api";
import CalendarGrid from "../../components/CalendarGrid";
import DayBookingsModal from "../../components/DayBookingsModal";
import { useTheme } from "../../contexts/ThemeContext";

/* months labels */
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

/**
 * buildCalendarFromSeminars
 * - Returns array of days with bookings
 */
function buildCalendarFromSeminars(seminarsList = [], selectedHallKey, yearParam, monthParam) {
  const approved = Array.isArray(seminarsList)
    ? seminarsList.filter((s) => String((s.status || "APPROVED")).toUpperCase() === "APPROVED")
    : [];

  const map = new Map();

  const matchesFilter = (s) => {
    if (!s) return false;
    const hallCandidates = [
      s.hallName, s.hall?.name, s.hall, s.hall_id, s.room, s.venue,
    ].filter(Boolean).map(String);

    const hallMatch = selectedHallKey
      ? hallCandidates.some((c) => String(c) === String(selectedHallKey))
      : true;

    const rawDate = s.date ?? s.startDate ?? s.appliedAt ?? s.createdAt ?? null;
    if (!rawDate) return false;

    const iso = String(rawDate).split("T")[0];
    const dt = new Date(iso);
    if (isNaN(dt.getTime())) return false;

    const m = dt.getMonth() + 1;
    const y = dt.getFullYear();

    return hallMatch && y === Number(yearParam) && m === Number(monthParam);
  };

  approved.forEach((s) => {
    if (!matchesFilter(s)) return;
    let rawDate = s.date ?? s.startDate ?? s.appliedAt ?? null;
    const iso = String(rawDate).split("T")[0];
    if (!iso) return;
    const arr = map.get(iso) || [];
    arr.push(s);
    map.set(iso, arr);
  });

  const daysInMonth = new Date(yearParam, monthParam, 0).getDate();
  const result = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const isoDate = `${yearParam}-${String(monthParam).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const bookings = map.get(isoDate) || [];
    result.push({ date: isoDate, bookingCount: bookings.length, bookings, free: bookings.length === 0 });
  }
  return result;
}

const AdminCalendarPage = () => {
  const { theme } = useTheme() || {};
  const isDtao = theme === "dtao";

  const [seminarHalls, setSeminarHalls] = useState([]);
  const [selectedHall, setSelectedHall] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [calendarData, setCalendarData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [dayBookings, setDayBookings] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");

  // ✅ Load halls once on mount
  useEffect(() => {
    let mounted = true;
    (async function loadHalls() {
      try {
        const res = await api.get("/halls");
        const data = Array.isArray(res?.data) ? res.data : res?.data?.halls ?? [];
        if (!mounted) return;
        setSeminarHalls(data);
        if (!selectedHall && data.length > 0) {
          const first = data[0];
          const key = first.hallName ?? first.name ?? first._id ?? first.id ?? "";
          setSelectedHall(key);
        }
      } catch (err) {
        console.error("loadHalls error:", err?.response ?? err);
        if (!mounted) return;
        setSeminarHalls([]);
        setError(err?.response?.status === 401 ? "Unauthorized - please login again." : "Failed to load halls.");
      }
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ✅ intentionally run only once (warning silenced)

  // Fetch calendar
  const fetchCalendar = useCallback(async () => {
    if (!selectedHall) {
      setCalendarData([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/seminars");
      const raw = Array.isArray(res?.data) ? res.data : res?.data?.seminars ?? [];
      const cal = buildCalendarFromSeminars(raw, selectedHall, year, month);
      setCalendarData(cal);
    } catch (err) {
      console.error("fetchCalendar error:", err?.response ?? err);
      setCalendarData([]);
      setError(err?.response?.status === 401 ? "Unauthorized — please login." : "Failed to fetch calendar data.");
    } finally {
      setLoading(false);
    }
  }, [selectedHall, year, month]);

  // Fetch bookings for selected day
  const fetchDayBookings = useCallback(async (date) => {
    if (!selectedHall || !date) return;
    try {
      const found = (calendarData || []).find((c) => c.date === date);
      if (found && Array.isArray(found.bookings)) {
        setDayBookings(found.bookings);
        setSelectedDay(date);
        setShowModal(true);
        return;
      }
      const res = await api.get(`/seminars?date=${encodeURIComponent(date)}&hallName=${encodeURIComponent(selectedHall)}`);
      const list = Array.isArray(res?.data) ? res.data : res?.data?.seminars ?? [];
      setDayBookings(list);
      setSelectedDay(date);
      setShowModal(true);
    } catch (err) {
      console.error("fetchDayBookings error:", err?.response ?? err);
      setDayBookings([]);
      setSelectedDay(date);
      setShowModal(true);
    }
  }, [selectedHall, calendarData]);

  // Auto-refresh
  useEffect(() => {
    if (selectedHall) fetchCalendar();
  }, [selectedHall, year, month, fetchCalendar]);

  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.25s ease forwards;
        }
      `}</style>

      {/* Themed Root */}
      <div
        className={`min-h-screen w-full transition-colors duration-700 p-4 sm:p-6 md:p-10 ${
          isDtao
            ? "bg-gradient-to-br from-[#05010a] via-[#0b0017] to-[#12002e] text-slate-100"
            : "bg-gray-50 text-gray-800"
        }`}
      >
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h1
              className={`text-2xl sm:text-3xl font-semibold ${
                isDtao ? "text-slate-100" : "text-gray-900"
              }`}
            >
              📅 Seminar Hall Calendar
            </h1>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3 md:items-center transition-all duration-500">
            {/* Hall */}
            <select
              className={`rounded-lg px-3 py-2 w-full md:w-auto focus:ring-2 transition-all duration-300 ${
                isDtao
                  ? "bg-black/40 border-violet-800 text-slate-100 focus:ring-violet-500"
                  : "bg-white border-gray-300 text-gray-800 focus:ring-blue-500"
              }`}
              value={selectedHall}
              onChange={(e) => setSelectedHall(e.target.value)}
            >
              <option value="">-- Select hall (all halls) --</option>
              {seminarHalls.map((h, i) => {
                const name = h.hallName ?? h.name ?? h.title ?? h._id ?? h.id ?? String(h);
                return (
                  <option key={i} value={name}>
                    {name}
                  </option>
                );
              })}
            </select>

            {/* Month */}
            <select
              className={`rounded-lg px-3 py-2 w-full md:w-auto focus:ring-2 transition-all duration-300 ${
                isDtao
                  ? "bg-black/40 border-violet-800 text-slate-100 focus:ring-violet-500"
                  : "bg-white border-gray-300 text-gray-800 focus:ring-blue-500"
              }`}
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
            >
              {MONTHS.map((mLabel, idx) => (
                <option key={idx} value={idx + 1}>
                  {mLabel}
                </option>
              ))}
            </select>

            {/* Year */}
            <input
              type="number"
              className={`rounded-lg px-3 py-2 w-full md:w-auto focus:ring-2 transition-all duration-300 ${
                isDtao
                  ? "bg-black/40 border-violet-800 text-slate-100 focus:ring-violet-500"
                  : "bg-white border-gray-300 text-gray-800 focus:ring-blue-500"
              }`}
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              min="2020"
              max="2100"
            />

            {/* Refresh */}
            <button
              onClick={fetchCalendar}
              className={`px-4 py-2 rounded-lg active:scale-95 transition-all ${
                isDtao
                  ? "bg-violet-600 text-white hover:bg-violet-500"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              Refresh
            </button>
          </div>

          {/* Calendar */}
          <div
            className={`rounded-2xl shadow transition-all duration-700 p-3 sm:p-5 mt-4 ${
              isDtao
                ? "bg-black/30 border border-violet-900/50 backdrop-blur-md"
                : "bg-white"
            }`}
          >
            {loading ? (
              <div
                className={`text-center py-10 animate-pulse ${
                  isDtao ? "text-violet-300" : "text-gray-500"
                }`}
              >
                Loading calendar...
              </div>
            ) : error ? (
              <div
                className={`text-center py-6 font-medium ${
                  isDtao ? "text-red-400" : "text-red-600"
                }`}
              >
                {error}
              </div>
            ) : calendarData && calendarData.length > 0 ? (
              <CalendarGrid
                data={calendarData}
                onDayClick={fetchDayBookings}
                month={month}
                year={year}
              />
            ) : (
              <div
                className={`text-center py-8 ${
                  isDtao ? "text-slate-400" : "text-gray-500"
                }`}
              >
                No bookings found for this month.
              </div>
            )}
          </div>
        </div>

        {/* ✅ Centered Modal */}
        {showModal && (
          <DayBookingsModal
            date={selectedDay}
            bookings={dayBookings}
            onClose={() => setShowModal(false)}
          />
        )}
      </div>
    </>
  );
};

export default AdminCalendarPage;
