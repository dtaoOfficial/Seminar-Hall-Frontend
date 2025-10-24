/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import api from "../../utils/api";
import { useTheme } from "../../contexts/ThemeContext";
// <-- custom notification hook (adjust path if your file is elsewhere)
import { useNotification } from "../../components/NotificationsProvider";

/* ---------- Helpers ---------- */
const ymd = (d) => {
  if (!d) return "";
  const dt = d instanceof Date ? d : new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
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
const to12Label = (hhmm) => {
  if (!hhmm) return "";
  const [hh, mm] = hhmm.split(":").map(Number);
  const period = hh >= 12 ? "PM" : "AM";
  const hour12 = ((hh + 11) % 12) + 1;
  return `${String(hour12).padStart(2, "0")}:${String(mm).padStart(2, "0")} ${period}`;
};
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
const intervalsOverlap = (aStart, aEnd, bStart, bEnd) => {
  if (aStart == null || aEnd == null || bStart == null || bEnd == null) return false;
  return aStart < bEnd && bStart < aEnd;
};
const listDatesBetween = (sd, ed) => {
  const out = [];
  const s = new Date(sd); s.setHours(0,0,0,0);
  const e = new Date(ed); e.setHours(0,0,0,0);
  for (let d = new Date(s); d <= e; d.setDate(d.getDate()+1)) out.push(new Date(d));
  return out;
};

/* small icons */
const CalendarIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" x2="16" y1="2" y2="6" />
    <line x1="8" x2="8" y1="2" y2="6" />
    <line x1="3" x2="21" y1="10" y2="10" />
  </svg>
);
const ClockIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v6l3 2" />
  </svg>
);
const UsersIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
  </svg>
);

