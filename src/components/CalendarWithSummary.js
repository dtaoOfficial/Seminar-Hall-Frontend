// src/components/CalendarWithSummary.js
import React, { useEffect, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "../styles/CalendarWithSummary.css";

// date helper (YYYY-MM-DD)
const ymd = (d) => {
  const dt = d instanceof Date ? d : new Date(d);
  const year = dt.getFullYear();
  const month = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// normalize DB date (handles ISO string OR Date object)
const normalizeDate = (d) => {
  if (!d) return "";
  try {
    const dt = typeof d === "string" ? new Date(d) : d;
    if (Number.isNaN(dt.getTime())) return "";
    return ymd(dt);
  } catch {
    return "";
  }
};

/**
 * Props:
 *  - seminars: array
 *  - hallName: string
 *  - date, setDate: controlled date
 *  - onSlotsChange: fn
 *  - allowPast: boolean (optional)
 *  - showHeader: boolean (optional) — default true
 *  - showSummary: boolean (optional) — default true
 */
const CalendarWithSummary = ({
  seminars,
  hallName,
  date,
  setDate,
  onSlotsChange,
  allowPast = false,
  showHeader = true,
  showSummary = true,
}) => {
  const [selectedDateSeminars, setSelectedDateSeminars] = useState([]);

  useEffect(() => {
    const dayStr = ymd(date);

    const daySeminars = (seminars || []).filter(
      (s) =>
        normalizeDate(s.date) === dayStr &&
        (s.hallName || "").toString().toLowerCase().trim() === (hallName || "").toString().toLowerCase().trim()
    );

    setSelectedDateSeminars(daySeminars);

    // compute available slots and notify parent
    const hasFullDay = daySeminars.some((s) =>
      (s.slot || "").toString().toLowerCase().includes("full")
    );
    const hasMorning = daySeminars.some((s) =>
      (s.slot || "").toString().toLowerCase().includes("morning")
    );
    const hasAfternoon = daySeminars.some((s) =>
      (s.slot || "").toString().toLowerCase().includes("afternoon")
    );

    let slots = [];
    if (hasFullDay || (hasMorning && hasAfternoon)) {
      slots = [];
    } else if (hasMorning && !hasAfternoon) {
      slots = ["Afternoon"];
    } else if (!hasMorning && hasAfternoon) {
      slots = ["Morning"];
    } else {
      slots = ["Morning", "Afternoon", "Full Day"];
    }

    if (onSlotsChange) onSlotsChange(slots);
  }, [date, seminars, hallName, onSlotsChange]);

  // returns the seminar object that booked the given slot (morning/afternoon/full)
  const getBookedBy = (slotName) =>
    selectedDateSeminars.find((s) =>
      (s.slot || "").toString().toLowerCase().includes(slotName.toLowerCase())
    );

  const hasFullDay = selectedDateSeminars.some((s) =>
    (s.slot || "").toString().toLowerCase().includes("full")
  );

  // tileClassName expects function argument { date, view }
  const tileClassName = ({ date: tileDate, view }) => {
    if (view !== "month") return null; // only style month view tiles
    const dayStr = ymd(tileDate);

    const daySeminars = (seminars || []).filter(
      (s) =>
        normalizeDate(s.date) === dayStr &&
        (s.hallName || "").toString().toLowerCase().trim() === (hallName || "").toString().toLowerCase().trim()
    );

    if (!daySeminars || daySeminars.length === 0) return null;

    const hasFull = daySeminars.some((s) =>
      (s.slot || "").toString().toLowerCase().includes("full")
    );
    const hasM = daySeminars.some((s) =>
      (s.slot || "").toString().toLowerCase().includes("morning")
    );
    const hasA = daySeminars.some((s) =>
      (s.slot || "").toString().toLowerCase().includes("afternoon")
    );

    // priority: full-day or both -> fully-booked (red)
    if (hasFull || (hasM && hasA)) return "fully-booked";
    if (hasM && !hasA) return "morning-booked"; // blue
    if (!hasM && hasA) return "afternoon-booked"; // violet
    return null;
  };

  return (
    <div className="calendar-section" style={{ minWidth: 320 }}>
      {showHeader && <h3>📅 Pick Seminar Date</h3>}

      <Calendar
        value={date}
        onChange={(d) => setDate(d)}
        tileClassName={tileClassName}
        minDate={!allowPast ? new Date() : undefined}
      />

      {showSummary && (
        <div className="date-summary">
          <h4>
            Day Summary · {normalizeDate(date)} · {hallName || "—"}
          </h4>

          {hasFullDay ? (
            <p className="booked">
              Full Day booked by <b>{getBookedBy("full")?.bookingName || "—"}</b> (
              {getBookedBy("full")?.department || "—"}) [
              {getBookedBy("full")?.startTime || "--"} -{" "}
              {getBookedBy("full")?.endTime || "--"}]
            </p>
          ) : (
            <ul>
              <li>
                <span className="badge morning">Morning</span>{" "}
                {getBookedBy("morning") ? (
                  <span className="booked">
                    {getBookedBy("morning")?.bookingName} (
                    {getBookedBy("morning")?.department}) [
                    {getBookedBy("morning")?.startTime || "--"} -{" "}
                    {getBookedBy("morning")?.endTime || "--"}]
                  </span>
                ) : (
                  <span className="available">Available</span>
                )}
              </li>

              <li>
                <span className="badge afternoon">Afternoon</span>{" "}
                {getBookedBy("afternoon") ? (
                  <span className="booked">
                    {getBookedBy("afternoon")?.bookingName} (
                    {getBookedBy("afternoon")?.department}) [
                    {getBookedBy("afternoon")?.startTime || "--"} -{" "}
                    {getBookedBy("afternoon")?.endTime || "--"}]
                  </span>
                ) : (
                  <span className="available">Available</span>
                )}
              </li>
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default CalendarWithSummary;
