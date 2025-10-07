// src/pages/Admin/UpdateSeminarPage.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import api from "../../utils/api";

const ymd = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const DEFAULT_REMARKS = "Updated by Admin";

const UpdateSeminarPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // form state
  const [hallName, setHallName] = useState("");
  const [slotTitle, setSlotTitle] = useState("");
  const [bookingName, setBookingName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState(new Date());
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [status, setStatus] = useState("PENDING");
  const [remarks, setRemarks] = useState(DEFAULT_REMARKS);
  const [appliedAt, setAppliedAt] = useState(new Date().toISOString());

  // lists
  const [halls, setHalls] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loadingDepts, setLoadingDepts] = useState(true);
  const [loading, setLoading] = useState(true);

  // notification
  const [notification, setNotification] = useState("");
  const notifRef = useRef(null);
  const [fieldErrors, setFieldErrors] = useState({
    slotTitle: "",
    bookingName: "",
    email: "",
    phone: "",
  });

  // helper: show notification (auto-dismiss)
  const showNotification = (msg, ms = 4000) => {
    if (notifRef.current) clearTimeout(notifRef.current);
    setNotification(String(msg));
    if (ms) {
      notifRef.current = setTimeout(() => setNotification(""), ms);
    }
  };
  const closeNotification = () => {
    if (notifRef.current) clearTimeout(notifRef.current);
    setNotification("");
  };

  // fetch lists
  const fetchHalls = useCallback(async () => {
    try {
      const res = await api.get("/halls");
      const list = Array.isArray(res.data) ? res.data : [];
      setHalls(list);
      if (list.length > 0 && !hallName) {
        const first = list[0];
        setHallName(first?.name ?? first ?? "");
      }
    } catch (err) {
      console.error("fetchHalls", err);
      showNotification("❌ Failed to load halls");
      setHalls([]);
    }
  }, [hallName]);

  const fetchDepartments = useCallback(async () => {
    setLoadingDepts(true);
    try {
      const res = await api.get("/departments");
      const raw = Array.isArray(res.data) ? res.data : [];
      const list = raw.map((d) => (typeof d === "string" ? d : d?.name || "")).filter(Boolean);
      const fallback = ["CSE", "ISE", "ECE", "EEE", "ME", "MBA", "MCA"];
      setDepartments(list.length > 0 ? list : fallback);
      if (!department && (list.length > 0 || fallback.length > 0)) {
        setDepartment((list[0] ?? fallback[0]) || "");
      }
    } catch (err) {
      console.error("fetchDepartments", err);
      setDepartments(["CSE", "ISE", "ECE", "EEE", "ME", "MBA", "MCA"]);
    } finally {
      setLoadingDepts(false);
    }
  }, [department]);

  // fetch seminar by id
  const fetchItem = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/seminars/${id}`);
      const s = res.data;
      if (!s) {
        showNotification("❌ Seminar not found");
        return;
      }

      setHallName(s.hallName ?? "");
      setSlotTitle(s.slotTitle ?? s.title ?? "");
      setBookingName(s.bookingName ?? s.organizer ?? "");
      setEmail(s.email ?? "");
      setDepartment(s.department ?? "");
      setPhone(s.phone ?? "");
      setDate(s.date ? new Date(s.date) : new Date());
      setStartTime(s.startTime ?? s.start_time ?? s.from ?? "");
      setEndTime(s.endTime ?? s.end_time ?? s.to ?? "");
      setStatus((s.status ?? "PENDING").toString().toUpperCase());
      setRemarks(s.remarks ?? DEFAULT_REMARKS);
      setAppliedAt(s.appliedAt ?? s.createdAt ?? new Date().toISOString());
    } catch (err) {
      console.error("fetchItem error", err);
      showNotification("❌ Failed to load seminar data.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  // initial load
  useEffect(() => {
    fetchHalls();
    fetchDepartments();
    fetchItem();

    // if navigated with preselected values (from SeminarDetails), apply them
    const navState = location?.state || {};
    if (navState.selectedHall) setHallName(navState.selectedHall);
    if (navState.date) {
      try {
        setDate(new Date(navState.date));
      } catch {
        /* ignore invalid date */
      }
    }
    if (navState.selectedStartTime) setStartTime(navState.selectedStartTime);
    if (navState.selectedEndTime) setEndTime(navState.selectedEndTime);

    return () => {
      if (notifRef.current) clearTimeout(notifRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchHalls, fetchDepartments, fetchItem, location?.state]);

  // validation helpers
  const validateEmail = (em) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em || "");
  const validatePhone = (p) => /^[6-9]\d{9}$/.test((p || "").trim());

  // submit handler
  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const errs = { slotTitle: "", bookingName: "", email: "", phone: "" };
    let hasErr = false;

    if (!slotTitle.trim()) {
      errs.slotTitle = "❌ Event name required";
      hasErr = true;
    }
    if (!bookingName.trim()) {
      errs.bookingName = "❌ Faculty name required";
      hasErr = true;
    }
    if (!validateEmail(email)) {
      errs.email = "❌ Invalid email";
      hasErr = true;
    }
    if (!validatePhone(phone)) {
      errs.phone = "❌ Invalid phone (10 digits, starts with 6-9)";
      hasErr = true;
    }
    if (!startTime || !endTime) {
      showNotification("❌ Please select hall & time");
      hasErr = true;
    }

    if (hasErr) {
      setFieldErrors(errs);
      return;
    }

    setFieldErrors({ slotTitle: "", bookingName: "", email: "", phone: "" });

    const payload = {
      hallName,
      slot: "Custom",
      slotTitle,
      bookingName,
      email,
      department,
      phone,
      date: ymd(date),
      startTime,
      endTime,
      status,
      remarks,
      appliedAt: new Date().toISOString(),
    };

    try {
      await api.put(`/seminars/${id}`, payload);
      showNotification("✅ Seminar updated successfully", 2500);
      setTimeout(() => navigate("/admin"), 1000);
    } catch (err) {
      console.error("Update error:", err?.response || err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err.message ||
        "❌ Failed to update seminar";
      showNotification(msg, 5000);
    }
  };

  const openSeminarDetails = () => {
    navigate("/admin/seminar-details", {
      state: {
        returnTo: `/admin/update/${id}`,
        selectedHall: hallName,
        date: ymd(date),
      },
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="mx-3 sm:mx-auto max-w-3xl">
        {/* Notification overlay (theme-preserving) */}
        {notification && (
          <div className="fixed inset-0 z-40 flex items-start sm:items-center justify-center p-4 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-md">
              <div className="bg-white border border-gray-200 shadow-lg rounded-lg p-3 sm:p-4 flex items-start gap-3">
                <div className="flex-1">
                  <div className="text-sm text-gray-800 break-words">{notification}</div>
                </div>
                <button
                  aria-label="Close notification"
                  onClick={closeNotification}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-lg shadow p-4 sm:p-6 border border-gray-100"
          aria-label="Update Seminar"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 leading-tight">✏ Update Seminar</h2>
              <div className="text-xs text-gray-500 mt-1 break-words">ID: <span className="font-mono">{id}</span></div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => navigate("/admin")}
                className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-md border border-gray-200 bg-white text-sm hover:bg-gray-50"
              >
                ↩ Back
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-sm text-gray-500 mt-3">Loading seminar data…</div>
          ) : null}

          {/* Hall + select button */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700">Hall Name</label>
            <div className="mt-2 flex gap-3">
              <div
                className="flex-1 px-3 py-2 rounded-md border border-gray-200 bg-gray-50 text-sm leading-5 min-h-0"
                style={{ display: "flex", alignItems: "center" }}
                title={hallName}
              >
                <span className="truncate">{hallName || "Select hall"}</span>
              </div>
              <button
                type="button"
                onClick={openSeminarDetails}
                className="px-3 py-2 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700 transition"
              >
                Select
              </button>
            </div>
            <div className={`mt-2 text-sm ${startTime && endTime ? "text-emerald-700" : "text-gray-500"}`}>
              {startTime && endTime ? `${startTime} — ${endTime} on ${ymd(date)}` : "No time selected"}
            </div>
          </div>

          {/* Event name */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700">Event Name</label>
            <input
              value={slotTitle}
              onChange={(e) => setSlotTitle(e.target.value)}
              className={`mt-2 w-full px-3 py-2 rounded-md border ${fieldErrors.slotTitle ? "border-rose-400 bg-rose-50" : "border-gray-200"} focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm`}
              aria-invalid={!!fieldErrors.slotTitle}
            />
            {fieldErrors.slotTitle && <div className="mt-1 text-xs text-rose-600">{fieldErrors.slotTitle}</div>}
          </div>

          {/* Faculty name */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700">Faculty Name</label>
            <input
              value={bookingName}
              onChange={(e) => setBookingName(e.target.value)}
              className={`mt-2 w-full px-3 py-2 rounded-md border ${fieldErrors.bookingName ? "border-rose-400 bg-rose-50" : "border-gray-200"} focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm`}
              aria-invalid={!!fieldErrors.bookingName}
            />
            {fieldErrors.bookingName && <div className="mt-1 text-xs text-rose-600">{fieldErrors.bookingName}</div>}
          </div>

          {/* Email + Department */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`mt-2 w-full px-3 py-2 rounded-md border ${fieldErrors.email ? "border-rose-400 bg-rose-50" : "border-gray-200"} focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm`}
                aria-invalid={!!fieldErrors.email}
              />
              {fieldErrors.email && <div className="mt-1 text-xs text-rose-600">{fieldErrors.email}</div>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Department</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                disabled={loadingDepts}
                className="mt-2 w-full px-3 py-2 rounded-md border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm"
              >
                {departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Phone + Remarks */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Phone</label>
              <input
                type="tel"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, ""))}
                className={`mt-2 w-full px-3 py-2 rounded-md border ${fieldErrors.phone ? "border-rose-400 bg-rose-50" : "border-gray-200"} focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm`}
                aria-invalid={!!fieldErrors.phone}
              />
              {fieldErrors.phone && <div className="mt-1 text-xs text-rose-600">{fieldErrors.phone}</div>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Remarks</label>
              <input
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="mt-2 w-full px-3 py-2 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm"
              />
            </div>
          </div>

          {/* Applied At (read-only) */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700">Applied At</label>
            <input
              value={new Date(appliedAt).toLocaleString()}
              readOnly
              className="mt-2 w-full px-3 py-2 rounded-md border border-gray-100 bg-gray-50 text-sm"
            />
          </div>

          {/* Status select */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-2 w-full px-3 py-2 rounded-md border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm"
            >
              <option value="PENDING">PENDING</option>
              <option value="APPROVED">APPROVED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </div>

          {/* actions */}
          <div className="mt-5 flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => navigate("/admin")}
              className="px-3 py-2 rounded-md border border-gray-200 bg-white text-sm hover:bg-gray-50"
            >
              ↩ Back
            </button>
            <button
              type="submit"
              className="px-3 py-2 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700 transition"
            >
              💾 Update
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UpdateSeminarPage;
