// src/components/DeptDashboard.js
import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";

import Navbar from "./Navbar"; // top navbar (liquid-glass)
import DeptSlotBooking from "../pages/Dept/AddSeminarPage"; // dept form (slot booking)
import DeptStatus from "../pages/Dept/DeptStatus";
import DeptHistory from "../pages/Dept/DeptHistory";
import DeptDetails from "../pages/Dept/DeptDetails"; // new details for dept
import DeptCalendarPage from "../pages/Dept/DeptCalendarPage"; // ← ADDED
import { useTheme } from "../contexts/ThemeContext";

/**
 * DeptDashboard — theme-aware (dtao) version
 * No logic or endpoints changed; only styling adapted for dark theme.
 */

const DeptDashboard = ({ user, setUser }) => {
  const navigate = useNavigate();
  const [restored, setRestored] = useState(false);
  const [checking, setChecking] = useState(true);
  const { theme } = useTheme() || {};
  const isDtao = theme === "dtao";

  // restore user from localStorage if not provided
  useEffect(() => {
    if (!user) {
      try {
        const raw = localStorage.getItem("user");
        if (raw && raw !== "undefined" && raw !== "null") {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === "object") {
            setUser(parsed);
          }
        }
      } catch (err) {
        // corrupt storage, clear
        localStorage.removeItem("user");
        localStorage.removeItem("token");
      }
    }
    setRestored(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // enforce department-only access once restore complete
  useEffect(() => {
    if (!restored) return;
    setChecking(true);
    const check = () => {
      if (!user) {
        navigate("/", { replace: true });
        return;
      }
      const role = (user.role || "").toString().trim().toLowerCase();
      if (role !== "department") {
        // redirect non-department users back to root
        navigate("/", { replace: true });
      }
    };
    check();
    setChecking(false);
  }, [restored, user, navigate]);

  const handleLogout = () => {
    setUser(null);
    try {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
    } catch (_) {}
    navigate("/");
  };

  // while we ensure restoration and role check complete, show nothing (or a small loader)
  if (!restored || checking) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDtao ? "bg-[#08050b]" : "bg-gray-50"}`}>
        <div className={`${isDtao ? "bg-black/60 border border-violet-900 text-slate-100" : "bg-white"} text-center p-6 rounded shadow`}>
          <svg className={`${isDtao ? "text-slate-300" : "text-gray-600"} w-8 h-8 mx-auto animate-spin`} viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeOpacity="0.25"></circle>
            <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round"></path>
          </svg>
          <p className={`${isDtao ? "text-slate-300" : "mt-3 text-sm text-gray-600"} mt-3 text-sm`}>Preparing dashboard…</p>
        </div>
      </div>
    );
  }

  // main content padding to account for fixed navbar (Navbar uses a 64-72px header)
  // keep this CSS hook inlined so consumers don't need a separate stylesheet
  return (
    <div className={`${isDtao ? "min-h-screen bg-[#08050b] text-slate-100" : "min-h-screen bg-gray-50 text-slate-900"}`}>
      <Navbar user={user} handleLogout={handleLogout} />

      <main
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
        style={{
          paddingTop: "var(--navbar-height, 64px)", // Navbar sets header height; fallback 64px
          boxSizing: "border-box",
          minHeight: "calc(100vh - var(--navbar-height, 64px))",
        }}
        aria-live="polite"
      >
        <Routes>
          <Route path="/" element={<Navigate to="slot-booking" replace />} />
          <Route path="slot-booking" element={<DeptSlotBooking user={user} />} />
          <Route path="status" element={<DeptStatus user={user} />} />
          <Route path="history" element={<DeptHistory user={user} />} />
          <Route path="seminar-details" element={<DeptDetails />} />
          <Route path="calendar" element={<DeptCalendarPage />} />{/* ← ADDED */}
          {/* catch-all inside dept dashboard: redirect to slot-booking */}
          <Route path="*" element={<Navigate to="slot-booking" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export default DeptDashboard;
