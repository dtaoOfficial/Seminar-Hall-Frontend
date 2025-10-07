// src/pages/Admin/AddSeminarPage.js
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "../../utils/api";

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

/* ---------- Small icons ---------- */
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

/* ---------- Component ---------- */
export default function SingleBookingPage() {
  // booking mode + form
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

  const showNotification = (msg, ms=3500) => {
    setNotification(msg);
    if (notifRef.current) clearTimeout(notifRef.current);
    if (ms>0) notifRef.current = setTimeout(()=>setNotification(""), ms);
  };

  /* ---------- fetch ---------- */
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
  }, [selectedHall]);

  useEffect(()=>{ fetchAll(); return ()=>{ if (notifRef.current) clearTimeout(notifRef.current); } }, [fetchAll]);

  useEffect(()=> {
    if (!selectedHall) { setSelectedHallObj(null); return; }
    const obj = halls.find(h => h.name === selectedHall || String(h._id) === String(selectedHall) || String(h.id) === String(selectedHall));
    setSelectedHallObj(obj || null);
  }, [selectedHall, halls]);

  /* ---------- normalize seminars -> bookings map (minute-precision) ---------- */
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

        // treat as day booking if both startDate & endDate present OR type === 'day'
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

        // time booking (requires date + startTime + endTime)
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

  /* ---------- check availability ---------- */
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

    // build friendly message + suggestion (slide forward by 15-min)
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
        // find suggestion for that date
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

  /* ---------- submit ---------- */
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
    // require a fresh successful check before submit
    const res = bookingMode === "day" ? checkDayWiseAvailability() : checkTimeWiseAvailability();
    if (!res.ok) { setLastCheckOk(false); setLastCheckMessage(res.msg); showNotification(res.msg, 6000); return; }

    // basic validation
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

      // refresh seminars
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

  /* ---------- when startDate/endDate change prefill daySlots ---------- */
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

  /* ---------- heatmap ---------- */
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
        <div className="mt-1 text-xs text-slate-500">Heatmap (15m seg)</div>
      </div>
    );
  };

  /* ---------- Render ---------- */
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* Notification */}
      {notification && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50">
          <div className="rounded-xl px-4 py-2 shadow-lg bg-white border">
            <div className="text-sm">{notification}</div>
          </div>
        </div>
      )}

      {/* Success overlay */}
      {showSuccess && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
          <div className="rounded-2xl bg-white p-6 shadow-xl">
            <div className="text-lg font-semibold">Booked!</div>
            <div className="text-sm text-slate-600">Your booking was saved.</div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* FORM (left) - note: removed hall dropdown here per request */}
        <section className="bg-white rounded-2xl border p-6 shadow">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Book a Seminar Hall (Admin)</h1>
              <p className="text-sm text-slate-500 mt-1">Select a hall from the right, then check & book.</p>
            </div>
          </div>

          <div className="mt-4 flex gap-3 rounded-full p-1 bg-indigo-50">
            <button onClick={()=>{ setBookingMode("time"); setLastCheckOk(false); setLastCheckMessage(""); }} className={`flex-1 py-2 rounded-full ${bookingMode==="time" ? "bg-indigo-600 text-white" : "text-slate-600"}`}>Time Wise</button>
            <button onClick={()=>{ setBookingMode("day"); setLastCheckOk(false); setLastCheckMessage(""); }} className={`flex-1 py-2 rounded-full ${bookingMode==="day" ? "bg-indigo-600 text-white" : "text-slate-600"}`}>Day Wise</button>
          </div>

          <form onSubmit={(e)=>e.preventDefault()} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium">Event Name</label>
              <input value={slotTitle} onChange={e=>setSlotTitle(e.target.value)} className="mt-2 w-full rounded-md px-3 py-2 border" placeholder="Event title"/>
            </div>

            {bookingMode === "time" ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm">
                      <span className="inline-flex items-center"><CalendarIcon className="h-4 w-4 mr-2 text-slate-400" />Date</span>
                    </label>
                    <input type="date" value={ymd(date)} onChange={e=>setDate(new Date(e.target.value))} className="mt-1 w-full rounded-md px-3 py-2 border" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm">
                      <span className="inline-flex items-center"><ClockIcon className="h-4 w-4 mr-2 text-slate-400" />Start Time</span>
                    </label>
                    <select value={startTime} onChange={e=>setStartTime(e.target.value)} className="mt-1 w-full rounded-md px-3 py-2 border">
                      {TIME_OPTIONS.map(t => <option key={t} value={t}>{to12Label(t)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm">
                      <span className="inline-flex items-center"><ClockIcon className="h-4 w-4 mr-2 text-slate-400" />End Time</span>
                    </label>
                    <select value={endTime} onChange={e=>setEndTime(e.target.value)} className="mt-1 w-full rounded-md px-3 py-2 border">
                      {TIME_OPTIONS.map(t => <option key={t} value={t}>{to12Label(t)}</option>)}
                    </select>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm">
                      <span className="inline-flex items-center"><CalendarIcon className="h-4 w-4 mr-2 text-slate-400" />Start Date</span>
                    </label>
                    <input type="date" value={ymd(startDate)} onChange={e=>setStartDate(new Date(e.target.value))} className="mt-1 w-full rounded-md px-3 py-2 border" />
                  </div>
                  <div>
                    <label className="block text-sm">
                      <span className="inline-flex items-center"><CalendarIcon className="h-4 w-4 mr-2 text-slate-400" />End Date</span>
                    </label>
                    <input type="date" value={ymd(endDate)} onChange={e=>setEndDate(new Date(e.target.value))} className="mt-1 w-full rounded-md px-3 py-2 border" />
                  </div>
                </div>

                <p className="text-sm text-slate-500">Set per-day times below (optional). If left empty for a day we treat it as a full-day booking for that date.</p>

                <div className="mt-4 space-y-2">
                  {listDatesBetween(startDate, endDate).map(d => {
                    const k = ymd(d);
                    const ds = daySlots[k] || { startTime: TIME_OPTIONS[4], endTime: TIME_OPTIONS[8] };
                    return (
                      <div key={k} className="p-3 bg-slate-50 rounded border">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium">{k}</div>
                            <div className="text-xs text-slate-500">Per-day time</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <select value={ds.startTime} onChange={e=>setDaySlots(prev=>({ ...prev, [k]: {...(prev[k]||{}), startTime: e.target.value}}))} className="rounded px-2 py-1 border">
                              {TIME_OPTIONS.map(t => <option key={t} value={t}>{to12Label(t)}</option>)}
                            </select>
                            <span className="text-sm">—</span>
                            <select value={ds.endTime} onChange={e=>setDaySlots(prev=>({ ...prev, [k]: {...(prev[k]||{}), endTime: e.target.value}}))} className="rounded px-2 py-1 border">
                              {TIME_OPTIONS.map(t => <option key={t} value={t}>{to12Label(t)}</option>)}
                            </select>
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
                <label className="block text-sm font-medium">Faculty Name</label>
                <input value={bookingName} onChange={e=>setBookingName(e.target.value)} className="mt-2 w-full rounded-md px-3 py-2 border" />
              </div>

              <div>
                <label className="block text-sm font-medium">Email</label>
                <input value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 w-full rounded-md px-3 py-2 border" placeholder="name@domain.edu" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium">Phone</label>
                <input
                  value={phone}
                  onChange={(e)=> {
                    // only digits, max 10
                    const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                    setPhone(digits);
                  }}
                  maxLength={10}
                  className="mt-2 w-full rounded-md px-3 py-2 border"
                  placeholder="10-digit"
                />
                <div className="text-xs text-slate-400 mt-1">Digits only, 10 characters</div>
              </div>

              <div>
                <label className="block text-sm font-medium">Department</label>
                <select value={department} onChange={e=>setDepartment(e.target.value)} className="mt-2 w-full rounded-md px-3 py-2 border">
                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button type="button" onClick={doCheckAvailability} className="px-6 py-3 rounded-lg bg-indigo-600 text-white font-semibold">Check Availability</button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!lastCheckOk}
                className={`px-6 py-3 rounded-lg font-semibold ${lastCheckOk ? "bg-emerald-600 text-white" : "bg-gray-200 text-slate-500 cursor-not-allowed"}`}
              >
                Confirm & Book Now
              </button>
            </div>

            {/* last check message */}
            {lastCheckMessage && <div className={`mt-2 text-sm ${lastCheckOk ? "text-emerald-700" : "text-rose-600"}`}>{lastCheckMessage}</div>}
          </form>
        </section>

        {/* RIGHT: Halls + summary */}
        <aside className="space-y-6">
          <div className="bg-white rounded-lg border p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-slate-800">Select a Hall</h3>
              <div className="text-sm text-slate-500">Click a hall (availability shown for selected date)</div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {loading ? <div>Loading halls...</div> : halls.length === 0 ? <div>No halls</div> : halls.map(h => {
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
                    <button onClick={()=>{ setSelectedHall(h.name || key); setSelectedHallObj(h); setLastCheckOk(false); setLastCheckMessage(""); }} className={`w-full text-left p-0 rounded-lg border ${sel ? "border-emerald-500 shadow-lg" : "border-gray-200"}`}>
                      <div className={`h-20 flex items-center justify-center font-bold ${sel ? "bg-emerald-500 text-white" : "bg-slate-50 text-slate-800"}`}>
                        <span>{h.name}</span>
                      </div>

                      <div className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-semibold">{h.name}</div>
                            <div className="text-xs text-slate-500 mt-2 flex items-center gap-2">
                              <UsersIcon className="h-4 w-4 text-slate-400" />
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

          <div className="bg-white rounded-lg border p-4 shadow-sm">
            <h4 className="text-lg font-semibold text-slate-800 mb-3">Selection</h4>
            <div className="text-sm text-slate-600 space-y-2">
              <div><span className="text-indigo-600">Hall:</span> {selectedHallObj?.name || selectedHall || "Not selected"}</div>
              <div><span className="text-indigo-600">Event:</span> {slotTitle || "Not specified"}</div>
              <div><span className="text-indigo-600">Date:</span> {bookingMode === "time" ? ymd(date) : `${ymd(startDate)} → ${ymd(endDate)}`}</div>
              <div><span className="text-indigo-600">Time:</span> {bookingMode === "time" ? `${to12Label(startTime)} — ${to12Label(endTime)}` : "Per-day times / full-day"}</div>
            </div>

            <div className="mt-4">
              <button onClick={()=>{ resetForm(); }} className="w-full py-2 rounded bg-gray-100">Clear</button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
