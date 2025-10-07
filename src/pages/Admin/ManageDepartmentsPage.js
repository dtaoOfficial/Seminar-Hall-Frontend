// src/pages/Admin/ManageDepartmentsPage.jsx
import React, { useEffect, useState, useCallback } from "react";
import api from "../../utils/api";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const ManageDepartmentsPage = ({ fetchDepartmentsProp }) => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // add form
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  // edit state
  const [editing, setEditing] = useState(null);
  const [editName, setEditName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // show table/cards depending on screen size
  const [showTable, setShowTable] = useState(true);
  const [showCards, setShowCards] = useState(false);

  // toggle table/cards on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setShowTable(false);
        setShowCards(true);
      } else {
        setShowTable(true);
        setShowCards(false);
      }
    };
    handleResize(); // run once
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // fetch list
  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/departments");
      const arr = Array.isArray(res.data)
        ? res.data.map((d) => (typeof d === "string" ? { name: d, id: d } : d))
        : [];
      setDepartments(arr);
    } catch (err) {
      console.error("Error fetching departments:", err);
      const msg =
        err?.response?.data?.message ||
        (typeof err?.response?.data === "string" ? err.response.data : null) ||
        err?.response?.statusText ||
        err?.message;
      toast.error("⚠️ Failed to fetch departments" + (msg ? `: ${msg}` : ""));
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  // ADD
  const handleAdd = async (e) => {
    e?.preventDefault();
    const name = (newName || "").trim();
    if (!name) {
      toast.warn("Please enter a department name");
      return;
    }
    setAdding(true);
    try {
      await api.post("/departments", { name });
      toast.success("✅ Department added");
      setNewName("");
      await fetchDepartments();
      if (typeof fetchDepartmentsProp === "function") fetchDepartmentsProp();
    } catch (err) {
      console.error("Add department error:", err);
      const serverMsg =
        err?.response?.data?.message ||
        (typeof err?.response?.data === "string" ? err.response.data : null) ||
        err?.response?.statusText ||
        err?.message;
      toast.error(`⚠️ ${serverMsg || "Failed to add department"}`);
    } finally {
      setAdding(false);
    }
  };

  // EDIT open
  const handleEditOpen = (dept) => {
    setEditing(dept);
    setEditName(dept.name || "");
  };

  // EDIT save
  const handleEditSave = async (e) => {
    e?.preventDefault();
    if (!editing) return;
    const name = (editName || "").trim();
    if (!name) {
      toast.warn("Please enter a department name");
      return;
    }
    setSavingEdit(true);
    try {
      const id = editing.id ?? editing._id ?? editing.name;
      await api.put(`/departments/${id}`, { name });
      toast.success("✅ Department updated");
      setEditing(null);
      setEditName("");
      await fetchDepartments();
      if (typeof fetchDepartmentsProp === "function") fetchDepartmentsProp();
    } catch (err) {
      console.error("Update dept error:", err);
      const serverMsg =
        err?.response?.data?.message ||
        (typeof err?.response?.data === "string" ? err.response.data : null) ||
        err?.response?.statusText ||
        err?.message;
      toast.error(`⚠️ ${serverMsg || "Failed to update department"}`);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleEditCancel = () => {
    setEditing(null);
    setEditName("");
  };

  // DELETE
  const handleDelete = async (dept) => {
    if (!window.confirm(`Delete department "${dept.name}"? This cannot be undone.`)) return;
    try {
      const id = dept.id ?? dept._id ?? dept.name;
      await api.delete(`/departments/${id}`);
      toast.success("🗑️ Department deleted");
      await fetchDepartments();
      if (typeof fetchDepartmentsProp === "function") fetchDepartmentsProp();
    } catch (err) {
      console.error("Delete dept error:", err);
      const serverMsg =
        err?.response?.data?.message ||
        (typeof err?.response?.data === "string" ? err.response.data : null) ||
        err?.response?.statusText ||
        err?.message;
      toast.error(`⚠️ ${serverMsg || "Failed to delete department"}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">Manage Departments / Courses</h2>
          <p className="text-sm text-gray-500 mt-1">Add, edit or remove departments (e.g. MCA, MBA, ME)</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
          <div className="p-4 md:p-6 space-y-6">
            {/* Add form */}
            <form
              onSubmit={handleAdd}
              className="flex flex-col md:flex-row md:items-center gap-3"
            >
              <input
                type="text"
                placeholder="Enter department name (e.g. MCA)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                disabled={adding}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              <button
                type="submit"
                disabled={adding}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-60"
              >
                {adding ? "Adding…" : "Add Department"}
              </button>
            </form>

            <div className="border-t border-gray-100" />

            {/* List */}
            {loading ? (
              <div className="py-8 text-center text-gray-500">Loading departments…</div>
            ) : departments.length === 0 ? (
              <div className="py-8 text-center text-gray-500">No departments found.</div>
            ) : (
              <>
                {showTable && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">#</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-40">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {departments.map((d, idx) => (
                          <tr key={d.id ?? d._id ?? d.name ?? idx}>
                            <td className="px-4 py-3 text-sm text-gray-600">{idx + 1}</td>
                            <td className="px-4 py-3 text-sm text-gray-800">{d.name}</td>
                            <td className="px-4 py-3 text-sm text-right">
                              <div className="inline-flex gap-2">
                                <button
                                  onClick={() => handleEditOpen(d)}
                                  className="px-3 py-1.5 bg-yellow-50 text-yellow-800 rounded-md hover:bg-yellow-100 text-sm"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDelete(d)}
                                  className="px-3 py-1.5 bg-rose-50 text-rose-700 rounded-md hover:bg-rose-100 text-sm"
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

                {showCards && (
                  <div className="divide-y divide-gray-100">
                    {departments.map((d, idx) => (
                      <div key={d.id ?? d._id ?? d.name ?? idx} className="p-4 flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-gray-800">{d.name}</div>
                          <div className="text-xs text-gray-500 mt-1">#{idx + 1}</div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditOpen(d)}
                            className="px-3 py-1.5 bg-yellow-50 text-yellow-800 rounded-md text-xs"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(d)}
                            className="px-3 py-1.5 bg-rose-50 text-rose-700 rounded-md text-xs"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Edit Modal */}
        {editing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Edit Department</h3>
              <form onSubmit={handleEditSave} className="space-y-4">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  disabled={savingEdit}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleEditCancel}
                    className="px-4 py-2 rounded-md border border-gray-200 bg-white"
                    disabled={savingEdit}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-md bg-blue-600 text-white"
                    disabled={savingEdit}
                  >
                    {savingEdit ? "Saving…" : "Save"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};

export default ManageDepartmentsPage;
