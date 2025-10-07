// src/pages/Admin/AllSeminarsPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import { ToastContainer, toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import "react-toastify/dist/ReactToastify.css";
import api from "../../utils/api";

/**
 * AllSeminarsPage — Tailwind version
 * - Table shown when viewport >= md (tablet + desktop)
 * - Cards shown when viewport < md (mobile)
 * - Uses window.matchMedia to determine view and listens for changes
 * - Robust parsing of API responses (handles array or { seminars: [] } shapes)
 */

const STATUS_APPROVED = "APPROVED";
const STATUS_PENDING = "PENDING";

const AllSeminarsPage = () => {
  const [loading, setLoading] = useState(true);
  const [seminars, setSeminars] = useState([]);
  const [error, setError] = useState("");
  const [isDesktopView, setIsDesktopView] = useState(() => {
    // initial: match Tailwind md breakpoint (768px)
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(min-width: 768px)").matches;
    }
    return true;
  });

  const navigate = useNavigate();

  // Normalize helper for different API shapes
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

  // Safe extractor for API response shapes
  const ensureArray = (res) => {
    if (!res) return [];
    // res might be array already
    if (Array.isArray(res)) return res;
    // res might be response object with .data array
    if (res.data && Array.isArray(res.data)) return res.data;
    // different shapes
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

      // debug log — remove if you want
      // eslint-disable-next-line no-console
      console.debug("Fetched", { rawSeminars: rawSeminars.length, rawRequests: rawRequests.length, combined: combined.length });
    } catch (err) {
      console.error("Fetch error", err);
      setError("Failed to fetch seminars/requests. Check console/network.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSeminars();
  }, [fetchSeminars]);

  // watch viewport changes using matchMedia so we can toggle table/cards reliably
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const mq = window.matchMedia("(min-width: 768px)"); // Tailwind md
    const apply = (ev) => setIsDesktopView(Boolean(ev.matches));
    // initial already set from state initializer, but update just in case
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
      toast.success("Deleted successfully");
    } catch (err) {
      console.error("Error deleting item:", err?.response || err);
      const serverMsg =
        (err.response && (err.response.data?.message || err.response.data)) || err.message || "Failed to delete";
      toast.error(String(serverMsg));
    }
  };

  const handleEdit = (item) => {
    navigate(`/admin/update/${item.id}?source=${item.source}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Top */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-gray-800">All Seminars (Edit / Delete)</h2>
            <p className="text-sm text-gray-500 mt-1">Combined view of confirmed seminars and booking requests.</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchSeminars()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-200 shadow-sm hover:shadow-md transition transform hover:-translate-y-0.5"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Card/Container */}
        <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading…</div>
          ) : error ? (
            <div className="p-8 text-center text-rose-600">{error}</div>
          ) : seminars.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No seminars or booking requests found.</div>
          ) : (
            <>
              {/* Render TABLE when viewport >= md (tablet+desktop) */}
              {isDesktopView && (
                <div className="w-full overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hall</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Booked By</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applied At</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>

                    <tbody className="bg-white divide-y divide-gray-100">
                      {seminars.map((s) => (
                        <tr key={s.id} className="hover:bg-gray-50 transition">
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">{s.hallName || "—"}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{(s.date || "").split("T")[0] || "—"}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{s.startTime || "--"}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{s.endTime || "--"}</td>

                          <td className="px-4 py-3 text-sm text-gray-800">
                            <div className="max-w-[220px] truncate">{s.slotTitle || "—"}</div>
                          </td>

                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{s.bookingName || "—"}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{s.department || "—"}</td>

                          <td className="px-4 py-3 text-sm text-gray-700">
                            <div className="max-w-[200px] truncate">{s.email || "—"}</div>
                          </td>

                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{s.phone || "—"}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{formatAppliedAt(s.appliedAt)}</td>

                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                s.status === STATUS_APPROVED ? "bg-emerald-100 text-emerald-700" : s.status === STATUS_PENDING ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
                              }`}
                              aria-label={`Status ${s.status}`}
                            >
                              {s.status}
                            </span>
                          </td>

                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{s.source}</td>

                          <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                            <div className="inline-flex gap-2">
                              <button
                                onClick={() => handleEdit(s)}
                                className="px-2 py-1 rounded-md bg-yellow-50 text-yellow-800 hover:shadow-sm transition transform hover:-translate-y-0.5"
                                title="Edit"
                                aria-label={`Edit ${s.slotTitle}`}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(s)}
                                className="px-2 py-1 rounded-md bg-rose-50 text-rose-700 hover:shadow-sm transition transform hover:-translate-y-0.5"
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

              {/* Render CARDS when viewport < md (mobile) */}
              {!isDesktopView && (
                <div className="divide-y divide-gray-200 md:hidden">
                  {seminars.map((s) => (
                    <div key={`card-${s.id}`} className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-gray-800 truncate">{s.slotTitle || "—"}</div>
                          <div className="text-xs text-gray-500">{s.hallName || "—"} • {(s.date || "").split("T")[0] || "—"}</div>
                          <div className="text-xs text-gray-500 mt-1">{s.bookingName || "—"} {s.department ? `• ${s.department}` : ""}</div>
                          <div className="text-xs text-gray-400 mt-1">{formatAppliedAt(s.appliedAt)}</div>
                        </div>

                        <div className="flex-shrink-0 flex flex-col items-end gap-2">
                          <div className={`text-xs px-2 py-1 rounded-full font-medium ${
                            s.status === STATUS_APPROVED ? "bg-emerald-100 text-emerald-700" : s.status === STATUS_PENDING ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
                          }`}>{s.status}</div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(s)}
                              className="px-3 py-1 rounded-md bg-yellow-50 text-yellow-800 text-xs"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(s)}
                              className="px-3 py-1 rounded-md bg-rose-50 text-rose-700 text-xs"
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

        <div className="text-sm text-gray-500 mt-2">Tip: Requests are shown with source=`request`. Seminars override requests for same slot.</div>
      </div>

      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};

export default AllSeminarsPage;
