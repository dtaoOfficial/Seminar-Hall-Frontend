// src/pages/LoginPage.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import AuthService from "../utils/AuthService";
import BackendIndicator from "../components/BackendIndicator";
import WaitingGame from "../components/WaitingGame";

/**
 * Inline icons — no external dependency
 */
const Eye = ({ size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOff = ({ size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M17.94 17.94A10.97 10.97 0 0112 20c-7 0-11-8-11-8a21.94 21.94 0 014.5-5.5" />
    <path d="M1 1l22 22" />
    <path d="M14.12 14.12A3 3 0 019.88 9.88" />
    <path d="M9.88 9.88L3.7 3.7" />
    <path d="M10.5 7a3 3 0 013 3" />
  </svg>
);

const LoginPage = ({ setUser }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState("checking");
  const [showGamePrompt, setShowGamePrompt] = useState(false);
  const [playGame, setPlayGame] = useState(false);
  const [showSorryPrompt, setShowSorryPrompt] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const [dots, setDots] = useState(".");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  // ✅ Auto redirect if already logged in
  useEffect(() => {
    const token = AuthService.getToken?.();
    const role = AuthService.getRole?.();
    if (token && role) {
      if (role === "ADMIN") navigate("/admin", { replace: true });
      else if (role === "DEPARTMENT") navigate("/dept", { replace: true });
    }
  }, [navigate]);

  // ✅ Animate dots for “please wait…”
  useEffect(() => {
    if (backendStatus !== "offline") return;
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "." : prev + "."));
    }, 700);
    return () => clearInterval(interval);
  }, [backendStatus]);

  // ✅ React to backend status changes
  useEffect(() => {
    if (backendStatus === "offline") {
      setShowGif(true);
      setShowGamePrompt(true);
      const timer = setTimeout(() => {
        if (backendStatus === "offline") setShowSorryPrompt(true);
      }, 60000);
      return () => clearTimeout(timer);
    } else if (backendStatus === "online") {
      setShowGif(false);
      setShowGamePrompt(false);
      setPlayGame(false);
      setShowSorryPrompt(false);
    }
  }, [backendStatus]);

  // ✅ Handle login
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await AuthService.login(email, password);
      const user = data.user;
      const role = (data.role || user?.role || "DEPARTMENT").toUpperCase();
      setUser && setUser(user);

      // Small delay for smooth UI
      setTimeout(() => {
        navigate(role === "ADMIN" ? "/admin" : "/dept", { replace: true });
      }, 400);
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Login failed. Try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row relative bg-gradient-to-br from-[#f8fbff] via-[#edf6ff] to-[#e9f5ff]">
      {/* Left Section */}
      <motion.div
        initial={{ x: -80, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="flex-1 relative flex flex-col justify-center items-center p-8 bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://res.cloudinary.com/duhki4wze/image/upload/v1757228960/NHCE_Photo_jhutdr.webp')",
        }}
      >
        <div className="absolute inset-0 bg-white/60 backdrop-blur-md" />

        <div className="relative z-10 text-center flex flex-col items-center justify-center w-full">
          <img
            src="https://res.cloudinary.com/duhki4wze/image/upload/v1756755114/nhce_25-scaled-2_a6givc.png"
            alt="NHCE Logo"
            className="w-48 md:w-56 mb-5 drop-shadow-xl mx-auto"
          />
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 text-center">
            New Horizon College of Engineering
          </h1>
          <p className="text-gray-600 mt-2 text-sm md:text-base text-center">
            Seminar Hall Booking & Management Portal
          </p>
        </div>
      </motion.div>

      {/* Right Section */}
      <motion.div
        initial={{ x: 80, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.9 }}
        className="flex-1 flex justify-center items-center p-8 relative"
      >
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="w-full max-w-md bg-white/70 backdrop-blur-2xl border border-white/50 rounded-3xl shadow-2xl p-8"
        >
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
            Admin & Department Login
          </h2>

          {/* 🌈 Larger Loading GIF */}
          {backendStatus === "offline" && showGif && (
            <div className="flex flex-col items-center mb-5">
              <div className="relative flex items-center justify-center">
                <img
                  src="/Loading.gif"
                  alt="Loading"
                  className="w-36 h-36 md:w-44 md:h-44 opacity-95 drop-shadow-2xl animate-pulse"
                />
                <div className="absolute w-40 h-40 md:w-48 md:h-48 rounded-full bg-blue-300/40 blur-2xl animate-ping"></div>
              </div>
              <p className="text-base md:text-lg text-gray-700 text-center mt-4 font-medium">
                ☕ Backend waking up{dots}
              </p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-gray-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full mt-1 rounded-xl bg-white/70 border border-gray-300 text-gray-800 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
                disabled={loading}
              />
            </div>

            {/* Password with show/hide */}
            <div className="relative">
              <label className="text-sm text-gray-700">Password</label>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full mt-1 rounded-xl bg-white/70 border border-gray-300 text-gray-800 px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-9 text-gray-500 hover:text-gray-700"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {error && (
              <p className="text-center text-red-500 text-sm bg-red-100 p-2 rounded-lg border border-red-300/40">
                {error}
              </p>
            )}

            <motion.button
              whileTap={{ scale: 0.97 }}
              whileHover={{ scale: 1.04 }}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
              type="submit"
              disabled={loading || backendStatus !== "online"}
              className={`w-full py-3 rounded-xl font-semibold text-lg shadow-md transition-all ${
                backendStatus === "online"
                  ? "bg-gradient-to-r from-blue-400 to-cyan-400 text-white"
                  : "bg-gray-300 text-gray-600 cursor-not-allowed"
              }`}
            >
              {backendStatus === "online"
                ? loading
                  ? "Signing in..."
                  : "Login"
                : "Backend Sleeping..."}
            </motion.button>
          </form>

          {/* 🎮 Game + Sorry Prompt */}
          <AnimatePresence>
            {showGamePrompt && backendStatus === "offline" && (
              <motion.div
                key="prompt"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
                className="mt-6 text-center"
              >
                {showSorryPrompt ? (
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-gray-700 text-sm mb-2"
                  >
                    😅 Sorry bro... backend still sleepy. Wanna play again while waiting?
                  </motion.p>
                ) : (
                  <p className="text-gray-700 text-sm mb-2">
                    Want to play a mini game while waiting?
                  </p>
                )}

                <div className="mt-3 flex justify-center gap-3">
                  <button
                    onClick={() => {
                      setPlayGame(true);
                      setShowGamePrompt(false);
                    }}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm shadow-sm"
                  >
                    Yes 🎮
                  </button>
                  <button
                    onClick={() => setShowGamePrompt(false)}
                    className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded-lg text-sm text-gray-800"
                  >
                    No thanks
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ✅ Backend Status Indicator */}
          <div className="mt-6 flex justify-center">
            <BackendIndicator onStatusChange={setBackendStatus} />
          </div>
        </motion.div>
      </motion.div>

      {/* 🎮 Game Overlay */}
      <WaitingGame
        visible={playGame}
        backendOnline={backendStatus === "online"}
        onExit={() => {
          setPlayGame(false);
          if (backendStatus === "offline") setShowGamePrompt(true);
        }}
      />
    </div>
  );
};

export default LoginPage;
