// src/pages/AllDepartmentsPage.js
import React, { useState, useEffect, useCallback, useRef } from "react";
import api from "../../utils/api";
import { useNavigate } from "react-router-dom";
import { useNotification } from "../../components/NotificationsProvider";
import { useTheme } from "../../contexts/ThemeContext";

const MIN_PASSWORD_LENGTH = 6;

const fallbackDepts = [
  "CSE-1",
  "CSE-2",
  "ISE",
  "DS",
  "AI&ML",
  "EEE",
  "ECE",
  "ME",
  "MCA",
  "MBA",
];

/* ---------- Small accessible Dropdown (replaces native select) ---------- */
/*
  Props:
    - options: array of string or { value, label }
    - value: current value (string)
    - onChange: (v) => void
    - placeholder: text when no selection
*/
function Dropdown({ options = [], value, onChange, placeholder = "Select" }) {
  const { theme } = useTheme() || {};
  const isDtao = theme === "dtao";
  const ref = useRef(null);
  const [open, setOpen] = useState(false);

  const normalized = (options || []).map((o) =>
    typeof o === "string" ? { value: o, label: o } : { value: o.value, label: o.label ?? o.value }
  );

  useEffect(() => {
    function onDoc(e) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    // ensure visible item in scroll when opening
    if (open) {
      const el = ref.current?.querySelector(`[data-val="${value}"]`);
      if (el?.scrollIntoView) el.scrollIntoView({ block: "nearest" });
    }
  }, [open, value]);

  const selected = normalized.find((o) => String(o.value) === String(value));
  const selectedLabel = selected ? selected.label : "";

  return (
    <div ref={ref} className="relative inline-block w-full">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="open dropdown"
        onClick={() => setOpen((s) => !s)}
        className={`w-full text-left rounded-md px-3 py-2 border flex items-center justify-between ${
          isDtao ? "bg-transparent border-violet-700 text-slate-100" : "bg-white border-gray-200 text-gray-800"
        }`}
      >
        <span className={`${selectedLabel ? "" : "text-slate-400"}`}>{selectedLabel || placeholder}</span>
        <svg className={`w-4 h-4 ml-2 ${isDtao ? "text-slate-300" : "text-slate-600"}`} viewBox="0 0 24 24" fill="none">
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          tabIndex={-1}
          className={`absolute z-50 mt-1 w-full rounded-md shadow-lg ${
            isDtao ? "bg-black/80 border border-violet-800 text-slate-100" : "bg-white border"
          }`}
          style={{ maxHeight: `${5 * 40}px`, overflowY: "auto" }}
        >
          {normalized.map((opt) => (
            <div
              key={opt.value}
              role="option"
              aria-selected={String(opt.value) === String(value)}
              data-val={opt.value}
              tabIndex={0}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onChange(opt.value);
                  setOpen(false);
                }
                if (e.key === "Escape") setOpen(false);
              }}
              className={`px-3 py-2 cursor-pointer hover:${
                isDtao ? "bg-violet-900/60" : "bg-gray-100"
              } ${String(opt.value) === String(value) ? (isDtao ? "bg-violet-900/70 font-medium" : "bg-blue-50 font-medium") : ""}`}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Page component ---------- */
const AllDepartmentsPage = () => {
  const { notify } = useNotification();
  const { theme } = useTheme() || {};
  const isDtao = theme === "dtao";

  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [searchDept, setSearchDept] = useState("");
  const [searchEmail, setSearchEmail] = useState("");
  const [loading, setLoading] = useState(false);

  // edit modal state
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "DEPARTMENT",
    department: "",
    phone: "",
    password: "",
  });

  // reset-password modal state
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetUser, setResetUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetSubmitting, setResetSubmitting] = useState(false);

  const navigate = useNavigate();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/users");
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching users:", err);
      if (err?.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/", { replace: true });
        return;
      }
      notify("Failed to load users", "error", 3000);
    } finally {
      setLoading(false);
    }
  }, [navigate, notify]);

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await api.get("/departments");
      const arr = Array.isArray(res.data) ? res.data : [];
      setDepartments(arr.map((d) => (typeof d === "string" ? d : d.name || "")).filter(Boolean));
    } catch (err) {
      console.warn("Departments endpoint failed:", err);
      setDepartments(fallbackDepts);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchDepartments();
  }, [fetchUsers, fetchDepartments]);

  // lock body scroll when a modal is open; restore on close/unmount
  useEffect(() => {
    const locked = !!editingUser || resetModalOpen;
    const prev = document.body.style.overflow;
    if (locked) document.body.style.overflow = "hidden";
    else document.body.style.overflow = prev || "";
    return () => {
      document.body.style.overflow = prev || "";
    };
  }, [editingUser, resetModalOpen]);

  const filteredUsers = users.filter((u) => {
    const matchDept = searchDept
      ? (u.department || "").toLowerCase().includes(searchDept.toLowerCase())
      : true;
    const matchEmail = searchEmail
      ? (u.email || "").toLowerCase().includes(searchEmail.toLowerCase())
      : true;
    return matchDept && matchEmail;
  });

  const startEdit = (u) => {
    setEditingUser(u);
    setForm({
      name: u.name || "",
      email: u.email || "",
      role: (u.role || "DEPARTMENT").toUpperCase(),
      department: u.department || departments[0] || "",
      phone: u.phone || "",
      password: "",
    });

    // ensure modal is visible on small screens
    window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50);
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setForm({
      name: "",
      email: "",
      role: "DEPARTMENT",
      department: "",
      phone: "",
      password: "",
    });
  };

  const saveEdit = async () => {
    if (!editingUser) return;
    const id = editingUser.id || editingUser._id;

    try {
      const payload = {
        name: form.name,
        email: form.email,
        role: form.role,
        department: form.department,
        phone: form.phone,
      };
      if (form.password?.trim()) payload.password = form.password;

      const res = await api.put(`/users/${id}`, payload);

      const updatedUser =
        res.data && typeof res.data === "object"
          ? res.data
          : { ...editingUser, ...payload };

      setUsers((prev) =>
        prev.map((u) => ((u.id === id || u._id === id) ? { ...u, ...updatedUser } : u))
      );

      notify("User updated", "success", 2000);
      cancelEdit();
    } catch (err) {
      console.error("Update error:", err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        (typeof err?.response?.data === "string" ? err.response.data : null) ||
        "Failed to update user";
      notify(String(msg), "error", 3500);
    }
  };

  const handleDelete = async (u) => {
    const id = u.id || u._id;
    if (!window.confirm(`Delete user ${u.email}?`)) return;
    try {
      await api.delete(`/users/${id}`);
      setUsers((prev) => prev.filter((x) => (x.id || x._id) !== id));
      notify("User deleted", "success", 2000);
      if (editingUser && (editingUser.id || editingUser._id) === id) cancelEdit();
    } catch (err) {
      console.error("Delete error:", err);
      notify("Failed to delete user", "error", 3000);
    }
  };

  // Reset password flow
  const openResetModal = (u) => {
    setResetUser(u);
    setNewPassword("");
    setResetModalOpen(true);
    window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50);
  };

  const resetPassword = async () => {
    if (!resetUser) return;
    const id = resetUser.id || resetUser._id;
    if (!newPassword || newPassword.trim().length < MIN_PASSWORD_LENGTH) {
      notify(`New password must be at least ${MIN_PASSWORD_LENGTH} characters`, "warn", 3000);
      return;
    }
    setResetSubmitting(true);
    try {
      await api.put(`/users/${id}`, { password: newPassword });
      setUsers((prev) => prev.map((u) => ((u.id || u._id) === id ? { ...u } : u)));
      notify("Password updated", "success", 2000);
      setResetModalOpen(false);
      setResetUser(null);
      setNewPassword("");
    } catch (err) {
      console.error("Reset password error:", err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Failed to reset password";
      notify(String(msg), "error", 3500);
    } finally {
      setResetSubmitting(false);
    }
  };

  // styles helper
  const containerBg = isDtao ? "bg-[#08050b] text-slate-100" : "bg-gray-50 text-slate-900";
  const cardBg = isDtao ? "bg-black/40 border border-violet-900" : "bg-white border border-gray-200";
  const inputLight = "border border-gray-200 bg-white text-gray-800";
  const inputDark = "border border-violet-700 bg-transparent text-slate-100";

  return (
    <div className={`min-h-screen py-8 ${containerBg}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className={`text-2xl font-semibold ${isDtao ? "text-slate-100" : "text-gray-800"}`}>All Departments & Users</h2>
            <p className={`${isDtao ? "text-slate-300" : "text-sm text-gray-500"} mt-1`}>Manage users, reset passwords, edit user details or delete accounts.</p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <input
              type="text"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              placeholder="Search by email..."
              aria-label="Search by email"
              className={`w-full sm:w-64 px-3 py-2 rounded-md focus:outline-none focus:ring-2 ${isDtao ? inputDark + " focus:ring-violet-700" : inputLight + " focus:ring-blue-300"}`}
            />
            <input
              type="text"
              value={searchDept}
              onChange={(e) => setSearchDept(e.target.value)}
              placeholder="Filter department..."
              aria-label="Filter department"
              className={`w-full sm:w-56 px-3 py-2 rounded-md focus:outline-none focus:ring-2 ${isDtao ? inputDark + " focus:ring-violet-700" : inputLight + " focus:ring-blue-300"}`}
            />
            <button
              onClick={fetchUsers}
              disabled={loading}
              className={`px-3 py-2 rounded-md ${isDtao ? "bg-violet-600 hover:bg-violet-700 text-white" : "bg-blue-600 text-white hover:bg-blue-700"} disabled:opacity-60`}
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
            <button
              onClick={() => { setSearchDept(""); setSearchEmail(""); }}
              className={`px-3 py-2 rounded-md ${isDtao ? "border border-violet-700 bg-transparent text-slate-100 hover:bg-black/20" : "border border-gray-200 bg-white hover:bg-gray-50"}`}
            >
              Reset
            </button>
          </div>
        </div>

        {/* Table */}
        <div className={`${cardBg} rounded-lg shadow overflow-hidden`}>
          <div className="w-full overflow-x-auto">
            <table className={`min-w-full divide-y ${isDtao ? "divide-violet-800" : "divide-gray-200"}`}>
              <thead className={`${isDtao ? "bg-transparent" : "bg-gray-50"}`}>
                <tr>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDtao ? "text-slate-300" : "text-gray-500"}`}>Name</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDtao ? "text-slate-300" : "text-gray-500"}`}>Email</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDtao ? "text-slate-300" : "text-gray-500"}`}>Department</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDtao ? "text-slate-300" : "text-gray-500"}`}>Role</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDtao ? "text-slate-300" : "text-gray-500"}`}>Phone</th>
                  <th className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${isDtao ? "text-slate-300" : "text-gray-500"}`}>Actions</th>
                </tr>
              </thead>

              <tbody className={`${isDtao ? "bg-black/40" : "bg-white"} divide-y ${isDtao ? "divide-violet-800" : "divide-gray-200"}`}>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className={`px-6 py-8 text-center ${isDtao ? "text-slate-300" : "text-gray-500"}`}>No users</td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id || u._id}>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDtao ? "text-slate-100" : "text-gray-900"}`}>{u.name}</td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDtao ? "text-slate-300" : "text-gray-700"}`}>{u.email}</td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDtao ? "text-slate-300" : "text-gray-700"}`}>{u.department || "—"}</td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDtao ? "text-slate-300" : "text-gray-700"}`}>{(u.role || "DEPARTMENT").toUpperCase()}</td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDtao ? "text-slate-300" : "text-gray-700"}`}>{u.phone || "—"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button
                          onClick={() => startEdit(u)}
                          className="px-2 py-1 rounded-md hover:opacity-90"
                          style={isDtao ? { background: "rgba(250,204,21,0.08)", color: "#eab308" } : { background: "#fffbeb", color: "#92400e" }}
                          title={`Edit ${u.email}`}
                          aria-label={`Edit ${u.email}`}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(u)}
                          className="px-2 py-1 rounded-md hover:opacity-90"
                          style={isDtao ? { background: "rgba(239,68,68,0.08)", color: "#fb7185" } : { background: "#fff1f2", color: "#9f1239" }}
                          title={`Delete ${u.email}`}
                          aria-label={`Delete ${u.email}`}
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => openResetModal(u)}
                          className="px-2 py-1 rounded-md hover:opacity-90"
                          style={isDtao ? { background: "rgba(99,102,241,0.08)", color: "#93c5fd" } : { background: "#eef2ff", color: "#3730a3" }}
                          title={`Reset password for ${u.email}`}
                          aria-label={`Reset password for ${u.email}`}
                        >
                          Reset
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile list */}
        <div className="md:hidden">
          <div className={`${cardBg} rounded-lg shadow overflow-hidden divide-y ${isDtao ? "divide-violet-800" : "divide-gray-200"}`}>
            {filteredUsers.length === 0 ? (
              <div className={`p-6 text-center ${isDtao ? "text-slate-300" : "text-gray-500"}`}>No users</div>
            ) : (
              filteredUsers.map((u) => (
                <div key={u.id || u._id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className={`text-base font-semibold truncate ${isDtao ? "text-slate-100" : "text-gray-900"}`}>{u.name}</div>
                      <div className={`text-sm truncate ${isDtao ? "text-slate-300" : "text-gray-600"}`}>{u.email}</div>
                      <div className={`text-xs mt-1 ${isDtao ? "text-slate-400" : "text-gray-500"}`}>{u.department || "—"} • {(u.role || "DEPARTMENT").toUpperCase()}</div>
                      <div className={`text-sm mt-1 ${isDtao ? "text-slate-300" : "text-gray-600"}`}>📞 {u.phone || "—"}</div>
                    </div>

                    <div className="flex-shrink-0 flex flex-col items-end gap-2">
                      <button onClick={() => startEdit(u)} className="px-3 py-1 rounded-md text-xs" style={isDtao ? { background: "rgba(250,204,21,0.08)", color: "#eab308" } : { background: "#fffbeb", color: "#92400e" }}>Edit</button>
                      <button onClick={() => handleDelete(u)} className="px-3 py-1 rounded-md text-xs" style={isDtao ? { background: "rgba(239,68,68,0.08)", color: "#fb7185" } : { background: "#fff1f2", color: "#9f1239" }}>Delete</button>
                      <button onClick={() => openResetModal(u)} className="px-3 py-1 rounded-md text-xs" style={isDtao ? { background: "rgba(99,102,241,0.08)", color: "#93c5fd" } : { background: "#eef2ff", color: "#3730a3" }}>Reset</button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Edit Modal */}
        {editingUser && (
          <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={cancelEdit} aria-hidden />
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Edit user"
              className={`relative rounded-lg max-w-xl w-full mx-auto z-50 p-5 sm:p-6 max-h-[90vh] overflow-auto transition-transform duration-200 transform ${isDtao ? "bg-black/40 border border-violet-900 text-slate-100" : "bg-white border border-gray-200 text-slate-900"}`}
              style={{ willChange: "transform, opacity" }}
            >
              <div className="flex items-start justify-between">
                <h3 className={`text-lg font-semibold ${isDtao ? "text-slate-100" : "text-gray-800"}`}>Edit User</h3>
                <button onClick={cancelEdit} className={`${isDtao ? "text-slate-300 hover:text-slate-100" : "text-gray-400 hover:text-gray-600"}`}>Close</button>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  placeholder="Name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={`w-full px-3 py-2 rounded-md ${isDtao ? inputDark : inputLight}`}
                />
                <input
                  placeholder="Email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={`w-full px-3 py-2 rounded-md ${isDtao ? inputDark : inputLight}`}
                />

                {/* role dropdown (custom) */}
                <Dropdown
                  options={["ADMIN", "DEPARTMENT"]}
                  value={form.role}
                  onChange={(v) => setForm({ ...form, role: v })}
                  placeholder="Select role"
                />

                {/* department dropdown only when role is DEPARTMENT */}
                {form.role === "DEPARTMENT" && (
                  <Dropdown
                    options={departments}
                    value={form.department}
                    onChange={(v) => setForm({ ...form, department: v })}
                    placeholder="Select department"
                  />
                )}

                <input
                  placeholder="Phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className={`w-full px-3 py-2 rounded-md ${isDtao ? inputDark : inputLight}`}
                />
                <input
                  placeholder="New Password (leave empty to keep)"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className={`w-full px-3 py-2 rounded-md ${isDtao ? inputDark : inputLight}`}
                />
              </div>

              <div className="mt-4 flex justify-end gap-3">
                <button onClick={cancelEdit} className={`px-4 py-2 rounded-md ${isDtao ? "border border-violet-700 bg-transparent text-slate-100 hover:bg-black/20" : "border border-gray-200 bg-white hover:bg-gray-50"}`}>Cancel</button>
                <button onClick={saveEdit} className={`px-4 py-2 rounded-md ${isDtao ? "bg-violet-600 hover:bg-violet-700 text-white" : "bg-blue-600 text-white hover:bg-blue-700"}`}>Save</button>
              </div>
            </div>
          </div>
        )}

        {/* Reset Password Modal */}
        {resetModalOpen && resetUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={() => { setResetModalOpen(false); setResetUser(null); }} aria-hidden />
            <div className={`relative rounded-lg max-w-md w-full mx-auto z-50 p-6 max-h-[90vh] overflow-auto transition-transform duration-200 transform ${isDtao ? "bg-black/40 border border-violet-900 text-slate-100" : "bg-white border border-gray-200 text-slate-900"}`} style={{ willChange: "transform, opacity" }}>
              <h3 className={`text-lg font-semibold ${isDtao ? "text-slate-100" : "text-gray-800"}`}>Reset Password for {resetUser.email}</h3>
              <p className={`${isDtao ? "text-slate-300" : "text-sm text-gray-500"} mt-1`}>Enter a new password. Current password is not shown for security.</p>

              <div className="mt-4">
                <label className={`block text-sm ${isDtao ? "text-slate-200" : "text-gray-700"}`}>New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className={`mt-2 w-full px-3 py-2 rounded-md ${isDtao ? inputDark : inputLight}`}
                />
              </div>

              <div className="mt-4 flex justify-end gap-3">
                <button
                  className={`px-4 py-2 rounded-md ${isDtao ? "border border-violet-700 bg-transparent text-slate-100 hover:bg-black/20" : "border border-gray-200 bg-white hover:bg-gray-50"}`}
                  onClick={() => { setResetModalOpen(false); setResetUser(null); setNewPassword(""); }}
                  disabled={resetSubmitting}
                >
                  Cancel
                </button>
                <button
                  className={`px-4 py-2 rounded-md ${isDtao ? "bg-violet-600 hover:bg-violet-700 text-white" : "bg-blue-600 text-white hover:bg-blue-700"}`}
                  onClick={resetPassword}
                  disabled={resetSubmitting}
                >
                  {resetSubmitting ? "Saving..." : "Save New Password"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AllDepartmentsPage;
