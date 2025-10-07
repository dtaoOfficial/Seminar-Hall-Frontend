// src/pages/RequestsPage.js
import React, { useEffect, useState, useCallback, useRef } from "react";
import api from "../../utils/api";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const POLL_INTERVAL_MS = 10000; // 10s
const FILTER_DEBOUNCE_MS = 400;

const RequestsPage = () => {
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
          if (!silent) toast.error("Unexpected seminars response");
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
          // toast + play sound + emit event
          toast.info(`${newlyAdded.length} new request(s)`, { autoClose: 3500 });
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
        }
      } catch (err) {
        console.error("Error fetching seminars:", err?.response || err);
        if (!silent) toast.error("Failed to fetch seminars");
      }
    },
    []
  );

  useEffect(() => {
    fetchAll(true);
    pollingRef.current = setInterval(() => fetchAll(false), POLL_INTERVAL_MS);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (blinkTimeoutRef.current) clearTimeout(blinkTimeoutRef.current);
    };
  }, [fetchAll]);

  // === keep your original action functions (unchanged logic) ===
  const saveRemarks = async (normId) => {
    const remarks = (remarksMap[normId] ?? "").trim();
    if (!normId) return;
    const [, rawId] = normId.split("-", 2);
    try {
      await api.put(`/seminars/${rawId}`, { remarks });
      toast.success("Remarks saved");
      await fetchAll(true);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save remarks");
    }
  };

  const handleApprove = async (normId) => {
    const [, rawId] = normId.split("-", 2);
    const remarks = (remarksMap[normId] ?? "").trim();
    try {
      await api.put(`/seminars/${rawId}`, { status: "APPROVED", remarks });
      toast.success("Request approved");
      await fetchAll(true);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to approve");
    }
  };

  const handleReject = async (normId) => {
    const [, rawId] = normId.split("-", 2);
    const remarks = (remarksMap[normId] ?? "").trim();
    if (!remarks) {
      toast.warn("Enter remarks before rejecting");
      return;
    }
    try {
      await api.put(`/seminars/${rawId}`, { status: "REJECTED", remarks });
      toast.success("Request rejected");
      await fetchAll(true);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to reject");
    }
  };

  const handleConfirmCancel = async (normId) => {
    const [, rawId] = normId.split("-", 2);
    const remarks = (remarksMap[normId] ?? "").trim() || "Cancellation confirmed";
    try {
      await api.put(`/seminars/${rawId}`, { status: "CANCELLED", remarks });
      toast.success("Cancel confirmed");
      setNewIdsSet((prev) => {
        const next = new Set(prev);
        next.delete(normId);
        return next;
      });
      await fetchAll(true);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to confirm cancel");
    }
  };

  const handleRejectCancel = async (normId) => {
    const [, rawId] = normId.split("-", 2);
    const remarks = (remarksMap[normId] ?? "").trim() || "Cancellation rejected";
    try {
      await api.put(`/seminars/${rawId}`, { status: "APPROVED", remarks });
      toast.success("Cancel rejected");
      setNewIdsSet((prev) => {
        const next = new Set(prev);
        next.delete(normId);
        return next;
      });
      await fetchAll(true);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to reject cancel");
    }
  };

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

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Tight header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Booking Requests & Cancels</h2>
        <div className="text-sm text-slate-600">
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
          className="col-span-1 md:col-span-2 p-2 rounded-lg border border-white/10 glass-pill text-slate-900"
        />
        <input
          type="date"
          value={searchDateRaw}
          onChange={(e) => setSearchDateRaw(e.target.value)}
          className="p-2 rounded-lg border border-white/10 glass-pill text-slate-900"
        />
        <select
          value={searchSlotRaw}
          onChange={(e) => setSearchSlotRaw(e.target.value)}
          className="p-2 rounded-lg border border-white/10 glass-pill text-slate-900"
        >
          <option value="">All Slots</option>
          <option value="Morning">Morning</option>
          <option value="Afternoon">Afternoon</option>
          <option value="Full Day">Full Day</option>
        </select>

        <select
          value={statusFilterRaw}
          onChange={(e) => setStatusFilterRaw(e.target.value)}
          className="p-2 rounded-lg border border-white/10 glass-pill text-slate-900"
        >
          <option value="ALL">All Status</option>
          <option value="PENDING">PENDING</option>
          <option value="APPROVED">APPROVED</option>
          <option value="REJECTED">REJECTED</option>
          <option value="CANCEL_REQUESTED">CANCEL_REQUESTED</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>

        <div className="flex gap-2 justify-end md:col-span-2">
          <button
            type="button"
            onClick={() => {
              setSearchDeptRaw("");
              setSearchDateRaw("");
              setSearchSlotRaw("");
              setStatusFilterRaw("ALL");
            }}
            className="px-4 py-2 rounded-lg glass text-sm font-semibold text-slate-900"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Card list */}
      <div className="space-y-4">
        {filteredItems.length === 0 ? (
          <div className="p-6 text-center text-slate-600 glass">No requests found</div>
        ) : (
          filteredItems.map((r) => {
            const formattedDate = formatDateNice(r.date);
            const timeRange = `${formatTime(r.startTime)} - ${formatTime(r.endTime)}`;
            const id = r.normId;
            const isCancelRequested = (r.status ?? "").toUpperCase() === "CANCEL_REQUESTED";
            const blink = blinkIds.has(String(id));
            const isNew = newIdsSet.has(String(id));
            const cardRing = blink ? "ring-2 ring-yellow-200/30" : isNew ? "ring-2 ring-blue-200/20" : "";

            return (
              <div key={id} className={`glass-strong p-4 md:p-5 rounded-xl flex flex-col md:flex-row md:items-start gap-4 ${cardRing}`}>
                {/* left: basic info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-semibold text-slate-900">{r.hallName || "—"}</div>
                    <div className="text-xs text-slate-600 px-2 py-1 rounded-md bg-white/6">{r.department || "—"}</div>
                    {isNew && <div className="w-3 h-3 rounded-full bg-red-500 ml-2" title="New request" />}
                  </div>

                  <div className="mt-2 text-sm text-slate-800">{formattedDate}</div>
                  <div className="text-xs text-slate-600 mt-1">{timeRange}</div>

                  <div className="mt-3 text-sm">
                    <div className="text-slate-900 font-medium">{r.bookingName || "—"}</div>
                    {r.bookingEmail && <div className="text-xs text-slate-600 mt-1">{r.bookingEmail}</div>}
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
                          className="px-3 py-1 rounded-md text-sm font-semibold glass-pill text-slate-900"
                          onClick={() => handleConfirmCancel(id)}
                        >
                          Confirm Cancel
                        </button>
                        <button
                          className="px-3 py-1 rounded-md text-sm font-semibold glass-pill text-slate-900"
                          onClick={() => handleRejectCancel(id)}
                        >
                          Reject Cancel
                        </button>
                      </>
                    ) : (
                      <div className="px-3 py-1 rounded-md text-sm text-slate-400">—</div>
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
                    className="w-full p-2 rounded-lg border border-white/10 bg-white/6 text-slate-900 text-sm"
                  />

                  <div className="flex gap-2 items-start">
                    <button
                      className="px-3 py-2 rounded-md text-sm font-semibold glass text-slate-900"
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

                    {isCancelRequested && (
                      <div className="p-3 rounded-md bg-yellow-50 text-sm text-yellow-800">
                        <div><strong>Cancel reason:</strong> {r.cancellationReason || "—"}</div>
                        <div className="mt-1"><strong>Requested by:</strong> {r.cancellationRequestedBy || r.requestedBy || "—"}</div>
                      </div>
                    )}

                    {r.remarks && (
                      <div className="p-3 rounded-md bg-white/30 text-sm text-slate-900">
                        <strong>Admin remarks:</strong> <span className="ml-1">{r.remarks}</span>
                      </div>
                    )}
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
          <div className="relative z-10 w-full max-w-lg glass-strong p-6 rounded-2xl">
            <h3 className="text-lg font-bold mb-3 text-slate-900">Reject Request</h3>
            <p className="text-sm text-slate-600 mb-4">Please enter the reason for rejection. This will be saved as admin remarks and sent to the backend.</p>

            <textarea
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
              className="w-full p-3 rounded-lg border border-white/20 bg-white/6 text-sm text-slate-900"
            />

            <div className="mt-4 flex justify-end gap-3">
              <button
                className="px-4 py-2 rounded-md glass text-slate-900"
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
                    toast.warn("Please enter a reason before rejecting");
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

      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};

export default RequestsPage;
