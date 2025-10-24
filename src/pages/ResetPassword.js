import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../utils/api";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function ResetPassword() {
  const query = useQuery();
  const navigate = useNavigate();
  const initialEmail = query.get("email") || "";
  const [email] = useState(initialEmail);
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);

  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const newPassRef = useRef(null);
  const errRef = useRef(null);

  useEffect(() => {
    if (newPassRef.current) newPassRef.current.focus();
  }, []);

  useEffect(() => {
    if (error && errRef.current) errRef.current.focus();
  }, [error]);

  function getPasswordStrength(pass) {
    if (!pass) return "";
    if (
      pass.length >= 12 &&
      /[A-Z]/.test(pass) &&
      /\d/.test(pass) &&
      /[^A-Za-z0-9]/.test(pass)
    )
      return "strong";
    if (pass.length >= 8 && (/[A-Z]/.test(pass) || /\d/.test(pass))) return "good";
    return "weak";
  }

  async function handleReset(e) {
    e.preventDefault();
    setError("");
    setFeedback("");

    if (!newPassword || newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    const normalized = (email || "").trim().toLowerCase();
    if (!normalized) {
      setError("Email missing. Start from Forgot Password.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/reset-password", {
        email: normalized,
        newPassword,
      });
      if (res && res.status === 200) {
        setFeedback("Password updated. Redirecting to login...");
        setTimeout(() => navigate("/"), 1200);
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

  const strength = getPasswordStrength(newPassword);

  const getStrengthColor = () => {
    switch (strength) {
      case "strong":
        return "text-green-600";
      case "good":
        return "text-yellow-600";
      case "weak":
        return "text-red-500";
      default:
        return "text-gray-500";
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-[#f8fbff] via-[#edf6ff] to-[#e9f5ff] relative overflow-hidden px-4 py-12">
      {/* background glow animation */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.04, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 6, repeat: Infinity }}
          className="absolute -top-12 -left-12 w-72 h-72 bg-blue-300/25 rounded-full blur-[96px]"
        />
        <motion.div
          animate={{ scale: [1, 1.06, 1], opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 7, repeat: Infinity }}
          className="absolute -bottom-8 -right-8 w-96 h-96 bg-cyan-200/30 rounded-full blur-[120px]"
        />
      </div>

      {/* main glass card */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        whileHover={{ scale: 1.01 }}
        className="relative z-10 w-full max-w-sm bg-white/70 backdrop-blur-2xl border border-white/50 rounded-3xl shadow-2xl p-6 md:p-8"
      >
        <div className="flex flex-col items-center text-center mb-6">
          <img
            src="https://res.cloudinary.com/duhki4wze/image/upload/v1756755114/nhce_25-scaled-2_a6givc.png"
            alt="NHCE Logo"
            className="w-28 md:w-32 mb-3 drop-shadow-md"
          />
          <h1 className="text-2xl font-semibold text-gray-800">Reset Password</h1>
          <p className="text-gray-600 text-sm mt-1">
            Set a new password for{" "}
            <span className="font-medium text-blue-600">{email || "(no email)"}</span>
          </p>
        </div>

        {/* form */}
        <form onSubmit={handleReset} className="space-y-4">
          {/* new password */}
          <div>
            <label className="text-gray-700 text-sm font-medium">New Password</label>
            <div className="relative">
              <input
                ref={newPassRef}
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full mt-2 rounded-xl bg-white/80 border border-gray-200 text-gray-800 placeholder-gray-400 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-300 transition"
                required
                disabled={loading}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-500 text-sm transition"
                onClick={() => setShowNew((s) => !s)}
              >
                {showNew ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* confirm password */}
          <div>
            <label className="text-gray-700 text-sm font-medium">Confirm Password</label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirm password"
                className="w-full mt-2 rounded-xl bg-white/80 border border-gray-200 text-gray-800 placeholder-gray-400 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-300 transition"
                required
                disabled={loading}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-500 text-sm transition"
                onClick={() => setShowConfirm((s) => !s)}
              >
                {showConfirm ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* password strength */}
          <div className={`text-sm mt-1 ${getStrengthColor()}`}>
            {newPassword
              ? `Password strength: ${strength}`
              : "Choose a secure password (min 6 chars)"}
          </div>

          {/* feedback / error */}
          {feedback && (
            <div className="text-green-600 text-sm bg-green-100/70 border border-green-300/40 p-2 rounded-lg text-center">
              {feedback}
            </div>
          )}
          {error && (
            <div
              ref={errRef}
              tabIndex={-1}
              className="text-red-500 text-sm bg-red-100/70 border border-red-300/40 p-2 rounded-lg text-center"
            >
              {error}
            </div>
          )}

          {/* buttons */}
          <div className="flex gap-3 pt-2">
            <motion.button
              whileTap={{ scale: 0.97 }}
              whileHover={{ scale: 1.03 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-xl font-semibold text-base bg-gradient-to-r from-blue-400 to-cyan-400 text-white shadow-md hover:shadow-lg transition"
            >
              {loading ? "Updating..." : "Update"}
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.97 }}
              whileHover={{ scale: 1.03 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              type="button"
              onClick={() => navigate("/")}
              disabled={loading}
              className="flex-1 py-3 rounded-xl font-semibold text-base bg-white/80 border border-gray-200 text-gray-700 hover:text-blue-500 transition"
            >
              Back
            </motion.button>
          </div>
        </form>
      </motion.div>

      <footer className="mt-8 text-gray-500 text-xs text-center z-10">
        © 2025 NHCE Seminar Management Portal — NHCE AquaGlass Theme
      </footer>
    </div>
  );
}
