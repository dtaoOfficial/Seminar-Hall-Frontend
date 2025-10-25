// src/pages/Admin/AdminCalendarPage.js
import React, { useEffect, useState, useCallback } from "react";
import api from "../../utils/api";
import CalendarGrid from "../../components/CalendarGrid";
import DayBookingsModal from "../../components/DayBookingsModal";

/* months labels */
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

/**
 * buildCalendarFromSeminars - pure helper
 * - Accepts seminars array and explicit filter values (hall/year/month)
 * - Returns array for days in month: [{date, bookingCount, bookings, free}, ...]
 */
function buildCalendarFromSeminars(seminarsList = [], selectedHallKey, yearParam, monthParam) {
  // collect approved seminars only
  const approved = Array.isArray(seminarsList)
    ? seminarsList.filter((s) => String((s.status || "APPROVED")).toUpperCase() === "APPROVED")
    : [];

  // group by date (YYYY-MM-DD)
  const map = new Map();

  const matchesFilter = (s) => {
    if (!s) return false;
    const hallCandidates = [
      s.hallName,
      s.hall?.name,
      s.hall,
      s.hall_id,
      s.room,
      s.venue,
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
    if (!rawDate && s.appliedAt) rawDate = s.appliedAt;
    if (!rawDate) return;

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
    result.push({
      date: isoDate,
      bookingCount: bookings.length,
      bookings: bookings,
      free: bookings.length === 0,
    });
  }
  return result;
}

const AdminCalendarPage = () => {
  const [seminarHalls, setSeminarHalls] = useState([]);
  const [selectedHall, setSelectedHall] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [calendarData, setCalendarData] = useState([]); // array of { date, bookingCount, bookings: [...] }
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [dayBookings, setDayBookings] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");

  // Load halls once on mount
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
        if (err?.response?.status === 401) {
          setError("Unauthorized - please login again.");
        } else {
          setError("Failed to load halls.");
        }
      }
    })();
    return () => { mounted = false; };
    // intentionally no dependencies: run once
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch seminars and build calendarData
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
      if (err?.response?.status === 401) {
        setError("Unauthorized — please login.");
      } else {
        setError("Failed to fetch calendar data.");
      }
    } finally {
      setLoading(false);
    }
  }, [selectedHall, year, month]);

  // Fetch bookings for a date (click)
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

      // fallback: ask backend for /seminars filter by date+hall
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

  // auto-refresh when selection changes
  useEffect(() => {
    if (selectedHall) fetchCalendar();
  }, [selectedHall, year, month, fetchCalendar]);

  return (
    <div className="min-h-screen w-full bg-gray-50 text-gray-800 p-4 sm:p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">📅 Seminar Hall Calendar</h1>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          {/* Hall selector */}
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 w-full md:w-auto focus:ring-2 focus:ring-blue-500"
            value={selectedHall}
            onChange={(e) => setSelectedHall(e.target.value)}
          >
            <option value="">-- Select hall (all halls) --</option>
            {seminarHalls.map((h, i) => {
              const name = h.hallName ?? h.name ?? h.title ?? h._id ?? h.id ?? String(h);
              return <option key={i} value={name}>{name}</option>;
            })}
          </select>

          {/* Month selector */}
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 w-full md:w-auto focus:ring-2 focus:ring-blue-500"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          >
            {MONTHS.map((mLabel, idx) => (
              <option key={idx} value={idx + 1}>{mLabel}</option>
            ))}
          </select>

          {/* Year */}
          <input
            type="number"
            className="border border-gray-300 rounded-lg px-3 py-2 w-full md:w-auto focus:ring-2 focus:ring-blue-500"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            min="2020"
            max="2100"
          />

          <button
            onClick={fetchCalendar}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 active:scale-95 transition-all"
          >
            Refresh
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="bg-white shadow rounded-2xl p-4 sm:p-6 mt-4">
          {loading ? (
            <div className="text-center py-10 text-gray-500 animate-pulse">Loading calendar...</div>
          ) : error ? (
            <div className="text-center py-6 text-red-600">{error}</div>
          ) : calendarData && calendarData.length > 0 ? (
            <CalendarGrid data={calendarData} onDayClick={fetchDayBookings} month={month} year={year} />
          ) : (
            <div className="text-center py-8 text-gray-500">No bookings found for this month.</div>
          )}
        </div>
      </div>

      {/* Day bookings modal */}
      {showModal && (
        <DayBookingsModal
          date={selectedDay}
          bookings={dayBookings}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
};

export default AdminCalendarPage;
