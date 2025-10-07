import React, { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import "../../styles/RequestsPage.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const POLL_INTERVAL_MS = 10000; // 10s

const RequestsPage = () => {
  const [items, setItems] = useState([]);
  const [searchDept, setSearchDept] = useState("");
  const [searchDate, setSearchDate] = useState("");
  const [searchSlot, setSearchSlot] = useState("");
  const [remarksMap, setRemarksMap] = useState({});
  const [statusFilter, setStatusFilter] = useState("ALL");

  const prevIdsRef = useRef(new Set());
  const pollingRef = useRef(null);

  const getAuthHeader = () => {
    const token = localStorage.getItem("token");
    return token
      ? { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
      : {};
  };

  // normalize seminar row
  const normalizeSeminar = (s) => ({
    ...s,
    normId: `seminar-${s.id ?? s._id}`,
    status: (s.status ?? "").toString().toUpperCase(),
  });

  const fetchAll = useCallback(async () => {
    try {
      const sRes = await axios.get("http://localhost:8080/api/seminars", getAuthHeader());
      const seminars = (Array.isArray(sRes.data) ? sRes.data : []).map(normalizeSeminar);

      // sort by date descending
      seminars.sort((a, b) => {
        const da = new Date(a.date || a.appliedAt || 0).getTime() || 0;
        const db = new Date(b.date || b.appliedAt || 0).getTime() || 0;
        return db - da;
      });

      setItems(seminars);

      // initialize remarks
      setRemarksMap((prev) => {
        const next = { ...prev };
        seminars.forEach((row) => {
          if (!(row.normId in next)) next[row.normId] = row.remarks ?? "";
        });
        return next;
      });
    } catch (err) {
      console.error("Error fetching seminars:", err?.response || err);
      toast.error("⚠️ Failed to fetch seminars");
    }
  }, []);

  useEffect(() => {
    fetchAll();
    pollingRef.current = setInterval(() => {
      fetchAll();
    }, POLL_INTERVAL_MS);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchAll]);

  // save remarks
  const saveRemarks = async (normId) => {
    const remarks = (remarksMap[normId] ?? "").trim();
    const rawId = normId.replace("seminar-", "");
    try {
      await axios.put(`http://localhost:8080/api/seminars/${rawId}`, { remarks }, getAuthHeader());
      toast.success("✅ Remarks saved");
      await fetchAll();
    } catch (err) {
      console.error("Error saving remarks:", err);
      toast.error("⚠️ Failed to save remarks");
    }
  };

  // approve
  const handleApprove = async (normId) => {
    const rawId = normId.replace("seminar-", "");
    const remarks = (remarksMap[normId] ?? "").trim();
    try {
      await axios.put(
        `http://localhost:8080/api/seminars/${rawId}`,
        { status: "APPROVED", remarks },
        getAuthHeader()
      );
      toast.success("✅ Approved");
      await fetchAll();
    } catch (err) {
      console.error("Error approving:", err);
      toast.error("⚠️ Failed to approve");
    }
  };

  // reject
  const handleReject = async (normId) => {
    const rawId = normId.replace("seminar-", "");
    const remarks = (remarksMap[normId] ?? "").trim();
    if (!remarks) {
      toast.warn("⚠️ Enter remarks before rejecting");
      return;
    }
    try {
      await axios.put(
        `http://localhost:8080/api/seminars/${rawId}`,
        { status: "REJECTED", remarks },
        getAuthHeader()
      );
      toast.success("✅ Rejected");
      await fetchAll();
    } catch (err) {
      console.error("Error rejecting:", err);
      toast.error("⚠️ Failed to reject");
    }
  };

  // confirm cancel
  const handleConfirmCancel = async (normId) => {
    const rawId = normId.replace("seminar-", "");
    const remarks = (remarksMap[normId] ?? "").trim() || "Cancellation confirmed by admin";
    try {
      await axios.put(
        `http://localhost:8080/api/seminars/${rawId}`,
        { status: "CANCELLED", remarks },
        getAuthHeader()
      );
      toast.success("✅ Cancel confirmed");
      await fetchAll();
    } catch (err) {
      console.error("Error confirming cancel:", err);
      toast.error("⚠️ Failed to confirm cancel");
    }
  };

  // reject cancel
  const handleRejectCancel = async (normId) => {
    const rawId = normId.replace("seminar-", "");
    const remarks = (remarksMap[normId] ?? "").trim() || "Cancel request rejected by admin";
    try {
      await axios.put(
        `http://localhost:8080/api/seminars/${rawId}`,
        { status: "APPROVED", remarks },
        getAuthHeader()
      );
      toast.success("✅ Cancel request rejected");
      await fetchAll();
    } catch (err) {
      console.error("Error rejecting cancel:", err);
      toast.error("⚠️ Failed to reject cancel");
    }
  };

  // filtering
  const filteredItems = items.filter((r) => {
    if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
    if (searchDept && !(r.department ?? "").toLowerCase().includes(searchDept.toLowerCase()))
      return false;
    if (searchDate) {
      const d = (r.date || "").split("T")[0];
      if (d !== searchDate) return false;
    }
    if (searchSlot && !(r.slot ?? "").toLowerCase().includes(searchSlot.toLowerCase()))
      return false;
    return true;
  });

  // formatters
  const formatTime = (t) =>
    t
      ? new Date(`1970-01-01T${t}`).toLocaleTimeString("en-IN", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })
      : "";

  const formatDate = (iso) => (iso ? String(iso).split("T")[0] : "");

  return (
    <div className="requests-container">
      <h2>📋 Booking Requests & Cancels</h2>

      {/* filters */}
      <div className="filters">
        <input
          type="text"
          placeholder="Search Dept..."
          value={searchDept}
          onChange={(e) => setSearchDept(e.target.value)}
        />
        <input type="date" value={searchDate} onChange={(e) => setSearchDate(e.target.value)} />
        <input
          type="text"
          placeholder="Search Slot..."
          value={searchSlot}
          onChange={(e) => setSearchSlot(e.target.value)}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="ALL">All</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="CANCEL_REQUESTED">Cancel Requested</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <button
          onClick={() => {
            setSearchDept("");
            setSearchDate("");
            setSearchSlot("");
            setStatusFilter("ALL");
          }}
        >
          Reset
        </button>
      </div>

      {/* table */}
      <table className="requests-table">
        <thead>
          <tr>
            <th>Hall</th>
            <th>Dept</th>
            <th>Date</th>
            <th>Slot</th>
            <th>Booked By</th>
            <th>Status</th>
            <th>Actions</th>
            <th>Remarks / Cancel Info</th>
          </tr>
        </thead>
        <tbody>
          {filteredItems.length === 0 ? (
            <tr>
              <td colSpan="8" style={{ textAlign: "center" }}>
                No records
              </td>
            </tr>
          ) : (
            filteredItems.map((r) => {
              const id = r.normId;
              const isCancelRequested = r.status === "CANCEL_REQUESTED";

              return (
                <tr key={id}>
                  <td>{r.hallName}</td>
                  <td>{r.department}</td>
                  <td>{formatDate(r.date)}</td>
                  <td>
                    {r.slot}
                    <div style={{ fontSize: 12, color: "#666" }}>
                      {formatTime(r.startTime)} - {formatTime(r.endTime)}
                    </div>
                  </td>
                  <td>{r.bookingName}</td>
                  <td>
                    <span className={`status ${r.status.toLowerCase()}`}>{r.status}</span>
                  </td>
                  <td>
                    {r.status === "PENDING" ? (
                      <>
                        <button onClick={() => handleApprove(id)} className="action-btn approve">
                          Approve
                        </button>
                        <button onClick={() => handleReject(id)} className="action-btn reject">
                          Reject
                        </button>
                      </>
                    ) : isCancelRequested ? (
                      <>
                        <button
                          onClick={() => handleConfirmCancel(id)}
                          className="action-btn confirm-cancel"
                        >
                          Confirm Cancel
                        </button>
                        <button
                          onClick={() => handleRejectCancel(id)}
                          className="action-btn reject-cancel"
                        >
                          Reject Cancel
                        </button>
                      </>
                    ) : (
                      <button disabled className="action-btn disabled">
                        —
                      </button>
                    )}
                  </td>
                  <td>
                    <input
                      type="text"
                      placeholder="Enter remarks"
                      value={remarksMap[id] ?? ""}
                      onChange={(e) =>
                        setRemarksMap((prev) => ({ ...prev, [id]: e.target.value }))
                      }
                      style={{ width: "100%", marginBottom: 6 }}
                    />
                    {isCancelRequested && (
                      <div className="cancel-info">
                        <strong>Cancel Reason:</strong> {r.remarks || "—"}
                      </div>
                    )}
                    <button onClick={() => saveRemarks(id)} className="save-btn">
                      💾 Save
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};

export default RequestsPage;
