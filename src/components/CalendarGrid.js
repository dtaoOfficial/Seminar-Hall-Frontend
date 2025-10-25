// src/components/CalendarGrid.js
import React from "react";

/**
 * CalendarGrid
 *  - Displays per-day booking state for a month.
 *  - Only counts APPROVED seminars.
 *  - Shows % full bar (based on 9am–5pm = 8h window).
 *  - Smooth animation + hover.
 */
const CalendarGrid = ({ data = [], onDayClick = () => {}, month, year }) => {
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

  // Helper functions
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
  const percentLabel = (p) =>
    p == null ? "—" : p >= 100 ? "Full" : `${p}%`;

  // Convert to day-number map safely
  const mapByDay = new Map();
  if (Array.isArray(data)) {
    data.forEach((entry) => {
      if (!entry?.date) return;
      const dt = safeDate(entry.date);
      if (!isNaN(dt.getTime())) {
        mapByDay.set(dt.getUTCDate(), entry);
      }
    });
  }

  const blanks = Array(firstDay).fill(null);
  const dayCells = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const entry = mapByDay.get(d) || null;
    let dateStr = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    let bookings = entry?.bookings || [];
    let approvedBookings = bookings.filter(
      (b) => (b.status || "").toUpperCase() === "APPROVED"
    );

    const bookingCount = approvedBookings.length;
    const free = bookingCount === 0;
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

    const percentFull = Math.round(
      Math.min(100, (totalBookedMinutes / DAY_TOTAL_MIN) * 100)
    );

    dayCells.push({
      date: dateStr,
      free,
      bookingCount,
      percentFull: bookingCount === 0 ? 0 : percentFull,
    });
  }

  const fullGrid = [...blanks, ...dayCells];

  return (
    <div className="w-full transition-all duration-300">
      <div className="grid grid-cols-7 gap-2 text-center mb-2 text-gray-600 text-sm font-semibold">
        {weekdays.map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2 sm:gap-3">
        {fullGrid.map((cell, idx) => {
          if (!cell)
            return <div key={`blank-${idx}`} className="h-20 sm:h-24" />;

          const { date, bookingCount, percentFull, free } = cell;
          const dateNum = Number(date.split("-")[2]);
          const booked = bookingCount > 0;

          const boxColor = booked
            ? "bg-red-50 border-red-200 hover:bg-red-100"
            : "bg-green-50 border-green-200 hover:bg-green-100";

          return (
            <div
              key={`${date}-${idx}`}
              onClick={() => booked && onDayClick(date)}
              className={`cursor-pointer rounded-xl border flex flex-col items-center justify-center p-3 text-center transition-transform duration-300 hover:scale-105 ${boxColor}`}
            >
              <div className="font-bold text-lg">{dateNum}</div>
              <div className="w-full mt-2">
                {booked ? (
                  <>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
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
                    <div className="mt-1 text-xs font-semibold text-red-700">
                      🔴 {percentLabel(percentFull)}
                    </div>
                  </>
                ) : (
                  <div className="text-xs mt-1 font-semibold text-green-700">
                    🟢 Free
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 text-center text-gray-600 text-sm">
        Showing {m}/{y} — Total Days: {daysInMonth}
      </div>
    </div>
  );
};

export default CalendarGrid;
