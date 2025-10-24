import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../utils/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSend(e) {
    e.preventDefault();
    setError("");
    setFeedback("");

    const normalized = (email || "").trim().toLowerCase();
    if (!normalized) {
      setError("Enter your college email");
      return;
    }
    if (!normalized.endsWith("@newhorizonindia.edu")) {
      setError("Use your college email (example@newhorizonindia.edu)");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/forgot-password", { email: normalized });
      if (res && res.status === 200) {
        setFeedback(res.data?.message || "If an account exists, an OTP was sent to that email.");
        setTimeout(() => navigate(`/verify?email=${encodeURIComponent(normalized)}`), 700);
      } else {
        setError(res?.data?.error || "Something went wrong — try again later");
      }
    } catch (err) {
      const backendErr =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Something went wrong — try again later";
      setError(backendErr);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-[#f8fbff] via-[#edf6ff] to-[#e9f5ff] relative overflow-hidden px-4">
      {/* Ambient background glow */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute top-10 left-10 w-80 h-80 bg-blue-300/30 rounded-full blur-[120px] animate-pulse"
        ></motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2, ease: "easeOut" }}
          className="absolute bottom-10 right-10 w-96 h-96 bg-cyan-200/40 rounded-full blur-[140px] animate-pulse-slow"
        ></motion.div>
      </div>

      {/* Glass card */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        whileHover={{
          scale: 1.02,
          boxShadow: "0 0 40px rgba(59,130,246,0.25)",
        }}
        className="relative z-10 w-full max-w-md bg-white/70 backdrop-blur-2xl border border-white/50 rounded-3xl shadow-2xl p-8"
      >
        {/* Logo */}
        <div className="flex flex-col items-center text-center mb-6">
          <img
            src="https://res.cloudinary.com/duhki4wze/image/upload/v1756755114/nhce_25-scaled-2_a6givc.png"
            alt="NHCE Logo"
            className="w-32 md:w-40 drop-shadow-lg mb-4 transition-transform duration-700 ease-out hover:scale-105"
          />
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
            Forgot Password
          </h1>
          <p className="text-gray-600 text-sm md:text-base mt-2">
            Enter your NHCE email. We'll send you a 6-digit OTP.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSend} className="space-y-5">
          <div>
            <label className="text-gray-700 text-sm font-medium">Email</label>
            <input
              type="email"
              value={email}
              placeholder="example@newhorizonindia.edu"
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mt-2 rounded-xl bg-white/70 border border-gray-300 text-gray-800 placeholder-gray-400 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
              required
              disabled={loading}
              autoComplete="email"
            />
          </div>

          {/* Feedback or error */}
          {feedback && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-green-600 text-sm bg-green-100/70 border border-green-300/40 p-2 rounded-lg text-center"
            >
              {feedback}
            </motion.div>
          )}
          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-500 text-sm bg-red-100/70 border border-red-300/40 p-2 rounded-lg text-center"
            >
              {error}
            </motion.div>
          )}

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <motion.button
              whileTap={{ scale: 0.97 }}
              whileHover={{
                scale: 1.03,
                background:
                  "linear-gradient(90deg, rgba(59,130,246,1) 0%, rgba(56,189,248,1) 100%)",
                boxShadow: "0 0 20px rgba(59,130,246,0.25)",
              }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 20,
              }}
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-xl font-semibold text-lg bg-gradient-to-r from-blue-400 to-cyan-400 text-white shadow-md hover:shadow-lg transition-all"
            >
              {loading ? "Sending..." : "Send OTP"}
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.97 }}
              whileHover={{
                scale: 1.03,
                background: "rgba(255,255,255,0.9)",
                boxShadow: "0 0 15px rgba(0,0,0,0.08)",
              }}
              onClick={() => navigate("/")}
              disabled={loading}
              className="flex-1 py-3 rounded-xl font-semibold text-lg bg-white/60 backdrop-blur-xl text-gray-700 border border-gray-300 hover:text-blue-500 transition-all"
              type="button"
            >
              Back to Login
            </motion.button>
          </div>
        </form>
      </motion.div>

      <footer className="mt-8 text-gray-500 text-xs text-center z-10">
        © 2025 NHCE Seminar Management Portal
      </footer>
    </div>
  );
}
