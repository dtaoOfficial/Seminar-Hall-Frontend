// src/components/CalendarGrid.js
import React from "react";
import { useTheme } from "../contexts/ThemeContext";

/**
 * CalendarGrid
 *  - Displays per-day booking state for a month.
 *  - Only counts APPROVED seminars.
 *  - Smooth animation + hover.
 */
const CalendarGrid = ({ data = [], onDayClick = () => {}, month, year, source = "admin" }) => {
  const { theme } = useTheme() || {};
  const isDtao = theme === "dtao";

  const m = Number(month);
  const y = Number(year);
  if (!m || !y || m < 1 || m > 12)
    return <div className="text-center py-6 text-gray-500">Invalid month/year</div>;

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const firstDay = new Date(y, m - 1, 1).getDay();
  const daysInMonth = new Date(y, m, 0).getDate();

  const DAY_START_MIN = 9 * 60;
  const DAY_END_MIN = 17 * 60;
  const DAY_TOTAL_MIN = DAY_END_MIN - DAY_START_MIN;

  // Helpers
  const safeDate = (v) => {
    try {
      const [yr, mo, dy] = String(v).split("-").map(Number);
      return new Date(Date.UTC(yr, mo - 1, dy));
    } catch {
      return new Date(v);
    }
  };
  const parseTimeToMinutes = (t) => {
    if (!t) return null;
    const s = String(t).trim();
    const m24 = s.match(/^(\d{1,2}):(\d{2})$/);
    if (m24) return Number(m24[1]) * 60 + Number(m24[2]);
    const m12 = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (m12) {
      let hh = Number(m12[1]);
      const mm = Number(m12[2]);
      const ap = m12[3].toUpperCase();
      if (ap === "PM" && hh < 12) hh += 12;
      if (ap === "AM" && hh === 12) hh = 0;
      return hh * 60 + mm;
    }
    try {
      const dt = new Date(s);
      if (!isNaN(dt.getTime())) return dt.getHours() * 60 + dt.getMinutes();
    } catch {}
    return null;
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const percentLabel = (p) => (p == null ? "—" : p >= 100 ? "Full" : `${p}%`);

  // Map by day
  const mapByDay = new Map();
  if (Array.isArray(data)) {
    data.forEach((entry) => {
      if (!entry?.date) return;
      const dt = safeDate(entry.date);
      if (!isNaN(dt.getTime())) mapByDay.set(dt.getUTCDate(), entry);
    });
  }

  const blanks = Array(firstDay).fill(null);
  const dayCells = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const entry = mapByDay.get(d) || null;
    const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const bookings =
      Array.isArray(entry?.bookings) && entry.bookings.length > 0
        ? entry.bookings
        : source === "dept"
        ? (entry ? Array(entry.bookingCount || 0).fill({ status: "APPROVED" }) : [])
        : [];

    const approvedBookings = bookings.filter(
      (b) => (b.status || "").toUpperCase() === "APPROVED"
    );

    const bookingCount = approvedBookings.length;
    let totalBookedMinutes = 0;

    approvedBookings.forEach((b) => {
      const start = parseTimeToMinutes(b.startTime);
      const end = parseTimeToMinutes(b.endTime);
      if (start != null && end != null && end > start) {
        const from = clamp(start, DAY_START_MIN, DAY_END_MIN);
        const to = clamp(end, DAY_START_MIN, DAY_END_MIN);
        totalBookedMinutes += Math.max(0, to - from);
      }
    });

    const percentFull =
      bookingCount === 0
        ? 0
        : Math.round(Math.min(100, (totalBookedMinutes / DAY_TOTAL_MIN) * 100));

    dayCells.push({ date: dateStr, bookingCount, percentFull });
  }

  const fullGrid = [...blanks, ...dayCells];

  return (
    <>
      {/* Hover animation */}
      <style>{`
        .calendar-cell { transition: all 0.3s ease; }
        .calendar-cell:hover { transform: scale(1.05); z-index: 5; }
      `}</style>

      <div
        className={`w-full transition-all duration-500 ${
          isDtao ? "text-slate-100" : "text-gray-800"
        }`}
      >
        {/* Weekday Header */}
        <div
          className={`grid grid-cols-7 gap-3 text-center mb-3 text-sm font-semibold ${
            isDtao ? "text-violet-200 tracking-wide" : "text-gray-600"
          }`}
        >
          {weekdays.map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>

        {/* Responsive grid */}
        <div className="grid grid-cols-4 xs:grid-cols-5 sm:grid-cols-7 gap-3 sm:gap-4">
          {fullGrid.map((cell, idx) => {
            if (!cell)
              return (
                <div
                  key={`blank-${idx}`}
                  className={`rounded-xl h-20 sm:h-24 ${
                    isDtao ? "bg-black/10" : "bg-gray-50"
                  }`}
                />
              );

            const { date, bookingCount, percentFull } = cell;
            const dateNum = Number(date.split("-")[2]);
            const booked = bookingCount > 0;

            // Theme-based coloring
            const boxColor = isDtao
              ? booked
                ? "bg-gradient-to-br from-[#2b001f] via-[#36002a] to-[#44003a] border border-violet-800 hover:shadow-[0_0_15px_rgba(167,139,250,0.3)]"
                : "bg-gradient-to-br from-[#003d2f] via-[#004f3b] to-[#00614a] border border-emerald-700 hover:shadow-[0_0_15px_rgba(52,211,153,0.3)]"
              : booked
              ? "bg-red-50 border-red-200 hover:bg-red-100"
              : "bg-green-50 border-green-200 hover:bg-green-100";

            return (
              <div
                key={`${date}-${idx}`}
                onClick={() => booked && onDayClick(date)}
                className={`calendar-cell cursor-pointer rounded-xl border flex flex-col items-center justify-center p-3 text-center ${boxColor}`}
              >
                <div className="font-bold text-lg">{dateNum}</div>
                <div className="w-full mt-2">
                  {booked ? (
                    <>
                      <div
                        className={`w-full h-2 rounded-full overflow-hidden ${
                          isDtao ? "bg-white/10" : "bg-gray-200"
                        }`}
                      >
                        <div
                          className="h-full transition-all duration-700 ease-out"
                          style={{
                            width: `${percentFull}%`,
                            background:
                              percentFull >= 75
                                ? "linear-gradient(90deg,#fb7185,#ef4444)"
                                : percentFull >= 40
                                ? "linear-gradient(90deg,#fb923c,#f59e0b)"
                                : "linear-gradient(90deg,#34d399,#06b6d4)",
                          }}
                        />
                      </div>
                      <div
                        className={`mt-1 text-xs font-semibold ${
                          isDtao ? "text-violet-300" : "text-red-700"
                        }`}
                      >
                        🔴 {percentLabel(percentFull)}
                      </div>
                    </>
                  ) : (
                    <div
                      className={`text-xs mt-1 font-semibold ${
                        isDtao ? "text-emerald-300" : "text-green-700"
                      }`}
                    >
                      🟢 Free
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div
          className={`mt-6 text-center text-sm ${
            isDtao ? "text-violet-400" : "text-gray-600"
          }`}
        >
          Showing {m}/{y} — Total Days: {daysInMonth}
        </div>
      </div>
    </>
  );
};

export default CalendarGrid;
