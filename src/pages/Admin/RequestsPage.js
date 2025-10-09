// src/pages/RequestsPage.js
import React, { useEffect, useState, useCallback, useRef } from "react";
import api from "../../utils/api";
import { useNotification } from "../../components/NotificationsProvider";
import { useTheme } from "../../contexts/ThemeContext";

const POLL_INTERVAL_MS = 10000; // 10s
const FILTER_DEBOUNCE_MS = 400;

/* ---------- Small accessible Dropdown (replaces native select) ----------
   same implementation used in other pages (keyboard support, aria, theme-aware)
*/
function Dropdown({ options = [], value, onChange, className = "", ariaLabel = "Select", placeholder = "" }) {
  const { theme } = useTheme() || {};
  const isDtao = theme === "dtao";
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  const normalized = options.map((o) => (typeof o === "string" ? { value: o, label: o } : { value: o.value, label: o.label ?? o.value }));
  const selectedLabel = (normalized.find((o) => String(o.value) === String(value)) || {}).label ?? "";

  useEffect(() => {
    function onDoc(e) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const onKeyDownRoot = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen((s) => !s);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const onOptionKey = (e, opt) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onChange(opt.value);
      setOpen(false);
    }
  };

  return (
    <div ref={ref} className={`relative inline-block w-full ${className}`}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((s) => !s)}
        onKeyDown={onKeyDownRoot}
        className={`w-full text-left rounded-md px-3 py-2 border flex items-center justify-between ${isDtao ? "bg-transparent border-violet-700 text-slate-100" : "bg-white border-gray-200 text-gray-800"}`}
      >
        <span className={`${selectedLabel ? "" : (isDtao ? "text-slate-400" : "text-gray-400")}`}>{selectedLabel || placeholder}</span>
        <svg className={`w-4 h-4 ml-2 ${isDtao ? "text-slate-300" : "text-slate-600"}`} viewBox="0 0 24 24" fill="none">
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          tabIndex={-1}
          className={`absolute z-50 mt-1 w-full rounded-md shadow-lg ${isDtao ? "bg-black/80 border border-violet-800 text-slate-100" : "bg-white border"}`}
          style={{ maxHeight: `${5 * 40}px`, overflowY: "auto" }}
        >
          {normalized.map((opt) => (
            <div
              key={opt.value}
              role="option"
              aria-selected={String(opt.value) === String(value)}
              tabIndex={0}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              onKeyDown={(e) => onOptionKey(e, opt)}
              className={`px-3 py-2 cursor-pointer ${isDtao ? "hover:bg-violet-900/60" : "hover:bg-gray-100"} ${String(opt.value) === String(value) ? (isDtao ? "bg-violet-900/70 font-medium" : "bg-blue-50 font-medium") : ""}`}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Page ---------- */
const RequestsPage = () => {
  const { notify } = useNotification();
  const { theme } = useTheme() || {};
  const isDtao = theme === "dtao";

  const [items, setItems] = useState([]);

  // filters (raw + debounced)
  const [searchDeptRaw, setSearchDeptRaw] = useState("");
  const [searchDateRaw, setSearchDateRaw] = useState("");
  const [searchSlotRaw, setSearchSlotRaw] = useState("");
  const [statusFilterRaw, setStatusFilterRaw] = useState("ALL");

  const [searchDept, setSearchDept] = useState("");
  const [searchDate, setSearchDate] = useState("");
  const [searchSlot, setSearchSlot] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [remarksMap, setRemarksMap] = useState({});
  const [blinkIds, setBlinkIds] = useState(new Set());
  const [newIdsSet, setNewIdsSet] = useState(new Set());
  const [lastUpdated, setLastUpdated] = useState(null);

  const prevIdsRef = useRef(new Set());
  const pollingRef = useRef(null);
  const mountedRef = useRef(true);
  const blinkTimeoutRef = useRef(null);
  const debounceTimers = useRef({});

  const [rejectModal, setRejectModal] = useState({ open: false, normId: null });
  const mainRef = useRef(null);
  const rejectTextareaRef = useRef(null);

  // new: expanded rows set
  const [expanded, setExpanded] = useState(() => new Set());

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Debounce filter updates
  useEffect(() => {
    const timers = debounceTimers.current;
    clearTimeout(timers.dept);
    timers.dept = setTimeout(() => setSearchDept(searchDeptRaw), FILTER_DEBOUNCE_MS);
    return () => clearTimeout(timers.dept);
  }, [searchDeptRaw]);

  useEffect(() => {
    const timers = debounceTimers.current;
    clearTimeout(timers.date);
    timers.date = setTimeout(() => setSearchDate(searchDateRaw), FILTER_DEBOUNCE_MS);
    return () => clearTimeout(timers.date);
  }, [searchDateRaw]);

  useEffect(() => {
    const timers = debounceTimers.current;
    clearTimeout(timers.slot);
    timers.slot = setTimeout(() => setSearchSlot(searchSlotRaw), FILTER_DEBOUNCE_MS);
    return () => clearTimeout(timers.slot);
  }, [searchSlotRaw]);

  useEffect(() => {
    const timers = debounceTimers.current;
    clearTimeout(timers.status);
    timers.status = setTimeout(() => setStatusFilter(statusFilterRaw), FILTER_DEBOUNCE_MS);
    return () => clearTimeout(timers.status);
  }, [statusFilterRaw]);

  const normalizeSeminar = (s) => ({
    ...s,
    __src: "seminar",
    normId: `seminar-${s.id ?? s._id}`,
    status: (s.status ?? "").toString().toUpperCase(),
  });

  // notification sound helper (WebAudio)
  const playNotificationSound = (count = 1) => {
    try {
      if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const now = ctx.currentTime;

      const playTone = (freq, tStart) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        o.frequency.value = freq;
        g.gain.value = 0;
        o.connect(g);
        g.connect(ctx.destination);
        o.start(now + tStart);
        g.gain.setValueAtTime(0, now + tStart);
        g.gain.linearRampToValueAtTime(0.12, now + tStart + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, now + tStart + 0.16);
        o.stop(now + tStart + 0.2);
      };

      playTone(880, 0);
      if (count > 1) playTone(1000, 0.22);

      setTimeout(() => {
        try { ctx.close(); } catch {}
      }, 600);
    } catch (err) {
      console.warn("audio err", err);
    }
  };

  const emitNewRequestsEvent = (num) => {
    try {
      window.dispatchEvent(new CustomEvent("new-requests", { detail: { count: Number(num) } }));
    } catch {}
  };

  const fetchAll = useCallback(
    async (silent = false) => {
      try {
        const sRes = await api.get("/seminars");
        if (!Array.isArray(sRes.data)) {
          if (!silent) notify("Unexpected seminars response", "error", 3000);
          if (mountedRef.current) setItems([]);
          return;
        }

        const seminars = sRes.data.map(normalizeSeminar).sort((a, b) => {
          const da = new Date(a.date || a.appliedAt || 0).getTime() || 0;
          const db = new Date(b.date || b.appliedAt || 0).getTime() || 0;
          return db - da;
        });

        // detect new items
        const incomingIds = new Set(seminars.map((it) => it.normId));
        const prevIds = prevIdsRef.current || new Set();
        const newlyAdded = [];
        for (const id of incomingIds) {
          if (id && !prevIds.has(id)) newlyAdded.push(id);
        }

        if (!silent && prevIds.size > 0 && newlyAdded.length > 0) {
          // notify + play sound + emit event
          notify(`${newlyAdded.length} new request(s)`, "info", 3500);
          playNotificationSound(Math.min(newlyAdded.length, 2));
          emitNewRequestsEvent(newlyAdded.length);

          if (mountedRef.current) {
            setBlinkIds((prev) => {
              const next = new Set(prev);
              newlyAdded.forEach((id) => next.add(String(id)));
              return next;
            });

            setNewIdsSet((prev) => {
              const next = new Set(prev);
              newlyAdded.forEach((id) => next.add(String(id)));
              return next;
            });

            if (blinkTimeoutRef.current) clearTimeout(blinkTimeoutRef.current);
            blinkTimeoutRef.current = setTimeout(() => {
              if (!mountedRef.current) return;
              setBlinkIds((prev) => {
                const next = new Set(prev);
                newlyAdded.forEach((id) => next.delete(String(id)));
                return next;
              });
              blinkTimeoutRef.current = null;
            }, 6000);
          }
        }

        prevIdsRef.current = incomingIds;

        if (mountedRef.current) {
          setRemarksMap((prev) => {
            const next = { ...prev };
            seminars.forEach((row) => {
              const id = row.normId;
              const serverRemark = row.remarks ?? "";
              if (id && !(id in next)) next[id] = serverRemark;
            });
            return next;
          });
          setItems(seminars);
          setLastUpdated(new Date());

          // scroll into view when data refreshed so user notices new requests
          if (mainRef.current && mainRef.current.scrollIntoView) {
            try {
              mainRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
            } catch (e) {}
          }
        }
      } catch (err) {
        console.error("Error fetching seminars:", err?.response || err);
        if (!silent) notify("Failed to fetch seminars", "error", 3000);
      }
    },
    [notify]
  );

  useEffect(() => {
    fetchAll(true);
    pollingRef.current = setInterval(() => fetchAll(false), POLL_INTERVAL_MS);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (blinkTimeoutRef.current) clearTimeout(blinkTimeoutRef.current);
    };
  }, [fetchAll]);

  // === action functions (kept same logic as requested) ===
  const saveRemarks = async (normId) => {
    const remarks = (remarksMap[normId] ?? "").trim();
    if (!normId) return;
    const [, rawId] = normId.split("-", 2);
    try {
      await api.put(`/seminars/${rawId}`, { remarks });
      notify("Remarks saved", "success", 2200);
      await fetchAll(true);
    } catch (err) {
      notify(err?.response?.data?.message || "Failed to save remarks", "error", 3500);
    }
  };

  const handleApprove = async (normId) => {
    const [, rawId] = normId.split("-", 2);
    try {
      await api.put(`/seminars/${rawId}`, { status: "APPROVED", remarks: (remarksMap[normId] ?? "").trim() });
      notify("Request approved", "success", 2200);
      await fetchAll(true);
    } catch (err) {
      notify(err?.response?.data?.message || "Failed to approve", "error", 3500);
    }
  };

  const handleReject = async (normId) => {
    const [, rawId] = normId.split("-", 2);
    const remarks = (remarksMap[normId] ?? "").trim();
    if (!remarks) {
      notify("Enter remarks before rejecting", "warn", 2200);
      return;
    }
    try {
      await api.put(`/seminars/${rawId}`, { status: "REJECTED", remarks });
      notify("Request rejected", "success", 2200);
      await fetchAll(true);
    } catch (err) {
      notify(err?.response?.data?.message || "Failed to reject", "error", 3500);
    }
  };

  const handleConfirmCancel = async (normId) => {
    const [, rawId] = normId.split("-", 2);
    const remarks = (remarksMap[normId] ?? "").trim() || "Cancellation confirmed";
    try {
      await api.put(`/seminars/${rawId}`, { status: "CANCELLED", remarks });
      notify("Cancel confirmed", "success", 2200);
      setNewIdsSet((prev) => {
        const next = new Set(prev);
        next.delete(normId);
        return next;
      });
      await fetchAll(true);
    } catch (err) {
      notify(err?.response?.data?.message || "Failed to confirm cancel", "error", 3500);
    }
  };

  const handleRejectCancel = async (normId) => {
    const [, rawId] = normId.split("-", 2);
    const remarks = (remarksMap[normId] ?? "").trim() || "Cancellation rejected";
    try {
      await api.put(`/seminars/${rawId}`, { status: "APPROVED", remarks });
      notify("Cancel rejected", "success", 2200);
      setNewIdsSet((prev) => {
        const next = new Set(prev);
        next.delete(normId);
        return next;
      });
      await fetchAll(true);
    } catch (err) {
      notify(err?.response?.data?.message || "Failed to reject cancel", "error", 3500);
    }
  };

  // end action functions (kept intact)

  const filteredItems = items.filter((r) => {
    const status = (r.status ?? "").toUpperCase();
    if (statusFilter !== "ALL" && status !== statusFilter) return false;
    if (searchDept && !(r.department ?? "").toLowerCase().includes(searchDept.toLowerCase())) return false;
    if (searchDate) {
      const dateOnly = (r.date || "").split("T")[0];
      if (dateOnly !== searchDate) return false;
    }
    if (searchSlot && !(r.slot ?? "").toLowerCase().includes(searchSlot.toLowerCase())) return false;
    return true;
  });

  const formatTime = (t) =>
    t
      ? new Date(`1970-01-01T${t}`).toLocaleTimeString("en-IN", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })
      : "";

  const formatDateNice = (iso) => {
    if (!iso) return "";
    const dateOnly = String(iso).split("T")[0];
    const d = new Date(dateOnly);
    if (isNaN(d.getTime())) return dateOnly;
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  const statusBadge = (s) => {
    const st = (s ?? "").toUpperCase();
    const base = "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold";
    if (st === "PENDING") return <span className={`${base} bg-yellow-50 text-yellow-800`}>PENDING</span>;
    if (st === "APPROVED") return <span className={`${base} bg-green-50 text-green-800`}>APPROVED</span>;
    if (st === "REJECTED") return <span className={`${base} bg-red-50 text-red-800`}>REJECTED</span>;
    if (st === "CANCEL_REQUESTED") return <span className={`${base} bg-orange-50 text-orange-800`}>CANCEL REQ</span>;
    if (st === "CANCELLED") return <span className={`${base} bg-gray-100 text-gray-700`}>CANCELLED</span>;
    return <span className={`${base} bg-gray-50 text-gray-700`}>{st || "—"}</span>;
  };

  // ensure reject textarea is focused when modal opens
  useEffect(() => {
    if (rejectModal.open && rejectTextareaRef.current) {
      try {
        rejectTextareaRef.current.focus({ preventScroll: true });
        rejectTextareaRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      } catch (e) {}
    }
  }, [rejectModal.open]);

  // toggle expand for "More"
  const toggleExpanded = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // render per-day details similar to DeptHistory
  const renderPerDayDetails = (s) => {
    if (s.daySlots && typeof s.daySlots === "object") {
      const keys = Object.keys(s.daySlots).sort();
      if (keys.length === 0) return <div className="text-sm text-slate-400">No per-day details</div>;
      return (
        <ul className="space-y-1 text-sm">
          {keys.map((k) => {
            const val = s.daySlots[k];
            if (!val) {
              return <li key={k}><strong>{k}</strong>: <span className="text-xs text-slate-400">Full day</span></li>;
            }
            const st = val.startTime || val.start || "--";
            const et = val.endTime || val.end || "--";
            return <li key={k}><strong>{k}</strong>: {st} — {et}</li>;
          })}
        </ul>
      );
    }

    if (s.startDate && s.endDate) {
      return <div className="text-sm">Full-day range: <strong>{s.startDate}</strong> → <strong>{s.endDate}</strong></div>;
    }

    if (s.date) {
      return <div className="text-sm">{(s.date || "").split("T")[0]}: {s.startTime || "--"} — {s.endTime || "--"}</div>;
    }

    return <div className="text-sm text-slate-400">No extra details</div>;
  };

  return (
    <div ref={mainRef} className={`p-4 md:p-6 max-w-7xl mx-auto ${isDtao ? "text-slate-100" : "text-slate-900"}`}>
      {/* Tight header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className={`text-2xl font-bold ${isDtao ? "text-slate-100" : "text-slate-900"}`}>Booking Requests & Cancels</h2>
        <div className={`${isDtao ? "text-slate-400" : "text-sm text-slate-600"}`}>
          {lastUpdated ? `Last updated: ${lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : "—"}
        </div>
      </div>

      {/* Filters - compact */}
      <div className="mb-5 grid grid-cols-1 md:grid-cols-6 gap-3 items-center">
        <input
          type="text"
          placeholder="Department"
          value={searchDeptRaw}
          onChange={(e) => setSearchDeptRaw(e.target.value)}
          className={`${isDtao ? "col-span-1 md:col-span-2 p-2 rounded-lg border border-violet-700 bg-transparent text-slate-200" : "col-span-1 md:col-span-2 p-2 rounded-lg border border-gray-200 text-slate-900"}`}
        />

        <input
          type="date"
          value={searchDateRaw}
          onChange={(e) => setSearchDateRaw(e.target.value)}
          className={`${isDtao ? "p-2 rounded-lg border border-violet-700 bg-transparent text-slate-200" : "p-2 rounded-lg border border-gray-200 text-slate-900"}`}
        />

        {/* Slot dropdown (custom) */}
        <div>
          <Dropdown
            options={["", "Morning", "Afternoon", "Full Day"].map((v) => (v === "" ? { value: "", label: "All Slots" } : v))}
            value={searchSlotRaw}
            onChange={(v) => setSearchSlotRaw(v)}
            ariaLabel="Select slot"
            placeholder="All Slots"
            className={isDtao ? "text-slate-200" : ""}
          />
        </div>

        {/* Status dropdown (custom) */}
        <div>
          <Dropdown
            options={[
              { value: "ALL", label: "All Status" },
              "PENDING",
              "APPROVED",
              "REJECTED",
              "CANCEL_REQUESTED",
              "CANCELLED",
            ]}
            value={statusFilterRaw}
            onChange={(v) => setStatusFilterRaw(v)}
            ariaLabel="Select status"
            placeholder="All Status"
            className={isDtao ? "text-slate-200" : ""}
          />
        </div>

        <div className="flex gap-2 justify-end md:col-span-2">
          <button
            type="button"
            onClick={() => {
              setSearchDeptRaw("");
              setSearchDateRaw("");
              setSearchSlotRaw("");
              setStatusFilterRaw("ALL");
            }}
            className={`${isDtao ? "px-4 py-2 rounded-lg bg-transparent border border-violet-700 text-slate-200" : "px-4 py-2 rounded-lg bg-white border border-gray-200 text-slate-900"} text-sm font-semibold`}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Card list */}
      <div className="space-y-4">
        {filteredItems.length === 0 ? (
          <div className={`${isDtao ? "p-6 text-center text-slate-300 bg-black/30 rounded-xl" : "p-6 text-center text-slate-600 glass"} `}>No requests found</div>
        ) : (
          filteredItems.map((r) => {
            const formattedDate = formatDateNice(r.date);
            const timeRange = `${formatTime(r.startTime)} - ${formatTime(r.endTime)}`;
            const id = r.normId;
            const isCancelRequested = (r.status ?? "").toUpperCase() === "CANCEL_REQUESTED";
            const blink = blinkIds.has(String(id));
            const isNew = newIdsSet.has(String(id));
            const cardRing = blink ? (isDtao ? "ring-2 ring-yellow-700/30" : "ring-2 ring-yellow-200/30") : isNew ? (isDtao ? "ring-2 ring-blue-700/20" : "ring-2 ring-blue-200/20") : "";
            const isExpanded = expanded.has(id);

            return (
              <div
                key={id}
                className={`p-4 md:p-5 rounded-xl flex flex-col md:flex-row md:items-start gap-4 transition-shadow duration-200 transform hover:-translate-y-0.5 ${isDtao ? "bg-black/40 border border-violet-900" : "glass-strong bg-white/60"} ${cardRing}`}
                aria-expanded={isExpanded}
              >
                {/* left: basic info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <div className={`${isDtao ? "text-sm font-semibold text-slate-100" : "text-sm font-semibold text-slate-900"}`}>{r.hallName || "—"}</div>
                    <div className={`${isDtao ? "text-xs text-slate-300 px-2 py-1 rounded-md bg-white/3" : "text-xs text-slate-600 px-2 py-1 rounded-md bg-white/6"}`}>{r.department || "—"}</div>
                    {isNew && <div className="w-3 h-3 rounded-full bg-red-500 ml-2" title="New request" />}
                    {blink && <div className="ml-1 animate-pulse text-xs font-medium text-yellow-600">New</div>}
                  </div>

                  <div className={`${isDtao ? "mt-2 text-sm text-slate-200" : "mt-2 text-sm text-slate-800"}`}>{formattedDate}</div>
                  <div className={`${isDtao ? "text-xs text-slate-400 mt-1" : "text-xs text-slate-600 mt-1"}`}>{timeRange}</div>

                  <div className="mt-3 text-sm">
                    <div className={`${isDtao ? "text-slate-100 font-medium" : "text-slate-900 font-medium"}`}>{r.bookingName || "—"}</div>
                    {r.bookingEmail && <div className={`${isDtao ? "text-xs text-slate-300 mt-1" : "text-xs text-slate-600 mt-1"}`}>{r.bookingEmail}</div>}
                    {r.bookingPhone && <div className={`${isDtao ? "text-xs text-slate-300 mt-1" : "text-xs text-slate-600 mt-1"}`}>{r.bookingPhone}</div>}
                    {r.slotTitle && <div className="text-xs mt-1 text-slate-500">Title: {r.slotTitle}</div>}
                  </div>
                </div>

                {/* middle: status & actions */}
                <div className="w-full md:w-64 flex flex-col gap-3 items-start md:items-end">
                  <div>{statusBadge(r.status)}</div>

                  <div className="flex gap-2 mt-2">
                    {r.status === "PENDING" ? (
                      <>
                        <button
                          className="px-3 py-1 rounded-md text-sm font-semibold text-white bg-green-600 hover:bg-green-700 shadow-md focus:outline-none focus:ring-2 focus:ring-green-300"
                          onClick={() => handleApprove(id)}
                        >
                          Approve
                        </button>

                        <button
                          className="px-3 py-1 rounded-md text-sm font-semibold text-white bg-red-600 hover:bg-red-700 shadow-md focus:outline-none focus:ring-2 focus:ring-red-300"
                          onClick={() => setRejectModal({ open: true, normId: id })}
                        >
                          Reject
                        </button>
                      </>
                    ) : isCancelRequested ? (
                      <>
                        <button
                          className={`${isDtao ? "px-3 py-1 rounded-md text-sm font-semibold bg-white/5 text-slate-100" : "px-3 py-1 rounded-md text-sm font-semibold glass-pill text-slate-900"}`}
                          onClick={() => handleConfirmCancel(id)}
                        >
                          Confirm Cancel
                        </button>
                        <button
                          className={`${isDtao ? "px-3 py-1 rounded-md text-sm font-semibold bg-white/5 text-slate-100" : "px-3 py-1 rounded-md text-sm font-semibold glass-pill text-slate-900"}`}
                          onClick={() => handleRejectCancel(id)}
                        >
                          Reject Cancel
                        </button>
                      </>
                    ) : (
                      <div className={`${isDtao ? "px-3 py-1 rounded-md text-sm text-slate-400" : "px-3 py-1 rounded-md text-sm text-slate-400"}`}>—</div>
                    )}
                  </div>
                </div>

                {/* right: remarks + save */}
                <div className="w-full md:w-96 flex flex-col gap-3">
                  <input
                    type="text"
                    placeholder="Enter remarks"
                    value={remarksMap[id] ?? ""}
                    onChange={(e) =>
                      setRemarksMap((prev) => {
                        const next = { ...prev };
                        next[id] = e.target.value;
                        return next;
                      })
                    }
                    className={`${isDtao ? "w-full p-2 rounded-lg border border-violet-700 bg-transparent text-slate-200 text-sm" : "w-full p-2 rounded-lg border border-gray-200 bg-white text-slate-900 text-sm"}`}
                  />

                  <div className="flex gap-2 items-start">
                    <button
                      className={`${isDtao ? "px-3 py-2 rounded-md text-sm font-semibold bg-emerald-600 text-white" : "px-3 py-2 rounded-md text-sm font-semibold glass text-slate-900"}`}
                      onClick={() => {
                        saveRemarks(id);
                        setNewIdsSet((prev) => {
                          const next = new Set(prev);
                          next.delete(id);
                          return next;
                        });
                      }}
                    >
                      Save
                    </button>

                    {/* Cancel request quick info */}
                    {isCancelRequested && (
                      <div className={`${isDtao ? "p-3 rounded-md bg-yellow-900/10 text-yellow-300" : "p-3 rounded-md bg-yellow-50 text-yellow-800"}`}>
                        <div><strong>Cancel reason:</strong> {r.cancellationReason || "—"}</div>
                        <div className="mt-1"><strong>Requested by:</strong> {r.cancellationRequestedBy || r.requestedBy || "—"}</div>
                      </div>
                    )}

                    {/* existing admin remarks saved on server */}
                    {r.remarks && (
                      <div className={`${isDtao ? "p-3 rounded-md bg-white/5 text-slate-200" : "p-3 rounded-md bg-white/30 text-slate-900"}`}>
                        <strong>Admin remarks:</strong> <span className="ml-1">{r.remarks}</span>
                      </div>
                    )}

                    {/* More toggle */}
                    <div className="ml-auto md:ml-0">
                      <button
                        onClick={() => toggleExpanded(id)}
                        aria-expanded={isExpanded}
                        className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
                      >
                        {isExpanded ? "Less" : "More"}
                      </button>
                    </div>
                  </div>

                  {/* Expanded area: smooth reveal */}
                  <div
                    className={`overflow-hidden transition-all duration-300 ${isExpanded ? "max-h-96 opacity-100 mt-3" : "max-h-0 opacity-0"}`}
                    aria-hidden={!isExpanded}
                  >
                    <div className={`${isDtao ? "bg-black/30 border border-violet-900 p-3 rounded-md" : "bg-gray-50 border border-gray-100 p-3 rounded-md"}`}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        <div>
                          <strong>Slot:</strong> {r.slot || "—"}
                        </div>
                        <div>
                          <strong>Applied at:</strong> {r.appliedAt ? new Date(r.appliedAt).toLocaleString() : "—"}
                        </div>
                        <div>
                          <strong>Venue Dept:</strong> {r.department || "—"}
                        </div>
                        <div>
                          <strong>Booking email:</strong> {r.bookingEmail || "—"}
                        </div>
                        <div>
                          <strong>Phone:</strong> {r.bookingPhone || "—"}
                        </div>
                        <div>
                          <strong>Slot title:</strong> {r.slotTitle || "—"}
                        </div>
                      </div>

                      <div className="mt-3">
                        <strong>Per-day details:</strong>
                        <div className="mt-2">{renderPerDayDetails(r)}</div>
                      </div>

                      {r.additionalInfo && (
                        <div className="mt-3 text-sm">
                          <strong>Additional Info:</strong>
                          <div className="mt-1 text-slate-500">{r.additionalInfo}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Reject modal */}
      {rejectModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setRejectModal({ open: false, normId: null })} />
          <div className={`${isDtao ? "relative z-10 w-full max-w-lg bg-black/80 border border-violet-900 text-slate-100 p-6 rounded-2xl" : "relative z-10 w-full max-w-lg glass-strong p-6 rounded-2xl"}`}>
            <h3 className={`${isDtao ? "text-lg font-bold mb-3 text-slate-100" : "text-lg font-bold mb-3 text-slate-900"}`}>Reject Request</h3>
            <p className={`${isDtao ? "text-sm text-slate-300 mb-4" : "text-sm text-slate-600 mb-4"}`}>Please enter the reason for rejection. This will be saved as admin remarks and sent to the backend.</p>

            <textarea
              ref={rejectTextareaRef}
              value={remarksMap[rejectModal.normId] ?? ""}
              onChange={(e) =>
                setRemarksMap((prev) => {
                  const next = { ...prev };
                  next[rejectModal.normId] = e.target.value;
                  return next;
                })
              }
              rows="4"
              placeholder="Enter rejection reason..."
              className={`${isDtao ? "w-full p-3 rounded-lg border border-violet-700 bg-transparent text-sm text-slate-200" : "w-full p-3 rounded-lg border border-gray-200 bg-white text-sm text-slate-900"}`}
            />

            <div className="mt-4 flex justify-end gap-3">
              <button
                className={`${isDtao ? "px-4 py-2 rounded-md bg-transparent border border-violet-700 text-slate-200" : "px-4 py-2 rounded-md glass text-slate-900"}`}
                onClick={() => setRejectModal({ open: false, normId: null })}
              >
                Cancel
              </button>

              <button
                className="px-4 py-2 rounded-md text-white bg-red-600 hover:bg-red-700 transition"
                onClick={async () => {
                  const id = rejectModal.normId;
                  if (!id) return;
                  const currentRemark = (remarksMap[id] ?? "").trim();
                  if (!currentRemark) {
                    notify("Please enter a reason before rejecting", "warn", 2200);
                    return;
                  }
                  setRejectModal({ open: false, normId: null });
                  await handleReject(id);
                }}
              >
                Reject & Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestsPage;
