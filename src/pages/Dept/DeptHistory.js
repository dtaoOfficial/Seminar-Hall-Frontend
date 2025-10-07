// src/components/DeptHistory.js
import React, { useCallback, useEffect, useState } from "react";
import api from "../../utils/api";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { generateCardPDF } from "../../utils/generateCardPDF";

const normalizeSeminar = (s) => ({
  ...s,
  id: s.id ?? s._id ?? `${s.hallName}-${s.date}-${s.slot}`,
  status: (s.status || "").toUpperCase(),
});

const MOBILE_BREAK = 760;

const DeptHistory = ({ user }) => {
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

  // small status pill
  const StatusPill = ({ status = "" }) => {
    const s = (status || "").toUpperCase();
    const base = "inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold";
    if (s === "APPROVED") return <span className={`${base} bg-green-100 text-green-800`}>Approved</span>;
    if (s === "CANCEL_REQUESTED") return <span className={`${base} bg-amber-100 text-amber-800`}>Cancel Requested</span>;
    return <span className={`${base} bg-gray-100 text-gray-800`}>{s || "N/A"}</span>;
  };

  return (
    <div className="p-3">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="text-lg font-semibold">Approved Seminars</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handleManualRefresh}
            className="px-3 py-2 border rounded-md bg-white hover:shadow-sm transition"
            disabled={loading || refreshing}
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center mb-4">
        <input
          aria-label="Search"
          className="px-3 py-2 border rounded-md w-full md:w-64 focus:ring-2 transition"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <input
          className="px-3 py-2 border rounded-md focus:ring-2 transition"
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
        />

        <button
          className="px-3 py-2 border rounded-md bg-white hover:shadow-sm transition"
          onClick={() => {
            setSearch("");
            setFilterDate("");
          }}
        >
          Reset
        </button>
      </div>

      {loading ? (
        <div className="py-6 text-center text-gray-600">Loading...</div>
      ) : filteredView.length === 0 ? (
        <div className="py-8 text-center text-gray-500">No approved seminars</div>
      ) : (
        <>
          {/* Table view for tablet/desktop */}
          {!isMobile && (
            <div className="overflow-auto rounded-md border bg-white shadow-sm transition-all duration-200">
              <table className="min-w-full divide-y">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Hall</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Slot</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Title</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Booked By</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Department</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Remarks</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y">
                  {filteredView.map((s, idx) => (
                    <tr
                      key={s.id}
                      className="hover:shadow-md hover:bg-gray-50 transition-transform transform hover:-translate-y-0.5"
                      style={{ transitionDelay: `${Math.min(100, idx * 10)}ms` }}
                    >
                      <td className="px-4 py-3 text-sm whitespace-nowrap">{(s.date || "").split("T")[0]}</td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">{s.hallName}</td>
                      <td className="px-4 py-3 text-sm">
                        <div className="font-medium">{s.slot}</div>
                        <div className="text-xs text-gray-500">
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
                              className="px-3 py-1 rounded-md bg-rose-50 text-rose-700 hover:bg-rose-100 transition text-sm"
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
                  className="bg-white/95 border border-gray-100 rounded-xl p-4 shadow-sm transition transform hover:-translate-y-1"
                  style={{ transitionDelay: `${Math.min(150, idx * 20)}ms` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold truncate">{s.slotTitle || s.hallName}</h4>
                        <span className="text-xs text-gray-500">{(s.date || "").split("T")[0]}</span>
                      </div>

                      <div className="mt-2 text-sm text-slate-700">
                        <div><strong>Hall:</strong> {s.hallName}</div>
                        <div>
                          <strong>Slot:</strong> {s.slot}{" "}
                          <span className="text-xs text-gray-500">[{s.startTime || "--"} - {s.endTime || "--"}]</span>
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
                            className="px-3 py-1 rounded-md bg-rose-50 text-rose-700 hover:bg-rose-100 transition text-sm"
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-4">
            <h4 className="text-lg font-semibold">Request Cancel</h4>
            <p className="text-sm text-gray-500 mb-3">Provide reason for cancelling</p>
            <textarea
              rows={4}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Reason required"
              className="w-full border rounded-md p-2 mb-3 focus:ring-2"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                className="px-3 py-2 border rounded-md bg-white hover:shadow-sm"
                onClick={() => setCancelModalOpen(false)}
                disabled={cancelSubmitting}
              >
                Close
              </button>
              <button
                className="px-3 py-2 rounded-md bg-rose-50 text-rose-700 hover:bg-rose-100"
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
