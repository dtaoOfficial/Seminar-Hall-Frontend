// src/pages/Admin/AddSeminarPage.js
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import api from "../../utils/api";
import { useTheme } from "../../contexts/ThemeContext";
import AnimatedButton from "../../components/AnimatedButton";
import { useNotification } from "../../components/NotificationsProvider"; // optional — will work if provider present

/* ---------- Helpers (unchanged) ---------- */
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
  return `${String(hour12).padStart(2, "0")}:${String(mm).padStart(2, "0")} ${period}`;
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

/* ---------- Small icons (unchanged) ---------- */
const CalendarIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
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

/* ---------- Custom TimeSelect (animated & accessible) ---------- */
function TimeSelect({ value, onChange, options = TIME_OPTIONS, className = "", ariaLabel = "Select time" }) {
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  const { theme } = useTheme() || {};
  const isDtao = theme === "dtao";
  const reduce = useReducedMotion();

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
    <div ref={ref} className={`relative inline-block ${className}`}>
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
        <motion.div
          role="listbox"
          tabIndex={-1}
          initial={reduce ? {} : { opacity: 0, y: -6, scale: 0.98 }}
          animate={reduce ? {} : { opacity: 1, y: 0, scale: 1 }}
          exit={reduce ? {} : { opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
          className={`absolute z-50 mt-1 w-full rounded-md shadow-lg ${isDtao ? "bg-black/80 border border-violet-800 text-slate-100" : "bg-white border"}`}
          style={{ maxHeight: `${5 * 40}px`, overflowY: "auto" }} // ~5 rows of 40px
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
              className={`px-3 py-2 cursor-pointer ${isDtao ? "hover:bg-violet-900/60" : "hover:bg-gray-100"} ${opt === value ? (isDtao ? "bg-violet-900/70" : "bg-blue-50 font-semibold") : ""}`}
            >
              {to12Label(opt)}
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

/* ---------- Component (UI & animations only) ---------- */
export default function SingleBookingPage() {
  const { theme } = useTheme() || {};
  const isDtao = theme === "dtao";
  const reduce = useReducedMotion();

  // booking mode + form (logic identical to yours)
  const [bookingMode, setBookingMode] = useState("time"); // time | day
  const [slotTitle, setSlotTitle] = useState("");
  const [bookingName, setBookingName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [phone, setPhone] = useState("");

  // time mode
  const [date, setDate] = useState(new Date());
  const [startTime, setStartTime] = useState(TIME_OPTIONS[4] || "09:00");
  const [endTime, setEndTime] = useState(TIME_OPTIONS[8] || "10:00");

  // day mode
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [daySlots, setDaySlots] = useState({}); // per-date { startTime, endTime }

  // data
  const [halls, setHalls] = useState([]);
  const [seminars, setSeminars] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedHall, setSelectedHall] = useState("");
  const [selectedHallObj, setSelectedHallObj] = useState(null);
  const [loading, setLoading] = useState(true);

  // UI state
  const [notification, setNotification] = useState("");
  const notifRef = useRef(null);
  const [lastCheckOk, setLastCheckOk] = useState(false);
  const [lastCheckMessage, setLastCheckMessage] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  // IMPORTANT: call hook unconditionally at top-level so eslint rules-of-hooks is satisfied
  // If NotificationsProvider isn't mounted, it's expected that the hook will return null/undefined per your provider implementation.
  const globalNotify = useNotification();

  const showNotification = useCallback((msg, ms = 3500) => {
    // local floating notification (keeps existing behavior)
    setNotification(msg);
    if (notifRef.current) clearTimeout(notifRef.current);
    if (ms > 0) notifRef.current = setTimeout(() => setNotification(""), ms);

    // also call global provider if available
    try {
      if (globalNotify && typeof globalNotify.notify === "function") {
        globalNotify.notify(msg, ms > 0 ? "info" : "info", { autoDismiss: ms });
      }
    } catch {}
  }, [globalNotify]);

  /* ---------- fetch (unchanged) ---------- */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [hRes, sRes, dRes] = await Promise.all([
        api.get("/halls"),
        api.get("/seminars"),
        api.get("/departments").catch(()=>({ data: [] }))
      ]);
      setHalls(Array.isArray(hRes.data) ? hRes.data : []);
      setSeminars(Array.isArray(sRes.data) ? sRes.data : []);
      const deps = Array.isArray(dRes.data) ? dRes.data.map(d => (typeof d === "string" ? d : d?.name)).filter(Boolean) : [];
      setDepartments(deps.length ? deps : ["ADMIN"]);
      if (!selectedHall && Array.isArray(hRes.data) && hRes.data.length) {
        const first = hRes.data[0];
        setSelectedHall(first.name || first._id || first.id || "");
      }
    } catch (err) {
      console.error("fetchAll failed", err);
      showNotification("Error fetching data");
    } finally {
      setLoading(false);
    }
  }, [selectedHall, showNotification]);

  useEffect(()=>{ fetchAll(); return ()=>{ if (notifRef.current) clearTimeout(notifRef.current); } }, [fetchAll]);

  useEffect(()=> {
    if (!selectedHall) { setSelectedHallObj(null); return; }
    const obj = halls.find(h => h.name === selectedHall || String(h._id) === String(selectedHall) || String(h.id) === String(selectedHall));
    setSelectedHallObj(obj || null);
  }, [selectedHall, halls]);

  /* ---------- normalize seminars -> bookings map (unchanged) ---------- */
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
        if (String((s.status || "").toUpperCase()) !== "APPROVED") return;
        const hallName = s.hallName || s.hall?.name || "";
        const hallId = s.hallId || s.hall?._id || s.hall?.id || "";

        if ((s.startDate && s.endDate) || s.type === "day") {
          const sdKey = toDateKey(s.startDate || s.date || s.dateFrom);
          const edKey = toDateKey(s.endDate || s.date || s.dateTo);
          if (!sdKey || !edKey) return;
          const days = listDatesBetween(new Date(sdKey), new Date(edKey));
          days.forEach(d => {
            const key = ymd(d);
            const arr = map.get(key) || [];
            arr.push({ date: key, startMin: 0, endMin: 1440, hallName, hallId, original: s, type: "day" });
            map.set(key, arr);
          });
          return;
        }

        const dateKey = toDateKey(s.date || s.startDate || s.dateFrom);
        if (!dateKey) return;
        if (!s.startTime || !s.endTime) return;
        const st = hhmmToMinutes(s.startTime);
        const et = hhmmToMinutes(s.endTime);
        if (st == null || et == null) return;
        const arr = map.get(dateKey) || [];
        arr.push({ date: dateKey, startMin: st, endMin: et, hallName, hallId, original: s, type: "time" });
        map.set(dateKey, arr);
      } catch (e) {
        console.error("normalize error", e, s);
      }
    });
    return map;
  }, [seminars]);

  const isDateFullDayBlocked = (dateStr, hall) => {
    const arr = normalizedBookings.get(dateStr) || [];
    return arr.some(b => (b.type === "day" || (b.startMin === 0 && b.endMin === 1440)) && (b.hallName === hall || String(b.hallId) === String(hall)));
  };

  /* ---------- check availability (unchanged) ---------- */
  const checkTimeWiseAvailability = () => {
    if (!selectedHall) return { ok:false, msg:"Please select a hall from the right." };
    if (!date) return { ok:false, msg:"Pick a date first." };
    if (!startTime || !endTime) return { ok:false, msg:"Pick start and end times." };

    const ds = ymd(date);
    const sMin = hhmmToMinutes(startTime);
    const eMin = hhmmToMinutes(endTime);
    if (sMin == null || eMin == null) return { ok:false, msg:"Invalid time format." };
    if (eMin <= sMin) return { ok:false, msg:"End time must be after start time." };

    if (isDateFullDayBlocked(ds, selectedHall)) return { ok:false, msg:`Conflict: ${ds} is blocked for the whole day.` };

    const arr = normalizedBookings.get(ds) || [];
    const overlapping = arr.filter(b => {
      const hallMatch = (b.hallName === selectedHall) || (String(b.hallId) === String(selectedHall));
      if (!hallMatch) return false;
      return intervalsOverlap(sMin, eMin, b.startMin, b.endMin);
    });

    if (overlapping.length === 0) {
      return { ok:true, msg:`Available on ${ds}: ${to12Label(startTime)} — ${to12Label(endTime)}` };
    }

    const conflictMsgs = overlapping.map(b => `${b.date} (${minutesToHHMM(b.startMin)} — ${minutesToHHMM(b.endMin)})`);
    const needed = eMin - sMin;
    const dayStart = hhmmToMinutes(TIME_OPTIONS[0]);
    const dayEnd = hhmmToMinutes(TIME_OPTIONS[TIME_OPTIONS.length-1]) + 15;
    let suggestion = null;
    for (let cand = sMin - 60; cand <= dayEnd - needed; cand += 15) {
      if (cand < dayStart) continue;
      let conflict = false;
      for (const b of arr) {
        const hallMatch = (b.hallName === selectedHall) || (String(b.hallId) === String(selectedHall));
        if (!hallMatch) continue;
        if (intervalsOverlap(cand, cand + needed, b.startMin, b.endMin)) { conflict = true; break; }
      }
      if (!conflict) { suggestion = cand; break; }
    }

    const conflictText = `Conflict on: ${conflictMsgs.join(", ")}`;
    const suggestionText = suggestion != null ? `Suggested alternative on ${ds}: ${to12Label(minutesToHHMM(suggestion))} — ${to12Label(minutesToHHMM(suggestion + needed))}` : `No suitable alternative found on ${ds}`;
    return { ok:false, msg: `${conflictText}. ${suggestionText}` };
  };

  const checkDayWiseAvailability = () => {
    if (!selectedHall) return { ok:false, msg:"Please select a hall from the right." };
    if (!startDate || !endDate) return { ok:false, msg:"Pick start and end dates." };
    const sd = new Date(startDate); sd.setHours(0,0,0,0);
    const ed = new Date(endDate); ed.setHours(0,0,0,0);
    if (ed < sd) return { ok:false, msg:"End date can't be before start date." };

    const days = listDatesBetween(sd, ed);
    const conflicts = [];
    const suggestions = [];

    for (const d of days) {
      const key = ymd(d);
      if (isDateFullDayBlocked(key, selectedHall)) {
        conflicts.push(`${key} (full-day)`);
        continue;
      }
      const ds = daySlots[key];
      if (!ds || !ds.startTime || !ds.endTime) continue; // no per-day times -> treated as full-day attempt (already checked)
      const sMin = hhmmToMinutes(ds.startTime);
      const eMin = hhmmToMinutes(ds.endTime);
      if (sMin == null || eMin == null || eMin <= sMin) { conflicts.push(`${key} (invalid times)`); continue; }

      const arr = normalizedBookings.get(key) || [];
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
        for (let cand = dayStart; cand + needed <= dayEnd; cand += 15) {
          let conf = false;
          for (const b of arr) {
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
    return { ok:true, msg: `All selected days are available (${ymd(sd)} → ${ymd(ed)})` };
  };

  const doCheckAvailability = async () => {
    setLastCheckMessage("");
    setLastCheckOk(false);
    try {
      const res = bookingMode === "day" ? checkDayWiseAvailability() : checkTimeWiseAvailability();
      setLastCheckOk(!!res.ok);
      setLastCheckMessage(res.msg);
      showNotification(res.msg, res.ok ? 3000 : 7000);
      return res;
    } catch (err) {
      console.error(err);
      showNotification("Error checking availability");
      return { ok:false, msg:"Error checking availability" };
    }
  };

  /* ---------- submit (unchanged logic) ---------- */
  const resetForm = () => {
    setSlotTitle("");
    setBookingName("");
    setEmail("");
    setPhone("");
    setStartTime(TIME_OPTIONS[4] || "09:00");
    setEndTime(TIME_OPTIONS[8] || "10:00");
    setStartDate(new Date());
    setEndDate(new Date());
    setDaySlots({});
    setLastCheckOk(false);
    setLastCheckMessage("");
    showNotification("Form cleared", 1200);
  };

  const handleSubmit = async (ev) => {
    ev && ev.preventDefault();
    const res = bookingMode === "day" ? checkDayWiseAvailability() : checkTimeWiseAvailability();
    if (!res.ok) { setLastCheckOk(false); setLastCheckMessage(res.msg); showNotification(res.msg, 6000); return; }

    if (!slotTitle || !slotTitle.trim()) { showNotification("Event name required"); return; }
    if (!bookingName || !bookingName.trim()) { showNotification("Faculty name required"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showNotification("Invalid email"); return; }
    if (!/^[6-9]\d{9}$/.test(phone)) { showNotification("Invalid phone (10 digits)"); return; }

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
          status: "APPROVED",
          remarks: "Added by Admin",
          appliedAt: new Date().toISOString(),
          date: ymd(date),
          startTime,
          endTime
        };
        await api.post("/seminars", payload);
      } else {
        const days = listDatesBetween(startDate, endDate);
        const posts = [];
        for (const d of days) {
          const key = ymd(d);
          const ds = daySlots[key];
          const base = {
            hallName: selectedHall || selectedHallObj?.name,
            slot: "Day",
            slotTitle,
            bookingName,
            email,
            department,
            phone,
            status: "APPROVED",
            remarks: "Added by Admin",
            appliedAt: new Date().toISOString()
          };
          if (ds && ds.startTime && ds.endTime) {
            posts.push({ ...base, date: key, startTime: ds.startTime, endTime: ds.endTime });
          } else {
            posts.push({ ...base, startDate: key, endDate: key });
          }
        }
        await Promise.all(posts.map(p => api.post("/seminars", p)));
      }

      const r = await api.get("/seminars");
      setSeminars(Array.isArray(r.data) ? r.data : []);
      setShowSuccess(true);
      setTimeout(()=>setShowSuccess(false), 1800);
      showNotification("Booked successfully!", 3000);
      resetForm();
    } catch (err) {
      console.error("book err", err);
      const serverMsg = (err.response && (err.response.data?.message || err.response.data?.error || err.response.data)) || err.message || "Error adding seminar!";
      showNotification(String(serverMsg), 6000);
    }
  };

  /* ---------- when startDate/endDate change prefill daySlots (unchanged) ---------- */
  useEffect(()=> {
    if (!startDate || !endDate) return;
    const sd = new Date(startDate); sd.setHours(0,0,0,0);
    const ed = new Date(endDate); ed.setHours(0,0,0,0);
    if (ed < sd) return;
    const days = listDatesBetween(sd, ed);
    setDaySlots(prev => {
      const next = { ...prev };
      days.forEach(d => {
        const k = ymd(d);
        if (!next[k]) next[k] = { startTime: TIME_OPTIONS[4], endTime: TIME_OPTIONS[8] };
      });
      Object.keys(next).forEach(k => {
        if (!days.some(d => ymd(d) === k)) delete next[k];
      });
      return next;
    });
  }, [startDate, endDate]);

  /* ---------- heatmap (unchanged) ---------- */
  const renderHeatmap = (hallKey, dateObj) => {
    const key = ymd(dateObj || new Date());
    const arr = normalizedBookings.get(key) || [];
    const startBase = hhmmToMinutes(TIME_OPTIONS[0]);
    const totalSegments = (hhmmToMinutes(TIME_OPTIONS[TIME_OPTIONS.length-1]) + 15 - startBase) / 15;
    const segments = new Array(totalSegments).fill(false);
    arr.forEach(b => {
      const hallMatch = (b.hallName === hallKey) || (String(b.hallId) === String(hallKey));
      if (!hallMatch) return;
      for (let seg=0; seg<segments.length; seg++) {
        const segStart = startBase + seg*15;
        const segEnd = segStart + 15;
        if (intervalsOverlap(segStart, segEnd, b.startMin, b.endMin)) segments[seg] = true;
      }
    });
    return (
      <div className="mt-2">
        <div className="flex gap-0.5">
          {segments.map((s,i)=>(
            <div key={i} className={`h-2 flex-1 rounded-sm ${s ? "bg-rose-300" : "bg-emerald-200"}`} />
          ))}
        </div>
        <div className={`mt-1 text-xs ${isDtao ? "text-slate-300" : "text-slate-500"}`}>Heatmap (15m seg)</div>
      </div>
    );
  };

  /* ---------- Render (UI/upgrades only) ---------- */
  return (
    <div className={`${isDtao ? "min-h-screen p-6 bg-[#08050b] text-slate-100" : "min-h-screen bg-slate-50 p-6"}`}>
      {/* floating local notification (kept for compatibility) */}
      {notification && (
        <motion.div
          initial={reduce ? {} : { opacity: 0, y: -8 }}
          animate={reduce ? {} : { opacity: 1, y: 0 }}
          exit={reduce ? {} : { opacity: 0, y: -8 }}
          transition={{ duration: 0.22 }}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-50"
          role="status"
          aria-live="polite"
        >
          <div className={`rounded-xl px-4 py-2 shadow-lg ${isDtao ? "bg-black/60 border border-violet-800 text-slate-100" : "bg-white border text-slate-900"}`}>
            <div className="text-sm">{notification}</div>
          </div>
        </motion.div>
      )}

      {/* Success overlay (animated, backdrop blur) */}
      <AnimateSuccessOverlay show={showSuccess} isDtao={isDtao} reduce={reduce} />

      <motion.div
        className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8"
        initial={reduce ? {} : { opacity: 0, y: 6 }}
        animate={reduce ? {} : { opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* FORM (left) */}
        <motion.section data-reveal className={`${isDtao ? "bg-black/40 border border-violet-900 text-slate-100" : "bg-white"} rounded-2xl p-6 shadow`}
          initial={reduce ? {} : { opacity: 0, y: 8 }}
          animate={reduce ? {} : { opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.05 }}
        >
          <div className="flex items-start justify-between">
            <div>
              <h1 className={`${isDtao ? "text-slate-100" : "text-slate-800"} text-2xl font-semibold`}>Book a Seminar Hall (Admin)</h1>
              <p className={`${isDtao ? "text-slate-300" : "text-slate-500"} text-sm mt-1`}>Select a hall from the right, then check & book.</p>
            </div>
          </div>

          <div className={`mt-4 flex gap-3 rounded-full p-1 ${isDtao ? "bg-black/30" : "bg-indigo-50"}`}>
            <AnimatedButton
              variant={bookingMode==="time" ? "primary" : "ghost"}
              size="sm"
              onClick={()=>{ setBookingMode("time"); setLastCheckOk(false); setLastCheckMessage(""); }}
              className={`flex-1 ${bookingMode==="time" ? "" : "opacity-90"}`}
            >
              Time Wise
            </AnimatedButton>

            <AnimatedButton
              variant={bookingMode==="day" ? "primary" : "ghost"}
              size="sm"
              onClick={()=>{ setBookingMode("day"); setLastCheckOk(false); setLastCheckMessage(""); }}
              className={`flex-1 ${bookingMode==="day" ? "" : "opacity-90"}`}
            >
              Day Wise
            </AnimatedButton>
          </div>

          <form onSubmit={(e)=>e.preventDefault()} className="mt-6 space-y-4">
            <div>
              <label className={`block text-sm font-medium ${isDtao ? "text-slate-200" : ""}`}>Event Name</label>
              <input value={slotTitle} onChange={e=>setSlotTitle(e.target.value)}
                     className={`mt-2 w-full rounded-md px-3 py-2 border ${isDtao ? "bg-transparent border-violet-700 text-slate-100" : ""}`}
                     placeholder="Event title"/>
            </div>

            {bookingMode === "time" ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm ${isDtao ? "text-slate-200" : ""}`}>
                      <span className="inline-flex items-center"><CalendarIcon className={`h-4 w-4 mr-2 ${isDtao ? "text-slate-300" : "text-slate-400"}`} />Date</span>
                    </label>
                    <input type="date" value={ymd(date)} onChange={e=>setDate(new Date(e.target.value))} className={`mt-1 w-full rounded-md px-3 py-2 border ${isDtao ? "bg-transparent border-violet-700 text-slate-100" : ""}`} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm ${isDtao ? "text-slate-200" : ""}`}>
                      <span className="inline-flex items-center"><ClockIcon className={`h-4 w-4 mr-2 ${isDtao ? "text-slate-300" : "text-slate-400"}`} />Start Time</span>
                    </label>

                    <TimeSelect
                      value={startTime}
                      onChange={(v) => setStartTime(v)}
                      className="mt-1 w-full"
                      ariaLabel="Start time"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm ${isDtao ? "text-slate-200" : ""}`}>
                      <span className="inline-flex items-center"><ClockIcon className={`h-4 w-4 mr-2 ${isDtao ? "text-slate-300" : "text-slate-400"}`} />End Time</span>
                    </label>

                    <TimeSelect
                      value={endTime}
                      onChange={(v) => setEndTime(v)}
                      className="mt-1 w-full"
                      ariaLabel="End time"
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm ${isDtao ? "text-slate-200" : ""}`}>
                      <span className="inline-flex items-center"><CalendarIcon className={`h-4 w-4 mr-2 ${isDtao ? "text-slate-300" : "text-slate-400"}`} />Start Date</span>
                    </label>
                    <input type="date" value={ymd(startDate)} onChange={e=>setStartDate(new Date(e.target.value))} className={`mt-1 w-full rounded-md px-3 py-2 border ${isDtao ? "bg-transparent border-violet-700 text-slate-100" : ""}`} />
                  </div>
                  <div>
                    <label className={`block text-sm ${isDtao ? "text-slate-200" : ""}`}>
                      <span className="inline-flex items-center"><CalendarIcon className={`h-4 w-4 mr-2 ${isDtao ? "text-slate-300" : "text-slate-400"}`} />End Date</span>
                    </label>
                    <input type="date" value={ymd(endDate)} onChange={e=>setEndDate(new Date(e.target.value))} className={`mt-1 w-full rounded-md px-3 py-2 border ${isDtao ? "bg-transparent border-violet-700 text-slate-100" : ""}`} />
                  </div>
                </div>

                <p className={`${isDtao ? "text-slate-300" : "text-slate-500"} text-sm`}>Set per-day times below (optional). If left empty for a day we treat it as a full-day booking for that date.</p>

                <div className="mt-4 space-y-2">
                  {listDatesBetween(startDate, endDate).map(d => {
                    const k = ymd(d);
                    const ds = daySlots[k] || { startTime: TIME_OPTIONS[4], endTime: TIME_OPTIONS[8] };
                    return (
                      <div key={k} className={`${isDtao ? "p-3 bg-black/30 rounded border border-violet-800" : "p-3 bg-slate-50 rounded border"}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className={`${isDtao ? "text-slate-100" : "text-sm font-medium"} text-sm font-medium`}>{k}</div>
                            <div className={`${isDtao ? "text-slate-300" : "text-xs text-slate-500"} text-xs`}>Per-day time</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-[120px]">
                              <TimeSelect
                                value={ds.startTime}
                                onChange={(v) => setDaySlots(prev=>({ ...prev, [k]: {...(prev[k]||{}), startTime: v}}))}
                                className=""
                                ariaLabel={`Start time for ${k}`}
                              />
                            </div>

                            <span className="text-sm">—</span>

                            <div className="w-[120px]">
                              <TimeSelect
                                value={ds.endTime}
                                onChange={(v) => setDaySlots(prev=>({ ...prev, [k]: {...(prev[k]||{}), endTime: v}}))}
                                className=""
                                ariaLabel={`End time for ${k}`}
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

            {/* DEPARTMENT dropdown fetched dynamically */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium ${isDtao ? "text-slate-200" : ""}`}>Faculty Name</label>
                <input value={bookingName} onChange={e=>setBookingName(e.target.value)} className={`mt-2 w-full rounded-md px-3 py-2 border ${isDtao ? "bg-transparent border-violet-700 text-slate-100" : ""}`} />
              </div>

              <div>
                <label className={`block text-sm font-medium ${isDtao ? "text-slate-200" : ""}`}>Email</label>
                <input value={email} onChange={e=>setEmail(e.target.value)} className={`mt-2 w-full rounded-md px-3 py-2 border ${isDtao ? "bg-transparent border-violet-700 text-slate-100" : ""}`} placeholder="name@domain.edu" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium ${isDtao ? "text-slate-200" : ""}`}>Phone</label>
                <input
                  value={phone}
                  onChange={(e)=> {
                    const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                    setPhone(digits);
                  }}
                  maxLength={10}
                  className={`mt-2 w-full rounded-md px-3 py-2 border ${isDtao ? "bg-transparent border-violet-700 text-slate-100" : ""}`}
                  placeholder="10-digit"
                />
                <div className={`${isDtao ? "text-slate-400" : "text-xs text-slate-400"} text-xs mt-1`}>Digits only, 10 characters</div>
              </div>

              <div>
                <label className={`block text-sm font-medium ${isDtao ? "text-slate-200" : ""}`}>Department</label>
                <select value={department} onChange={e=>setDepartment(e.target.value)} className={`mt-2 w-full rounded-md px-3 py-2 border ${isDtao ? "bg-transparent border-violet-700 text-slate-100" : ""}`}>
                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <AnimatedButton type="button" onClick={doCheckAvailability} variant="primary">
                Check Availability
              </AnimatedButton>

              <AnimatedButton
                type="button"
                onClick={handleSubmit}
                variant={lastCheckOk ? "primary" : "ghost"}
                className={!lastCheckOk ? "opacity-60 pointer-events-none" : ""}
              >
                Confirm & Book Now
              </AnimatedButton>
            </div>

            {/* last check message */}
            {lastCheckMessage && <div className={`mt-2 text-sm ${lastCheckOk ? (isDtao ? "text-emerald-300" : "text-emerald-700") : "text-rose-600"}`}>{lastCheckMessage}</div>}
          </form>
        </motion.section>

        {/* RIGHT: Halls + summary */}
        <motion.aside className="space-y-6" data-reveal
          initial={reduce ? {} : { opacity: 0, y: 8 }}
          animate={reduce ? {} : { opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08 }}
        >
          <div className={`${isDtao ? "bg-black/40 border border-violet-900 text-slate-100" : "bg-white"} rounded-lg p-4 shadow-sm`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className={`${isDtao ? "text-slate-100" : "text-slate-800"} text-lg font-semibold`}>Select a Hall</h3>
              <div className={`${isDtao ? "text-slate-300" : "text-sm text-slate-500"}`}>Click a hall (availability shown for selected date)</div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {loading ? <div className={`${isDtao ? "text-slate-300" : ""}`}>Loading halls...</div> : halls.length === 0 ? <div className={`${isDtao ? "text-slate-300" : ""}`}>No halls</div> : halls.map(h => {
                const key = h._id || h.id || h.name;
                const sel = selectedHall === (h.name || key);
                const onDate = bookingMode === "time" ? date : startDate;
                const ds = ymd(onDate);
                const arr = normalizedBookings.get(ds) || [];
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
                    <button onClick={()=>{ setSelectedHall(h.name || key); setSelectedHallObj(h); setLastCheckOk(false); setLastCheckMessage(""); }} className={`w-full text-left p-0 rounded-lg ${sel ? (isDtao ? "border-emerald-500 shadow-lg border" : "border-emerald-500 shadow-lg border") : "border-gray-200"}`}>
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

                        {renderHeatmap(h.name || key, bookingMode === "time" ? date : startDate)}
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={`${isDtao ? "bg-black/40 border border-violet-900 text-slate-100" : "bg-white"} rounded-lg p-4 shadow-sm`}>
            <h4 className={`${isDtao ? "text-slate-100" : "text-lg font-semibold text-slate-800"} text-lg font-semibold`}>Selection</h4>
            <div className={`text-sm ${isDtao ? "text-slate-300" : "text-slate-600"} space-y-2`}>
              <div><span className={`${isDtao ? "text-violet-300" : "text-indigo-600"}`}>Hall:</span> {selectedHallObj?.name || selectedHall || "Not selected"}</div>
              <div><span className={`${isDtao ? "text-violet-300" : "text-indigo-600"}`}>Event:</span> {slotTitle || "Not specified"}</div>
              <div><span className={`${isDtao ? "text-violet-300" : "text-indigo-600"}`}>Date:</span> {bookingMode === "time" ? ymd(date) : `${ymd(startDate)} → ${ymd(endDate)}`}</div>
              <div><span className={`${isDtao ? "text-violet-300" : "text-indigo-600"}`}>Time:</span> {bookingMode === "time" ? `${to12Label(startTime)} — ${to12Label(endTime)}` : "Per-day times / full-day"}</div>
            </div>

            <div className="mt-4">
              <AnimatedButton onClick={()=>{ resetForm(); }} variant="ghost" className={`${isDtao ? "w-full py-2 rounded bg-transparent border border-violet-700 text-slate-200" : "w-full py-2 rounded bg-gray-100"}`}>Clear</AnimatedButton>
            </div>
          </div>
        </motion.aside>
      </motion.div>
    </div>
  );
}

/* ---------- small helpers components used above ---------- */
function AnimateSuccessOverlay({ show, isDtao, reduce }) {
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
        transition={{ duration: 0.28, type: "spring", stiffness: 350, damping: 28 }}
        className={`${isDtao ? "rounded-2xl bg-black/80 border border-violet-800 p-6 shadow-xl text-slate-100" : "rounded-2xl bg-white p-6 shadow-xl"}`}
        style={{ backdropFilter: "blur(6px)" }}
        role="status"
        aria-live="polite"
      >
        <div className="text-lg font-semibold">Booked!</div>
        <div className={`${isDtao ? "text-slate-300" : "text-slate-600"} text-sm`}>Your booking was saved.</div>
      </motion.div>

      {/* translucent backdrop to blur page */}
      <motion.div
        initial={reduce ? {} : { opacity: 0 }}
        animate={reduce ? {} : { opacity: 1 }}
        transition={{ duration: 0.36 }}
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(6px)" }}
        onClick={(e) => e.stopPropagation()}
        aria-hidden
      />
    </motion.div>
  );
}
