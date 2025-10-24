// src/pages/Admin/ManageHallsPage.js
import React, { useEffect, useState, useCallback } from "react";
import api from "../../utils/api";
import { useNotification } from "../../components/NotificationsProvider";
import { useTheme } from "../../contexts/ThemeContext";

const ManageHallsPage = ({ halls = [], fetchHalls }) => {
  const { notify } = useNotification();
  const { theme } = useTheme() || {};
  const isDtao = theme === "dtao";

  const [newHall, setNewHall] = useState("");
  const [newCapacity, setNewCapacity] = useState("");
  const [editingHall, setEditingHall] = useState(null);
  const [editName, setEditName] = useState("");
  const [editCapacity, setEditCapacity] = useState("");
  const [localHalls, setLocalHalls] = useState(halls || []);
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  const [showTable, setShowTable] = useState(true);
  const [showCards, setShowCards] = useState(false);

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
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fetchHallsInternal = useCallback(
    async () => {
      setLoading(true);
      try {
        const res = await api.get("/halls");
        const arr = Array.isArray(res?.data) ? res.data : [];
        setLocalHalls(arr);
        if (typeof fetchHalls === "function") {
          try {
            await fetchHalls();
          } catch {}
        }
        return arr;
      } catch (err) {
        console.error("Error fetching halls:", err);
        const msg =
          err?.response?.data?.message ||
          err?.response?.data ||
          err.message ||
          "Failed to fetch halls";
        notify(`Error fetching halls: ${msg}`, "error", 3500);
        setLocalHalls([]);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [fetchHalls, notify]
  );

  useEffect(() => {
    if (!halls || halls.length === 0) {
      fetchHallsInternal();
    } else {
      setLocalHalls(halls);
    }
  }, [halls, fetchHallsInternal]);

  // Add hall
  const handleAddHall = async (e) => {
    e.preventDefault();
    if (!newHall.trim()) {
      notify("Hall name cannot be empty", "warn", 2000);
      return;
    }
    const capacityNum = Number(newCapacity);
    if (!Number.isInteger(capacityNum) || capacityNum <= 0) {
      notify("Capacity must be a positive integer", "warn", 2000);
      return;
    }
    try {
      await api.post("/halls", { name: newHall.trim(), capacity: capacityNum });
      notify("Hall added successfully", "success", 2000);
      setNewHall("");
      setNewCapacity("");
      await fetchHallsInternal();
    } catch (err) {
      console.error("Error adding hall:", err);
      notify(err?.response?.data?.message || "Failed to add hall", "error", 3500);
    }
  };

  const openEdit = (hall) => {
    setEditingHall(hall.id ?? hall._id);
    setEditName(hall.name || "");
    setEditCapacity(hall.capacity != null ? String(hall.capacity) : "");
  };

  const handleEditHall = async (id) => {
    if (!editName.trim()) {
      notify("Hall name cannot be empty", "warn", 2000);
      return;
    }
    const capacityNum = Number(editCapacity);
    if (!Number.isInteger(capacityNum) || capacityNum <= 0) {
      notify("Capacity must be a positive integer", "warn", 2000);
      return;
    }
    try {
      await api.put(`/halls/${id}`, { name: editName.trim(), capacity: capacityNum });
      notify("Hall updated successfully", "success", 2000);
      setEditingHall(null);
      setEditName("");
      setEditCapacity("");
      await fetchHallsInternal();
    } catch (err) {
      console.error("Error updating hall:", err);
      notify(err?.response?.data?.message || "Failed to update hall", "error", 3500);
    }
  };

  const handleDeleteHall = async (id) => {
    if (!window.confirm("Are you sure you want to delete this hall?")) return;
    try {
      await api.delete(`/halls/${id}`);
      notify("Hall deleted successfully", "success", 2000);
      await fetchHallsInternal();
    } catch (err) {
      console.error("Error deleting hall:", err);
      notify(err?.response?.data?.message || "Failed to delete hall", "error", 3500);
    }
  };

  const effectiveHalls = Array.isArray(halls) && halls.length > 0 ? halls : localHalls;

  useEffect(() => {
    const anyOpen = !!editingHall || !!previewUrl;
    const prev = document.body.style.overflow;
    if (anyOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = prev || "";
    return () => {
      document.body.style.overflow = prev || "";
    };
  }, [editingHall, previewUrl]);

  // theme helpers
  const pageBg = isDtao ? "bg-[#08050b] text-slate-100" : "bg-gray-50 text-slate-900";
  const cardBg = isDtao ? "bg-black/40 border border-violet-900" : "bg-white";
  const inputBase = `px-3 py-2 rounded-md focus:outline-none`;
  const inputLight = `border border-gray-200 bg-white text-slate-900 focus:ring-2 focus:ring-blue-200`;
  const inputDark = `border border-violet-700 bg-transparent text-slate-100 focus:ring-2 focus:ring-violet-700`;
  const buttonPrimary = isDtao ? "bg-violet-600 hover:bg-violet-500 text-white" : "bg-blue-600 hover:bg-blue-700 text-white";
  const buttonMuted = isDtao ? "border border-violet-700 bg-transparent text-slate-100 hover:bg-black/20" : "border border-gray-200 bg-white hover:bg-gray-50 text-slate-900";

  return (
    <div className={`min-h-screen py-8 ${pageBg}`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className={`text-2xl font-semibold ${isDtao ? "text-slate-100" : "text-gray-800"}`}>Manage Seminar Halls</h2>
          <button
            className={`px-4 py-2 rounded-md transition ${buttonMuted}`}
            onClick={fetchHallsInternal}
          >
            Refresh
          </button>
        </div>

        {/* Add hall form */}
        <form onSubmit={handleAddHall} className="flex flex-col sm:flex-row gap-3 items-center">
          <input
            type="text"
            placeholder="Enter new hall name"
            value={newHall}
            onChange={(e) => setNewHall(e.target.value)}
            className={`flex-1 ${inputBase} ${isDtao ? inputDark : inputLight}`}
          />
          <input
            type="number"
            min="1"
            placeholder="Capacity"
            value={newCapacity}
            onChange={(e) => setNewCapacity(e.target.value)}
            className={`w-32 ${inputBase} ${isDtao ? inputDark : inputLight}`}
          />
          <button type="submit" className={`px-4 py-2 rounded-md ${buttonPrimary}`}>
            Add Hall
          </button>
        </form>

        {loading && <p className={`${isDtao ? "text-slate-300" : "text-center text-gray-500"}`}>Loading halls...</p>}

        {!loading && effectiveHalls.length === 0 && (
          <p className={`${isDtao ? "text-slate-300" : "text-center text-gray-500"}`}>No halls available.</p>
        )}

        {/* Table View */}
        {showTable && effectiveHalls.length > 0 && (
          <div className={`overflow-x-auto ${cardBg} rounded-lg shadow transition-all duration-200`}>
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className={`${isDtao ? "bg-transparent" : "bg-gray-50"}`}>
                <tr>
                  <th className={`px-4 py-3 text-left font-medium uppercase tracking-wider ${isDtao ? "text-slate-300" : "text-gray-500"}`}>Hall</th>
                  <th className={`px-4 py-3 text-left font-medium uppercase tracking-wider ${isDtao ? "text-slate-300" : "text-gray-500"}`}>Capacity</th>
                  <th className={`px-4 py-3 text-right font-medium uppercase tracking-wider ${isDtao ? "text-slate-300" : "text-gray-500"}`}>Actions</th>
                </tr>
              </thead>
              <tbody className={`${isDtao ? "bg-black/40 divide-y divide-violet-800" : "bg-white divide-y divide-gray-100"}`}>
                {effectiveHalls.map((hall) => (
                  <tr key={hall.id ?? hall._id} className={`${isDtao ? "hover:bg-black/30" : "hover:bg-gray-50"} transition`}>
                    <td className="px-4 py-3">{hall.name}</td>
                    <td className="px-4 py-3">{hall.capacity != null ? hall.capacity : "-"}</td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        className={`px-3 py-1.5 rounded-md ${isDtao ? "bg-amber-600/10 text-amber-300" : "bg-yellow-50 text-yellow-800"} hover:opacity-95`}
                        onClick={() => openEdit(hall)}
                      >
                        Edit
                      </button>
                      <button
                        className={`px-3 py-1.5 rounded-md ${isDtao ? "bg-rose-600/10 text-rose-300" : "bg-rose-50 text-rose-700"} hover:opacity-95`}
                        onClick={() => handleDeleteHall(hall.id ?? hall._id)}
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

        {/* Mobile Cards */}
        {showCards && effectiveHalls.length > 0 && (
          <div className="space-y-4">
            {effectiveHalls.map((hall) => (
              <div key={hall.id ?? hall._id} className={`${cardBg} p-4 rounded-lg shadow space-y-2 transition`}>
                <div className="flex items-center justify-between">
                  <h3 className={`text-lg font-semibold ${isDtao ? "text-slate-100" : "text-gray-900"}`}>{hall.name}</h3>
                  <span className={`${isDtao ? "text-slate-300" : "text-sm text-gray-600"}`}>Capacity: {hall.capacity ?? "-"}</span>
                </div>

                <div className="flex gap-2 overflow-x-auto">
                  {(hall.photos || []).slice(0, 3).map((p, i) => (
                    // clicking opens preview
                    // no extra theme needed for images
                    <img
                      key={i}
                      src={p}
                      alt={`hall-${i}`}
                      className="w-16 h-16 object-cover rounded cursor-pointer hover:opacity-80"
                      onClick={() => setPreviewUrl(p)}
                    />
                  ))}
                </div>

                <div className="flex gap-2">
                  <button
                    className={`px-3 py-1.5 rounded-md text-xs ${isDtao ? "bg-amber-600/10 text-amber-300" : "bg-yellow-50 text-yellow-800"}`}
                    onClick={() => openEdit(hall)}
                  >
                    Edit
                  </button>
                  <button
                    className={`px-3 py-1.5 rounded-md text-xs ${isDtao ? "bg-rose-600/10 text-rose-300" : "bg-rose-50 text-rose-700"}`}
                    onClick={() => handleDeleteHall(hall.id ?? hall._id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit Modal */}
        {editingHall && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className={`${isDtao ? "bg-black/60 border border-violet-900 text-slate-100" : "bg-white"} rounded-lg shadow-lg w-full max-w-md p-6 space-y-4 transition-transform duration-200 transform`}>
              <h3 className={`text-lg font-semibold ${isDtao ? "text-slate-100" : "text-gray-800"}`}>Edit Hall</h3>

              <input
                className={`${inputBase} w-full ${isDtao ? inputDark : inputLight}`}
                placeholder="Hall name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />

              <input
                className={`${inputBase} w-full ${isDtao ? inputDark : inputLight}`}
                placeholder="Capacity"
                type="number"
                min="1"
                value={editCapacity}
                onChange={(e) => setEditCapacity(e.target.value)}
              />

              <div className="flex justify-end gap-3">
                <button
                  className={`px-4 py-2 rounded-md ${isDtao ? "border border-violet-700 bg-transparent text-slate-100 hover:bg-black/20" : "border border-gray-200 bg-white hover:bg-gray-50"}`}
                  onClick={() => { setEditingHall(null); setEditName(""); setEditCapacity(""); }}
                >
                  Cancel
                </button>
                <button
                  className={`px-4 py-2 rounded-md ${buttonPrimary}`}
                  onClick={() => handleEditHall(editingHall)}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Photo Preview Modal */}
        {previewUrl && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            onClick={() => setPreviewUrl(null)}
          >
            <div className="absolute inset-0 bg-black/70" />
            <img
              src={previewUrl}
              alt="preview"
              className="relative max-h-[90vh] max-w-full rounded-lg shadow-lg transition-transform duration-300"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageHallsPage;
