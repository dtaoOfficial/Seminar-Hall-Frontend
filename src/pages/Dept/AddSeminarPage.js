// src/pages/Dept/AddSeminarPage.js

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useLocation } from "react-router-dom";
import api from "../../utils/api";
import { useTheme } from "../../contexts/ThemeContext";
import AnimatedButton from "../../components/AnimatedButton";
import { useNotification } from "../../components/NotificationsProvider";

/* ---------- Constants / helpers ---------- */

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const ymd = (d) => {
  if (!d) return "";
  const dt = d instanceof Date ? d : new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(dt.getDate()).padStart(2, "0")}`;
};

const build15MinOptions = (startHour = 8, endHour = 18) => {
  const out = [];
  for (let h = startHour; h <= endHour; h++) {
    for (let m = 0; m < 60; m += 15) {
      if (h === endHour && m > 0) continue;
      out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return out;
};
const TIME_OPTIONS = build15MinOptions(8, 18);

const hhmmToMinutes = (hhmm) => {
  if (!hhmm) return null;
  const [hh, mm] = hhmm.split(":").map((n) => parseInt(n, 10));
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  return hh * 60 + mm;
};

const minutesToHHMM = (m) => {
  if (m == null) return "";
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
};

const to12Label = (hhmm) => {
  if (!hhmm) return "";
  const [hh, mm] = hhmm.split(":").map(Number);
  const period = hh >= 12 ? "PM" : "AM";
  const hour12 = ((hh + 11) % 12) + 1;
  return `${String(hour12).padStart(2, "0")}:${String(mm).padStart(
    2,
    "0"
  )} ${period}`;
};

const intervalsOverlap = (aStart, aEnd, bStart, bEnd) => {
  if (aStart == null || aEnd == null || bStart == null || bEnd == null)
    return false;
  return aStart < bEnd && bStart < aEnd;
};

const listDatesBetween = (sd, ed) => {
  const out = [];
  const s = new Date(sd);
  s.setHours(0, 0, 0, 0);
  const e = new Date(ed);
  e.setHours(0, 0, 0, 0);
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    out.push(new Date(d));
  }
  return out;
};

/* ---------- icons ---------- */

const CalendarIcon = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" x2="16" y1="2" y2="6" />
    <line x1="8" x2="8" y1="2" y2="6" />
    <line x1="3" x2="21" y1="10" y2="10" />
  </svg>
);

const ClockIcon = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v6l3 2" />
  </svg>
);

const UsersIcon = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
  </svg>
);

/* ---------- TimeSelect ---------- */

function TimeSelect({
  value,
  onChange,
  options = TIME_OPTIONS,
  className = "",
  ariaLabel = "Select time",
  isDtao = false,
}) {
  const ref = useRef(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onDoc(e) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (open) {
      const el = ref.current?.querySelector(`[data-val="${value}"]`);
      if (el?.scrollIntoView) el.scrollIntoView({ block: "nearest" });
    }
  }, [open, value]);

  return (
    <div ref={ref} className={`relative inline-block w-full ${className}`}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((s) => !s)}
        className={`w-full text-left rounded-md px-3 py-2 border flex items-center justify-between ${
          isDtao ? "bg-transparent border-violet-700 text-slate-100" : ""
        }`}
      >
        <span>{to12Label(value)}</span>
        <svg
          className={`w-4 h-4 ml-2 ${
            isDtao ? "text-slate-300" : "text-slate-600"
          }`}
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          tabIndex={-1}
          className={`absolute z-50 mt-1 w-full rounded-md shadow-lg ${
            isDtao
              ? "bg-black/80 border border-violet-800 text-slate-100"
              : "bg-white border"
          }`}
          style={{ maxHeight: `${5 * 40}px`, overflowY: "auto" }}
        >
          {options.map((opt) => (
            <div
              key={opt}
              role="option"
              data-val={opt}
              aria-selected={opt === value}
              tabIndex={0}
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onChange(opt);
                  setOpen(false);
                }
              }}
              className={`px-3 py-2 cursor-pointer ${
                isDtao ? "hover:bg-violet-900/60" : "hover:bg-gray-100"
              } ${
                opt === value
                  ? isDtao
                    ? "bg-violet-900/70 font-semibold"
                    : "bg-blue-50 font-semibold"
                  : ""
              }`}
            >
              {to12Label(opt)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Day bookings modal ---------- */

function DayBookingsOverlay({ isDtao, reduce, date, bookings, onClose }) {
  const prettyDate = (() => {
    if (!date) return "";
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return date;
    return d.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  })();

  return (
    <motion.div
      initial={reduce ? {} : { opacity: 0 }}
      animate={reduce ? {} : { opacity: 1 }}
      exit={reduce ? {} : { opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[70] flex items-center justify-center"
      aria-modal="true"
      role="dialog"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={reduce ? {} : { scale: 0.96, opacity: 0 }}
        animate={reduce ? {} : { scale: 1, opacity: 1 }}
        transition={{ duration: 0.25 }}
        className={`relative max-w-3xl w-[95%] max-h-[80vh] overflow-hidden rounded-2xl shadow-xl ${
          isDtao
            ? "bg-[#05010a] border border-violet-900 text-slate-100"
            : "bg-white"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/40">
          <div>
            <div className="text-xs uppercase tracking-[0.14em] text-slate-400">
              Bookings on
            </div>
            <div className="text-lg font-semibold">{prettyDate}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm px-3 py-1.5 rounded-full bg-slate-200/70 hover:bg-slate-300/80 text-slate-800"
          >
            Close
          </button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto max-h-[70vh]">
          {bookings.length === 0 ? (
            <div
              className={`text-sm text-center py-6 ${
                isDtao ? "text-slate-300" : "text-slate-600"
              }`}
            >
              No bookings for this date.
            </div>
          ) : (
            bookings.map((b, idx) => (
              <BookingCard
                key={b._id || b.id || idx}
                booking={b}
                isDtao={isDtao}
              />
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function BookingCard({ booking, isDtao }) {
  const [open, setOpen] = useState(false);

  const hallName =
    booking.hallName ||
    booking.hall?.name ||
    booking.hall ||
    booking.room ||
    booking.venue ||
    "—";
  const title =
    booking.slotTitle || booking.title || booking.topic || "Untitled";
  const dept =
    booking.department || booking.dept || booking.departmentName || "—";
  const dateStr = (booking.date || booking.startDate || "")
    .toString()
    .split("T")[0];
  const timeStr =
    booking.startTime && booking.endTime
      ? `${to12Label(booking.startTime)} – ${to12Label(booking.endTime)}`
      : booking.type === "day"
      ? "Full day"
      : "—";
  const status = (booking.status || "APPROVED").toString();
  const organizer =
    booking.bookingName ||
    booking.organizer ||
    booking.requesterName ||
    booking.userName ||
    "—";
  const email = booking.email || "—";
  const phone = booking.phone || booking.mobile || "—";
  const remarks = booking.remarks || "—";

  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm ${
        isDtao ? "bg-black/40 border-violet-800" : "bg-slate-50 border-slate-200"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-xs uppercase tracking-[0.14em] text-slate-400">
            {dept}
          </div>
          <div className="font-semibold">{title}</div>
          <div className="text-xs mt-1 text-slate-500">
            Hall: <span className="font-medium">{hallName}</span>
          </div>
          <div className="text-xs text-slate-500">
            Date: {dateStr} • Time: {timeStr}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              status.toUpperCase() === "APPROVED"
                ? "bg-emerald-100 text-emerald-700"
                : status.toUpperCase() === "REJECTED"
                ? "bg-rose-100 text-rose-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {status}
          </span>
          <button
            type="button"
            onClick={() => setOpen((s) => !s)}
            className="mt-1 text-xs px-3 py-1 rounded-full border border-slate-300 hover:bg-slate-100"
          >
            {open ? "Hide details" : "More details"}
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-3 border-t pt-2 text-xs space-y-1 text-slate-500">
          <div>
            <span className="font-semibold">Organizer:</span> {organizer}
          </div>
          <div>
            <span className="font-semibold">Email:</span> {email}
          </div>
          <div>
            <span className="font-semibold">Phone:</span> {phone}
          </div>
          <div>
            <span className="font-semibold">Remarks:</span> {remarks}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- success overlay ---------- */
function SuccessOverlay({ show, isDtao, reduce }) {
  if (!show) return null;
  return (
    <motion.div
      initial={reduce ? {} : { opacity: 0 }}
      animate={reduce ? {} : { opacity: 1 }}
      exit={reduce ? {} : { opacity: 0 }}
      transition={{ duration: 0.28 }}
      className="fixed inset-0 z-[60] flex items-center justify-center"
      aria-hidden={!show}
    >
      <motion.div
        initial={reduce ? {} : { scale: 0.98, opacity: 0 }}
        animate={reduce ? {} : { scale: 1, opacity: 1 }}
        transition={{
          duration: 0.28,
          type: "spring",
          stiffness: 350,
          damping: 28,
        }}
        className={`${
          isDtao
            ? "rounded-2xl bg-black/80 border border-violet-800 p-6 shadow-xl text-slate-100"
            : "rounded-2xl bg-white p-6 shadow-xl"
        }`}
        style={{ backdropFilter: "blur(6px)" }}
        role="status"
        aria-live="polite"
      >
        <div className="text-lg font-semibold">Request sent!</div>
        <div
          className={`${isDtao ? "text-slate-300" : "text-slate-600"} text-sm`}
        >
          Your seminar request is now PENDING for admin approval.
        </div>
      </motion.div>

      <motion.div
        initial={reduce ? {} : { opacity: 0 }}
        animate={reduce ? {} : { opacity: 1 }}
        transition={{ duration: 0.36 }}
        className="absolute inset-0"
        style={{
          background: "rgba(0,0,0,0.35)",
          backdropFilter: "blur(6px)",
        }}
        onClick={(e) => e.stopPropagation()}
        aria-hidden
      />
    </motion.div>
  );
}

/* ---------- MAIN COMPONENT ---------- */

export default function DeptAddSeminarPage() {
  const { theme } = useTheme() || {};
  const isDtao = theme === "dtao";
  const reduce = useReducedMotion();
  const notificationApi = useNotification();
  const location = useLocation();

  const [bookingMode, setBookingMode] = useState("time");
  const [slotTitle, setSlotTitle] = useState("");

  const [bookingName, setBookingName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [phone, setPhone] = useState("");

  const [date, setDate] = useState(new Date());
  const [startTime, setStartTime] = useState(TIME_OPTIONS[4] || "09:00");
  const [endTime, setEndTime] = useState(TIME_OPTIONS[8] || "10:00");

  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [daySlots, setDaySlots] = useState({});

  const [halls, setHalls] = useState([]);
  const [seminars, setSeminars] = useState([]);
  const [selectedHall, setSelectedHall] = useState("");
  const [selectedHallObj, setSelectedHallObj] = useState(null);

  const [lastCheckOk, setLastCheckOk] = useState(false);
  const [lastCheckMessage, setLastCheckMessage] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [, setAppliedAt] = useState("");

  // calendar
  const now = new Date();
  const [calendarMonth, setCalendarMonth] = useState(now.getMonth());
  const [calendarYear, setCalendarYear] = useState(now.getFullYear());

  const [showDayModal, setShowDayModal] = useState(false);
  const [dayModalDate, setDayModalDate] = useState("");
  const [dayModalBookings, setDayModalBookings] = useState([]);

  const notifTimerRef = useRef(null);

  const DEFAULT_REMARKS = "Requested by Dept";

  const showNotification = useCallback(
    (msg, type = "info", ms = 3500) => {
      if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
      if (notificationApi && typeof notificationApi.notify === "function") {
        notificationApi.notify(msg, type, {
          autoDismiss: ms,
        });
      }
      if (ms > 0) {
        notifTimerRef.current = setTimeout(() => {}, ms);
      }
    },
    [notificationApi]
  );

  // Read logged-in DEPARTMENT user from localStorage (handles seminarhall_dept_user key)
  const getLoggedUser = () => {
    try {
      let raw = null;

      // Look specifically for your seminarhall dept user key
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i) || "";
        if (
          key.includes("seminarhall_dept_user") || // your actual key
          key.endsWith("_dept_user") || // fallback pattern
          key.endsWith("_user") // generic fallback
        ) {
          const v = localStorage.getItem(key);
          if (v) {
            raw = v;
            break;
          }
        }
      }

      if (!raw) return null;

      const base = JSON.parse(raw);
      if (!base || typeof base !== "object") return null;

      // Map fields exactly as stored:
      return {
        name: base.name || "",
        email: base.email || "",
        department: base.department || "",
        phone: base.phone || "",
      };
    } catch (e) {
      console.error("Failed to parse dept user from localStorage", e);
      return null;
    }
  };

  /* ---------- fetch data ---------- */

  const fetchAll = useCallback(
    async () => {
      try {
        const [hRes, sRes] = await Promise.all([
          api.get("/halls").catch(() => ({ data: [] })),
          api.get("/seminars").catch(() => ({ data: [] })),
        ]);

        const hallsData = Array.isArray(hRes.data) ? hRes.data : [];
        const semData = Array.isArray(sRes.data) ? sRes.data : [];

        setHalls(hallsData);
        setSeminars(semData);

        if (!selectedHall && hallsData.length > 0) {
          const first = hallsData[0];
          setSelectedHall(first.name || first._id || first.id || "");
          setSelectedHallObj(first);
        }
      } catch (err) {
        console.error("Dept fetchAll error:", err);
        showNotification("Error fetching halls / seminars", "error");
      }
    },
    [selectedHall, showNotification]
  );

  useEffect(() => {
    fetchAll();
    return () => {
      if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
    };
  }, [fetchAll]);

  useEffect(() => {
    if (!selectedHall) {
      setSelectedHallObj(null);
      return;
    }
    const obj = halls.find(
      (h) =>
        h.name === selectedHall ||
        String(h._id) === String(selectedHall) ||
        String(h.id) === String(selectedHall)
    );
    setSelectedHallObj(obj || null);
  }, [selectedHall, halls]);

  /* ---------- normalize seminars for availability ---------- */

  const normalizedBookings = useMemo(() => {
    const map = new Map();

    const toDateKey = (value) => {
      if (!value) return null;
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return null;
      return ymd(d);
    };

    (seminars || []).forEach((s) => {
      try {
        if (String((s.status || "APPROVED")).toUpperCase() !== "APPROVED")
          return;

        const hallName = s.hallName || s.hall?.name || "";
        const hallId = s.hallId || s.hall?._id || s.hall?.id || "";

        // day-range full
        if (s.startDate && s.endDate && !s.daySlots) {
          const sdKey = toDateKey(s.startDate);
          const edKey = toDateKey(s.endDate);
          if (!sdKey || !edKey) return;
          const days = listDatesBetween(new Date(sdKey), new Date(edKey));
          days.forEach((d) => {
            const key = ymd(d);
            const arr = map.get(key) || [];
            arr.push({
              date: key,
              startMin: 0,
              endMin: 1440,
              hallName,
              hallId,
              original: s,
              type: "day",
            });
            map.set(key, arr);
          });
          return;
        }

        // aggregated with daySlots
        if (s.daySlots && typeof s.daySlots === "object") {
          const keys = Object.keys(s.daySlots || {}).sort();
          if (keys.length === 0) return;
          for (const key of keys) {
            const val = s.daySlots[key];
            if (!val) {
              const arr = map.get(key) || [];
              arr.push({
                date: key,
                startMin: 0,
                endMin: 1440,
                hallName,
                hallId,
                original: s,
                type: "day",
              });
              map.set(key, arr);
            } else {
              const sMin = hhmmToMinutes(val.startTime || val.start);
              const eMin = hhmmToMinutes(val.endTime || val.end);
              const arr = map.get(key) || [];
              if (sMin != null && eMin != null) {
                arr.push({
                  date: key,
                  startMin: sMin,
                  endMin: eMin,
                  hallName,
                  hallId,
                  original: s,
                  type: "time",
                });
              } else {
                arr.push({
                  date: key,
                  startMin: 0,
                  endMin: 1440,
                  hallName,
                  hallId,
                  original: s,
                  type: "day",
                });
              }
              map.set(key, arr);
            }
          }
          return;
        }

        const dateKey =
          toDateKey(s.date) || toDateKey(s.startDate) || toDateKey(new Date());
        if (!dateKey) return;

        if (!s.startTime || !s.endTime) {
          const arr = map.get(dateKey) || [];
          arr.push({
            date: dateKey,
            startMin: 0,
            endMin: 1440,
            hallName,
            hallId,
            original: s,
            type: "day",
          });
          map.set(dateKey, arr);
          return;
        }

        const sMin = hhmmToMinutes(s.startTime);
        const eMin = hhmmToMinutes(s.endTime);
        const arr = map.get(dateKey) || [];
        if (sMin == null || eMin == null) {
          arr.push({
            date: dateKey,
            startMin: 0,
            endMin: 1440,
            hallName,
            hallId,
            original: s,
            type: "day",
          });
        } else {
          arr.push({
            date: dateKey,
            startMin: sMin,
            endMin: eMin,
            hallName,
            hallId,
            original: s,
            type: "time",
          });
        }
        map.set(dateKey, arr);
      } catch (e) {
        console.error("normalize seminar error (dept)", e, s);
      }
    });

    return map;
  }, [seminars]);

  const isDateFullDayBlocked = useCallback(
    (dateStr, hallKey) => {
      const arr = normalizedBookings.get(dateStr) || [];
      return arr.some(
        (b) =>
          (b.type === "day" || (b.startMin === 0 && b.endMin === 1440)) &&
          (b.hallName === hallKey || String(b.hallId) === String(hallKey))
      );
    },
    [normalizedBookings]
  );

  const getCalendarDayStatus = (dateStr, hallKey) => {
    const arr = normalizedBookings.get(dateStr) || [];
    if (!hallKey) {
      if (arr.length === 0) return "free";
      const full = arr.some(
        (b) => b.type === "day" || (b.startMin === 0 && b.endMin === 1440)
      );
      return full ? "full" : "partial";
    }
    const hallBookings = arr.filter(
      (b) => b.hallName === hallKey || String(b.hallId) === String(hallKey)
    );
    if (hallBookings.length === 0) return "free";
    if (
      hallBookings.some(
        (b) => b.type === "day" || (b.startMin === 0 && b.endMin === 1440)
      )
    )
      return "full";
    return "partial";
  };

  /* ---------- availability check ---------- */

  const checkTimeWiseAvailability = () => {
    if (!selectedHall)
      return { ok: false, msg: "Please select a hall (Venue) first." };
    if (!date) return { ok: false, msg: "Pick a date." };
    if (!startTime || !endTime)
      return { ok: false, msg: "Pick start & end times." };

    const ds = ymd(date);
    const sMin = hhmmToMinutes(startTime);
    const eMin = hhmmToMinutes(endTime);
    if (sMin == null || eMin == null)
      return { ok: false, msg: "Invalid time." };
    if (eMin <= sMin)
      return { ok: false, msg: "End time must be after start time." };

    if (isDateFullDayBlocked(ds, selectedHall))
      return {
        ok: false,
        msg: `Date ${ds} is fully blocked for this hall.`,
      };

    const arr = normalizedBookings.get(ds) || [];
    const overlapping = arr.filter((b) => {
      const hallMatch =
        b.hallName === selectedHall || String(b.hallId) === String(selectedHall);
      if (!hallMatch) return false;
      return intervalsOverlap(sMin, eMin, b.startMin, b.endMin);
    });

    if (overlapping.length === 0) {
      return {
        ok: true,
        msg: `Available ${to12Label(
          startTime
        )} — ${to12Label(endTime)} on ${ds}`,
      };
    }

    const conflictMsgs = overlapping.map(
      (b) =>
        `${b.date} (${minutesToHHMM(b.startMin)} — ${minutesToHHMM(
          b.endMin
        )})`
    );

    const needed = eMin - sMin;
    const dayStart = hhmmToMinutes(TIME_OPTIONS[0]);
    const dayEnd =
      hhmmToMinutes(TIME_OPTIONS[TIME_OPTIONS.length - 1]) + 15;
    let suggestion = null;

    for (let cand = dayStart; cand + needed <= dayEnd; cand += 15) {
      let conflict = false;
      for (const b of arr) {
        const hallMatch =
          b.hallName === selectedHall ||
          String(b.hallId) === String(selectedHall);
        if (!hallMatch) continue;
        if (intervalsOverlap(cand, cand + needed, b.startMin, b.endMin)) {
          conflict = true;
          break;
        }
      }
      if (!conflict) {
        suggestion = cand;
        break;
      }
    }

    const conflictText = `Conflicts: ${conflictMsgs.join(", ")}`;
    const suggestionText =
      suggestion != null
        ? `Try ${to12Label(
            minutesToHHMM(suggestion)
          )} — ${to12Label(minutesToHHMM(suggestion + needed))} on ${ds}`
        : `No alternative free slot on ${ds}`;
    return { ok: false, msg: `${conflictText}. ${suggestionText}` };
  };

  const checkDayWiseAvailability = () => {
    if (!selectedHall)
      return { ok: false, msg: "Please select a hall (Venue) first." };
    if (!startDate || !endDate)
      return { ok: false, msg: "Pick start & end dates." };

    const sd = new Date(startDate);
    const ed = new Date(endDate);
    sd.setHours(0, 0, 0, 0);
    ed.setHours(0, 0, 0, 0);
    if (ed < sd)
      return { ok: false, msg: "End date cannot be before start date." };

    const days = listDatesBetween(sd, ed);
    const conflicts = [];
    const suggestions = [];

    for (const d of days) {
      const key = ymd(d);
      if (isDateFullDayBlocked(key, selectedHall)) {
        conflicts.push(`${key} (full-day)`);
        continue;
      }
      const dsObj = daySlots[key];
      if (!dsObj || !dsObj.startTime || !dsObj.endTime) continue;
      const sMin = hhmmToMinutes(dsObj.startTime);
      const eMin = hhmmToMinutes(dsObj.endTime);
      if (sMin == null || eMin == null || eMin <= sMin) {
        conflicts.push(`${key} (invalid time)`);
        continue;
      }
      const arr = normalizedBookings.get(key) || [];
      const overlap = arr.some((b) => {
        const hallMatch =
          b.hallName === selectedHall ||
          String(b.hallId) === String(selectedHall);
        if (!hallMatch) return false;
        return intervalsOverlap(sMin, eMin, b.startMin, b.endMin);
      });
      if (overlap) {
        conflicts.push(`${key} (${dsObj.startTime} — ${dsObj.endTime})`);
        const needed = eMin - sMin;
        const dayStart = hhmmToMinutes(TIME_OPTIONS[0]);
        const dayEnd =
          hhmmToMinutes(TIME_OPTIONS[TIME_OPTIONS.length - 1]) + 15;
        let found = null;
        for (let cand = dayStart; cand + needed <= dayEnd; cand += 15) {
          let conf = false;
          for (const b of arr) {
            const hallMatch =
              b.hallName === selectedHall ||
              String(b.hallId) === String(selectedHall);
            if (!hallMatch) continue;
            if (intervalsOverlap(cand, cand + needed, b.startMin, b.endMin)) {
              conf = true;
              break;
            }
          }
          if (!conf) {
            found = cand;
            break;
          }
        }
        if (found != null) {
          suggestions.push(
            `${key}: ${to12Label(
              minutesToHHMM(found)
            )} — ${to12Label(minutesToHHMM(found + needed))}`
          );
        }
      }
    }

    if (conflicts.length) {
      let msg = `Conflicts on: ${conflicts.join(", ")}`;
      if (suggestions.length)
        msg += `. Suggestions: ${suggestions.slice(0, 3).join("; ")}`;
      return { ok: false, msg };
    }

    return {
      ok: true,
      msg: `All selected days available (${ymd(sd)} → ${ymd(ed)})`,
    };
  };

  const doCheckAvailability = async () => {
    setLastCheckOk(false);
    setLastCheckMessage("");
    const res =
      bookingMode === "day"
        ? checkDayWiseAvailability()
        : checkTimeWiseAvailability();
    setLastCheckOk(!!res.ok);
    setLastCheckMessage(res.msg);
    showNotification(res.msg, res.ok ? "success" : "warn", res.ok ? 3000 : 7000);
    return res;
  };

  /* ---------- submit ---------- */

  const resetForm = () => {
    setSlotTitle("");
    setStartTime(TIME_OPTIONS[4] || "09:00");
    setEndTime(TIME_OPTIONS[8] || "10:00");
    setStartDate(new Date());
    setEndDate(new Date());
    setDaySlots({});
    setLastCheckOk(false);
    setLastCheckMessage("");
    showNotification("Form cleared.", "info", 1500);
  };

  const handleSubmit = async (e) => {
    e && e.preventDefault();

    const res =
      bookingMode === "day"
        ? checkDayWiseAvailability()
        : checkTimeWiseAvailability();
    if (!res.ok) {
      setLastCheckOk(false);
      setLastCheckMessage(res.msg);
      showNotification(res.msg, "warn", 6000);
      return;
    }

    if (!slotTitle || !slotTitle.trim()) {
      showNotification("Event name required", "warn");
      return;
    }

    if (!email || !bookingName || !department || !phone) {
      showNotification("Profile info missing. Please login again.", "warn");
      return;
    }

    try {
      const nowIso = new Date().toISOString();
      if (bookingMode === "time") {
        const payload = {
          hallName: selectedHall || selectedHallObj?.name,
          slot: "Custom",
          slotTitle,
          bookingName,
          email,
          department,
          phone,
          status: "PENDING",
          remarks: DEFAULT_REMARKS,
          appliedAt: nowIso,
          date: ymd(date),
          startTime,
          endTime,
        };
        await api.post("/seminars", payload);
      } else {
        const days = listDatesBetween(startDate, endDate);
        const submittedDaySlots = {};
        for (const d of days) {
          const key = ymd(d);
          const ds = daySlots[key];
          if (ds && ds.startTime && ds.endTime) {
            submittedDaySlots[key] = {
              startTime: ds.startTime,
              endTime: ds.endTime,
            };
          } else {
            submittedDaySlots[key] = null; // full-day
          }
        }

        const payload = {
          hallName: selectedHall || selectedHallObj?.name,
          slot: "DayRange",
          slotTitle,
          bookingName,
          email,
          department,
          phone,
          status: "PENDING",
          remarks: DEFAULT_REMARKS,
          appliedAt: nowIso,
          startDate: ymd(startDate),
          endDate: ymd(endDate),
          daySlots: submittedDaySlots,
        };
        await api.post("/seminars", payload);
      }

      await fetchAll();
      resetForm();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 1600);
    } catch (err) {
      console.error("Dept submit error:", err);
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Error submitting request";
      showNotification(String(msg), "error", 6000);
    }
  };

  /* ---------- sync daySlots with date range ---------- */

  useEffect(() => {
    if (!startDate || !endDate) return;
    const sd = new Date(startDate);
    const ed = new Date(endDate);
    sd.setHours(0, 0, 0, 0);
    ed.setHours(0, 0, 0, 0);
    if (ed < sd) return;
    const days = listDatesBetween(sd, ed);
    setDaySlots((prev) => {
      const next = { ...prev };
      days.forEach((d) => {
        const k = ymd(d);
        if (!next[k])
          next[k] = {
            startTime: TIME_OPTIONS[4],
            endTime: TIME_OPTIONS[8],
          };
      });
      Object.keys(next).forEach((k) => {
        if (!days.some((d) => ymd(d) === k)) delete next[k];
      });
      return next;
    });
  }, [startDate, endDate]);

  /* ---------- calendar cells ---------- */

  const firstOfMonth = new Date(calendarYear, calendarMonth, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const calendarCells = [];
  for (let i = 0; i < startWeekday; i++) calendarCells.push(null);
  for (let dNum = 1; dNum <= daysInMonth; dNum++) calendarCells.push(dNum);

  const selectedDateForDisplay = bookingMode === "time" ? date : startDate;
  const selectedDateKey = ymd(selectedDateForDisplay);

  /* ---------- day click -> set form + show modal ---------- */

  const extractIsoDate = (s) => {
    const raw =
      s.date ?? s.startDate ?? s.appliedAt ?? s.createdAt ?? null;
    if (!raw) return null;
    return String(raw).split("T")[0];
  };

  const handleCalendarDayClick = (dayNumber) => {
    if (!dayNumber) return;
    const d = new Date(calendarYear, calendarMonth, dayNumber);

    if (bookingMode === "time") {
      setDate(d);
    } else {
      setStartDate(d);
      setEndDate(d);
    }
    setLastCheckOk(false);
    setLastCheckMessage("");

    const clickedKey = ymd(d);
    const list = (seminars || []).filter((s) => {
      const status = String((s.status || "APPROVED")).toUpperCase();
      if (status !== "APPROVED" && status !== "PENDING") return false;
      const iso = extractIsoDate(s);
      if (!iso || iso !== clickedKey) return false;

      const hallCandidates = [
        s.hallName,
        s.hall?.name,
        s.hall,
        s.hall_id,
        s.room,
        s.venue,
      ]
        .filter(Boolean)
        .map(String);

      if (selectedHall) {
        return hallCandidates.some((c) => String(c) === String(selectedHall));
      }
      return true;
    });

    setDayModalDate(clickedKey);
    setDayModalBookings(list);
    setShowDayModal(true);
  };

  /* ---------- prefill user + location state ---------- */

  useEffect(() => {
    const u = getLoggedUser();
    if (u) {
      if (u.email) setEmail(u.email);
      if (u.name) setBookingName((prev) => prev || u.name);
      if (u.department) setDepartment((prev) => prev || u.department);
      if (u.phone) setPhone((prev) => prev || u.phone);
    }

    const st = location.state || {};
    if (st.selectedHall) setSelectedHall(st.selectedHall);
    if (st.date) {
      try {
        const d = new Date(st.date);
        setDate(d);
        setStartDate(d);
        setEndDate(d);
      } catch {}
    }
    if (st.selectedStartTime) setStartTime(st.selectedStartTime);
    if (st.selectedEndTime) setEndTime(st.selectedEndTime);
    setAppliedAt(new Date().toISOString());
  }, [location.state]);

  /* ---------- render ---------- */

  return (
    <div
      className={`${
        isDtao
          ? "min-h-screen p-6 bg-[#08050b] text-slate-100"
          : "min-h-screen bg-slate-50 p-6"
      }`}
    >
      <SuccessOverlay show={showSuccess} isDtao={isDtao} reduce={reduce} />

      {showDayModal && (
        <DayBookingsOverlay
          isDtao={isDtao}
          reduce={reduce}
          date={dayModalDate}
          bookings={dayModalBookings}
          onClose={() => setShowDayModal(false)}
        />
      )}

      <motion.div
        className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8"
        initial={reduce ? {} : { opacity: 0, y: 6 }}
        animate={reduce ? {} : { opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* LEFT: Dept form */}
        <motion.section
          className={`${
            isDtao
              ? "bg-black/40 border border-violet-900 text-slate-100"
              : "bg-white"
          } rounded-2xl p-6 shadow`}
          initial={reduce ? {} : { opacity: 0, y: 8 }}
          animate={reduce ? {} : { opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.05 }}
        >
          {/* Venue header with dropdown */}
          <div className="flex flex-col sm:flex-row items-center gap-3 mb-4">
            <span className="text-xs font-semibold tracking-[0.15em] uppercase">
              Venue
            </span>

            <select
              value={selectedHall}
              onChange={(e) => {
                setSelectedHall(e.target.value);
                setLastCheckOk(false);
                setLastCheckMessage("");
              }}
              className={`rounded-md px-3 py-2 border text-sm ${
                isDtao
                  ? "bg-black/40 border-violet-700 text-slate-100"
                  : "bg-white border-gray-300 text-slate-800"
              }`}
            >
              {halls.map((h) => {
                const key = h.name || h._id || h.id;
                return (
                  <option key={key} value={h.name || key}>
                    {h.name}
                  </option>
                );
              })}
            </select>
          </div>

          <div
            className={`mt-4 flex gap-3 rounded-full p-1 ${
              isDtao ? "bg-black/30" : "bg-indigo-50"
            }`}
          >
            <AnimatedButton
              variant={bookingMode === "time" ? "primary" : "ghost"}
              size="sm"
              onClick={() => {
                setBookingMode("time");
                setLastCheckOk(false);
                setLastCheckMessage("");
              }}
              className="flex-1"
            >
              Time Wise
            </AnimatedButton>
            <AnimatedButton
              variant={bookingMode === "day" ? "primary" : "ghost"}
              size="sm"
              onClick={() => {
                setBookingMode("day");
                setLastCheckOk(false);
                setLastCheckMessage("");
              }}
              className="flex-1"
            >
              Day Wise
            </AnimatedButton>
          </div>

          <form
            onSubmit={(e) => e.preventDefault()}
            className="mt-6 space-y-4"
          >
            <div>
              <label
                className={`block text-sm font-medium ${
                  isDtao ? "text-slate-200" : ""
                }`}
              >
                Event Name
              </label>
              <input
                value={slotTitle}
                onChange={(e) => setSlotTitle(e.target.value)}
                placeholder="Tech Symposium 2025"
                className={`mt-2 w-full rounded-md px-3 py-2 border ${
                  isDtao
                    ? "bg-transparent border-violet-700 text-slate-100"
                    : ""
                }`}
              />
            </div>

            {bookingMode === "time" ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      className={`block text-sm ${
                        isDtao ? "text-slate-200" : ""
                      }`}
                    >
                      <span className="inline-flex items-center">
                        <CalendarIcon
                          className={`h-4 w-4 mr-2 ${
                            isDtao ? "text-slate-300" : "text-slate-400"
                          }`}
                        />
                        Date
                      </span>
                    </label>
                    <input
                      type="date"
                      value={ymd(date)}
                      onChange={(e) => {
                        setDate(new Date(e.target.value));
                        setLastCheckOk(false);
                        setLastCheckMessage("");
                      }}
                      className={`mt-1 w-full rounded-md px-3 py-2 border ${
                        isDtao
                          ? "bg-transparent border-violet-700 text-slate-100"
                          : ""
                      }`}
                    />
                  </div>
                  <div>
                    <label
                      className={`block text-sm ${
                        isDtao ? "text-slate-200" : ""
                      }`}
                    >
                      End Date
                    </label>
                    <input
                      type="date"
                      value={ymd(date)}
                      readOnly
                      className={`mt-1 w-full rounded-md px-3 py-2 border bg-gray-50 text-slate-500 cursor-not-allowed ${
                        isDtao ? "bg-transparent/10 text-slate-400" : ""
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      className={`block text-sm ${
                        isDtao ? "text-slate-200" : ""
                      }`}
                    >
                      <span className="inline-flex items-center">
                        <ClockIcon
                          className={`h-4 w-4 mr-2 ${
                            isDtao ? "text-slate-300" : "text-slate-400"
                          }`}
                        />
                        Start Time
                      </span>
                    </label>
                    <TimeSelect
                      value={startTime}
                      onChange={(v) => {
                        setStartTime(v);
                        setLastCheckOk(false);
                        setLastCheckMessage("");
                      }}
                      isDtao={isDtao}
                    />
                  </div>
                  <div>
                    <label
                      className={`block text-sm ${
                        isDtao ? "text-slate-200" : ""
                      }`}
                    >
                      <span className="inline-flex items-center">
                        <ClockIcon
                          className={`h-4 w-4 mr-2 ${
                            isDtao ? "text-slate-300" : "text-slate-400"
                          }`}
                        />
                        End Time
                      </span>
                    </label>
                    <TimeSelect
                      value={endTime}
                      onChange={(v) => {
                        setEndTime(v);
                        setLastCheckOk(false);
                        setLastCheckMessage("");
                      }}
                      isDtao={isDtao}
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      className={`block text-sm ${
                        isDtao ? "text-slate-200" : ""
                      }`}
                    >
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={ymd(startDate)}
                      onChange={(e) => {
                        setStartDate(new Date(e.target.value));
                        setLastCheckOk(false);
                        setLastCheckMessage("");
                      }}
                      className={`mt-1 w-full rounded-md px-3 py-2 border ${
                        isDtao
                          ? "bg-transparent border-violet-700 text-slate-100"
                          : ""
                      }`}
                    />
                  </div>
                  <div>
                    <label
                      className={`block text-sm ${
                        isDtao ? "text-slate-200" : ""
                      }`}
                    >
                      End Date
                    </label>
                    <input
                      type="date"
                      value={ymd(endDate)}
                      onChange={(e) => {
                        setEndDate(new Date(e.target.value));
                        setLastCheckOk(false);
                        setLastCheckMessage("");
                      }}
                      className={`mt-1 w-full rounded-md px-3 py-2 border ${
                        isDtao
                          ? "bg-transparent border-violet-700 text-slate-100"
                          : ""
                      }`}
                    />
                  </div>
                </div>

                <p
                  className={`${
                    isDtao ? "text-slate-300" : "text-slate-500"
                  } text-sm`}
                >
                  You can set per-day times below (optional). If left
                  blank for a day, that date will be requested as full-day.
                </p>

                <div className="mt-4 space-y-2">
                  {listDatesBetween(startDate, endDate).map((d) => {
                    const k = ymd(d);
                    const ds =
                      daySlots[k] || {
                        startTime: TIME_OPTIONS[4],
                        endTime: TIME_OPTIONS[8],
                      };
                    return (
                      <div
                        key={k}
                        className={`${
                          isDtao
                            ? "p-3 bg-black/30 rounded border border-violet-800"
                            : "p-3 bg-slate-50 rounded border"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium">
                              {k}
                            </div>
                            <div
                              className={`text-xs ${
                                isDtao
                                  ? "text-slate-300"
                                  : "text-slate-500"
                              }`}
                            >
                              Optional per-day time
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-[120px]">
                              <TimeSelect
                                value={ds.startTime}
                                onChange={(v) =>
                                  setDaySlots((prev) => ({
                                    ...prev,
                                    [k]: {
                                      ...(prev[k] || {}),
                                      startTime: v,
                                    },
                                  }))
                                }
                                isDtao={isDtao}
                              />
                            </div>
                            <span className="text-sm">—</span>
                            <div className="w-[120px]">
                              <TimeSelect
                                value={ds.endTime}
                                onChange={(v) =>
                                  setDaySlots((prev) => ({
                                    ...prev,
                                    [k]: {
                                      ...(prev[k] || {}),
                                      endTime: v,
                                    },
                                  }))
                                }
                                isDtao={isDtao}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Faculty / contact (read only) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  className={`block text-sm font-medium ${
                    isDtao ? "text-slate-200" : ""
                  }`}
                >
                  Coordinator Name
                </label>
                <input
                  value={bookingName}
                  readOnly
                  className={`mt-2 w-full rounded-md px-3 py-2 border bg-gray-50 ${
                    isDtao ? "bg-transparent/10 text-slate-100" : ""
                  }`}
                />
              </div>
              <div>
                <label
                  className={`block text-sm font-medium ${
                    isDtao ? "text-slate-200" : ""
                  }`}
                >
                  Email
                </label>
                <input
                  value={email}
                  readOnly
                  className={`mt-2 w-full rounded-md px-3 py-2 border bg-gray-50 ${
                    isDtao ? "bg-transparent/10 text-slate-100" : ""
                  }`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  className={`block text-sm font-medium ${
                    isDtao ? "text-slate-200" : ""
                  }`}
                >
                  Phone
                </label>
                <input
                  value={phone}
                  readOnly
                  className={`mt-2 w-full rounded-md px-3 py-2 border bg-gray-50 ${
                    isDtao ? "bg-transparent/10 text-slate-100" : ""
                  }`}
                />
              </div>
              <div>
                <label
                  className={`block text-sm font-medium ${
                    isDtao ? "text-slate-200" : ""
                  }`}
                >
                  Department
                </label>
                <input
                  value={department}
                  readOnly
                  className={`mt-2 w-full rounded-md px-3 py-2 border bg-gray-50 ${
                    isDtao ? "bg-transparent/10 text-slate-100" : ""
                  }`}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <AnimatedButton
                type="button"
                variant="ghost"
                className="flex-1"
                onClick={resetForm}
              >
                Clear
              </AnimatedButton>

              <AnimatedButton
                type="button"
                variant="primary"
                onClick={doCheckAvailability}
              >
                Check Availability
              </AnimatedButton>
            </div>

            <div className="mt-2 text-sm">
              {lastCheckMessage && !lastCheckOk && (
                <span className="text-rose-600">{lastCheckMessage}</span>
              )}
              {lastCheckMessage && lastCheckOk && (
                <span className="text-emerald-700">{lastCheckMessage}</span>
              )}
            </div>

            <div className="mt-3">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!lastCheckOk}
                className={`w-full py-3 rounded-lg font-semibold ${
                  lastCheckOk
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-200 text-slate-500 cursor-not-allowed"
                }`}
              >
                Submit Request
              </button>
            </div>
          </form>
        </motion.section>

        {/* RIGHT: calendar + selection */}
        <motion.aside
          className="space-y-6"
          initial={reduce ? {} : { opacity: 0, y: 8 }}
          animate={reduce ? {} : { opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08 }}
        >
          <div
            className={`${
              isDtao
                ? "bg-black/40 border border-violet-900 text-slate-100"
                : "bg-white"
            } rounded-lg p-4 shadow-sm`}
          >
            <div className="flex items-center justify-between mb-4 gap-3">
              <h3
                className={`${
                  isDtao ? "text-slate-100" : "text-slate-800"
                } text-lg font-semibold flex items-center gap-2`}
              >
                <span role="img" aria-label="calendar">
                  
                </span>
                Venue Calendar
              </h3>
            </div>

            <p
              className={`${
                isDtao ? "text-slate-300" : "text-slate-500"
              } text-xs sm:text-sm mb-3`}
            >
              Choose month &amp; year to see which days are free for the
              selected venue.
            </p>

            <div className="flex flex-wrap gap-3 mb-4">
              <select
                value={calendarMonth}
                onChange={(e) =>
                  setCalendarMonth(Number(e.target.value))
                }
                className={`rounded-md px-3 py-2 border text-sm ${
                  isDtao
                    ? "bg-black/40 border-violet-800 text-slate-100"
                    : "bg-white border-slate-200 text-slate-800"
                }`}
              >
                {MONTH_NAMES.map((m, idx) => (
                  <option key={m} value={idx}>
                    {m}
                  </option>
                ))}
              </select>

              <select
                value={calendarYear}
                onChange={(e) =>
                  setCalendarYear(Number(e.target.value))
                }
                className={`rounded-md px-3 py-2 border text-sm ${
                  isDtao
                    ? "bg-black/40 border-violet-800 text-slate-100"
                    : "bg-white border-slate-200 text-slate-800"
                }`}
              >
                {[-1, 0, 1].map((off) => {
                  const y = now.getFullYear() + off;
                  return (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="grid grid-cols-7 text-center text-xs font-semibold text-slate-500 mb-2">
              <div>Sun</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {calendarCells.map((cell, idx) => {
                if (cell === null) {
                  return <div key={idx} className="h-20 rounded-xl" />;
                }
                const dObj = new Date(calendarYear, calendarMonth, cell);
                const key = ymd(dObj);
                const status = getCalendarDayStatus(key, selectedHall);
                const isSelected = key === selectedDateKey;

                let bg = "bg-emerald-50";
                let badgeText = "Free";
                let badgeDot = "bg-emerald-500";

                if (status === "partial") {
                  bg = "bg-amber-50";
                  badgeText = "Partial";
                  badgeDot = "bg-amber-500";
                } else if (status === "full") {
                  bg = "bg-rose-50";
                  badgeText = "Booked";
                  badgeDot = "bg-rose-500";
                }

                const borderClass = isSelected
                  ? "ring-2 ring-blue-500"
                  : "border border-transparent";

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleCalendarDayClick(cell)}
                    className={`h-20 rounded-xl flex flex-col items-start justify-between px-2 py-2 text-left text-xs ${bg} ${borderClass} transition hover:shadow-sm`}
                  >
                    <span className="text-sm font-semibold">
                      {cell}
                    </span>
                    <div className="flex items-center gap-1 text-[11px] mt-auto">
                      <span
                        className={`w-2 h-2 rounded-full ${badgeDot}`}
                      />
                      <span className="text-slate-700">
                        {badgeText}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div
              className={`${
                isDtao ? "text-slate-300" : "text-slate-500"
              } text-xs mt-3`}
            >
              Tip: Click a date to view bookings on that day.
            </div>
          </div>

          <div
            className={`${
              isDtao
                ? "bg-black/40 border border-violet-900 text-slate-100"
                : "bg-white"
            } rounded-lg p-4 shadow-sm`}
          >
            <h4
              className={`${
                isDtao
                  ? "text-slate-100"
                  : "text-lg font-semibold text-slate-800"
              } text-lg font-semibold`}
            >
              Your Selection
            </h4>
            <div
              className={`text-sm ${
                isDtao ? "text-slate-300" : "text-slate-600"
              } space-y-2`}
            >
              <div>
                <span
                  className={`${
                    isDtao ? "text-violet-300" : "text-indigo-600"
                  }`}
                >
                  Hall:
                </span>{" "}
                {selectedHallObj?.name || selectedHall || "Not selected"}
              </div>
              <div>
                <span
                  className={`${
                    isDtao ? "text-violet-300" : "text-indigo-600"
                  }`}
                >
                  Event:
                </span>{" "}
                {slotTitle || "Not specified"}
              </div>
              <div>
                <span
                  className={`${
                    isDtao ? "text-violet-300" : "text-indigo-600"
                  }`}
                >
                  Date:
                </span>{" "}
                {bookingMode === "time"
                  ? ymd(date)
                  : `${ymd(startDate)} → ${ymd(endDate)}`}
              </div>
              <div>
                <span
                  className={`${
                    isDtao ? "text-violet-300" : "text-indigo-600"
                  }`}
                >
                  Time:
                </span>{" "}
                {bookingMode === "time"
                  ? `${to12Label(startTime)} — ${to12Label(endTime)}`
                  : "Per-day times / full-day"}
              </div>
              <div className="flex items-center gap-2 text-xs pt-1">
                <UsersIcon
                  className={`h-4 w-4 ${
                    isDtao ? "text-slate-300" : "text-slate-400"
                  }`}
                />
                <span>
                  Capacity: {selectedHallObj?.capacity ?? "—"}
                </span>
              </div>
            </div>
          </div>
        </motion.aside>
      </motion.div>
    </div>
  );
}
