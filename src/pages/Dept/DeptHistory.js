// src/components/DeptHistory.js
import React, { useCallback, useEffect, useState } from "react";
import api from "../../utils/api";
// removed react-toastify usage; using custom notify
import { useNotification } from "../../components/NotificationsProvider";
 // adjust path if your provider lives elsewhere
import { useNavigate } from "react-router-dom";
import { generateCardPDF } from "../../utils/generateCardPDF";
import { useTheme } from "../../contexts/ThemeContext";

const normalizeSeminar = (s) => ({
  ...s,
  id: s.id ?? s._id ?? `${s.hallName}-${s.date}-${s.slot}`,
  status: (s.status || "").toUpperCase(),
});

const MOBILE_BREAK = 760;

const DeptHistory = ({ user }) => {
  const { theme } = useTheme() || {};
  const isDtao = theme === "dtao";

  // custom notification
  const { notify } = useNotification();

  const [seminars, setSeminars] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filterDate, setFilterDate] = useState("");

  const [refreshing, setRefreshing] = useState(false);

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(`(max-width: ${MOBILE_BREAK}px)`).matches : false
  );

  // state to track which seminar rows are expanded to show "more"
  const [expanded, setExpanded] = useState(() => new Set());

  const navigate = useNavigate();
  const email = (user?.email || "").toLowerCase();
  const userDept = (user?.department || "").toLowerCase();

  const fetchHistory = useCallback(async () => {
    if (!email || !userDept) {
      setSeminars([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await api.get("/seminars");
      const all = Array.isArray(res.data) ? res.data : [];

      const filtered = all
        .map(normalizeSeminar)
        .filter(
          (s) =>
            (s.email || "").toLowerCase() === email &&
            (s.department || "").toLowerCase() === userDept
        );

      const approved = filtered.filter(
        (s) => s.status === "APPROVED" || s.status === "CANCEL_REQUESTED"
      );

      // Sort by start date if day-range exists else by date
      approved.sort((a, b) => {
        const aKey = a.startDate ? new Date(a.startDate).getTime() : (a.date ? new Date(a.date).getTime() : 0);
        const bKey = b.startDate ? new Date(b.startDate).getTime() : (b.date ? new Date(b.date).getTime() : 0);
        return bKey - aKey;
      });

      setSeminars(approved);
    } catch (err) {
      console.error("Error fetching history:", err);
      notify("Failed to fetch booking history", "error");
      if (err?.response?.status === 401) {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        setTimeout(() => navigate("/"), 1200);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [email, userDept, navigate, notify]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // viewport listener for table/card switch
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAK}px)`);
    const onChange = (e) => setIsMobile(e.matches);

    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else mq.addListener(onChange);

    setIsMobile(mq.matches);

    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", onChange);
      else mq.removeListener(onChange);
    };
  }, []);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await fetchHistory();
    notify("Refreshed", "info");
  };

  const handleRequestCancel = (seminar) => {
    setCancelTarget(seminar);
    setCancelReason("");
    setCancelModalOpen(true);
  };

  const confirmCancelRequest = async () => {
    if (!cancelTarget) return;
    if (!cancelReason.trim()) {
      notify("Cancel reason required", "warn");
      return;
    }

    setCancelSubmitting(true);
    try {
      const payload = {
        remarks: `${cancelTarget.remarks || ""}${cancelTarget.remarks ? " | " : ""}${cancelReason}`,
        cancellationReason: cancelReason,
      };
      await api.put(`/seminars/${cancelTarget.id}/cancel-request`, payload);

      setSeminars((prev) =>
        prev.map((s) =>
          s.id === cancelTarget.id
            ? { ...s, status: "CANCEL_REQUESTED", remarks: payload.remarks }
            : s
        )
      );
      notify("Cancel request submitted", "success");
      setCancelModalOpen(false);
    } catch (err) {
      console.error("Error cancel request:", err);
      notify("Failed to request cancel", "error");
    } finally {
      setCancelSubmitting(false);
    }
  };

  const filteredView = seminars.filter((s) => {
    // If filterDate used: consider day-range as matching if the filter date is between startDate and endDate
    if (filterDate) {
      if (s.startDate && s.endDate) {
        const f = new Date(filterDate); f.setHours(0,0,0,0);
        const sd = new Date(s.startDate); sd.setHours(0,0,0,0);
        const ed = new Date(s.endDate); ed.setHours(0,0,0,0);
        if (!(f >= sd && f <= ed)) return false;
      } else {
        if ((s.date || "").split("T")[0] !== filterDate) return false;
      }
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        (s.hallName || "").toLowerCase().includes(q) ||
        (s.slotTitle || "").toLowerCase().includes(q) ||
        (s.bookingName || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  // toggle expand for 'more' area
  const toggleExpanded = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // small status pill (theme-aware)
  const StatusPill = ({ status = "" }) => {
    const s = (status || "").toUpperCase();
    const base = "inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold";
    if (s === "APPROVED") return <span className={`${base} ${isDtao ? "bg-emerald-900/30 text-emerald-200" : "bg-green-100 text-green-800"}`}>Approved</span>;
    if (s === "CANCEL_REQUESTED") return <span className={`${base} ${isDtao ? "bg-amber-900/30 text-amber-200" : "bg-amber-100 text-amber-800"}`}>Cancel Requested</span>;
    return <span className={`${base} ${isDtao ? "bg-slate-800 text-slate-300" : "bg-gray-100 text-gray-800"}`}>{s || "N/A"}</span>;
  };

  // theme helpers
  const pageBg = isDtao ? "bg-[#08050b] text-slate-100" : "bg-gray-50 text-slate-900";
  const cardBg = isDtao ? "bg-black/40 border border-violet-900" : "bg-white border border-gray-100";
  const inputBase = "px-3 py-2 rounded-md focus:ring-2 focus:outline-none";
  const inputClass = isDtao ? `${inputBase} bg-transparent border-violet-700 text-slate-100` : `${inputBase} bg-white border border-gray-200`;

  // helper to render per-day details from a seminar's daySlots or start/end
  const renderPerDayDetails = (s) => {
    // If seminar has daySlots: iterate keys (which stored by AddSeminarPage)
    if (s.daySlots && typeof s.daySlots === "object") {
      const keys = Object.keys(s.daySlots).sort();
      if (keys.length === 0) return <div className="text-sm text-slate-400">No per-day details</div>;
      return (
        <ul className="space-y-1">
          {keys.map((k) => {
            const val = s.daySlots[k];
            if (!val) {
              return <li key={k} className="text-sm"><strong>{k}</strong>: <span className="text-xs text-slate-400">Full day</span></li>;
            }
            const st = val.startTime || val.start || "--";
            const et = val.endTime || val.end || "--";
            return <li key={k} className="text-sm"><strong>{k}</strong>: {st} — {et}</li>;
          })}
        </ul>
      );
    }

    // If startDate/endDate exist but no daySlots: show as full-day range
    if (s.startDate && s.endDate) {
      return <div className="text-sm">Full-day range: <strong>{s.startDate}</strong> → <strong>{s.endDate}</strong></div>;
    }

    // Fallback: if single date with start/end times
    if (s.date) {
      return <div className="text-sm">{(s.date || "").split("T")[0]}: {s.startTime || "--"} — {s.endTime || "--"}</div>;
    }

    return <div className="text-sm text-slate-400">No extra details</div>;
  };

  // NEW: render remarks history as list inside expanded area
  const renderRemarksHistory = (s) => {
    const raw = s.remarks || "";
    if (!raw.trim()) return <div className="text-sm text-slate-400">No remarks</div>;

    // Split using " | " which backend uses when concatenating
    const parts = raw.split(" | ").map(p => p.trim()).filter(Boolean);
    if (parts.length === 0) return <div className="text-sm text-slate-400">No remarks</div>;

    return (
      <ol className="list-decimal list-inside space-y-1 text-sm">
        {parts.map((p, i) => (
          <li key={i} className="break-words">{p}</li>
        ))}
      </ol>
    );
  };

  return (
    <div className={`p-3 ${pageBg}`}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className={`text-lg font-semibold ${isDtao ? "text-slate-100" : "text-gray-800"}`}>Approved Seminars</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handleManualRefresh}
            className={`px-3 py-2 rounded-md transition ${isDtao ? "bg-violet-700 text-white hover:bg-violet-600" : "bg-white border border-gray-200 hover:shadow-sm"}`}
            disabled={loading || refreshing}
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center mb-4">
        <input
          aria-label="Search"
          className={`${inputClass} w-full md:w-64 transition`}
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <input
          className={`${inputClass} transition`}
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
        />

        <button
          className={`px-3 py-2 rounded-md transition ${isDtao ? "bg-transparent border border-violet-700 text-slate-100 hover:bg-black/20" : "bg-white border border-gray-200 hover:shadow-sm"}`}
          onClick={() => {
            setSearch("");
            setFilterDate("");
          }}
        >
          Reset
        </button>
      </div>

      {loading ? (
        <div className={`py-6 text-center ${isDtao ? "text-slate-300" : "text-gray-600"}`}>Loading...</div>
      ) : filteredView.length === 0 ? (
        <div className={`py-8 text-center ${isDtao ? "text-slate-400" : "text-gray-500"}`}>No approved seminars</div>
      ) : (
        <>
          {/* Table view for tablet/desktop */}
          {!isMobile && (
            <div className={`overflow-auto rounded-md ${cardBg} shadow-sm transition-all duration-200`}>
              <table className="min-w-full divide-y">
                <thead className={isDtao ? "bg-transparent" : "bg-gray-50"}>
                  <tr>
                    <th className={`px-4 py-3 text-left text-sm font-semibold ${isDtao ? "text-slate-300" : "text-gray-700"}`}>Date</th>
                    <th className={`px-4 py-3 text-left text-sm font-semibold ${isDtao ? "text-slate-300" : "text-gray-700"}`}>Hall</th>
                    <th className={`px-4 py-3 text-left text-sm font-semibold ${isDtao ? "text-slate-300" : "text-gray-700"}`}>Slot</th>
                    <th className={`px-4 py-3 text-left text-sm font-semibold ${isDtao ? "text-slate-300" : "text-gray-700"}`}>Title</th>
                    <th className={`px-4 py-3 text-left text-sm font-semibold ${isDtao ? "text-slate-300" : "text-gray-700"}`}>Booked By</th>
                    <th className={`px-4 py-3 text-left text-sm font-semibold ${isDtao ? "text-slate-300" : "text-gray-700"}`}>Department</th>
                    <th className={`px-4 py-3 text-left text-sm font-semibold ${isDtao ? "text-slate-300" : "text-gray-700"}`}>Status</th>
                    <th className={`px-4 py-3 text-left text-sm font-semibold ${isDtao ? "text-slate-300" : "text-gray-700"}`}>Remarks</th>
                    <th className={`px-4 py-3 text-center text-sm font-semibold ${isDtao ? "text-slate-300" : "text-gray-700"}`}>Action</th>
                  </tr>
                </thead>
                <tbody className={isDtao ? "bg-black/40 divide-y divide-violet-800" : "bg-white divide-y"}>
                  {filteredView.map((s, idx) => {
                    const isExpanded = expanded.has(s.id);
                    const displayDate = s.startDate && s.endDate ? `${s.startDate} → ${s.endDate}` : (s.date || "").split("T")[0];
                    const slotLabel = s.slot || (s.daySlots ? "DayRange" : "--");
                    // show only first/most recent remark in-cell (truncate) — full history in expanded area
                    const latestRemark = (s.remarks || "").split(" | ").filter(Boolean).pop() || "";
                    return (
                      <React.Fragment key={s.id}>
                        <tr
                          className={`${isDtao ? "hover:bg-black/30" : "hover:bg-gray-50"} hover:shadow-md transition-transform transform hover:-translate-y-0.5`}
                          style={{ transitionDelay: `${Math.min(100, idx * 10)}ms` }}
                        >
                          <td className="px-4 py-3 text-sm whitespace-nowrap">{displayDate}</td>
                          <td className="px-4 py-3 text-sm whitespace-nowrap">{s.hallName}</td>
                          <td className="px-4 py-3 text-sm">
                            <div className="font-medium">{slotLabel}</div>
                            <div className={`${isDtao ? "text-slate-300" : "text-xs text-gray-500"}`}>
                              {/* show summary times: if daySlots exists, try to show first day's times or show range */}
                              {s.daySlots
                                ? (() => {
                                    const keys = Object.keys(s.daySlots || {}).sort();
                                    if (keys.length === 0) return "[--]";
                                    const k0 = keys[0];
                                    const v0 = s.daySlots[k0];
                                    if (!v0) return "[Full day]";
                                    return `[${v0.startTime || "--"} - ${v0.endTime || "--"}]`;
                                  })()
                                : `[${s.startTime || "--"} - ${s.endTime || "--"}]`}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">{s.slotTitle}</td>
                          <td className="px-4 py-3 text-sm">{s.bookingName}</td>
                          <td className="px-4 py-3 text-sm">{s.department}</td>
                          <td className="px-4 py-3 text-sm"><StatusPill status={s.status} /></td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex items-center gap-2">
                              <div className="truncate">{latestRemark || "—"}</div>
                              {/* More toggle */}
                              <button
                                onClick={() => toggleExpanded(s.id)}
                                className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
                                aria-expanded={isExpanded}
                                type="button"
                              >
                                {isExpanded ? "Less" : "More"}
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-center">
                            {s.status === "APPROVED" && (
                              <div className="flex flex-col sm:flex-row items-center gap-2 justify-center">
                                <button
                                  onClick={() => generateCardPDF(s)}
                                  className="px-3 py-1 rounded-md bg-blue-600 text-white hover:shadow-md transition text-sm"
                                >
                                  Download Card
                                </button>
                                <button
                                  onClick={() => handleRequestCancel(s)}
                                  className={`${isDtao ? "px-3 py-1 rounded-md bg-rose-600/10 text-rose-300 hover:bg-rose-600/20" : "px-3 py-1 rounded-md bg-rose-50 text-rose-700 hover:bg-rose-100"} transition text-sm`}
                                >
                                  Request Cancel
                                </button>
                              </div>
                            )}
                            {s.status === "CANCEL_REQUESTED" && (
                              <button className="px-3 py-1 rounded-md border text-sm" disabled>
                                Cancel Requested
                              </button>
                            )}
                          </td>
                        </tr>

                        {/* Expanded "More" row showing per-day breakdown + remarks history */}
                        {isExpanded && (
                          <tr className={isDtao ? "bg-black/30" : "bg-gray-50"}>
                            <td colSpan={9} className="px-4 py-3">
                              <div className="text-sm space-y-3">
                                <div>
                                  <strong>Details:</strong>
                                  <div className="mt-2">
                                    {renderPerDayDetails(s)}
                                  </div>
                                </div>

                                <div>
                                  <strong>Remarks history:</strong>
                                  <div className="mt-2">
                                    {renderRemarksHistory(s)}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Card view for mobile */}
          {isMobile && (
            <div className="space-y-3">
              {filteredView.map((s, idx) => {
                const isExpanded = expanded.has(s.id);
                const displayDate = s.startDate && s.endDate ? `${s.startDate} → ${s.endDate}` : (s.date || "").split("T")[0];
                const slotLabel = s.slot || (s.daySlots ? "DayRange" : "--");
                const latestRemark = (s.remarks || "").split(" | ").filter(Boolean).pop() || "";
                return (
                  <article
                    key={s.id}
                    className={`${cardBg} p-4 rounded-xl shadow-sm transition transform hover:-translate-y-1`}
                    style={{ transitionDelay: `${Math.min(150, idx * 20)}ms` }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className={`text-sm font-semibold truncate ${isDtao ? "text-slate-100" : ""}`}>{s.slotTitle || s.hallName}</h4>
                          <span className={`${isDtao ? "text-slate-300" : "text-xs text-gray-500"}`}>{displayDate}</span>
                        </div>

                        <div className={`${isDtao ? "text-slate-200" : "text-sm text-slate-700"} mt-2`}>
                          <div><strong>Hall:</strong> {s.hallName}</div>
                          <div>
                            <strong>Slot:</strong> {slotLabel}{" "}
                            <span className={`${isDtao ? "text-slate-300" : "text-xs text-gray-500"}`}>
                              {s.daySlots
                                ? (() => {
                                    const keys = Object.keys(s.daySlots || {}).sort();
                                    if (keys.length === 0) return "[--]";
                                    const k0 = keys[0];
                                    const v0 = s.daySlots[k0];
                                    if (!v0) return "[Full day]";
                                    return `[${v0.startTime || "--"} - ${v0.endTime || "--"}]`;
                                  })()
                                : `[${s.startTime || "--"} - ${s.endTime || "--"}]`}
                            </span>
                          </div>
                          <div><strong>By:</strong> {s.bookingName}</div>
                          <div className="mt-2"><strong>Remarks:</strong> {latestRemark || "—"}</div>

                          {/* expanded per-day details + remarks history */}
                          {isExpanded && (
                            <div className="mt-3 space-y-3">
                              <div>
                                <div className="text-sm font-medium mb-1">Per-day details</div>
                                {renderPerDayDetails(s)}
                              </div>

                              <div>
                                <div className="text-sm font-medium mb-1">Remarks history</div>
                                {renderRemarksHistory(s)}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <StatusPill status={s.status} />
                        {s.status === "APPROVED" ? (
                          <>
                            <button
                              onClick={() => generateCardPDF(s)}
                              className="px-3 py-1 rounded-md bg-blue-600 text-white hover:shadow-md transition text-sm"
                            >
                              Download Card
                            </button>
                            <button
                              onClick={() => handleRequestCancel(s)}
                              className={`${isDtao ? "px-3 py-1 rounded-md bg-rose-600/10 text-rose-300 hover:bg-rose-600/20" : "px-3 py-1 rounded-md bg-rose-50 text-rose-700 hover:bg-rose-100"} transition text-sm`}
                            >
                              Request Cancel
                            </button>
                          </>
                        ) : (
                          <button className="px-3 py-1 rounded-md border text-sm" disabled>
                            Cancel Requested
                          </button>
                        )}

                        <button
                          onClick={() => toggleExpanded(s.id)}
                          className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700"
                        >
                          {isExpanded ? "Less" : "More"}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Cancel modal */}
      {cancelModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
        >
          <div className="absolute inset-0 bg-black/40" onClick={() => setCancelModalOpen(false)} />
          <div className={`${isDtao ? "bg-black/60 border border-violet-900 text-slate-100" : "bg-white"} rounded-lg shadow-lg max-w-lg w-full p-4 z-10`}>
            <h4 className={`text-lg font-semibold ${isDtao ? "text-slate-100" : "text-gray-800"}`}>Request Cancel</h4>
            <p className={`${isDtao ? "text-slate-300" : "text-sm text-gray-500"} mb-3`}>Provide reason for cancelling</p>
            <textarea
              rows={4}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Reason required"
              className={`${isDtao ? "w-full border border-violet-700 bg-transparent text-slate-100 p-2 rounded-md focus:ring-violet-700" : "w-full border rounded-md p-2 focus:ring-2"}`}
            />
            <div className="flex items-center justify-end gap-2 mt-3">
              <button
                className={`${isDtao ? "px-3 py-2 rounded-md bg-transparent border border-violet-700 text-slate-100 hover:bg-black/20" : "px-3 py-2 border rounded-md bg-white hover:shadow-sm"}`}
                onClick={() => setCancelModalOpen(false)}
                disabled={cancelSubmitting}
              >
                Close
              </button>
              <button
                className={`${isDtao ? "px-3 py-2 rounded-md bg-rose-600/10 text-rose-300 hover:bg-rose-600/20" : "px-3 py-2 rounded-md bg-rose-50 text-rose-700 hover:bg-rose-100"}`}
                onClick={confirmCancelRequest}
                disabled={cancelSubmitting}
              >
                {cancelSubmitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeptHistory;
