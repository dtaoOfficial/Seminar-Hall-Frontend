// src/pages/Admin/ManageDepartmentsPage.jsx
import React, { useEffect, useState, useCallback, useRef } from "react";
import api from "../../utils/api";
import { useNotification } from "../../components/NotificationsProvider";
import { useTheme } from "../../contexts/ThemeContext";

const ManageDepartmentsPage = ({ fetchDepartmentsProp }) => {
  const { notify } = useNotification();
  const { theme } = useTheme() || {};
  const isDtao = theme === "dtao";

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

  // refs for smooth scrolling / focus
  const mainRef = useRef(null);
  const modalInputRef = useRef(null);

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

  // helper to extract server error message
  const errMsg = (err) => {
    return (
      err?.response?.data?.message ||
      (typeof err?.response?.data === "string" ? err.response.data : null) ||
      err?.response?.statusText ||
      err?.message ||
      "Unknown error"
    );
  };

  // fetch list
  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/departments");
      const arr = Array.isArray(res.data)
        ? res.data.map((d) => (typeof d === "string" ? { name: d, id: d } : d))
        : [];
      setDepartments(arr);
      // smooth scroll main into view so user sees updated list
      if (mainRef.current && mainRef.current.scrollIntoView) {
        try {
          mainRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        } catch (e) {
          // ignore
        }
      }
    } catch (err) {
      console.error("Error fetching departments:", err);
      notify(`Failed to fetch departments: ${errMsg(err)}`, "error", 3000);
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  // ADD
  const handleAdd = async (e) => {
    e?.preventDefault();
    const name = (newName || "").trim();
    if (!name) {
      notify("Please enter a department name", "warn", 2000);
      return;
    }
    setAdding(true);
    try {
      await api.post("/departments", { name });
      notify("Department added", "success", 2000);
      setNewName("");
      await fetchDepartments();
      if (typeof fetchDepartmentsProp === "function") fetchDepartmentsProp();
    } catch (err) {
      console.error("Add department error:", err);
      notify(errMsg(err) || "Failed to add department", "error", 3500);
    } finally {
      setAdding(false);
    }
  };

  // EDIT open
  const handleEditOpen = (dept) => {
    setEditing(dept);
    setEditName(dept.name || "");
    // allow modal to open then focus input (see effect below)
    setTimeout(() => {
      if (modalInputRef.current) {
        try {
          modalInputRef.current.focus({ preventScroll: true });
          modalInputRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
        } catch (e) {}
      }
    }, 120);
  };

  // EDIT save
  const handleEditSave = async (e) => {
    e?.preventDefault();
    if (!editing) return;
    const name = (editName || "").trim();
    if (!name) {
      notify("Please enter a department name", "warn", 2000);
      return;
    }
    setSavingEdit(true);
    try {
      const id = editing.id ?? editing._id ?? editing.name;
      await api.put(`/departments/${id}`, { name });
      notify("Department updated", "success", 2000);
      setEditing(null);
      setEditName("");
      await fetchDepartments();
      if (typeof fetchDepartmentsProp === "function") fetchDepartmentsProp();
    } catch (err) {
      console.error("Update dept error:", err);
      notify(errMsg(err) || "Failed to update department", "error", 3500);
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
      notify("Department deleted", "success", 2000);
      await fetchDepartments();
      if (typeof fetchDepartmentsProp === "function") fetchDepartmentsProp();
    } catch (err) {
      console.error("Delete dept error:", err);
      notify(errMsg(err) || "Failed to delete department", "error", 3500);
    }
  };

  return (
    <div
      ref={mainRef}
      className={`${isDtao ? "min-h-screen bg-[#08050b] text-slate-100" : "min-h-screen bg-gray-50 text-slate-900"} py-8`}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div>
          <h2 className={`${isDtao ? "text-slate-100" : "text-gray-800"} text-2xl font-semibold`}>Manage Departments / Courses</h2>
          <p className={`${isDtao ? "text-slate-300" : "text-sm text-gray-500"} mt-1`}>Add, edit or remove departments (e.g. MCA, MBA, ME)</p>
        </div>

        {/* Card */}
        <div className={`${isDtao ? "bg-black/40 border border-violet-900" : "bg-white"} rounded-lg shadow overflow-hidden`}>
          <div className={`p-4 md:p-6 space-y-6 ${isDtao ? "text-slate-100" : ""}`}>
            {/* Add form */}
            <form onSubmit={handleAdd} className="flex flex-col md:flex-row md:items-center gap-3">
              <input
                type="text"
                placeholder="Enter department name (e.g. MCA)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                disabled={adding}
                className={`${isDtao ? "flex-1 px-3 py-2 border border-violet-700 bg-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-violet-700" : "flex-1 px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200"}`}
              />
              <button
                type="submit"
                disabled={adding}
                className={`px-4 py-2 ${isDtao ? "bg-violet-600 hover:bg-violet-700 text-white" : "bg-blue-600 text-white hover:bg-blue-700"} rounded-md disabled:opacity-60`}
              >
                {adding ? "Adding…" : "Add Department"}
              </button>
            </form>

            <div className={`${isDtao ? "border-t border-violet-800" : "border-t border-gray-100"}`} />

            {/* List */}
            {loading ? (
              <div className={`${isDtao ? "py-8 text-center text-slate-300" : "py-8 text-center text-gray-500"}`}>Loading departments…</div>
            ) : departments.length === 0 ? (
              <div className={`${isDtao ? "py-8 text-center text-slate-300" : "py-8 text-center text-gray-500"}`}>No departments found.</div>
            ) : (
              <>
                {showTable && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm divide-y" style={{ borderCollapse: "collapse" }}>
                      <thead className={`${isDtao ? "bg-black/30" : "bg-gray-50"}`}>
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider w-12">#</th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Name</th>
                          <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider w-40">Actions</th>
                        </tr>
                      </thead>
                      <tbody className={`${isDtao ? "bg-black/20 divide-y divide-violet-800" : "bg-white divide-y divide-gray-100"}`}>
                        {departments.map((d, idx) => (
                          <tr key={d.id ?? d._id ?? d.name ?? idx}>
                            <td className={`${isDtao ? "px-4 py-3 text-sm text-slate-300" : "px-4 py-3 text-sm text-gray-600"}`}>{idx + 1}</td>
                            <td className={`${isDtao ? "px-4 py-3 text-sm text-slate-100" : "px-4 py-3 text-sm text-gray-800"}`}>{d.name}</td>
                            <td className="px-4 py-3 text-sm text-right">
                              <div className="inline-flex gap-2">
                                <button
                                  onClick={() => handleEditOpen(d)}
                                  className={`${isDtao ? "px-3 py-1.5 bg-yellow-900/10 text-yellow-300 rounded-md hover:bg-yellow-900/15" : "px-3 py-1.5 bg-yellow-50 text-yellow-800 rounded-md hover:bg-yellow-100"} text-sm`}
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDelete(d)}
                                  className={`${isDtao ? "px-3 py-1.5 bg-rose-900/10 text-rose-300 rounded-md hover:bg-rose-900/15" : "px-3 py-1.5 bg-rose-50 text-rose-700 rounded-md hover:bg-rose-100"} text-sm`}
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
                          <div className={`${isDtao ? "text-sm font-medium text-slate-100" : "text-sm font-medium text-gray-800"}`}>{d.name}</div>
                          <div className={`${isDtao ? "text-xs text-slate-400 mt-1" : "text-xs text-gray-500 mt-1"}`}>#{idx + 1}</div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditOpen(d)}
                            className={`${isDtao ? "px-3 py-1.5 bg-yellow-900/10 text-yellow-300 rounded-md text-xs" : "px-3 py-1.5 bg-yellow-50 text-yellow-800 rounded-md text-xs"}`}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(d)}
                            className={`${isDtao ? "px-3 py-1.5 bg-rose-900/10 text-rose-300 rounded-md text-xs" : "px-3 py-1.5 bg-rose-50 text-rose-700 rounded-md text-xs"}`}
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
          <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => {
                if (!savingEdit) handleEditCancel();
              }}
            />
            <div className={`${isDtao ? "bg-black/80 border border-violet-900 text-slate-100" : "bg-white"} rounded-lg shadow-lg w-full max-w-md p-6 z-10`}>
              <h3 className={`${isDtao ? "text-slate-100" : "text-gray-800"} text-lg font-semibold mb-4`}>Edit Department</h3>
              <form onSubmit={handleEditSave} className="space-y-4">
                <input
                  ref={modalInputRef}
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  disabled={savingEdit}
                  className={`${isDtao ? "w-full px-3 py-2 border border-violet-700 bg-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-violet-700" : "w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200"}`}
                />
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleEditCancel}
                    className={`${isDtao ? "px-4 py-2 rounded-md border border-violet-700 bg-transparent text-slate-200" : "px-4 py-2 rounded-md border border-gray-200 bg-white"}`}
                    disabled={savingEdit}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`${isDtao ? "px-4 py-2 rounded-md bg-emerald-600 text-white" : "px-4 py-2 rounded-md bg-blue-600 text-white"}`}
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
    </div>
  );
};

export default ManageDepartmentsPage;
