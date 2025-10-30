// src/layouts/AquaGlassLayout.js
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import GlobalStyles from "../styles/GlobalStyles";
import { useTheme } from "../contexts/ThemeContext";
import useScrollReveal from "../hooks/useScrollReveal";
import AuthService from "../utils/AuthService"; // ✅ added import

export default function AquaGlassLayout({ children, user, setUser }) {
  const { theme } = useTheme() || {};
  const [showSmallWarning, setShowSmallWarning] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkSize = () => {
      if (window.innerWidth < 360) setShowSmallWarning(true);
      else setShowSmallWarning(false);
    };
    checkSize();
    window.addEventListener("resize", checkSize);
    return () => window.removeEventListener("resize", checkSize);
  }, []);

  // enable reveal animations site-wide (called once in layout)
  useScrollReveal();

  /** ✅ Improved logout: clears only current role session and syncs globally **/
  const handleLogout = () => {
    try {
      const path = window.location.pathname || "";
      const role = path.startsWith("/admin")
        ? "ADMIN"
        : path.startsWith("/dept")
        ? "DEPARTMENT"
        : null;

      // Clear local storage and emit logout event
      AuthService.logout(role);

      // Clear user state immediately (for instant UI update)
      setUser?.(null);

      // ✅ Smooth redirect (no reload)
      navigate("/", { replace: true });
    } catch (err) {
      console.error("Logout error:", err);
      navigate("/", { replace: true });
    }
  };

  const isDtao = theme === "dtao";

  return (
    <div
      className={`min-h-screen w-full flex flex-col relative overflow-hidden transition-colors duration-700 ${
        isDtao
          ? "bg-gradient-to-br from-black via-violet-950 to-[#1a001a] text-white"
          : "bg-gradient-to-br from-[#f8fbff] via-[#edf6ff] to-[#e9f5ff] text-slate-900"
      }`}
    >
      <GlobalStyles />

      {/* glowing background blobs only visible in DTAO */}
      {isDtao && (
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <motion.div
            animate={{ opacity: [0.6, 0.9, 0.6], scale: [1, 1.05, 1] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-24 -left-16 w-[30rem] h-[30rem] rounded-full blur-[160px] bg-violet-700/30"
          />
          <motion.div
            animate={{ opacity: [0.5, 0.8, 0.5], scale: [1, 1.08, 1] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -bottom-32 -right-16 w-[34rem] h-[34rem] rounded-full blur-[180px] bg-pink-600/20"
          />
        </div>
      )}

      <Navbar user={user} handleLogout={handleLogout} />

      <main className="relative flex-1 z-10 px-4 md:px-6 py-8 max-w-7xl mx-auto pt-20 w-full">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full"
        >
          {children}
        </motion.div>
      </main>

      <footer
        className={`relative z-20 py-4 text-center text-xs md:text-sm border-t ${
          isDtao
            ? "border-violet-800 bg-black/50 text-violet-300 backdrop-blur-md"
            : "border-white/30 bg-white/40 text-gray-600 backdrop-blur-xl"
        }`}
      >
        <p>Developed by DTAOofficial — Maheswar Reddy Kuraparthi</p>
      </footer>

      {showSmallWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.25 }}
            className={`rounded-3xl p-6 max-w-sm text-center shadow-2xl border ${
              isDtao
                ? "bg-[#1a001a]/90 border-violet-800 text-violet-100"
                : "bg-white/88 border-white/60 text-gray-800"
            }`}
          >
            <img
              src="https://res.cloudinary.com/duhki4wze/image/upload/v1756755114/nhce_25-scaled-2_a6givc.png"
              alt="NHCE"
              className="w-20 mx-auto mb-4"
            />
            <h2 className="text-lg font-semibold mb-2">Device Not Supported</h2>
            <p className="text-sm mb-4">
              Screen is very narrow — rotate or use larger display.
            </p>
            <button
              onClick={() => setShowSmallWarning(false)}
              className={`px-5 py-2 rounded-xl font-semibold transition ${
                isDtao
                  ? "bg-violet-700 hover:bg-violet-600 text-white"
                  : "bg-gradient-to-r from-blue-400 to-cyan-400 text-white shadow"
              }`}
            >
              Got it
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