/* ---------- TimeSelect (theme-aware via prop) ---------- */
function TimeSelect({ value, onChange, options = TIME_OPTIONS, className = "", ariaLabel = "Select time", isDtao = false }) {
  const ref = React.useRef(null);
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
        className={`w-full text-left rounded-md px-3 py-2 border flex items-center justify-between ${isDtao ? "bg-transparent border-violet-700 text-slate-100" : ""}`}
      >
        <span>{to12Label(value)}</span>
        <svg className={`w-4 h-4 ml-2 ${isDtao ? "text-slate-300" : "text-slate-600"}`} viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>

      {open && (
        <div
          role="listbox"
          tabIndex={-1}
          className={`absolute z-50 mt-1 w-full rounded-md shadow-lg ${isDtao ? "bg-black/80 border border-violet-800 text-slate-100" : "bg-white border"}`}
          style={{ maxHeight: `${5 * 40}px`, overflowY: "auto" }}
        >
          {options.map((opt) => (
            <div
              key={opt}
              role="option"
              data-val={opt}
              aria-selected={opt === value}
              tabIndex={0}
              onClick={() => { onChange(opt); setOpen(false); }}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onChange(opt); setOpen(false); } }}
              className={`px-3 py-2 cursor-pointer ${isDtao ? "hover:bg-violet-900/60" : "hover:bg-gray-100"} ${opt === value ? (isDtao ? "bg-violet-900/70 font-semibold" : "bg-blue-50 font-semibold") : ""}`}
            >
              {to12Label(opt)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- BookedSlotsModal (now theme via prop) ---------- */
const BookedSlotsModal = ({ isOpen, onClose, seminars, hallKey, dateStr, isDtao = false }) => {
  if (!isOpen) return null;
  const hallTitle = hallKey?.name || hallKey || "Selected Hall";
  const relevant = (seminars || []).filter((s) => {
    const hn = (s.hallName || (s.hall && s.hall.name) || "").toString();
    const hid = (s.hallId || (s.hall && (s.hall._id || s.hall.id)) || "").toString();
    return hn === hallKey || hid === String(hallKey) || String(hallKey) === String(s.hall?._id || s.hall?.id);
  });

  const dayBookings = relevant.filter((r) => r.type === "day" || (!r.startTime && !r.endTime && (r.startDate || r.endDate)));
  const timeBookings = relevant.filter((r) => r.startTime && r.endTime);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className={`${isDtao ? "relative w-full max-w-lg bg-black/80 rounded-lg border border-violet-800 p-5 text-slate-100 shadow-xl" : "relative w-full max-w-lg bg-white rounded-lg shadow-lg border border-gray-200 p-5"}`}
        onClick={(e)=>e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold">{`Booked Slots — ${hallTitle}`}</h3>
            {dateStr && <p className="text-sm text-slate-400 mt-1">Date: {dateStr}</p>}
          </div>
          <button onClick={onClose} className="text-2xl text-slate-400 leading-none">×</button>
        </div>

        <div className="mt-4 max-h-72 overflow-auto pr-2 space-y-4">
          <div>
            <h4 className="text-sm font-medium text-indigo-600 mb-2">Day-wise</h4>
            {dayBookings.length === 0 ? <p className="text-slate-500">No full-day bookings</p> : (
              <ul className="space-y-2">
                {dayBookings.map((b,i)=>(<li key={i} className={`${isDtao ? "p-2 rounded bg-black/60 border border-violet-800" : "p-2 rounded bg-slate-50 border border-gray-100"}`}>
                  <strong className="text-slate-200">{b.startDate || b.date} → {b.endDate || b.date}</strong>
                  <div className="text-sm text-slate-400 mt-1">{b.slotTitle || b.bookingName || "Booked"}</div>
                </li>))}
              </ul>
            )}
          </div>

          <div>
            <h4 className="text-sm font-medium text-indigo-600 mb-2">Time-wise</h4>
            {timeBookings.length === 0 ? <p className="text-slate-500">No time-slot bookings</p> : (
              <ul className="space-y-2">
                {timeBookings.map((b,i)=>(<li key={i} className={`${isDtao ? "p-2 rounded bg-black/60 border border-violet-800" : "p-2 rounded bg-slate-50 border border-gray-100"}`}>
                  <div className="font-semibold text-slate-200">{b.date}</div>
                  <div className="text-sm text-slate-400">{b.startTime} — {b.endTime} — {b.slotTitle || b.bookingName || "Booked"}</div>
                </li>))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ---------- Component ---------- */
export default function AddSeminarPage() {
  const location = useLocation();
  const { theme } = useTheme() || {};
  const isDtao = theme === "dtao";

  // custom notification
  const { notify } = useNotification();

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

  const [appliedAt, setAppliedAt] = useState(new Date().toISOString());

  const [halls, setHalls] = useState([]);
  const [seminars, setSeminars] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [bookedMap, setBookedMap] = useState(new Map());

  const [selectedHall, setSelectedHall] = useState("");
  const [selectedHallObj, setSelectedHallObj] = useState(null);
  const [showBookedModal, setShowBookedModal] = useState(false);
  const [bookedModalDate, setBookedModalDate] = useState("");
  const notifRef = useRef(null);
  const [fieldErrors, setFieldErrors] = useState({ slotTitle: "", bookingName: "", email: "", phone: "" });

  const [autoCheckEnabled, setAutoCheckEnabled] = useState(false);
  const [lastCheckOk, setLastCheckOk] = useState(false);
  const [lastCheckMessage, setLastCheckMessage] = useState("");
  const [checking, setChecking] = useState(false);
  const [isSelectedPast, setIsSelectedPast] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  const DEFAULT_REMARKS = "Requested by Dept";

  const validateEmail = (em) => !!em && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em);
  const validatePhone = (p) => !!p && /^[6-9]\d{9}$/.test(p);

  const getLoggedUser = () => {
    try { const raw = localStorage.getItem("user"); return raw ? JSON.parse(raw) : null; } catch { return null; }
  };

  /* ---------- fetch ---------- */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [hRes, sRes, dRes] = await Promise.all([
        api.get("/halls").catch(()=>({ data: [] })),
        api.get("/seminars").catch(()=>({ data: [] })),
        api.get("/departments").catch(()=>({ data: [] }))
      ]);
      setHalls(Array.isArray(hRes.data) ? hRes.data : []);
      setSeminars(Array.isArray(sRes.data) ? sRes.data : []);
      const depts = Array.isArray(dRes.data) ? dRes.data.map(d => (typeof d === "string" ? d : d?.name)).filter(Boolean) : [];
      setDepartments(depts);
      if (Array.isArray(hRes.data) && hRes.data.length > 0 && !selectedHall) {
        const first = hRes.data[0];
        setSelectedHall(first.name || first._id || first.id || "");
      }
    } catch (err) {
      console.error("fetchAll failed", err);
      notify("Error fetching data", "error");
    } finally {
      setLoading(false);
    }
  }, [selectedHall, notify]);

  useEffect(()=>{ fetchAll(); return ()=>{ if (notifRef.current) clearTimeout(notifRef.current); } }, [fetchAll]);

  /* ---------- normalize seminars -> bookedMap ---------- */
  useEffect(()=> {
    const map = new Map();
    (seminars || []).forEach((s) => {
      try {
        // only approved bookings block availability
        if (String((s.status || "").toUpperCase()) !== "APPROVED") return;

        const hallName = s.hallName || s.hall?.name || "";
        const hallId = s.hallId || s.hall?._id || s.hall?.id || "";

        // 1) If explicit startDate & endDate -> treat as day-range (full days)
        if (s.startDate && s.endDate) {
          const sd = new Date(s.startDate);
          const ed = new Date(s.endDate);
          for (let d = new Date(sd); d <= ed; d.setDate(d.getDate()+1)) {
            const key = ymd(new Date(d));
            const arr = map.get(key) || [];
            // full-day entry
            arr.push({ date: key, startMin: 0, endMin: 1440, hallName, hallId, original: s, type: "day", startDate: s.startDate, endDate: s.endDate });
            map.set(key, arr);
          }
          return;
        }

        // 2) If a daySlots object exists (aggregated DayRange payload)
        if (s.daySlots && typeof s.daySlots === "object") {
          // use explicit startDate/endDate if present, else derive from daySlots keys
          const keys = Object.keys(s.daySlots || {}).sort();
          // if keys empty, fallback to single date stored in s.date (rare)
          if (keys.length === 0) {
            const dateKey = (s.date && s.date.split ? s.date.split("T")[0] : s.date) || ymd(new Date());
            const arr = map.get(dateKey) || [];
            arr.push({ date: dateKey, startMin: 0, endMin: 1440, hallName, hallId, original: s, type: "day" });
            map.set(dateKey, arr);
            return;
          }

          for (const key of keys) {
            const val = s.daySlots[key]; // either null (full-day) or {startTime,endTime}
            if (!val) {
              // full-day
              const arr = map.get(key) || [];
              arr.push({ date: key, startMin: 0, endMin: 1440, hallName, hallId, original: s, type: "day", startDate: keys[0], endDate: keys[keys.length-1] });
              map.set(key, arr);
            } else {
              // time-based for that date
              const sTime = val.startTime || val.start || null;
              const eTime = val.endTime || val.end || null;
              const sMin = hhmmToMinutes(sTime);
              const eMin = hhmmToMinutes(eTime);
              if (sMin != null && eMin != null) {
                const arr = map.get(key) || [];
                arr.push({ date: key, startMin: sMin, endMin: eMin, startTime: sTime, endTime: eTime, hallName, hallId, original: s, type: "time" });
                map.set(key, arr);
              } else {
                // fallback to full-day if times invalid
                const arr = map.get(key) || [];
                arr.push({ date: key, startMin: 0, endMin: 1440, hallName, hallId, original: s, type: "day", startDate: keys[0], endDate: keys[keys.length-1] });
                map.set(key, arr);
              }
            }
          }
          return;
        }

        // 3) Time-booking: date + startTime + endTime
        const dateKey = (s.date && s.date.split ? s.date.split("T")[0] : s.date) || s.startDate || ymd(new Date());
        if (!dateKey) return;

        // if missing start/end times, treat as full-day
        if (!s.startTime || !s.endTime) {
          const arr = map.get(dateKey) || [];
          arr.push({ date: dateKey, startMin: 0, endMin: 1440, hallName, hallId, original: s, type: "day" });
          map.set(dateKey, arr);
          return;
        }

        const sMin = hhmmToMinutes(s.startTime);
        const eMin = hhmmToMinutes(s.endTime);
        if (sMin == null || eMin == null) {
          const arr = map.get(dateKey) || [];
          arr.push({ date: dateKey, startMin: 0, endMin: 1440, hallName, hallId, original: s, type: "day" });
          map.set(dateKey, arr);
          return;
        }

        const arr = map.get(dateKey) || [];
        arr.push({ date: dateKey, startMin: sMin, endMin: eMin, startTime: s.startTime, endTime: s.endTime, hallName, hallId, original: s, type: "time" });
        map.set(dateKey, arr);
      } catch (e) {
        // ignore an individual seminar parse error
      }
    });
    setBookedMap(map);
  }, [seminars]);

  useEffect(()=> {
    if (!selectedHall) { setSelectedHallObj(null); return; }
    const obj = halls.find((h) => h.name === selectedHall || String(h._id) === String(selectedHall) || String(h.id) === String(selectedHall));
    setSelectedHallObj(obj || null);
  }, [selectedHall, halls]);

  const isDateFullDayBlocked = useCallback((dateStr, hall) => {
    const arr = bookedMap.get(dateStr) || [];
    return arr.some(b => (b.type === "day" || (b.startMin === 0 && b.endMin === 1440)) && (b.hallName === hall || String(b.hallId) === String(hall)));
  }, [bookedMap]);

  /* ---------- availability checks ---------- */
  const checkTimeWiseAvailability = useCallback(() => {
    if (!selectedHall) return { ok:false, msg:"Please select a hall from the right." };
    if (!date) return { ok:false, msg:"Pick a date." };
    if (!startTime || !endTime) return { ok:false, msg:"Pick start & end times." };

    const ds = ymd(date);
    const sMin = hhmmToMinutes(startTime);
    const eMin = hhmmToMinutes(endTime);
    if (sMin == null || eMin == null) return { ok:false, msg:"Invalid time" };
    if (eMin <= sMin) return { ok:false, msg:"End must be after start" };

    if (isDateFullDayBlocked(ds, selectedHall)) return { ok:false, msg:`Date ${ds} is fully blocked.` };

    const arr = bookedMap.get(ds) || [];
    const overlapping = arr.filter(b => {
      const hallMatch = (b.hallName === selectedHall) || (String(b.hallId) === String(selectedHall));
      if (!hallMatch) return false;
      return intervalsOverlap(sMin, eMin, b.startMin, b.endMin);
    });

    if (overlapping.length === 0) {
      return { ok:true, msg:`Available ${to12Label(startTime)} — ${to12Label(endTime)} on ${ds}` };
    }

    const conflictMsgs = overlapping.map(b => `${b.date} (${minutesToHHMM(b.startMin)} — ${minutesToHHMM(b.endMin)})`);
    const needed = eMin - sMin;
    const dayStart = hhmmToMinutes(TIME_OPTIONS[0]);
    const dayEnd = hhmmToMinutes(TIME_OPTIONS[TIME_OPTIONS.length-1]) + 15;
    let suggestion = null;
    for (let cand = dayStart; cand + needed <= dayEnd; cand += 15) {
      let conflict = false;
      for (const b of arr) {
        const hallMatch = (b.hallName === selectedHall) || (String(b.hallId) === String(selectedHall));
        if (!hallMatch) continue;
        if (intervalsOverlap(cand, cand + needed, b.startMin, b.endMin)) { conflict = true; break; }
      }
      if (!conflict) { suggestion = cand; break; }
    }

    const conflictText = `Conflict: ${conflictMsgs.join(", ")}`;
    const suggestionText = suggestion != null ? `Try: ${to12Label(minutesToHHMM(suggestion))} — ${to12Label(minutesToHHMM(suggestion + needed))} on ${ds}` : `No alternative found on ${ds}`;
    return { ok:false, msg: `${conflictText}. ${suggestionText}` };
  }, [selectedHall, date, startTime, endTime, bookedMap, isDateFullDayBlocked]);

  const checkDayWiseAvailability = useCallback(() => {
    if (!selectedHall) return { ok:false, msg:"Select a hall first." };
    if (!startDate || !endDate) return { ok:false, msg:"Select start & end dates." };
    const sd = new Date(startDate); sd.setHours(0,0,0,0);
    const ed = new Date(endDate); ed.setHours(0,0,0,0);
    if (ed < sd) return { ok:false, msg:"End date can't be before start date." };

    const conflicts = [];
    const suggestions = [];
    const days = listDatesBetween(sd, ed);

    for (const d of days) {
      const key = ymd(d);
      if (isDateFullDayBlocked(key, selectedHall)) {
        conflicts.push(`${key} (full-day)`);
        continue;
      }
      const ds = daySlots[key];
      if (!ds || !ds.startTime || !ds.endTime) {
        // if user left per-day times blank -> it's full-day request, but we already checked full-day block above
        continue;
      }
      const sMin = hhmmToMinutes(ds.startTime);
      const eMin = hhmmToMinutes(ds.endTime);
      if (sMin == null || eMin == null || eMin <= sMin) { conflicts.push(`${key} (invalid times)`); continue; }
      const arr = bookedMap.get(key) || [];
      const overlap = arr.some(b => {
        const hallMatch = (b.hallName === selectedHall) || (String(b.hallId) === String(selectedHall));
        if (!hallMatch) return false;
        return intervalsOverlap(sMin, eMin, b.startMin, b.endMin);
      });
      if (overlap) {
        conflicts.push(`${key} (${ds.startTime} — ${ds.endTime})`);
        const needed = eMin - sMin;
        const dayStart = hhmmToMinutes(TIME_OPTIONS[0]);
        const dayEnd = hhmmToMinutes(TIME_OPTIONS[TIME_OPTIONS.length-1]) + 15;
        let found = null;
        const arrAll = bookedMap.get(key) || [];
        for (let cand = dayStart; cand + needed <= dayEnd; cand += 15) {
          let conf = false;
          for (const b of arrAll) {
            const hallMatch = (b.hallName === selectedHall) || (String(b.hallId) === String(selectedHall));
            if (!hallMatch) continue;
            if (intervalsOverlap(cand, cand + needed, b.startMin, b.endMin)) { conf = true; break; }
          }
          if (!conf) { found = cand; break; }
        }
        if (found != null) suggestions.push(`${key}: ${to12Label(minutesToHHMM(found))} — ${to12Label(minutesToHHMM(found + needed))}`);
      }
    }

    if (conflicts.length) {
      let msg = `Conflicts on: ${conflicts.join(", ")}`;
      if (suggestions.length) msg += `. Suggestions: ${suggestions.slice(0,3).join("; ")}`;
      return { ok:false, msg };
    }
    return { ok:true, msg: `All selected days available (${ymd(sd)} → ${ymd(ed)})` };
  }, [selectedHall, startDate, endDate, daySlots, bookedMap, isDateFullDayBlocked]);

  const doCheckAvailability = useCallback(async () => {
    setChecking(true);
    setLastCheckMessage("");
    setLastCheckOk(false);
    try {
      const res = bookingMode === "day" ? checkDayWiseAvailability() : checkTimeWiseAvailability();
      setLastCheckOk(!!res.ok);
      setLastCheckMessage(res.msg);
      notify(res.msg, res.ok ? "success" : "warn", { autoDismiss: res.ok ? 3000 : 7000 });
      return res;
    } catch (err) {
      console.error("check err", err);
      notify("Error checking availability", "error");
      return { ok:false, msg:"Error checking availability" };
    } finally {
      setChecking(false);
    }
  }, [bookingMode, checkDayWiseAvailability, checkTimeWiseAvailability, notify]);

  /* ---------- auto-check ---------- */
  const autoCheckTimer = useRef(null);
  useEffect(() => {
    if (!autoCheckEnabled) return;
    if (autoCheckTimer.current) clearTimeout(autoCheckTimer.current);
    autoCheckTimer.current = setTimeout(() => { doCheckAvailability(); }, 700);
    return () => { if (autoCheckTimer.current) clearTimeout(autoCheckTimer.current); };
  }, [autoCheckEnabled, bookingMode, selectedHall, date, startTime, endTime, startDate, endDate, daySlots, doCheckAvailability]);

  /* ---------- submit ---------- */
  const resetForm = () => {
    setSlotTitle("");
    setStartTime(TIME_OPTIONS[4]);
    setEndTime(TIME_OPTIONS[8]);
    setStartDate(new Date());
    setEndDate(new Date());
    setDaySlots({});
    setLastCheckOk(false);
    setLastCheckMessage("");
    notify("Form cleared", "info", { autoDismiss: 1200 });
  };

  const handleSubmit = async (ev) => {
    ev && ev.preventDefault();
    if (!lastCheckOk) { notify("Please Check Availability first (or enable auto-check).", "warn"); return; }

    setFieldErrors({ slotTitle: "", bookingName: "", email: "", phone: "" });
    let hasErr = false;
    const errs = { slotTitle: "", bookingName: "", email: "", phone: "" };
    if (!slotTitle || !slotTitle.trim()) { errs.slotTitle = "Event required"; hasErr = true; }
    if (!bookingName || !bookingName.trim()) { errs.bookingName = "Faculty required"; hasErr = true; }
    if (!validateEmail(email)) { errs.email = "Invalid email"; hasErr = true; }
    if (!validatePhone(phone)) { errs.phone = "Invalid phone"; hasErr = true; }
    setFieldErrors(errs);
    if (hasErr) { const first = Object.values(errs).find(Boolean); notify(first, "warn"); return; }

    setLoadingSubmit(true);
    const nowIso = new Date().toISOString();
    setAppliedAt(nowIso);

    try {
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
          endTime
        };
        await api.post("/seminars", payload);
      } else {
        // ---- NEW: create ONE aggregated record for the whole date range ----
        const days = listDatesBetween(startDate, endDate);
        const startKey = ymd(startDate);
        const endKey = ymd(endDate);

        // Build a daySlots map (date -> { startTime, endTime } or null for full-day)
        const submittedDaySlots = {};
        for (const d of days) {
          const key = ymd(d);
          const ds = daySlots[key];
          if (ds && ds.startTime && ds.endTime) {
            submittedDaySlots[key] = { startTime: ds.startTime, endTime: ds.endTime };
          } else {
            submittedDaySlots[key] = null; // full-day
          }
        }

        // Single payload representing the whole range.
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
          startDate: startKey,
          endDate: endKey,
          // include per-day times so admin UI can show the "more" detail
          daySlots: submittedDaySlots
        };

        await api.post("/seminars", payload);
      }

      await fetchAll();
      resetForm();
      notify("Seminar request submitted (PENDING).", "success", { autoDismiss: 3500 });
    } catch (err) {
      console.error("Error adding seminar:", err);
      const serverMsg =
        (err.response && (err.response.data?.message || err.response.data?.error || err.response.data)) ||
        err.message ||
        "Error adding seminar!";
      notify(String(serverMsg), "error", { autoDismiss: 6000 });
    } finally {
      setLoadingSubmit(false);
    }
  };

  /* ---------- tiny heatmap ---------- */
  const renderTinyHeatmap = (hallKey, dateObj) => {
    const key = ymd(dateObj || new Date());
    const arr = bookedMap.get(key) || [];
    const startBase = hhmmToMinutes(TIME_OPTIONS[0]);
    const endBase = hhmmToMinutes(TIME_OPTIONS[TIME_OPTIONS.length-1]) + 15;
    const total = Math.max(0, (endBase - startBase) / 15);
    const slots = new Array(total).fill(false);
    arr.forEach((b) => {
      const hallMatch = b.hallName === hallKey || String(b.hallId) === String(hallKey);
      if (!hallMatch) return;
      for (let seg=0; seg<total; seg++) {
        const segStart = startBase + seg*15;
        const segEnd = segStart + 15;
        if (intervalsOverlap(segStart, segEnd, b.startMin, b.endMin)) slots[seg] = true;
      }
    });
    return (
      <div className="mt-3">
        <div className="flex gap-0.5">
          {slots.map((s,i) => (
            <div key={i} title={`${String(i)} ${s ? "(booked)" : "(free)"}`} className={`h-2 flex-1 rounded-sm ${s ? "bg-rose-300" : "bg-emerald-200"}`} />
          ))}
        </div>
        <div className={`mt-1 text-xs ${isDtao ? "text-slate-300" : "text-slate-500"}`}>Heatmap (15m segments)</div>
      </div>
    );
  };

  /* ---------- load user + location state ---------- */
  useEffect(()=> {
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
      try { const d = new Date(st.date); setDate(d); setStartDate(d); setEndDate(d); } catch {}
    }
    if (st.selectedStartTime) setStartTime(st.selectedStartTime);
    if (st.selectedEndTime) setEndTime(st.selectedEndTime);
    setAppliedAt(new Date().toISOString());
  }, [location.state]);

  useEffect(()=> {
    const sel = new Date(date);
    sel.setHours(0,0,0,0);
    const today = new Date(); today.setHours(0,0,0,0);
    setIsSelectedPast(sel < today);
  }, [date]);

  useEffect(()=> {
    if (!startDate || !endDate) return;
    const sd = new Date(startDate); sd.setHours(0,0,0,0);
    const ed = new Date(endDate); ed.setHours(0,0,0,0);
    if (ed < sd) return;
    const days = listDatesBetween(sd, ed);
    setDaySlots((prev) => {
      const next = { ...prev };
      days.forEach((d) => {
        const k = ymd(d);
        if (!next[k]) next[k] = { startTime: TIME_OPTIONS[4], endTime: TIME_OPTIONS[8] };
      });
      Object.keys(next).forEach((k) => {
        if (!days.some(d => ymd(d) === k)) delete next[k];
      });
      return next;
    });
  }, [startDate, endDate]);

  useEffect(()=> {
    if (halls.length > 0 && !selectedHall) {
      const first = halls[0];
      setSelectedHall(first.name || first._id || first.id || "");
    }
    if ((!departments || departments.length === 0) && !loading) {
      setDepartments(["ADMIN","CSE-1","CSE-2","ISE","ECE"]);
    }
  }, [halls, departments, loading, selectedHall]);

  /* ---------- render ---------- */
  return (
    <>
      <style>{`
        .liquid-toggle { background: linear-gradient(90deg, rgba(99,102,241,0.08), rgba(99,102,241,0.04)); background-size: 200% 100%; transition: background-position .5s; }
        .hall-tile { transition: transform .18s ease, box-shadow .18s ease; }
        .hall-tile:hover { transform: translateY(-4px) scale(1.01); box-shadow: 0 10px 20px rgba(0,0,0,0.06); }
      `}</style>

      <div className={`${isDtao ? "min-h-screen p-6 bg-[#08050b] text-slate-100" : "min-h-screen w-full p-4 sm:p-6 lg:p-8"}`}>
        <main className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* LEFT: form */}
          <section className={`${isDtao ? "bg-black/40 border border-violet-900 text-slate-100" : "bg-white"} rounded-2xl p-6 shadow`}>
            <div className="flex items-start justify-between">
              <div>
                <h1 className={`${isDtao ? "text-slate-100" : "text-slate-800"} text-2xl font-semibold`}>Request Seminar (Dept)</h1>
                <p className={`${isDtao ? "text-slate-300" : "text-slate-500"} text-sm mt-1`}>Requests go to Admin (PENDING) — check availability first.</p>
              </div>

              <div className="text-right">
                <div className={`${isDtao ? "text-slate-300" : "text-sm text-slate-500"}`}>Auto-check</div>
                <label className="inline-flex items-center mt-1">
                  <input type="checkbox" checked={autoCheckEnabled} onChange={(e)=>setAutoCheckEnabled(!!e.target.checked)} className="mr-2" />
                  <span className="text-sm">{autoCheckEnabled ? "On" : "Off"}</span>
                </label>
              </div>
            </div>

            <div className={`mt-6 flex gap-3 liquid-toggle rounded-full p-1 ${isDtao ? "bg-black/30" : ""}`}>
              <button onClick={()=>{ setBookingMode("time"); setLastCheckOk(false); setLastCheckMessage(""); }} className={`flex-1 py-2 rounded-full ${bookingMode==="time" ? (isDtao ? "bg-violet-600 text-white" : "bg-indigo-600 text-white") : (isDtao ? "text-slate-300" : "text-slate-600")}`}>Time Wise</button>
              <button onClick={()=>{ setBookingMode("day"); setLastCheckOk(false); setLastCheckMessage(""); }} className={`flex-1 py-2 rounded-full ${bookingMode==="day" ? (isDtao ? "bg-violet-600 text-white" : "bg-indigo-600 text-white") : (isDtao ? "text-slate-300" : "text-slate-600")}`}>Day Wise</button>
            </div>

            <form onSubmit={(e)=>e.preventDefault()} className="mt-6 space-y-4">
              <div>
                <label className={`block text-sm font-medium ${isDtao ? "text-slate-200" : ""}`}>Event Name</label>
                <input value={slotTitle} onChange={(e)=>setSlotTitle(e.target.value)} placeholder="Tech Symposium 2025" className={`mt-2 w-full rounded-md px-3 py-2 border ${isDtao ? "bg-transparent border-violet-700 text-slate-100" : ""}`} />
                {fieldErrors.slotTitle && <div className="text-rose-600 text-xs mt-1">{fieldErrors.slotTitle}</div>}
              </div>

              {bookingMode==="time" ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm ${isDtao ? "text-slate-200" : ""}`}><span className="inline-flex items-center"><CalendarIcon className={`h-4 w-4 mr-2 ${isDtao ? "text-slate-300" : "text-slate-400"}`} />Date</span></label>
                      <div className="relative mt-1">
                        <input type="date" value={ymd(date)} onChange={(e)=>{ setDate(new Date(e.target.value)); setLastCheckOk(false); setLastCheckMessage(""); }} className={`pl-3 w-full rounded-md px-3 py-2 border ${isDtao ? "bg-transparent border-violet-700 text-slate-100" : ""}`} />
                      </div>
                    </div>

                    <div>
                      <label className={`block text-sm ${isDtao ? "text-slate-200" : ""}`}>End Date</label>
                      <div className="relative mt-1">
                        <input type="date" value={ymd(date)} readOnly className={`pl-3 w-full rounded-md px-3 py-2 border bg-gray-50 text-slate-500 cursor-not-allowed ${isDtao ? "bg-transparent/10 text-slate-400" : ""}`} />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm ${isDtao ? "text-slate-200" : ""}`}><span className="inline-flex items-center"><ClockIcon className={`h-4 w-4 mr-2 ${isDtao ? "text-slate-300" : "text-slate-400"}`} />Start Time</span></label>
                      <div className="mt-1">
                        <TimeSelect value={startTime} onChange={(v)=>{ setStartTime(v); setLastCheckOk(false); setLastCheckMessage(""); }} className="" ariaLabel="Start time" isDtao={isDtao} />
                      </div>
                    </div>

                    <div>
                      <label className={`block text-sm ${isDtao ? "text-slate-200" : ""}`}><span className="inline-flex items-center"><ClockIcon className={`h-4 w-4 mr-2 ${isDtao ? "text-slate-300" : "text-slate-400"}`} />End Time</span></label>
                      <div className="mt-1">
                        <TimeSelect value={endTime} onChange={(v)=>{ setEndTime(v); setLastCheckOk(false); setLastCheckMessage(""); }} className="" ariaLabel="End time" isDtao={isDtao} />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm ${isDtao ? "text-slate-200" : ""}`}>Start Date</label>
                      <div className="relative mt-1">
                        <input type="date" value={ymd(startDate)} onChange={(e)=>{ setStartDate(new Date(e.target.value)); setLastCheckOk(false); setLastCheckMessage(""); }} className={`pl-3 w-full rounded-md px-3 py-2 border ${isDtao ? "bg-transparent border-violet-700 text-slate-100" : ""}`} />
                      </div>
                    </div>

                    <div>
                      <label className={`block text-sm ${isDtao ? "text-slate-200" : ""}`}>End Date</label>
                      <div className="relative mt-1">
                        <input type="date" value={ymd(endDate)} onChange={(e)=>{ setEndDate(new Date(e.target.value)); setLastCheckOk(false); setLastCheckMessage(""); }} className={`pl-3 w-full rounded-md px-3 py-2 border ${isDtao ? "bg-transparent border-violet-700 text-slate-100" : ""}`} />
                      </div>
                    </div>
                  </div>

                  <p className={`${isDtao ? "text-slate-300" : "text-slate-500"} text-sm`}>You can set per-day times below (optional). If left blank for a day, that day is requested as full-day.</p>

                  <div className="mt-4 space-y-2">
                    {listDatesBetween(startDate, endDate).map(d => {
                      const k = ymd(d);
                      const ds = daySlots[k] || { startTime: TIME_OPTIONS[4], endTime: TIME_OPTIONS[8] };
                      return (
                        <div key={k} className={`${isDtao ? "p-3 bg-black/30 rounded border border-violet-800" : "p-3 bg-slate-50 rounded border"}`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <div className={`${isDtao ? "text-slate-100" : "text-sm font-medium"} text-sm font-medium`}>{k}</div>
                              <div className={`${isDtao ? "text-slate-300" : "text-xs text-slate-500"} text-xs`}>Optional per-day time</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-[120px]">
                                <TimeSelect value={ds.startTime} onChange={(v)=>setDaySlots(prev=>({...prev, [k]: {...(prev[k]||{}), startTime: v}}))} isDtao={isDtao} />
                              </div>
                              <span className="text-sm">—</span>
                              <div className="w-[120px]">
                                <TimeSelect value={ds.endTime} onChange={(v)=>setDaySlots(prev=>({...prev, [k]: {...(prev[k]||{}), endTime: v}}))} isDtao={isDtao} />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${isDtao ? "text-slate-200" : ""}`}>Faculty Name</label>
                  <input value={bookingName} readOnly className={`mt-2 w-full rounded-md px-3 py-2 border bg-gray-50 ${isDtao ? "bg-transparent/10 text-slate-100" : ""}`} />
                  {fieldErrors.bookingName && <div className="text-rose-600 text-xs mt-1">{fieldErrors.bookingName}</div>}
                </div>

                <div>
                  <label className={`block text-sm font-medium ${isDtao ? "text-slate-200" : ""}`}>Email</label>
                  <input value={email} readOnly className={`mt-2 w-full rounded-md px-3 py-2 border bg-gray-50 ${isDtao ? "bg-transparent/10 text-slate-100" : ""}`} placeholder="name@domain.edu" />
                  {fieldErrors.email && <div className="text-rose-600 text-xs mt-1">{fieldErrors.email}</div>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${isDtao ? "text-slate-200" : ""}`}>Phone</label>
                  <input value={phone} readOnly className={`mt-2 w-full rounded-md px-3 py-2 border bg-gray-50 ${isDtao ? "bg-transparent/10 text-slate-100" : ""}`} placeholder="10-digit number" />
                  {fieldErrors.phone && <div className="text-rose-600 text-xs mt-1">{fieldErrors.phone}</div>}
                </div>

                <div>
                  <label className={`block text-sm font-medium ${isDtao ? "text-slate-200" : ""}`}>Department</label>
                  <input value={department} readOnly className={`mt-2 w-full rounded-md px-3 py-2 border bg-gray-50 ${isDtao ? "bg-transparent/10 text-slate-100" : ""}`} />
                </div>
              </div>

              <div className="flex gap-3 mt-4">
                <button type="button" onClick={()=>{ setShowBookedModal(true); setBookedModalDate(bookingMode==="time"? ymd(date) : `${ymd(startDate)} → ${ymd(endDate)}`); }} className={`${isDtao ? "flex-1 bg-transparent border border-violet-800 text-slate-200 py-3 rounded-lg" : "flex-1 bg-gray-100 border py-3 rounded-lg"}`}>View Booked Slots</button>

                <button type="button" onClick={doCheckAvailability} disabled={checking} className={`${isDtao ? "px-6 py-3 rounded-lg bg-violet-600 text-white" : "px-6 py-3 rounded-lg bg-indigo-600 text-white"}`}>
                  {checking ? "Checking..." : "Check Availability"}
                </button>
              </div>

              <div>
                <button onClick={handleSubmit} disabled={!lastCheckOk || loadingSubmit} className={`w-full py-3 rounded-lg font-semibold ${lastCheckOk ? "bg-emerald-600 text-white" : "bg-gray-200 text-slate-500 cursor-not-allowed"}`}>
                  {loadingSubmit ? "Submitting..." : "Submit"}
                </button>
                {!lastCheckOk && lastCheckMessage && <div className="mt-2 text-sm text-rose-600">{lastCheckMessage}</div>}
                {lastCheckOk && lastCheckMessage && <div className="mt-2 text-sm text-emerald-700">{lastCheckMessage}</div>}
              </div>

              <div>
                <label className={`block text-sm ${isDtao ? "text-slate-200" : ""}`}>Applied At (current)</label>
                <input value={new Date(appliedAt).toLocaleString()} readOnly className={`mt-2 w-full rounded-md px-3 py-2 border bg-gray-50 ${isDtao ? "bg-transparent/10 text-slate-100" : ""}`} />
              </div>

              {isSelectedPast && (
                <p className="mt-2 text-sm text-amber-700 bg-amber-50 border rounded-md p-3">
                  You selected a past date ({ymd(date)}). Booking is disabled for past dates.
                </p>
              )}
            </form>
          </section>

          {/* RIGHT: halls + summary */}
          <aside className="space-y-6">
            <div className={`${isDtao ? "bg-black/40 border border-violet-900 text-slate-100" : "bg-white"} rounded-lg p-4 shadow-sm`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className={`${isDtao ? "text-slate-100" : "text-slate-800"} text-lg font-semibold`}>Select a Hall</h3>
                <div className={`${isDtao ? "text-slate-300" : "text-sm text-slate-500"}`}>Indicator shows availability for selected date</div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {loading ? <div className={`${isDtao ? "text-slate-300" : ""}`}>Loading halls...</div> : halls.length === 0 ? <div className={`${isDtao ? "text-slate-300" : ""}`}>No halls</div> : halls.map(h => {
                  const key = h._id || h.id || h.name;
                  const sel = selectedHall === (h.name || key);
                  const onDate = bookingMode === "time" ? date : startDate;
                  const ds = ymd(onDate);
                  const arr = bookedMap.get(ds) || [];
                  const startBase = hhmmToMinutes(TIME_OPTIONS[0]);
                  const endBase = hhmmToMinutes(TIME_OPTIONS[TIME_OPTIONS.length-1]) + 15;
                  let booked = 0;
                  arr.forEach(b => {
                    const hallMatch = (b.hallName === h.name) || (String(b.hallId) === String(h._id));
                    if (!hallMatch) return;
                    const overlapStart = Math.max(b.startMin, startBase);
                    const overlapEnd = Math.min(b.endMin, endBase);
                    if (overlapEnd > overlapStart) booked += (overlapEnd - overlapStart);
                  });
                  const totalWorking = Math.max(1, endBase - startBase);
                  const pct = Math.round((booked / totalWorking) * 100);

                  return (
                    <div key={key} className="relative">
                      <button onClick={()=>{ setSelectedHall(h.name || key); setSelectedHallObj(h); setLastCheckOk(false); setLastCheckMessage(""); }} className={`w-full text-left p-0 rounded-lg ${sel ? (isDtao ? "border-emerald-500 shadow-lg border" : "border-emerald-500 shadow-lg border") : (isDtao ? "border-violet-800 bg-black/30" : "border-gray-200")}`}>
                        <div className={`${sel ? (isDtao ? "h-20 flex items-center justify-center font-bold bg-emerald-600 text-white" : "h-20 flex items-center justify-center font-bold bg-emerald-500 text-white") : "h-20 flex items-center justify-center font-bold bg-slate-50 text-slate-800"}`}>
                          <span>{h.name}</span>
                        </div>

                        <div className={`${isDtao ? "p-3" : "p-3"}`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <div className={`${isDtao ? "text-slate-100" : "text-sm font-semibold"} text-sm font-semibold`}>{h.name}</div>
                              <div className={`${isDtao ? "text-slate-300" : "text-xs text-slate-500"} mt-2 flex items-center gap-2 text-xs`}>
                                <UsersIcon className={`h-4 w-4 ${isDtao ? "text-slate-300" : "text-slate-400"}`} />
                                <span>Capacity: {h.capacity ?? "—"}</span>
                              </div>
                            </div>
                            <div className={`text-xs px-2 py-1 rounded ${pct===0 ? "bg-emerald-500 text-white" : pct>=95 ? "bg-rose-600 text-white" : "bg-orange-400 text-white"}`}>{pct===0 ? "Free" : pct>=95 ? "Blocked" : `${pct}%`}</div>
                          </div>

                          {renderTinyHeatmap(h.name || key, bookingMode === "time" ? date : startDate)}
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={`${isDtao ? "bg-black/40 border border-violet-900 text-slate-100" : "bg-white"} rounded-lg p-4 shadow-sm`}>
              <h4 className={`${isDtao ? "text-slate-100" : "text-lg font-semibold text-slate-800"} text-lg font-semibold`}>Your Selection</h4>
              <div className={`text-sm ${isDtao ? "text-slate-300" : "text-slate-600"} space-y-2`}>
                <div><span className={`${isDtao ? "text-violet-300" : "text-indigo-600"}`}>Hall:</span> {selectedHallObj?.name || selectedHall || "Not selected"}</div>
                <div><span className={`${isDtao ? "text-violet-300" : "text-indigo-600"}`}>Event:</span> {slotTitle || "Not specified"}</div>
                <div><span className={`${isDtao ? "text-violet-300" : "text-indigo-600"}`}>Date:</span> {bookingMode==="time" ? ymd(date) : `${ymd(startDate)} → ${ymd(endDate)}`}</div>
                <div><span className={`${isDtao ? "text-violet-300" : "text-indigo-600"}`}>Time:</span> {bookingMode==="time" ? `${to12Label(startTime)} — ${to12Label(endTime)}` : "Per-day times / full-day"}</div>
              </div>

              <div className="mt-4">
                <button onClick={()=>resetForm()} className={`${isDtao ? "w-full py-2 rounded bg-transparent border border-violet-700 text-slate-200" : "w-full py-2 rounded bg-gray-100"}`}>Clear</button>
              </div>
            </div>
          </aside>
        </main>

        <BookedSlotsModal isOpen={showBookedModal} onClose={()=>setShowBookedModal(false)} seminars={seminars} hallKey={selectedHallObj?.name || selectedHall} dateStr={bookedModalDate} isDtao={isDtao} />
      </div>
    </>
  );
}
