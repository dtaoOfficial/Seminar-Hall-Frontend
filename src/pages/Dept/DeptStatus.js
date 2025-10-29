// src/components/DeptStatus.js
import React, { useState, useEffect, useCallback } from "react";
import api from "../../utils/api";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../contexts/ThemeContext";
import { useNotification } from "../../components/NotificationsProvider";
// removed generateCardPDF import as requested

const authHeader = () => {
  const token = localStorage.getItem("token");
  return token
    ? { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
    : {};
};

const VISIBLE_STATUSES = new Set(["PENDING", "REJECTED", "CANCELLED"]);
const MOBILE_BREAK = 760;

const idEq = (a, b) => String(a) === String(b);

const normalizeSeminar = (s) => ({
  ...s,
  id: s.id ?? s._id ?? `${s.hallName}-${s.date}-${s.slot}`,
  status: (s.status || "").toUpperCase(),
});

const DeptStatus = ({ user }) => {
  const { theme } = useTheme() || {};
  const isDtao = theme === "dtao";

  const { notify } = useNotification();

  const [seminars, setSeminars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterDate, setFilterDate] = useState("");

  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(`(max-width: ${MOBILE_BREAK}px)`).matches : false
  );

  // track expanded rows for "More"
  const [expanded, setExpanded] = useState(() => new Set());

  const navigate = useNavigate();

  const email = (user?.email || "").toLowerCase();
  const department = (user?.department || "").toLowerCase();
  const userName = (user?.name || "").toLowerCase();

  const fetchSeminars = useCallback(async () => {
    if (!email && !department && !userName) {
      setSeminars([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await api.get("/seminars");
      const raw = Array.isArray(res.data) ? res.data : [];

      const filtered = raw
        .map(normalizeSeminar)
        .filter((s) => {
          if (!VISIBLE_STATUSES.has(s.status)) return false;

          const matchEmail = s.email && email && s.email.toLowerCase() === email;
          const matchDept = s.department && department && s.department.toLowerCase() === department;
          const matchName = s.bookingName && userName && s.bookingName.toLowerCase() === userName;

          return Boolean(matchEmail || matchDept || matchName);
        });

      // sort by startDate if present else by date (descending)
      filtered.sort((a, b) => {
        const aKey = a.startDate ? new Date(a.startDate).getTime() : (a.date ? new Date(a.date).getTime() : 0);
        const bKey = b.startDate ? new Date(b.startDate).getTime() : (b.date ? new Date(b.date).getTime() : 0);
        return bKey - aKey;
      });

      setSeminars(filtered);
    } catch (err) {
      console.error("Error fetching seminars:", err);
      if (err?.response?.status === 401) {
        notify("⛔ Unauthorized! Please login again.", "error");
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        setTimeout(() => navigate("/"), 1200);
        return;
      }
      notify("❌ Failed to load seminars", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [email, department, userName, notify, navigate]);

  useEffect(() => {
    fetchSeminars();
  }, [fetchSeminars]);

  // viewport listener
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
    await fetchSeminars();
    notify("Refreshed", "info");
  };

  const filteredView = seminars.filter((s) => {
    if (filterStatus !== "ALL" && s.status !== filterStatus) return false;

    // filterDate: if seminar has startDate/endDate treat as range, else compare single date
    if (filterDate) {
      if (s.startDate && s.endDate) {
        const f = new Date(filterDate); f.setHours(0,0,0,0);
        const sd = new Date(s.startDate); sd.setHours(0,0,0,0);
        const ed = new Date(s.endDate); ed.setHours(0,0,0,0);
        if (!(f >= sd && f <= ed)) return false;
      } else {
        const d = (s.date || "").split("T")[0];
        if (d !== filterDate) return false;
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

  const handleDelete = async (seminar) => {
    if (!seminar) return;
    const docId = seminar.id;
    const ok = window.confirm(
      `Delete / cancel this booking?\n\n${seminar.slotTitle || seminar.hallName}\nDate: ${ (seminar.date || "").split("T")[0] }`
    );
    if (!ok) return;

    try {
      setSaving(true);
      await api.delete(`/seminars/${docId}`, authHeader());
      setSeminars((prev) => prev.filter((s) => !idEq(s.id, docId)));
      notify("✅ Deleted successfully", "success");
    } catch (err) {
      console.error("Error deleting seminar:", err);
      notify(err?.response?.data?.message || err.message || "Delete failed", "error");
    } finally {
      setSaving(false);
    }
  };

  // toggle expand for per-row "More"
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
    if (s === "PENDING") return <span className={`${base} ${isDtao ? "bg-yellow-900/20 text-yellow-200" : "bg-yellow-100 text-yellow-800"}`}>Pending</span>;
    if (s === "REJECTED") return <span className={`${base} ${isDtao ? "bg-rose-900/20 text-rose-200" : "bg-rose-100 text-rose-800"}`}>Rejected</span>;
    if (s === "CANCELLED") return <span className={`${base} ${isDtao ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-800"}`}>Cancelled</span>;
    return <span className={`${base} ${isDtao ? "bg-slate-800 text-slate-200" : "bg-gray-100 text-gray-800"}`}>{s || "N/A"}</span>;
  };

  // theme helpers
  const pageBg = isDtao ? "bg-[#08050b] text-slate-100" : "bg-gray-50 text-slate-900";
  const cardBg = isDtao ? "bg-black/40 border border-violet-900" : "bg-white";
  const inputBase = "px-3 py-2 rounded-md focus:ring-2 focus:outline-none transition";
  const inputClass = isDtao ? `${inputBase} bg-transparent border-violet-700 text-slate-100` : `${inputBase} bg-white border border-gray-200`;

  // render per-day details (reuse same logic as DeptHistory)
  const renderPerDayDetails = (s) => {
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

    if (s.startDate && s.endDate) {
      return <div className="text-sm">Full-day range: <strong>{s.startDate}</strong> → <strong>{s.endDate}</strong></div>;
    }

    if (s.date) {
      return <div className="text-sm">{(s.date || "").split("T")[0]}: {s.startTime || "--"} — {s.endTime || "--"}</div>;
    }

    return <div className="text-sm text-slate-400">No extra details</div>;
  };

  return (
    <div className={`p-3 ${pageBg}`}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className={`text-lg font-extrabold ${isDtao ? "text-slate-100" : "text-gray-900"}`}> My Requests (Pending / Rejected / Cancelled)</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleManualRefresh}
            className={`${isDtao ? "px-3 py-2 rounded-md bg-violet-700 text-white hover:bg-violet-600" : "px-3 py-2 border rounded-md bg-white hover:shadow-sm"} transition`}
            disabled={loading || refreshing}
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center mb-4">
        <input
          aria-label="Search"
          className={`${inputClass} w-full md:w-64`}
          placeholder="Search hall/title/name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className={`${inputClass}`}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="ALL">All</option>
          <option value="PENDING">Pending</option>
          <option value="REJECTED">Rejected</option>
          <option value="CANCELLED">Cancelled</option>
        </select>

        <input
          className={`${inputClass}`}
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
        />

        <button
          className={`${isDtao ? "px-3 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-500" : "px-3 py-2 bg-blue-600 text-white rounded-md hover:shadow-md"} transition`}
          onClick={() => {
            setSearch("");
            setFilterStatus("ALL");
            setFilterDate("");
          }}
        >
          Reset
        </button>
      </div>

      {/* Loading / empty */}
      {loading ? (
        <div className={`${isDtao ? "py-6 text-slate-300" : "py-6 text-gray-600"} text-center`}>⏳ Loading...</div>
      ) : filteredView.length === 0 ? (
        <div className={`${isDtao ? "py-8 text-slate-400" : "py-8 text-gray-500"} text-center`}>No seminars found</div>
      ) : (
        <>
          {/* Desktop/table */}
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
                              {/* single-line truncated remark preview */}
                              <div className="truncate max-w-[26ch]">{s.remarks ? String(s.remarks) : "—"}</div>
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
                            <div className="flex flex-col sm:flex-row items-center gap-2 justify-center">
                              {/* Removed Download Card button as requested */}
                              <button
                                onClick={() => handleDelete(s)}
                                className={`${isDtao ? "px-3 py-1 rounded-md bg-rose-600/10 text-rose-300 hover:bg-rose-600/20" : "px-3 py-1 rounded-md bg-rose-50 text-rose-700 hover:bg-rose-100"} transition text-sm`}
                                disabled={saving}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>

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
                                  <strong>Remarks:</strong>
                                  <div className="mt-1 text-sm text-slate-400 break-words">{s.remarks || "—"}</div>
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

          {/* Mobile cards */}
          {isMobile && (
            <div className="space-y-3">
              {filteredView.map((s, idx) => {
                const isExpanded = expanded.has(s.id);
                const displayDate = s.startDate && s.endDate ? `${s.startDate} → ${s.endDate}` : (s.date || "").split("T")[0];
                const slotLabel = s.slot || (s.daySlots ? "DayRange" : "--");
                return (
                  <article
                    key={s.id}
                    className={`${cardBg} p-4 rounded-xl shadow-sm transition transform hover:-translate-y-1`}
                    style={{ transitionDelay: `${Math.min(150, idx * 20)}ms` }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className={`text-sm font-extrabold truncate ${isDtao ? "text-slate-100" : ""}`}>{s.slotTitle || s.hallName}</h3>
                          <span className={`${isDtao ? "text-slate-300" : "text-xs text-gray-500"}`}>{displayDate}</span>
                        </div>

                        <div className={`${isDtao ? "text-slate-200" : "text-sm text-slate-700"} mt-2`}>
                          <div><strong>Hall:</strong> {s.hallName}</div>
                          <div><strong>Slot:</strong> {slotLabel} <span className={`${isDtao ? "text-slate-300" : "text-xs text-gray-500"}`}>[{s.startTime || "--"} - {s.endTime || "--"}]</span></div>
                          <div><strong>By:</strong> {s.bookingName}</div>

                          {/* truncated remarks preview on mobile */}
                          <div className="mt-2">
                            <strong>Remarks:</strong>
                            <div className="truncate max-w-[40ch] text-sm text-slate-400">{s.remarks ? String(s.remarks) : "—"}</div>
                          </div>

                          {isExpanded && (
                            <div className="mt-3 space-y-2">
                              <div className="text-sm font-medium">Per-day details</div>
                              {renderPerDayDetails(s)}
                              <div>
                                <strong>Full Remarks:</strong>
                                <div className="mt-1 text-sm text-slate-400 break-words">{s.remarks || "—"}</div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <StatusPill status={s.status} />
                        {/* Download removed */}
                        <button
                          onClick={() => handleDelete(s)}
                          className={`${isDtao ? "px-3 py-1 rounded-md bg-rose-600/10 text-rose-300 hover:bg-rose-600/20" : "px-3 py-1 rounded-md bg-rose-50 text-rose-700 hover:bg-rose-100"} transition`}
                          disabled={saving}
                        >
                          ❌
                        </button>

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
    </div>
  );
};

export default DeptStatus;
