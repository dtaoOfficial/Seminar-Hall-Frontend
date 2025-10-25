// src/pages/ManageOperatorsPage.jsx
import React, { useEffect, useState, useMemo, useRef } from "react";
import api from "../utils/api";
import { useNotification } from "../components/NotificationsProvider";
import { useTheme } from "../contexts/ThemeContext";

export default function ManageOperatorsPage() {
  const { notify } = useNotification();
  const { theme } = useTheme() || {};
  const isDtao = theme === "dtao";

  const [operators, setOperators] = useState([]);
  const [halls, setHalls] = useState([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    hallIds: [], // new: array of hall ids
    hallNames: [], // optional helper (sent too)
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

  // selected operator to show details & edit below table
  const [selectedOperator, setSelectedOperator] = useState(null);

  const mainRef = useRef(null);
  const formTopRef = useRef(null);

  /* ---------- MultiSelect for Halls ---------- */
  function MultiSelect({ options = [], value = [], onChange, placeholder = "Select halls", ariaLabel = "Select halls" }) {
    // options: [{ value: id, label: name }]
    const ref = useRef(null);
    const [open, setOpen] = useState(false);

    useEffect(() => {
      function onDoc(e) {
        if (!ref.current) return;
        if (!ref.current.contains(e.target)) setOpen(false);
      }
      document.addEventListener("mousedown", onDoc);
      return () => document.removeEventListener("mousedown", onDoc);
    }, []);

    const toggle = (v) => {
      if (value.includes(v)) onChange(value.filter((x) => x !== v));
      else onChange([...value, v]);
    };

    const selectedLabels = options.filter((o) => value.includes(o.value)).map((o) => o.label);
    const label = selectedLabels.length ? selectedLabels.join(", ") : placeholder;

    return (
      <div ref={ref} className="relative w-full">
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={ariaLabel}
          onClick={() => setOpen((s) => !s)}
          className={`w-full text-left rounded-md px-3 py-2 border flex items-center justify-between ${isDtao ? "bg-transparent border-violet-700 text-slate-100" : "bg-white border-gray-200 text-gray-800"}`}
        >
          <span className={`${selectedLabels.length ? "" : (isDtao ? "text-slate-400" : "text-gray-400")}`}>{label}</span>
          <svg className={`w-4 h-4 ml-2 ${isDtao ? "text-slate-300" : "text-slate-600"}`} viewBox="0 0 24 24" fill="none">
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {open && (
          <div className={`absolute z-50 mt-1 w-full rounded-md shadow-lg ${isDtao ? "bg-black/80 border border-violet-800 text-slate-100" : "bg-white border"}`} style={{ maxHeight: 220, overflowY: "auto" }}>
            {options.map((opt) => {
              const checked = value.includes(opt.value);
              return (
                <label key={opt.value} className={`flex items-center gap-2 px-3 py-2 cursor-pointer ${isDtao ? "hover:bg-violet-900/60" : "hover:bg-gray-100"}`}>
                  <input type="checkbox" checked={checked} onChange={() => toggle(opt.value)} />
                  <span className={`${checked ? "font-medium" : ""}`}>{opt.label}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  /* ---------- Data fetchers ---------- */
  async function fetchOperators() {
    setLoading(true);
    try {
      const res = await api.get("/hall-operators");
      // backend now returns operators with hallNames array & hallIds array
      setOperators(Array.isArray(res.data) ? res.data : []);
      try {
        if (mainRef.current && mainRef.current.scrollIntoView) mainRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch (e) {}
    } catch (err) {
      console.error("fetchOperators", err);
      notify("Failed to load operators", "error", 3000);
    } finally {
      setLoading(false);
    }
  }

  async function fetchHalls() {
    try {
      const res = await api.get("/halls");
      setHalls(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("fetchHalls", err);
      notify("Failed to load halls", "error", 3000);
    }
  }

  useEffect(() => {
    fetchOperators();
    fetchHalls();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetForm() {
    setForm({ hallIds: [], hallNames: [], headName: "", headEmail: "", phone: "" });
    setEditingId(null);
    try {
      if (formTopRef.current && formTopRef.current.scrollIntoView) formTopRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (e) {}
  }

  function validateForm() {
    if (!form.hallIds || form.hallIds.length === 0) {
      notify("Select at least one hall", "warn", 2200);
      return false;
    }
    if (!form.headName.trim() || !form.headEmail.trim()) {
      notify("Head name and email are required", "warn", 2200);
      return false;
    }

    if (form.phone) {
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(form.phone)) {
        notify("Phone must be 10 digits starting with 6/7/8/9", "error", 3000);
        return false;
      }
    }

    const email = (form.headEmail || "").toLowerCase();
    if (!(email.endsWith("@newhorizonindia.edu") || email.endsWith("@gmail.com"))) {
      notify("Email must be @newhorizonindia.edu or @gmail.com", "error", 3000);
      return false;
    }

    return true;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validateForm()) return;

    // prepare payload: include hallIds and hallNames for convenience
    const hallNames = halls.filter((h) => form.hallIds.includes(h.id)).map((h) => h.name);
    const payload = {
      ...form,
      hallNames,
    };

    try {
      if (editingId) {
        await api.put(`/hall-operators/${editingId}`, payload);
        notify("Operator updated", "success", 2200);
      } else {
        await api.post("/hall-operators", payload);
        notify("Operator created", "success", 2200);
      }
      resetForm();
      setSelectedOperator(null);
      await fetchOperators();
    } catch (err) {
      console.error("save operator", err);
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed";
      notify(String(msg), "error", 3500);
    }
  }

  function handleEdit(op) {
    const id = op.id ?? op._id;
    setEditingId(id);
    setForm({
      hallIds: (op.hallIds && op.hallIds.length) ? op.hallIds : (op.hallId ? [op.hallId] : []),
      hallNames: (op.hallNames && op.hallNames.length) ? op.hallNames : (op.hallName ? [op.hallName] : []),
      headName: op.headName || "",
      headEmail: op.headEmail || "",
      phone: op.phone || "",
    });
    try {
      if (formTopRef.current && formTopRef.current.scrollIntoView) formTopRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (e) {}
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id) {
    if (!id) return;
    if (!window.confirm("Delete this operator?")) return;
    try {
      await api.delete(`/hall-operators/${id}`);
      notify("Deleted", "success", 1800);
      if (selectedOperator && (selectedOperator.id === id || selectedOperator._id === id)) {
        setSelectedOperator(null);
      }
      await fetchOperators();
    } catch (err) {
      console.error("delete operator", err);
      notify("Failed to delete", "error", 3000);
    }
  }

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      notify("Email copied", "success", 1400);
    } catch {
      notify("Copy failed", "error", 1800);
    }
  };

  const exportCSV = (rows) => {
    if (!rows || rows.length === 0) {
      notify("No rows to export", "info", 1800);
      return;
    }
    const headers = ["Halls", "Head", "Email", "Phone"];
    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        [
          `"${((r.hallNames && r.hallNames.join("; ")) || r.hallName || "").replace(/"/g, '""')}"`,
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
    notify("CSV exported", "success", 1800);
  };

  // filtering / search / pagination
  const filtered = useMemo(() => {
    const q = (query || "").trim().toLowerCase();
    return operators.filter((op) => {
      const hallList = (op.hallNames && op.hallNames.join(" ")) || op.hallName || "";
      if (hallFilter && !hallList.includes(hallFilter)) return false;
      if (!q) return true;
      const hay = `${hallList} ${op.headName || ""} ${op.headEmail || ""}`.toLowerCase();
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
    setPage(1);
  }, [query, hallFilter, perPage]);

  // UI helper: click row to show details (or Clear selection)
  const handleSelectOperator = (op) => {
    setSelectedOperator(op);
  };

  return (
    <div ref={mainRef} className={`${isDtao ? "min-h-screen bg-[#08050b] text-slate-100" : "min-h-screen bg-gray-50 text-slate-900"} p-4 sm:p-8`}>
      <div className="max-w-5xl mx-auto">
        <h1 className={`${isDtao ? "text-slate-100" : "text-gray-800"} text-2xl font-semibold mb-4`}>Manage Hall Operators</h1>

        {/* form */}
        <form ref={formTopRef} onSubmit={handleSubmit} className={`${isDtao ? "bg-black/40 border border-violet-900" : "bg-white"} rounded-lg shadow p-4 sm:p-6 mb-6`}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className={`block text-sm font-medium mb-1 ${isDtao ? "text-slate-200" : "text-gray-700"}`}>Halls</label>

              <MultiSelect
                options={halls.map((h) => ({ value: h.id, label: h.name }))}
                value={form.hallIds}
                onChange={(ids) => setForm({ ...form, hallIds: ids })}
                placeholder="-- Select halls --"
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${isDtao ? "text-slate-200" : "text-gray-700"}`}>Head Name</label>
              <input
                placeholder="Head name"
                value={form.headName}
                onChange={(e) => setForm({ ...form, headName: e.target.value })}
                required
                className={`${isDtao ? "block w-full border border-violet-700 rounded-md px-3 py-2 bg-transparent text-slate-100" : "block w-full border border-gray-200 rounded-md px-3 py-2 bg-white"}`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${isDtao ? "text-slate-200" : "text-gray-700"}`}>Head Email</label>
              <input
                placeholder="Head email"
                type="email"
                value={form.headEmail}
                onChange={(e) => setForm({ ...form, headEmail: e.target.value })}
                required
                className={`${isDtao ? "block w-full border border-violet-700 rounded-md px-3 py-2 bg-transparent text-slate-100" : "block w-full border border-gray-200 rounded-md px-3 py-2 bg-white"}`}
              />
            </div>

            <div className="sm:col-span-1">
              <label className={`block text-sm font-medium mb-1 ${isDtao ? "text-slate-200" : "text-gray-700"}`}>Phone</label>
              <input
                placeholder="Phone (10 digits, optional)"
                value={form.phone}
                maxLength={10}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setForm({ ...form, phone: val });
                }}
                className={`${isDtao ? "block w-full border border-violet-700 rounded-md px-3 py-2 bg-transparent text-slate-100" : "block w-full border border-gray-200 rounded-md px-3 py-2 bg-white"}`}
              />
            </div>

            <div className="sm:col-span-2 flex items-end justify-between gap-2">
              <div className="flex gap-2">
                <button
                  type="submit"
                  className={`${isDtao ? "inline-flex items-center px-4 py-2 bg-violet-600 text-white rounded-md hover:bg-violet-700" : "inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"} shadow`}
                >
                  {editingId ? "Save" : "Create"}
                </button>

                {editingId ? (
                  <button
                    type="button"
                    onClick={resetForm}
                    className={`${isDtao ? "inline-flex items-center px-4 py-2 bg-transparent border border-violet-700 text-slate-200 rounded-md hover:bg-black/10" : "inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"}`}
                  >
                    Cancel
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setForm({ hallIds: [], hallNames: [], headName: "", headEmail: "", phone: "" })}
                    className={`${isDtao ? "inline-flex items-center px-4 py-2 bg-transparent border border-violet-700 text-slate-200 rounded-md hover:bg-black/10" : "inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"}`}
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className={`${isDtao ? "text-xs text-slate-400" : "text-sm text-gray-500"}`}>Tip: email must be @newhorizonindia.edu or @gmail.com</div>
            </div>
          </div>
        </form>

        {/* controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              placeholder="Search hall, head or email..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={`${isDtao ? "w-full sm:w-80 border border-violet-700 rounded-md px-3 py-2 bg-transparent text-slate-200" : "w-full sm:w-80 border border-gray-200 rounded-md px-3 py-2 bg-white"}`}
            />

            {/* hall filter uses simple dropdown (name-based) */}
            <div style={{ width: 200 }}>
              <select
                value={hallFilter}
                onChange={(e) => setHallFilter(e.target.value)}
                className={`${isDtao ? "w-full border border-violet-700 rounded-md px-3 py-2 bg-transparent text-slate-200" : "w-full border border-gray-200 rounded-md px-3 py-2 bg-white"}`}
              >
                <option value="">All halls</option>
                {halls.map((h) => (
                  <option key={h.id} value={h.name}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => {
                exportCSV(filtered);
              }}
              className={`${isDtao ? "px-3 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700" : "px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"}`}
            >
              Export CSV
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className={`${isDtao ? "text-xs text-slate-400" : "text-sm text-gray-600"}`}>Rows:</div>
            <select value={perPage} onChange={(e) => setPerPage(Number(e.target.value))} className={`${isDtao ? "border border-violet-700 rounded-md px-2 py-1 bg-transparent text-slate-200" : "border border-gray-200 rounded-md px-2 py-1 bg-white"}`}>
              {perPageOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>

            <div className={`${isDtao ? "text-xs text-slate-400 ml-2" : "text-sm text-gray-600 ml-2"}`}>
              {total} result{total !== 1 ? "s" : ""}
            </div>
          </div>
        </div>

        {/* table / list */}
        <div className={`${isDtao ? "bg-black/40 border border-violet-900" : "bg-white"} rounded-lg shadow overflow-hidden`}>
          {/* desktop table */}
          <div className="hidden sm:block">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className={`${isDtao ? "bg-black/30" : "bg-gray-50"}`}>
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Halls</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Head</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Phone</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
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
                  paged.map((op) => {
                    const id = op.id ?? op._id;
                    const hallsText = (op.hallNames && op.hallNames.join(", ")) || op.hallName || "—";
                    return (
                      <tr key={id} className="cursor-pointer hover:bg-gray-50" onClick={() => handleSelectOperator(op)}>
                        <td className="px-4 py-3 text-sm">{hallsText}</td>
                        <td className="px-4 py-3 text-sm">{op.headName}</td>
                        <td className="px-4 py-3 text-sm flex items-center gap-3">
                          <span>{op.headEmail}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(op.headEmail || "");
                            }}
                            className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
                            aria-label="Copy email"
                          >
                            Copy
                          </button>
                        </td>
                        <td className="px-4 py-3 text-sm">{op.phone || "—"}</td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(op);
                              }}
                              className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
                            >
                              Edit
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(id);
                              }}
                              className="px-3 py-1 bg-red-600 text-white rounded text-sm"
                            >
                              Delete
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedOperator(op);
                              }}
                              className="px-3 py-1 bg-gray-100 text-gray-800 rounded text-sm"
                            >
                              Details
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
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
              paged.map((op) => {
                const id = op.id ?? op._id;
                const hallsText = (op.hallNames && op.hallNames.join(", ")) || op.hallName || "—";
                return (
                  <div key={id} className="p-4 border-b last:border-b-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-sm font-medium">{hallsText}</div>
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
                        <button onClick={() => handleDelete(id)} className="px-3 py-1 bg-red-600 text-white rounded text-sm">
                          Delete
                        </button>
                        <button onClick={() => setSelectedOperator(op)} className="px-3 py-1 bg-gray-100 text-gray-800 rounded text-sm">
                          Details
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Selected Operator Details panel (shows below table) */}
        <div className="mt-4">
          {selectedOperator ? (
            <div className={`${isDtao ? "bg-black/40 border border-violet-900 text-slate-100" : "bg-white border"} rounded-lg p-4 shadow`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold">{(selectedOperator.hallNames && selectedOperator.hallNames.join(", ")) || selectedOperator.hallName}</h3>
                  <div className="text-sm text-slate-400 mt-1">{selectedOperator.headName}</div>
                </div>

                <div className="text-sm text-slate-400">
                  <div><strong>Email:</strong> {selectedOperator.headEmail}</div>
                  <div><strong>Phone:</strong> {selectedOperator.phone || "—"}</div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={() => handleEdit(selectedOperator)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md"
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    const id = selectedOperator.id ?? selectedOperator._id;
                    handleDelete(id);
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-md"
                >
                  Delete
                </button>
                <button
                  onClick={() => {
                    copyToClipboard(selectedOperator.headEmail || "");
                  }}
                  className="px-3 py-2 bg-gray-100 rounded-md"
                >
                  Copy Email
                </button>

                <button
                  onClick={() => setSelectedOperator(null)}
                  className={`${isDtao ? "ml-auto px-3 py-2 bg-transparent border border-violet-700 rounded-md text-slate-200" : "ml-auto px-3 py-2 bg-gray-100 rounded-md"}`}
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <div className={`${isDtao ? "text-slate-400" : "text-gray-600"} text-sm`}>Click "Details" on any row to view full operator details and edit/delete actions.</div>
          )}
        </div>

        {/* pagination */}
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm">
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
    </div>
  );
}
