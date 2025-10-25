// src/components/DayBookingsModal.js
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * DayBookingsModal
 * - Shows only APPROVED bookings for the selected day.
 * - Includes smooth animations, light & DTAO theme support.
 * - Displays full seminar details when expanded.
 */

const DayBookingsModal = ({ date, bookings = [], onClose }) => {
  const [list, setList] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");
  const isDtao = theme === "dtao";

  useEffect(() => {
    // ✅ Filter APPROVED bookings only
    const approved = (Array.isArray(bookings) ? bookings : [])
      .filter((b) => (b.status || "").toUpperCase() === "APPROVED");
    setList(approved);
    setExpanded({});
  }, [bookings, date]);

  // Watch theme from localStorage
  useEffect(() => {
    const observer = () => setTheme(localStorage.getItem("theme") || "light");
    window.addEventListener("storage", observer);
    return () => window.removeEventListener("storage", observer);
  }, []);

  const idOf = (b) =>
    b?.id || b?._id || b?._key || b?.raw?.id || b?.raw?._id || null;

  const toggle = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const formatTimeRange = (b) => {
    if (b.startTime && b.endTime) return `${b.startTime} — ${b.endTime}`;
    if (b.startDate && b.endDate && b.startDate !== b.endDate)
      return `${b.startDate} → ${b.endDate}`;
    return b.date || b.startDate || "Full day";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className={`rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 ${
          isDtao
            ? "bg-black/80 border border-violet-900 text-slate-100"
            : "bg-white text-gray-900"
        }`}
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b border-gray-300/40 pb-3 mb-4">
          <h2
            className={`text-xl sm:text-2xl font-semibold ${
              isDtao ? "text-slate-100" : "text-gray-900"
            }`}
          >
            📅 Bookings on {date}
          </h2>
          <button
            onClick={onClose}
            className={`text-xl font-bold ${
              isDtao
                ? "text-slate-400 hover:text-red-400"
                : "text-gray-500 hover:text-red-600"
            }`}
          >
            ✖
          </button>
        </div>

        {/* Empty State */}
        {(!list || list.length === 0) && (
          <div
            className={`text-center py-12 ${
              isDtao ? "text-slate-400" : "text-gray-500"
            }`}
          >
            No approved seminars found for this day.
          </div>
        )}

        {/* List */}
        <div className="space-y-4">
          {list.map((b, i) => {
            const uid = idOf(b) ?? `idx-${i}`;
            const isOpen = !!expanded[uid];
            const bookingTitle =
              b.slotTitle || b.title || b.name || b.bookingName || "Untitled Seminar";
            const dept = b.department || b.dept || "";

            return (
              <motion.div
                key={uid}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className={`border rounded-xl p-4 transition-all ${
                  isDtao
                    ? "bg-black/30 border-violet-900 hover:bg-black/50"
                    : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Left Info */}
                  <div className="min-w-0">
                    <div
                      className={`font-semibold truncate ${
                        isDtao ? "text-violet-300" : "text-blue-700"
                      }`}
                    >
                      {bookingTitle}
                    </div>
                    <div
                      className={`text-sm mt-1 truncate ${
                        isDtao ? "text-slate-300" : "text-gray-600"
                      }`}
                    >
                      {dept}
                    </div>
                    <div
                      className={`text-xs mt-2 ${
                        isDtao ? "text-slate-400" : "text-gray-500"
                      }`}
                    >
                      {formatTimeRange(b)}
                    </div>
                  </div>

                  {/* Right Info */}
                  <div className="flex flex-col items-end gap-2">
                    <div
                      className={`text-xs px-2 py-1 rounded-full font-semibold ${
                        (b.status || "").toUpperCase() === "APPROVED"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-50 text-yellow-800"
                      }`}
                    >
                      {(b.status || "APPROVED").toString().toUpperCase()}
                    </div>
                    <button
                      onClick={() => toggle(uid)}
                      className={`px-3 py-1 rounded-md border text-sm font-medium ${
                        isDtao
                          ? "border-violet-800 hover:bg-violet-900/40"
                          : "border-gray-300 hover:bg-gray-200"
                      }`}
                    >
                      {isOpen ? "Less" : "More"}
                    </button>
                  </div>
                </div>

                {/* Expanded details */}
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className={`mt-3 border-t pt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm ${
                        isDtao ? "text-slate-200" : "text-gray-800"
                      }`}
                    >
                      <p>
                        <span className="font-medium">Hall:</span>{" "}
                        {b.hallName ||
                          b.hall ||
                          b.hallObj?.name ||
                          b.hallObj?.title ||
                          "—"}
                      </p>
                      <p>
                        <span className="font-medium">Date:</span>{" "}
                        {b.date || b.startDate || b.endDate || "—"}
                      </p>
                      {b.startTime && (
                        <p>
                          <span className="font-medium">Time:</span>{" "}
                          {b.startTime} — {b.endTime}
                        </p>
                      )}
                      <p>
                        <span className="font-medium">Email:</span>{" "}
                        {b.email || b.bookingEmail || "—"}
                      </p>
                      <p>
                        <span className="font-medium">Phone:</span>{" "}
                        {b.phone || b.bookingPhone || "—"}
                      </p>
                      <p>
                        <span className="font-medium">Department:</span>{" "}
                        {dept || "—"}
                      </p>
                      {b.remarks && (
                        <div className="col-span-2 mt-2">
                          <span className="font-medium">Remarks:</span>{" "}
                          {b.remarks}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <button
            onClick={onClose}
            className={`px-6 py-2 rounded-xl font-semibold transition ${
              isDtao
                ? "bg-violet-600 hover:bg-violet-500 text-white"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default DayBookingsModal;
