// src/layouts/AquaGlassLayout.js
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import GlobalStyles from "../styles/GlobalStyles"; // <-- new: global theme + background

export default function AquaGlassLayout({ children, user, setUser }) {
  const [showSmallWarning, setShowSmallWarning] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkSize = () => {
      if (typeof window !== "undefined" && window.innerWidth < 360) setShowSmallWarning(true);
      else setShowSmallWarning(false);
    };
    checkSize();
    window.addEventListener("resize", checkSize);
    return () => window.removeEventListener("resize", checkSize);
  }, []);

  const handleLogout = () => {
    if (typeof setUser === "function") setUser(null);
    try {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
    } catch {}
    navigate("/");
  };

  return (
    <div className="min-h-screen w-full flex flex-col relative overflow-hidden bg-gradient-to-br from-[#f8fbff] via-[#edf6ff] to-[#e9f5ff]">
      {/* Global styles + animated background */}
      <GlobalStyles />

      {/* Background glowing orbs (AquaGlass ambience) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ scale: [1, 1.04, 1], opacity: [0.6, 0.9, 0.6] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-20 -left-16 w-[24rem] h-[24rem] bg-blue-300/30 rounded-full blur-[130px]"
        />
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-20 -right-16 w-[26rem] h-[26rem] bg-cyan-200/40 rounded-full blur-[150px]"
        />
      </div>

      {/* Navbar (fixed inside layout) */}
      <Navbar user={user} handleLogout={handleLogout} />

      {/* Main content area: add top padding so content sits below fixed Navbar */}
      <main className="relative flex-1 z-10 px-4 md:px-6 py-8 max-w-7xl w-full mx-auto pt-20">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full"
        >
          {children}
        </motion.div>
      </main>

      {/* Footer (keeps same theme) */}
      <footer className="relative z-20 py-4 text-center text-gray-600 text-xs md:text-sm backdrop-blur-xl bg-white/40 border-t border-white/30">
        <p>Developed with 💙 by DTAOofficial — Maheswar Reddy Kuraparthi</p>
      </footer>

      {/* Small Device Warning Modal */}
      {showSmallWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.25 }}
            className="bg-white/88 backdrop-blur-2xl border border-white/60 rounded-3xl p-6 max-w-sm text-center shadow-2xl"
          >
            <img
              src="https://res.cloudinary.com/duhki4wze/image/upload/v1756755114/nhce_25-scaled-2_a6givc.png"
              alt="NHCE"
              className="w-20 mx-auto mb-4"
            />
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Device Not Supported</h2>
            <p className="text-gray-600 text-sm mb-4">
              Your screen is very narrow — rotate your device or use a larger screen for the best experience.
            </p>
            <button
              onClick={() => setShowSmallWarning(false)}
              className="px-5 py-2 rounded-xl font-semibold bg-gradient-to-r from-blue-400 to-cyan-400 text-white shadow hover:shadow-lg transition"
            >
              Got it
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
