// src/pages/Admin/ManageHallsPage.js
import React, { useEffect, useState, useCallback } from "react";
import api from "../../utils/api";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const ManageHallsPage = ({ halls = [], fetchHalls }) => {
  const [newHall, setNewHall] = useState("");
  const [newCapacity, setNewCapacity] = useState("");
  const [editingHall, setEditingHall] = useState(null); // id of hall being edited
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
        toast.error(`Error fetching halls: ${msg}`);
        setLocalHalls([]);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [fetchHalls]
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
      toast.warning("Hall name cannot be empty");
      return;
    }
    const capacityNum = Number(newCapacity);
    if (!Number.isInteger(capacityNum) || capacityNum <= 0) {
      toast.warning("Capacity must be a positive integer");
      return;
    }
    try {
      await api.post("/halls", { name: newHall.trim(), capacity: capacityNum });
      toast.success("Hall added successfully");
      setNewHall("");
      setNewCapacity("");
      await fetchHallsInternal();
    } catch (err) {
      console.error("Error adding hall:", err);
      toast.error(err?.response?.data?.message || "Failed to add hall");
    }
  };

  // Open edit: set id, name, capacity
  const openEdit = (hall) => {
    setEditingHall(hall.id ?? hall._id);
    setEditName(hall.name || "");
    // support capacity as number or missing
    setEditCapacity(hall.capacity != null ? String(hall.capacity) : "");
  };

  // Save edit (name + capacity)
  const handleEditHall = async (id) => {
    if (!editName.trim()) {
      toast.warning("Hall name cannot be empty");
      return;
    }
    const capacityNum = Number(editCapacity);
    if (!Number.isInteger(capacityNum) || capacityNum <= 0) {
      toast.warning("Capacity must be a positive integer");
      return;
    }
    try {
      await api.put(`/halls/${id}`, { name: editName.trim(), capacity: capacityNum });
      toast.success("Hall updated");
      setEditingHall(null);
      setEditName("");
      setEditCapacity("");
      await fetchHallsInternal();
    } catch (err) {
      console.error("Error updating hall:", err);
      toast.error(err?.response?.data?.message || "Failed to update hall");
    }
  };

  const handleDeleteHall = async (id) => {
    if (!window.confirm("Are you sure you want to delete this hall?")) return;
    try {
      await api.delete(`/halls/${id}`);
      toast.success("Hall deleted successfully");
      await fetchHallsInternal();
    } catch (err) {
      console.error("Error deleting hall:", err);
      toast.error(err?.response?.data?.message || "Failed to delete hall");
    }
  };

  const effectiveHalls = Array.isArray(halls) && halls.length > 0 ? halls : localHalls;

  useEffect(() => {
    const anyOpen = !!editingHall || !!previewUrl;
    const prev = document.body.style.overflow;
    if (anyOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = prev || "";
    }
    return () => {
      document.body.style.overflow = prev || "";
    };
  }, [editingHall, previewUrl]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-gray-800">Manage Seminar Halls</h2>
          <button
            className="px-4 py-2 rounded-md border border-gray-200 bg-white hover:bg-gray-50"
            onClick={fetchHallsInternal}
          >
            Refresh
          </button>
        </div>

        {/* Add hall form (name + capacity) */}
        <form onSubmit={handleAddHall} className="flex flex-col sm:flex-row gap-3 items-center">
          <input
            type="text"
            placeholder="Enter new hall name"
            value={newHall}
            onChange={(e) => setNewHall(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-200"
          />
          <input
            type="number"
            min="1"
            placeholder="Capacity"
            value={newCapacity}
            onChange={(e) => setNewCapacity(e.target.value)}
            className="w-32 px-3 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-200"
          />
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            Add Hall
          </button>
        </form>

        {loading && <p className="text-center text-gray-500">Loading halls...</p>}

        {!loading && effectiveHalls.length === 0 && (
          <p className="text-center text-gray-500">No halls available.</p>
        )}

        {/* Table: Hall + Capacity + Actions */}
        {showTable && effectiveHalls.length > 0 && (
          <div className="overflow-x-auto bg-white shadow rounded-lg">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Hall</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Capacity</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {effectiveHalls.map((hall) => (
                  <tr key={hall.id ?? hall._id}>
                    <td className="px-4 py-3">{hall.name}</td>
                    <td className="px-4 py-3">{hall.capacity != null ? hall.capacity : "-"}</td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        className="px-3 py-1.5 bg-yellow-50 text-yellow-800 rounded-md hover:bg-yellow-100"
                        onClick={() => openEdit(hall)}
                      >
                        Edit
                      </button>
                      <button
                        className="px-3 py-1.5 bg-rose-50 text-rose-700 rounded-md hover:bg-rose-100"
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

        {/* Mobile Cards include capacity */}
        {showCards && effectiveHalls.length > 0 && (
          <div className="space-y-4">
            {effectiveHalls.map((hall) => (
              <div key={hall.id ?? hall._id} className="p-4 bg-white rounded-lg shadow space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{hall.name}</h3>
                  <span className="text-sm text-gray-600">Capacity: {hall.capacity != null ? hall.capacity : "-"}</span>
                </div>

                <div className="flex gap-2">
                  {(hall.photos || []).slice(0, 3).map((p, i) => (
                    <img
                      key={i}
                      src={p}
                      alt={`hall-${i}`}
                      className="w-16 h-16 object-cover rounded cursor-pointer"
                      onClick={() => setPreviewUrl(p)}
                    />
                  ))}
                </div>

                <div className="flex gap-2">
                  <button
                    className="px-3 py-1.5 bg-yellow-50 text-yellow-800 rounded-md text-xs"
                    onClick={() => openEdit(hall)}
                  >
                    Edit
                  </button>
                  <button
                    className="px-3 py-1.5 bg-rose-50 text-rose-700 rounded-md text-xs"
                    onClick={() => handleDeleteHall(hall.id ?? hall._id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit Modal (name + capacity) */}
        {editingHall && (
          <div className="fixed inset-0 z-50 overflow-auto" aria-modal="true" role="dialog">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => { setEditingHall(null); setEditName(""); setEditCapacity(""); }}
              aria-hidden
            />
            <div className="relative max-w-md w-full mx-auto mt-6 sm:mt-16 p-4">
              <div className="bg-white rounded-lg shadow-lg w-full p-6 space-y-4 max-h-[90vh] overflow-auto">
                <h3 className="text-lg font-semibold">Edit Hall</h3>

                <input
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Hall name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />

                <input
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Capacity"
                  type="number"
                  min="1"
                  value={editCapacity}
                  onChange={(e) => setEditCapacity(e.target.value)}
                />

                <div className="flex justify-end gap-3">
                  <button
                    className="px-4 py-2 rounded-md border border-gray-200 bg-white"
                    onClick={() => { setEditingHall(null); setEditName(""); setEditCapacity(""); }}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-4 py-2 rounded-md bg-blue-600 text-white"
                    onClick={() => handleEditHall(editingHall)}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal for enlarged photo */}
        {previewUrl && (
          <div
            className="fixed inset-0 z-50 overflow-auto"
            role="dialog"
            aria-modal="true"
            onClick={() => setPreviewUrl(null)}
          >
            <div className="absolute inset-0 bg-black/70" />
            <div className="relative max-w-4xl w-full mx-auto mt-6 sm:mt-16 p-4">
              <img
                src={previewUrl}
                alt="preview"
                className="max-h-[90vh] max-w-full rounded-lg shadow-lg mx-auto"
              />
            </div>
          </div>
        )}
      </div>
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};

export default ManageHallsPage;
