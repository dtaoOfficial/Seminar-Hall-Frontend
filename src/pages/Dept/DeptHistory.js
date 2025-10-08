// src/components/DeptHistory.js
import React, { useCallback, useEffect, useState } from "react";
import api from "../../utils/api";
import { toast } from "react-toastify";
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

      approved.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setSeminars(approved);
    } catch (err) {
      console.error("Error fetching history:", err);
      toast.error("Failed to fetch booking history");
      if (err?.response?.status === 401) {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        setTimeout(() => navigate("/"), 1200);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [email, userDept, navigate]);

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
    toast.info("Refreshed");
  };

  const handleRequestCancel = (seminar) => {
    setCancelTarget(seminar);
    setCancelReason("");
    setCancelModalOpen(true);
  };

  const confirmCancelRequest = async () => {
    if (!cancelTarget) return;
    if (!cancelReason.trim()) return toast.warn("Cancel reason required");

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
      toast.success("Cancel request submitted");
      setCancelModalOpen(false);
    } catch (err) {
      console.error("Error cancel request:", err);
      toast.error("Failed to request cancel");
    } finally {
      setCancelSubmitting(false);
    }
  };

  const filteredView = seminars.filter((s) => {
    if (filterDate && (s.date || "").split("T")[0] !== filterDate) return false;
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
                  {filteredView.map((s, idx) => (
                    <tr
                      key={s.id}
                      className={`${isDtao ? "hover:bg-black/30" : "hover:bg-gray-50"} hover:shadow-md transition-transform transform hover:-translate-y-0.5`}
                      style={{ transitionDelay: `${Math.min(100, idx * 10)}ms` }}
                    >
                      <td className="px-4 py-3 text-sm whitespace-nowrap">{(s.date || "").split("T")[0]}</td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">{s.hallName}</td>
                      <td className="px-4 py-3 text-sm">
                        <div className="font-medium">{s.slot}</div>
                        <div className={`${isDtao ? "text-slate-300" : "text-xs text-gray-500"}`}>
                          [{s.startTime || "--"} - {s.endTime || "--"}]
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">{s.slotTitle}</td>
                      <td className="px-4 py-3 text-sm">{s.bookingName}</td>
                      <td className="px-4 py-3 text-sm">{s.department}</td>
                      <td className="px-4 py-3 text-sm"><StatusPill status={s.status} /></td>
                      <td className="px-4 py-3 text-sm">{s.remarks || "—"}</td>
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
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Card view for mobile */}
          {isMobile && (
            <div className="space-y-3">
              {filteredView.map((s, idx) => (
                <article
                  key={s.id}
                  className={`${cardBg} p-4 rounded-xl shadow-sm transition transform hover:-translate-y-1`}
                  style={{ transitionDelay: `${Math.min(150, idx * 20)}ms` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className={`text-sm font-semibold truncate ${isDtao ? "text-slate-100" : ""}`}>{s.slotTitle || s.hallName}</h4>
                        <span className={`${isDtao ? "text-slate-300" : "text-xs text-gray-500"}`}>{(s.date || "").split("T")[0]}</span>
                      </div>

                      <div className={`${isDtao ? "text-slate-200" : "text-sm text-slate-700"} mt-2`}>
                        <div><strong>Hall:</strong> {s.hallName}</div>
                        <div>
                          <strong>Slot:</strong> {s.slot}{" "}
                          <span className={`${isDtao ? "text-slate-300" : "text-xs text-gray-500"}`}>[{s.startTime || "--"} - {s.endTime || "--"}]</span>
                        </div>
                        <div><strong>By:</strong> {s.bookingName}</div>
                        <div className="mt-2"><strong>Remarks:</strong> {s.remarks || "—"}</div>
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
                    </div>
                  </div>
                </article>
              ))}
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
