// src/components/DeptStatus.js
import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../contexts/ThemeContext";

const authHeader = () => {
  const token = localStorage.getItem("token");
  return token
    ? { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
    : {};
};

const VISIBLE_STATUSES = new Set(["PENDING", "REJECTED", "CANCELLED"]);
const MOBILE_BREAK = 760; // matches your CSS break behavior

const idEq = (a, b) => String(a) === String(b);

const normalizeSeminar = (s) => ({
  ...s,
  id: s.id ?? s._id ?? `${s.hallName}-${s.date}-${s.slot}`,
  status: (s.status || "").toUpperCase(),
});

const DeptStatus = ({ user }) => {
  const { theme } = useTheme() || {};
  const isDtao = theme === "dtao";

  const [seminars, setSeminars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterDate, setFilterDate] = useState("");

  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(`(max-width: ${MOBILE_BREAK}px)`).matches : false
  );

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
      // keep endpoint exactly as original
      const res = await axios.get("http://localhost:8080/api/seminars", authHeader());
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

      filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setSeminars(filtered);
    } catch (err) {
      console.error("Error fetching seminars:", err);
      if (err?.response?.status === 401) {
        toast.error("⛔ Unauthorized! Please login again.");
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        setTimeout(() => navigate("/"), 1200);
        return;
      }
      toast.error("❌ Failed to load seminars");
    } finally {
      setLoading(false);
    }
  }, [email, department, userName, navigate]);

  useEffect(() => {
    fetchSeminars();
  }, [fetchSeminars]);

  // Listen to viewport changes to toggle table/card view
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAK}px)`);

    const onChange = (e) => {
      setIsMobile(e.matches);
    };
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else mq.addListener(onChange);

    setIsMobile(mq.matches);

    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", onChange);
      else mq.removeListener(onChange);
    };
  }, []);

  const filteredView = seminars.filter((s) => {
    if (filterStatus !== "ALL" && s.status !== filterStatus) return false;
    if (filterDate) {
      const d = (s.date || "").split("T")[0];
      if (d !== filterDate) return false;
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
      await axios.delete(`http://localhost:8080/api/seminars/${docId}`, authHeader());
      setSeminars((prev) => prev.filter((s) => !idEq(s.id, docId)));
      toast.success("✅ Deleted successfully");
    } catch (err) {
      console.error("Error deleting seminar:", err);
      toast.error(err?.response?.data?.message || err.message || "Delete failed");
    } finally {
      setSaving(false);
    }
  };

  // small helper to render status pill (theme-aware)
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

  return (
    <div className={`p-3 ${pageBg}`}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className={`text-lg font-extrabold ${isDtao ? "text-slate-100" : "text-gray-900"}`}> My Requests (Pending / Rejected / Cancelled)</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchSeminars}
            className={`${isDtao ? "px-3 py-2 rounded-md bg-violet-700 text-white hover:bg-violet-600" : "px-3 py-2 border rounded-md bg-white hover:shadow-sm"} transition`}
            disabled={loading}
          >
             Refresh
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

      {/* Loading */}
      {loading ? (
        <div className={`${isDtao ? "py-6 text-slate-300" : "py-6 text-gray-600"} text-center`}>⏳ Loading...</div>
      ) : filteredView.length === 0 ? (
        <div className={`${isDtao ? "py-8 text-slate-400" : "py-8 text-gray-500"} text-center`}>No seminars found</div>
      ) : (
        <>
          {/* Table for tablet/desktop */}
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
                        <button
                          onClick={() => handleDelete(s)}
                          className={`${isDtao ? "px-3 py-1 rounded-md bg-rose-600/10 text-rose-300 hover:bg-rose-600/20" : "px-3 py-1 rounded-md bg-rose-50 text-rose-700 hover:bg-rose-100"} transition`}
                          disabled={saving}
                        >
                           Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Cards for mobile */}
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
                        <h3 className={`text-sm font-extrabold truncate ${isDtao ? "text-slate-100" : ""}`}>{s.slotTitle || s.hallName}</h3>
                        <span className={`${isDtao ? "text-slate-300" : "text-xs text-gray-500"}`}>{(s.date || "").split("T")[0]}</span>
                      </div>

                      <div className={`${isDtao ? "text-slate-200" : "text-sm text-slate-700"} mt-2`}>
                        <div><strong>Hall:</strong> {s.hallName}</div>
                        <div><strong>Slot:</strong> {s.slot} <span className={`${isDtao ? "text-slate-300" : "text-xs text-gray-500"}`}>[{s.startTime || "--"} - {s.endTime || "--"}]</span></div>
                        <div><strong>By:</strong> {s.bookingName}</div>
                        <div className="mt-2"><strong>Remarks:</strong> {s.remarks || "—"}</div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <StatusPill status={s.status} />
                      <button
                        onClick={() => handleDelete(s)}
                        className={`${isDtao ? "px-3 py-1 rounded-md bg-rose-600/10 text-rose-300 hover:bg-rose-600/20" : "px-3 py-1 rounded-md bg-rose-50 text-rose-700 hover:bg-rose-100"} transition`}
                        disabled={saving}
                      >
                        ❌
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DeptStatus;
