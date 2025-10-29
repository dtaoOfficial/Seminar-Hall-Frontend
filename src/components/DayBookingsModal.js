import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * DayBookingsModal
 * - Centered modal
 * - Mobile-friendly layout
 * - Prevents overlap in small screens
 */
const DayBookingsModal = ({ date, bookings = [], onClose }) => {
  const [list, setList] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");
  const isDtao = theme === "dtao";

  useEffect(() => {
    // Dept-safe: ensure bookings is an array before filtering
    const approved = Array.isArray(bookings)
      ? bookings.filter((b) => (b.status || "").toUpperCase() === "APPROVED")
      : [];
    setList(approved);
    setExpanded({});
  }, [bookings, date]);

  useEffect(() => {
    const observer = () => setTheme(localStorage.getItem("theme") || "light");
    window.addEventListener("storage", observer);
    return () => window.removeEventListener("storage", observer);
  }, []);

  // ✅ Disable page scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = "auto");
  }, []);

  const idOf = (b) =>
    b?.id || b?._id || b?._key || b?.raw?.id || b?.raw?._id || null;

  const toggle = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const formatTimeRange = (b) => {
    if (b.startTime && b.endTime) return `${b.startTime} — ${b.endTime}`;
    if (b.startDate && b.endDate && b.startDate !== b.endDate)
      return `${b.startDate} → ${b.endDate}`;
    return b.date || b.startDate || "Full day";
  };

  return (
    <AnimatePresence>
      {/* Overlay */}
      <motion.div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md p-2 sm:p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
      >
        {/* Modal */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className={`relative w-full max-w-[95vw] sm:max-w-[90vw] md:max-w-[70vw] lg:max-w-[55vw] xl:max-w-[45vw] max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl flex flex-col
            ${isDtao
              ? "bg-black/80 border border-violet-900 text-slate-100"
              : "bg-white text-gray-900"
            }`}
        >
          {/* Header */}
          <div className="flex justify-between items-center border-b px-5 py-3 sticky top-0 bg-opacity-70 backdrop-blur-md z-10">
            <h2
              className={`text-base sm:text-lg md:text-xl font-semibold ${
                isDtao ? "text-slate-100" : "text-gray-900"
              }`}
            >
              📅 Bookings on {date}
            </h2>
            <button
              onClick={onClose}
              className={`text-xl font-bold px-2 rounded-full transition ${
                isDtao
                  ? "text-slate-400 hover:text-red-400"
                  : "text-gray-500 hover:text-red-600"
              }`}
            >
              ✖
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-4">
            {(!list || list.length === 0) && (
              <div
                className={`text-center py-10 ${
                  isDtao ? "text-slate-400" : "text-gray-500"
                }`}
              >
                No approved seminars found for this day.
              </div>
            )}

            {list.map((b, i) => {
              const uid = idOf(b) ?? `idx-${i}`;
              const isOpen = !!expanded[uid];
              const bookingTitle =
                b.slotTitle ||
                b.title ||
                b.name ||
                b.bookingName ||
                "Untitled Seminar";
              const dept = b.department || b.dept || "";

              return (
                <motion.div
                  key={uid}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`border rounded-xl p-3 sm:p-4 transition-all ${
                    isDtao
                      ? "bg-black/30 border-violet-900 hover:bg-black/50"
                      : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div
                        className={`font-semibold break-words ${
                          isDtao ? "text-violet-300" : "text-blue-700"
                        }`}
                      >
                        {bookingTitle}
                      </div>
                      {dept && (
                        <div
                          className={`text-sm mt-1 ${
                            isDtao ? "text-slate-300" : "text-gray-600"
                          }`}
                        >
                          {dept}
                        </div>
                      )}
                      <div
                        className={`text-xs mt-2 ${
                          isDtao ? "text-slate-400" : "text-gray-500"
                        }`}
                      >
                        {formatTimeRange(b)}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div
                        className={`text-xs px-2 py-1 rounded-full font-semibold text-center ${
                          (b.status || "").toUpperCase() === "APPROVED"
                            ? isDtao
                              ? "bg-emerald-900/50 text-emerald-300 border border-emerald-700"
                              : "bg-green-100 text-green-800"
                            : isDtao
                              ? "bg-yellow-900/40 text-yellow-300 border border-yellow-700"
                              : "bg-yellow-50 text-yellow-800"
                        }`}
                      >
                        {(b.status || "APPROVED").toString().toUpperCase()}
                      </div>
                      <button
                        onClick={() => toggle(uid)}
                        className={`px-3 py-1 rounded-md border text-sm font-medium ${
                          isDtao
                            ? "border-violet-800 hover:bg-violet-900/40 text-violet-300"
                            : "border-gray-300 hover:bg-gray-200 text-gray-700"
                        }`}
                      >
                        {isOpen ? "Less" : "More"}
                      </button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className={`mt-3 border-t pt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 ${
                          isDtao ? "text-slate-200 border-violet-800/40" : "text-gray-800 border-gray-200"
                        }`}
                      >
                        <div className="break-words">
                          <span className="font-medium">Hall:</span>{" "}
                          {b.hallName ||
                            b.hall ||
                            b.hallObj?.name ||
                            b.hallObj?.title ||
                            "—"}
                        </div>
                        <div className="break-words">
                          <span className="font-medium">Date:</span>{" "}
                          {b.date || b.startDate || b.endDate || "—"}
                        </div>
                        {b.startTime && (
                          <div className="break-words">
                            <span className="font-medium">Time:</span>{" "}
                            {b.startTime} — {b.endTime}
                          </div>
                        )}
                        <div className="break-words">
                          <span className="font-medium">Email:</span>{" "}
                          {b.email || b.bookingEmail || "—"}
                        </div>
                        <div className="break-words">
                          <span className="font-medium">Phone:</span>{" "}
                          {b.phone || b.bookingPhone || "—"}
                        </div>
                        <div className="break-words">
                          <span className="font-medium">Department:</span>{" "}
                          {dept || "—"}
                        </div>
                        {b.remarks && (
                          <div className="col-span-1 sm:col-span-2 mt-2 break-words">
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
          <div className="border-t px-5 py-3 text-center sticky bottom-0 bg-opacity-70 backdrop-blur-md">
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
      </motion.div>
    </AnimatePresence>
  );
};

export default DayBookingsModal;
