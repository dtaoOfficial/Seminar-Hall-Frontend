// src/pages/Admin/AllSeminarsPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../utils/api";
import { useNotification } from "../../components/NotificationsProvider";
import { useTheme } from "../../contexts/ThemeContext";

/**
 * AllSeminarsPage — Tailwind + theme-aware
 * unchanged logic; styling adapted for 'dtao' theme.
 */

const STATUS_APPROVED = "APPROVED";
const STATUS_PENDING = "PENDING";

const AllSeminarsPage = () => {
  const { notify } = useNotification();
  const { theme } = useTheme() || {};
  const isDtao = theme === "dtao";

  const [loading, setLoading] = useState(true);
  const [seminars, setSeminars] = useState([]);
  const [error, setError] = useState("");
  const [isDesktopView, setIsDesktopView] = useState(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(min-width: 768px)").matches;
    }
    return true;
  });

  const navigate = useNavigate();

  const normalizeSeminar = (s) => ({
    id: s.id ?? s._id ?? s.seminarId ?? `seminar-${Math.random()}`,
    hallName: s.hallName ?? s.hall ?? "",
    slotTitle: s.slotTitle ?? s.title ?? s.topic ?? "",
    bookingName: s.bookingName ?? s.organizer ?? s.requesterName ?? "",
    email: s.email ?? s.organizerEmail ?? "",
    department: s.department ?? s.dept ?? "",
    phone: s.phone ?? s.contact ?? "",
    slot: s.slot ?? "Custom",
    date: s.date ?? "",
    startTime: s.startTime ?? s.start_time ?? s.from ?? "",
    endTime: s.endTime ?? s.end_time ?? s.to ?? "",
    status: (s.status ?? STATUS_APPROVED).toString().toUpperCase(),
    remarks: s.remarks ?? s.note ?? "",
    appliedAt: s.appliedAt ?? s.createdAt ?? "",
    cancellationReason: s.cancellationReason ?? "",
    createdBy: s.createdBy ?? "",
    source: "seminar",
  });

  const normalizeRequest = (r) => ({
    id: r.id ?? r._id ?? r.requestId ?? `req-${Math.random()}`,
    hallName: r.hallName ?? r.requestedHall ?? "",
    slotTitle: r.slotTitle ?? r.requestTitle ?? "",
    bookingName: r.bookingName ?? r.requesterName ?? "",
    email: r.email ?? r.requesterEmail ?? "",
    department: r.department ?? r.dept ?? "",
    phone: r.phone ?? r.contact ?? "",
    slot: r.slot ?? "Custom",
    date: r.date ?? r.requestedDate ?? "",
    startTime: r.startTime ?? r.requestedStartTime ?? "",
    endTime: r.endTime ?? r.requestedEndTime ?? "",
    status: (r.status ?? STATUS_PENDING).toString().toUpperCase(),
    remarks: r.remarks ?? r.note ?? "",
    appliedAt: r.appliedAt ?? r.createdAt ?? "",
    source: "request",
  });

  const ensureArray = (res) => {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (res.data && Array.isArray(res.data)) return res.data;
    if (res.seminars && Array.isArray(res.seminars)) return res.seminars;
    if (res.requests && Array.isArray(res.requests)) return res.requests;
    if (res.data && res.data.seminars && Array.isArray(res.data.seminars)) return res.data.seminars;
    return [];
  };

  const fetchSeminars = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [seminarRes, requestRes] = await Promise.allSettled([api.get("/seminars"), api.get("/requests")]);

      const rawSeminars =
        seminarRes.status === "fulfilled" ? ensureArray(seminarRes.value.data ?? seminarRes.value) : [];
      const rawRequests =
        requestRes.status === "fulfilled" ? ensureArray(requestRes.value.data ?? requestRes.value) : [];

      const seminarList = rawSeminars.map(normalizeSeminar);
      const requestList = rawRequests.map(normalizeRequest);

      // dedupe by hall|date|start|end|title preferring seminar over request
      const seen = new Map();
      const keyFor = (it) =>
        `${(it.hallName || "").trim()}|${(it.date || "").trim()}|${(it.startTime || "").trim()}|${(it.endTime || "").trim()}|${(it.slotTitle || "").trim()}`;

      const pushIfNew = (item) => {
        const k = keyFor(item);
        if (!seen.has(k)) seen.set(k, item);
        else {
          const existing = seen.get(k);
          if (existing.source === "request" && item.source === "seminar") seen.set(k, item);
        }
      };

      seminarList.forEach(pushIfNew);
      requestList.forEach(pushIfNew);

      const combined = Array.from(seen.values()).sort((a, b) => {
        const da = (a.date || "").split("T")[0];
        const db = (b.date || "").split("T")[0];
        if (da > db) return -1;
        if (da < db) return 1;
        return String(b.id).localeCompare(String(a.id));
      });

      setSeminars(combined);
      // eslint-disable-next-line no-console
      console.debug("Fetched", { rawSeminars: rawSeminars.length, rawRequests: rawRequests.length, combined: combined.length });
    } catch (err) {
      console.error("Fetch error", err);
      setError("Failed to fetch seminars/requests. Check console/network.");
      notify("Failed to fetch seminars/requests", "error", 3500);
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    fetchSeminars();
  }, [fetchSeminars]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const mq = window.matchMedia("(min-width: 768px)");
    const apply = (ev) => setIsDesktopView(Boolean(ev.matches));
    setIsDesktopView(Boolean(mq.matches));
    mq.addEventListener ? mq.addEventListener("change", apply) : mq.addListener(apply);
    return () => {
      mq.removeEventListener ? mq.removeEventListener("change", apply) : mq.removeListener(apply);
    };
  }, []);

  const formatAppliedAt = (isoOrStr) => {
    if (!isoOrStr) return "--";
    try {
      const d = new Date(isoOrStr);
      if (isNaN(d.getTime())) return isoOrStr;
      return d.toLocaleString();
    } catch {
      return isoOrStr;
    }
  };

  const handleDelete = async (item) => {
    const ok = window.confirm(`Delete this ${item.source === "request" ? "booking request" : "seminar"}?`);
    if (!ok) return;

    try {
      if (item.source === "request") {
        await api.delete(`/requests/${item.id}`);
      } else {
        await api.delete(`/seminars/${item.id}`);
      }
      setSeminars((prev) => prev.filter((s) => s.id !== item.id));
      notify("Deleted successfully", "success", 2200);
    } catch (err) {
      console.error("Error deleting item:", err?.response || err);
      const serverMsg =
        (err.response && (err.response.data?.message || err.response.data)) || err.message || "Failed to delete";
      notify(String(serverMsg), "error", 4000);
    }
  };

  const handleEdit = (item) => {
    navigate(`/admin/update/${item.id}?source=${encodeURIComponent(item.source)}`);
  };

  // theme helpers
  const pageBg = isDtao ? "bg-[#08050b] text-slate-100" : "bg-gray-50 text-slate-900";
  const containerBg = isDtao ? "bg-black/40 border border-violet-900" : "bg-white border border-gray-100";
  const mutedText = isDtao ? "text-slate-300" : "text-gray-500";
  const headingText = isDtao ? "text-slate-100" : "text-gray-800";
  const tableHeadBg = isDtao ? "bg-transparent" : "bg-gray-50";
  const rowHover = isDtao ? "hover:bg-black/30" : "hover:bg-gray-50";
  const divider = isDtao ? "divide-violet-800" : "divide-gray-200";

  return (
    <div className={`min-h-screen py-8 ${pageBg}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Top */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className={`text-2xl font-semibold ${headingText}`}>All Seminars (Edit / Delete)</h2>
            <p className={`${mutedText} text-sm mt-1`}>Combined view of confirmed seminars and booking requests.</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchSeminars()}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg shadow-sm transition transform ${isDtao ? "bg-violet-700 text-white hover:bg-violet-600" : "bg-white border border-gray-200 hover:shadow-md"} `}
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Card/Container */}
        <div className={`${containerBg} rounded-xl shadow overflow-hidden`}>
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading…</div>
          ) : error ? (
            <div className="p-8 text-center text-rose-500">{error}</div>
          ) : seminars.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No seminars or booking requests found.</div>
          ) : (
            <>
              {isDesktopView && (
                <div className="w-full overflow-x-auto">
                  <table className={`min-w-full divide-y ${divider}`}>
                    <thead className={tableHeadBg}>
                      <tr>
                        <th className={`px-4 py-3 text-left text-xs font-medium ${mutedText} uppercase tracking-wider`}>Hall</th>
                        <th className={`px-4 py-3 text-left text-xs font-medium ${mutedText} uppercase tracking-wider`}>Date</th>
                        <th className={`px-4 py-3 text-left text-xs font-medium ${mutedText} uppercase tracking-wider`}>Start</th>
                        <th className={`px-4 py-3 text-left text-xs font-medium ${mutedText} uppercase tracking-wider`}>End</th>
                        <th className={`px-4 py-3 text-left text-xs font-medium ${mutedText} uppercase tracking-wider`}>Title</th>
                        <th className={`px-4 py-3 text-left text-xs font-medium ${mutedText} uppercase tracking-wider`}>Booked By</th>
                        <th className={`px-4 py-3 text-left text-xs font-medium ${mutedText} uppercase tracking-wider`}>Department</th>
                        <th className={`px-4 py-3 text-left text-xs font-medium ${mutedText} uppercase tracking-wider`}>Email</th>
                        <th className={`px-4 py-3 text-left text-xs font-medium ${mutedText} uppercase tracking-wider`}>Phone</th>
                        <th className={`px-4 py-3 text-left text-xs font-medium ${mutedText} uppercase tracking-wider`}>Applied At</th>
                        <th className={`px-4 py-3 text-left text-xs font-medium ${mutedText} uppercase tracking-wider`}>Status</th>
                        <th className={`px-4 py-3 text-left text-xs font-medium ${mutedText} uppercase tracking-wider`}>Source</th>
                        <th className={`px-4 py-3 text-right text-xs font-medium ${mutedText} uppercase tracking-wider`}>Action</th>
                      </tr>
                    </thead>

                    <tbody className={`${isDtao ? "bg-black/40" : "bg-white"} divide-y ${divider}`}>
                      {seminars.map((s) => (
                        <tr key={s.id} className={`${rowHover} transition`}>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">{s.hallName || "—"}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">{(s.date || "").split("T")[0] || "—"}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">{s.startTime || "--"}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">{s.endTime || "--"}</td>

                          <td className="px-4 py-3 text-sm">
                            <div className="max-w-[220px] truncate">{s.slotTitle || "—"}</div>
                          </td>

                          <td className="px-4 py-3 whitespace-nowrap text-sm">{s.bookingName || "—"}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">{s.department || "—"}</td>

                          <td className="px-4 py-3 text-sm">
                            <div className="max-w-[200px] truncate">{s.email || "—"}</div>
                          </td>

                          <td className="px-4 py-3 whitespace-nowrap text-sm">{s.phone || "—"}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">{formatAppliedAt(s.appliedAt)}</td>

                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                s.status === STATUS_APPROVED
                                  ? "bg-emerald-100 text-emerald-700"
                                  : s.status === STATUS_PENDING
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-rose-100 text-rose-700"
                              }`}
                              aria-label={`Status ${s.status}`}
                            >
                              {s.status}
                            </span>
                          </td>

                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-400">{s.source}</td>

                          <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                            <div className="inline-flex gap-2">
                              <button
                                onClick={() => handleEdit(s)}
                                className={`px-2 py-1 rounded-md hover:shadow-sm transition transform hover:-translate-y-0.5 ${isDtao ? "bg-yellow-600/10 text-amber-300" : "bg-yellow-50 text-yellow-800"}`}
                                title="Edit"
                                aria-label={`Edit ${s.slotTitle}`}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(s)}
                                className={`px-2 py-1 rounded-md hover:shadow-sm transition transform hover:-translate-y-0.5 ${isDtao ? "bg-rose-600/10 text-rose-300" : "bg-rose-50 text-rose-700"}`}
                                title="Delete"
                                aria-label={`Delete ${s.slotTitle}`}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {!isDesktopView && (
                <div className={`divide-y ${divider} md:hidden`}>
                  {seminars.map((s) => (
                    <div key={`card-${s.id}`} className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className={`text-sm font-semibold truncate ${isDtao ? "text-slate-100" : "text-gray-800"}`}>{s.slotTitle || "—"}</div>
                          <div className={`${isDtao ? "text-slate-300" : "text-xs text-gray-500"}`}>{s.hallName || "—"} • {(s.date || "").split("T")[0] || "—"}</div>
                          <div className={`${isDtao ? "text-slate-300" : "text-xs text-gray-500"} mt-1`}>{s.bookingName || "—"} {s.department ? `• ${s.department}` : ""}</div>
                          <div className={`${isDtao ? "text-slate-400" : "text-xs text-gray-400"} mt-1`}>{formatAppliedAt(s.appliedAt)}</div>
                        </div>

                        <div className="flex-shrink-0 flex flex-col items-end gap-2">
                          <div className={`text-xs px-2 py-1 rounded-full font-medium ${
                            s.status === STATUS_APPROVED ? "bg-emerald-100 text-emerald-700" : s.status === STATUS_PENDING ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
                          }`}>{s.status}</div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(s)}
                              className={`px-3 py-1 rounded-md text-xs ${isDtao ? "bg-yellow-600/10 text-amber-300" : "bg-yellow-50 text-yellow-800"}`}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(s)}
                              className={`px-3 py-1 rounded-md text-xs ${isDtao ? "bg-rose-600/10 text-rose-300" : "bg-rose-50 text-rose-700"}`}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className={`${isDtao ? "text-slate-300" : "text-sm text-gray-500"} mt-2`}>Tip: Requests are shown with source=`request`. Seminars override requests for same slot.</div>
      </div>
    </div>
  );
};

export default AllSeminarsPage;
