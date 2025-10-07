// src/pages/ManageOperatorsPage.jsx
import React, { useEffect, useState, useMemo } from "react";
import api from "../utils/api";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function ManageOperatorsPage() {
  const [operators, setOperators] = useState([]);
  const [halls, setHalls] = useState([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    hallName: "",
    headName: "",
    headEmail: "",
    phone: "",
  });

  const [editingId, setEditingId] = useState(null);

  // UI helpers
  const [query, setQuery] = useState("");
  const [hallFilter, setHallFilter] = useState("");
  const [page, setPage] = useState(1);
  const perPageOptions = [5, 10, 20];
  const [perPage, setPerPage] = useState(10);

  // Fetch operators
  async function fetchOperators() {
    setLoading(true);
    try {
      const res = await api.get("/hall-operators");
      setOperators(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("fetchOperators", err);
      toast.error("Failed to load operators");
    } finally {
      setLoading(false);
    }
  }

  // Fetch halls for select
  async function fetchHalls() {
    try {
      const res = await api.get("/halls");
      setHalls(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("fetchHalls", err);
      toast.error("Failed to load halls");
    }
  }

  useEffect(() => {
    fetchOperators();
    fetchHalls();
  }, []);

  function resetForm() {
    setForm({ hallName: "", headName: "", headEmail: "", phone: "" });
    setEditingId(null);
  }

  function validateForm() {
    if (!form.hallName || !form.headName.trim() || !form.headEmail.trim()) {
      toast.warn("Hall, head name and email are required");
      return false;
    }

    // Phone validation (optional)
    if (form.phone) {
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(form.phone)) {
        toast.error("Phone must be 10 digits starting with 6/7/8/9");
        return false;
      }
    }

    // Email domain validation
    const email = (form.headEmail || "").toLowerCase();
    if (!(email.endsWith("@newhorizonindia.edu") || email.endsWith("@gmail.com"))) {
      toast.error("Email must be @newhorizonindia.edu or @gmail.com");
      return false;
    }

    return true;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      if (editingId) {
        await api.put(`/hall-operators/${editingId}`, form);
        toast.success("Operator updated");
      } else {
        await api.post("/hall-operators", form);
        toast.success("Operator created");
      }
      resetForm();
      await fetchOperators();
    } catch (err) {
      console.error("save operator", err);
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed";
      toast.error(String(msg));
    }
  }

  function handleEdit(op) {
    setEditingId(op.id ?? op._id);
    setForm({
      hallName: op.hallName || "",
      headName: op.headName || "",
      headEmail: op.headEmail || "",
      phone: op.phone || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this operator?")) return;
    try {
      await api.delete(`/hall-operators/${id}`);
      toast.success("Deleted");
      await fetchOperators();
    } catch (err) {
      console.error("delete operator", err);
      toast.error("Failed to delete");
    }
  }

  // --- Extra features ---
  // copy email to clipboard
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Email copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  // export visible data to CSV
  const exportCSV = (rows) => {
    if (!rows || rows.length === 0) {
      toast.info("No rows to export");
      return;
    }
    const headers = ["Hall", "Head", "Email", "Phone"];
    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        [
          `"${(r.hallName || "").replace(/"/g, '""')}"`,
          `"${(r.headName || "").replace(/"/g, '""')}"`,
          `"${(r.headEmail || "").replace(/"/g, '""')}"`,
          `"${(r.phone || "").replace(/"/g, '""')}"`,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `operators_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  // --- filtering / search / pagination ---
  const filtered = useMemo(() => {
    const q = (query || "").trim().toLowerCase();
    return operators.filter((op) => {
      if (hallFilter && op.hallName !== hallFilter) return false;
      if (!q) return true;
      const hay = `${op.hallName || ""} ${op.headName || ""} ${op.headEmail || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [operators, query, hallFilter]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const paged = useMemo(() => {
    const start = (page - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }, [filtered, page, perPage]);

  useEffect(() => {
    // reset to page 1 when filters change
    setPage(1);
  }, [query, hallFilter, perPage]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-semibold text-gray-800 mb-4">Manage Hall Operators</h1>

        {/* form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-4 sm:p-6 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Hall</label>
              <select
                value={form.hallName}
                onChange={(e) => setForm({ ...form, hallName: e.target.value })}
                required
                className="block w-full border border-gray-200 rounded-md px-3 py-2 bg-white"
              >
                <option value="">-- Select Hall --</option>
                {halls.map((h) => (
                  <option key={h.id ?? h._id} value={h.name}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Head Name</label>
              <input
                placeholder="Head name"
                value={form.headName}
                onChange={(e) => setForm({ ...form, headName: e.target.value })}
                required
                className="block w-full border border-gray-200 rounded-md px-3 py-2 bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Head Email</label>
              <input
                placeholder="Head email"
                type="email"
                value={form.headEmail}
                onChange={(e) => setForm({ ...form, headEmail: e.target.value })}
                required
                className="block w-full border border-gray-200 rounded-md px-3 py-2 bg-white"
              />
            </div>

            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                placeholder="Phone (10 digits, optional)"
                value={form.phone}
                maxLength={10}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setForm({ ...form, phone: val });
                }}
                className="block w-full border border-gray-200 rounded-md px-3 py-2 bg-white"
              />
            </div>

            <div className="sm:col-span-2 flex items-end justify-between gap-2">
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 shadow"
                >
                  {editingId ? "Save" : "Create"}
                </button>

                {editingId ? (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setForm({ hallName: "", headName: "", headEmail: "", phone: "" })}
                    className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="text-sm text-gray-500">Tip: email must be @newhorizonindia.edu or @gmail.com</div>
            </div>
          </div>
        </form>

        {/* controls: search / filter / export */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              placeholder="Search hall, head or email..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full sm:w-80 border border-gray-200 rounded-md px-3 py-2 bg-white"
            />

            <select
              value={hallFilter}
              onChange={(e) => setHallFilter(e.target.value)}
              className="border border-gray-200 rounded-md px-3 py-2 bg-white"
            >
              <option value="">All halls</option>
              {halls.map((h) => (
                <option key={h.id ?? h._id} value={h.name}>
                  {h.name}
                </option>
              ))}
            </select>

            <button
              onClick={() => {
                exportCSV(filtered);
              }}
              className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Export CSV
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="text-sm text-gray-600">Rows:</div>
            <select value={perPage} onChange={(e) => setPerPage(Number(e.target.value))} className="border border-gray-200 rounded-md px-2 py-1 bg-white">
              {perPageOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>

            <div className="text-sm text-gray-600 ml-2">
              {total} result{total !== 1 ? "s" : ""}
            </div>
          </div>
        </div>

        {/* table / list */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* responsive table header for desktop */}
          <div className="hidden sm:block">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Hall</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Head</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Phone</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
                </tr>
              </thead>

              <tbody className="bg-white divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-4 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : paged.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-4 text-center text-gray-500">
                      No operators found.
                    </td>
                  </tr>
                ) : (
                  paged.map((op) => (
                    <tr key={op.id ?? op._id}>
                      <td className="px-4 py-3 text-sm text-gray-700">{op.hallName}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{op.headName}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 flex items-center gap-3">
                        <span>{op.headEmail}</span>
                        <button
                          onClick={() => copyToClipboard(op.headEmail || "")}
                          className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
                          aria-label="Copy email"
                        >
                          Copy
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{op.phone || "—"}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        <div className="flex gap-2">
                          <button onClick={() => handleEdit(op)} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">
                            Edit
                          </button>
                          <button onClick={() => handleDelete(op.id ?? op._id)} className="px-3 py-1 bg-red-600 text-white rounded text-sm">
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* mobile list */}
          <div className="sm:hidden">
            {loading ? (
              <div className="p-4 text-center text-gray-500">Loading...</div>
            ) : paged.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No operators found.</div>
            ) : (
              paged.map((op) => (
                <div key={op.id ?? op._id} className="p-4 border-b last:border-b-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-sm font-medium text-gray-800">{op.hallName}</div>
                      <div className="text-sm text-gray-600">{op.headName}</div>
                      <div className="text-sm text-gray-600">{op.phone || "—"}</div>
                      <div className="text-sm text-gray-600 flex items-center gap-2">
                        <span>{op.headEmail}</span>
                        <button onClick={() => copyToClipboard(op.headEmail || "")} className="text-xs px-2 py-1 bg-gray-100 rounded">
                          Copy
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <button onClick={() => handleEdit(op)} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(op.id ?? op._id)} className="px-3 py-1 bg-red-600 text-white rounded text-sm">
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* pagination */}
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <ToastContainer position="top-right" autoClose={2500} />
    </div>
  );
}
