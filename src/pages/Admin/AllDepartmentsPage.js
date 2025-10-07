// src/pages/AllDepartmentsPage.js
import React, { useState, useEffect, useCallback } from "react";
import api from "../../utils/api";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const MIN_PASSWORD_LENGTH = 6;

const AllDepartmentsPage = () => {
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
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await api.get("/departments");
      const arr = Array.isArray(res.data) ? res.data : [];
      setDepartments(arr.map((d) => (typeof d === "string" ? d : d.name || "")).filter(Boolean));
    } catch (err) {
      console.warn("Departments endpoint failed:", err);
      setDepartments([
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
      ]);
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

      toast.success("User updated");
      cancelEdit();
    } catch (err) {
      console.error("Update error:", err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        (typeof err?.response?.data === "string" ? err.response.data : null) ||
        "Failed to update user";
      toast.error(String(msg));
    }
  };

  const handleDelete = async (u) => {
    const id = u.id || u._id;
    if (!window.confirm(`Delete user ${u.email}?`)) return;
    try {
      await api.delete(`/users/${id}`);
      setUsers((prev) => prev.filter((x) => (x.id || x._id) !== id));
      toast.success("User deleted");
      if (editingUser && (editingUser.id || editingUser._id) === id) cancelEdit();
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Failed to delete user");
    }
  };

  // Reset password flow
  const openResetModal = (u) => {
    setResetUser(u);
    setNewPassword("");
    setResetModalOpen(true);
    // ensure modal visible on small screens
    window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50);
  };

  const resetPassword = async () => {
    if (!resetUser) return;
    const id = resetUser.id || resetUser._id;
    if (!newPassword || newPassword.trim().length < MIN_PASSWORD_LENGTH) {
      toast.warn(`New password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }
    setResetSubmitting(true);
    try {
      await api.put(`/users/${id}`, { password: newPassword });
      // keep user object safe (don't set password)
      setUsers((prev) => prev.map((u) => ((u.id || u._id) === id ? { ...u } : u)));
      toast.success("Password updated");
      setResetModalOpen(false);
      setResetUser(null);
      setNewPassword("");
    } catch (err) {
      console.error("Reset password error:", err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Failed to reset password";
      toast.error(String(msg));
    } finally {
      setResetSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-gray-800">All Departments & Users</h2>
            <p className="text-sm text-gray-500 mt-1">Manage users, reset passwords, edit user details or delete accounts.</p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <input
              type="text"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              placeholder="Search by email..."
              aria-label="Search by email"
              className="w-full sm:w-64 px-3 py-2 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <input
              type="text"
              value={searchDept}
              onChange={(e) => setSearchDept(e.target.value)}
              placeholder="Filter department..."
              aria-label="Filter department"
              className="w-full sm:w-56 px-3 py-2 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <button
              onClick={fetchUsers}
              disabled={loading}
              className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
            <button
              onClick={() => { setSearchDept(""); setSearchEmail(""); }}
              className="px-3 py-2 border border-gray-200 rounded-md bg-white hover:bg-gray-50"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Table: always render (desktop & mobile). On small screens it becomes horizontally scrollable */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="w-full overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>

              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No users</td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id || u._id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{u.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{u.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{u.department || "—"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{(u.role || "DEPARTMENT").toUpperCase()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{u.phone || "—"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button
                          onClick={() => startEdit(u)}
                          className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-md hover:bg-yellow-200"
                          title={`Edit ${u.email}`}
                          aria-label={`Edit ${u.email}`}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(u)}
                          className="px-2 py-1 bg-red-100 text-red-800 rounded-md hover:bg-red-200"
                          title={`Delete ${u.email}`}
                          aria-label={`Delete ${u.email}`}
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => openResetModal(u)}
                          className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded-md hover:bg-indigo-200"
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

        {/* Compact mobile card list below the table for small screens only */}
        <div className="md:hidden">
          <div className="divide-y divide-gray-200 bg-white rounded-lg shadow overflow-hidden">
            {filteredUsers.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No users</div>
            ) : (
              filteredUsers.map((u) => (
                <div key={u.id || u._id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-base font-semibold text-gray-900 truncate">{u.name}</div>
                      <div className="text-sm text-gray-600 truncate">{u.email}</div>
                      <div className="text-xs text-gray-500 mt-1">{u.department || "—"} • {(u.role || "DEPARTMENT").toUpperCase()}</div>
                      <div className="text-sm text-gray-600 mt-1">📞 {u.phone || "—"}</div>
                    </div>

                    <div className="flex-shrink-0 flex flex-col items-end gap-2">
                      <button
                        onClick={() => startEdit(u)}
                        className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-md text-xs"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(u)}
                        className="px-3 py-1 bg-red-100 text-red-800 rounded-md text-xs"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => openResetModal(u)}
                        className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-md text-xs"
                      >
                        Reset
                      </button>
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
              className="relative bg-white rounded-lg shadow-lg max-w-xl w-full mx-auto z-50 p-5 sm:p-6 max-h-[90vh] overflow-auto"
            >
              <div className="flex items-start justify-between">
                <h3 className="text-lg font-semibold text-gray-800">Edit User</h3>
                <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600">Close</button>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  placeholder="Name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md"
                />
                <input
                  placeholder="Email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md"
                />
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md"
                >
                  <option value="ADMIN">ADMIN</option>
                  <option value="DEPARTMENT">DEPARTMENT</option>
                </select>

                {form.role === "DEPARTMENT" && (
                  <select
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md"
                  >
                    {departments.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                )}

                <input
                  placeholder="Phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md"
                />
                <input
                  placeholder="New Password (leave empty to keep)"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md"
                />
              </div>

              <div className="mt-4 flex justify-end gap-3">
                <button onClick={cancelEdit} className="px-4 py-2 rounded-md border border-gray-200 bg-white">Cancel</button>
                <button onClick={saveEdit} className="px-4 py-2 rounded-md bg-blue-600 text-white">Save</button>
              </div>
            </div>
          </div>
        )}

        {/* Reset Password Modal */}
        {resetModalOpen && resetUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={() => { setResetModalOpen(false); setResetUser(null); }} aria-hidden />
            <div className="relative bg-white rounded-lg shadow-lg max-w-md w-full mx-auto z-50 p-6 max-h-[90vh] overflow-auto">
              <h3 className="text-lg font-semibold text-gray-800">Reset Password for {resetUser.email}</h3>
              <p className="text-sm text-gray-500 mt-1">Enter a new password. Current password is not shown for security.</p>

              <div className="mt-4">
                <label className="block text-sm text-gray-700">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="mt-2 w-full px-3 py-2 border border-gray-200 rounded-md"
                />
              </div>

              <div className="mt-4 flex justify-end gap-3">
                <button
                  className="px-4 py-2 rounded-md border border-gray-200 bg-white"
                  onClick={() => { setResetModalOpen(false); setResetUser(null); setNewPassword(""); }}
                  disabled={resetSubmitting}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 rounded-md bg-blue-600 text-white"
                  onClick={resetPassword}
                  disabled={resetSubmitting}
                >
                  {resetSubmitting ? "Saving..." : "Save New Password"}
                </button>
              </div>
            </div>
          </div>
        )}

        <ToastContainer position="top-right" autoClose={3000} />
      </div>
    </div>
  );
};

export default AllDepartmentsPage;
