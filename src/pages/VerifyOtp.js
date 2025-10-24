import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../utils/api";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function VerifyOtp() {
  const query = useQuery();
  const navigate = useNavigate();
  const initialEmail = query.get("email") || "";

  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);

  const otpRef = useRef(null);
  const RESEND_COOLDOWN = 60;
  const DEFAULT_OTP_TTL = 300; // 5 min
  const [cooldown, setCooldown] = useState(0);
  const [remaining, setRemaining] = useState(DEFAULT_OTP_TTL);

  const cooldownRef = useRef(null);
  const countdownRef = useRef(null);

  useEffect(() => {
    startCountdown();
    if (otpRef.current) otpRef.current.focus();
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
    // eslint-disable-next-line
  }, []);

  function startCooldown(seconds = RESEND_COOLDOWN) {
    setCooldown(seconds);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown((p) => {
        if (p <= 1) {
          clearInterval(cooldownRef.current);
          return 0;
        }
        return p - 1;
      });
    }, 1000);
  }

  function startCountdown(seconds = DEFAULT_OTP_TTL) {
    setRemaining(seconds);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setRemaining((p) => {
        if (p <= 1) {
          clearInterval(countdownRef.current);
          return 0;
        }
        return p - 1;
      });
    }, 1000);
  }

  async function handleVerify(e) {
    e.preventDefault();
    setError("");
    setFeedback("");
    const normalized = (email || "").trim().toLowerCase();
    if (!normalized || !otp) {
      setError("Provide email and OTP");
      return;
    }
    if (remaining <= 0) {
      setError("OTP expired — please resend");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/auth/verify-otp", { email: normalized, otp });
      if (res && res.status === 200) {
        navigate(`/reset?email=${encodeURIComponent(normalized)}`);
      } else {
        setError(res?.data?.error || "Invalid or expired OTP");
      }
    } catch {
      setError("Invalid or expired OTP");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError("");
    setFeedback("");
    const normalized = (email || "").trim().toLowerCase();
    if (!normalized.endsWith("@newhorizonindia.edu")) {
      setError("Use your college email (example@newhorizonindia.edu)");
      return;
    }
    if (cooldown > 0) return;

    setLoading(true);
    try {
      await api.post("/auth/resend-otp", { email: normalized });
      setFeedback("If an account exists, OTP sent to email.");
      startCooldown();
      startCountdown(DEFAULT_OTP_TTL);
    } catch {
      setError("Something went wrong — try again later");
    } finally {
      setLoading(false);
    }
  }

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  const percent = Math.round((remaining / DEFAULT_OTP_TTL) * 100);

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-[#f8fbff] via-[#eef8ff] to-[#e9f5ff] relative overflow-hidden px-4 py-12">
      {/* animated background orbs (subtle) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.04, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 6, repeat: Infinity }}
          className="absolute -top-12 -left-12 w-72 h-72 bg-blue-300/24 rounded-full blur-[96px]"
        />
        <motion.div
          animate={{ scale: [1, 1.06, 1], opacity: [0.5, 0.95, 0.5] }}
          transition={{ duration: 7, repeat: Infinity }}
          className="absolute -bottom-8 -right-8 w-96 h-96 bg-cyan-200/26 rounded-full blur-[120px]"
        />
      </div>

      {/* compact glass card */}
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        whileHover={{ scale: 1.01 }}
        className="relative z-10 w-full max-w-sm bg-white/72 backdrop-blur-2xl border border-white/50 rounded-3xl shadow-2xl p-6 md:p-8"
      >
        {/* logo + title (medium logo) */}
        <div className="flex flex-col items-center text-center mb-5">
          <img
            src="https://res.cloudinary.com/duhki4wze/image/upload/v1756755114/nhce_25-scaled-2_a6givc.png"
            alt="NHCE Logo"
            className="w-28 md:w-32 mb-3 drop-shadow-md"
          />
          <h1 className="text-2xl font-semibold text-gray-800">Verify OTP</h1>
          <p className="text-gray-600 text-sm mt-1">Enter the 6-digit OTP sent to your email.</p>
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="text-gray-700 text-sm font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mt-2 rounded-xl bg-white/80 border border-gray-200 text-gray-800 placeholder-gray-400 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-300 transition"
              disabled={loading}
            />
          </div>

          <div>
            <label className="text-gray-700 text-sm font-medium">OTP</label>
            <input
              ref={otpRef}
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
              maxLength={6}
              required
              disabled={loading}
              className="w-full mt-2 rounded-xl bg-white/80 border border-gray-200 text-gray-800 placeholder-gray-400 px-4 py-3 tracking-widest text-center text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-300 transition"
            />
          </div>

          {/* countdown */}
          <div className="text-center text-gray-600 text-sm">
            {remaining > 0 ? `Expires in ${formatTime(remaining)}` : "OTP expired"}
            <div className="w-full h-2 mt-3 bg-gray-200/60 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: `${percent}%` }}
                animate={{ width: `${percent}%` }}
                transition={{ duration: 0.8 }}
                className={`h-2 rounded-full ${remaining > 60 ? "bg-gradient-to-r from-blue-400 to-cyan-400" : "bg-gradient-to-r from-orange-400 to-red-400"}`}
              />
            </div>
          </div>

          {/* buttons */}
          <div className="flex gap-3 pt-2">
            <motion.button
              whileTap={{ scale: 0.97 }}
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              type="submit"
              disabled={loading || remaining <= 0}
              className="flex-1 py-3 rounded-xl font-semibold text-base bg-gradient-to-r from-blue-400 to-cyan-400 text-white shadow-md hover:shadow-lg transition"
            >
              {loading ? "Verifying..." : "Verify"}
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.97 }}
              whileHover={{ scale: 1.02 }}
              onClick={handleResend}
              disabled={loading || cooldown > 0}
              className="flex-1 py-3 rounded-xl font-semibold text-base bg-white/80 border border-gray-200 text-gray-700 hover:text-blue-500 transition"
              type="button"
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend"}
            </motion.button>
          </div>

          {/* messages */}
          {feedback && <div className="text-green-600 text-sm bg-green-100/70 border border-green-300/40 p-2 rounded-lg text-center">{feedback}</div>}
          {error && <div className="text-red-500 text-sm bg-red-100/70 border border-red-300/40 p-2 rounded-lg text-center">{error}</div>}
        </form>
      </motion.div>

      {/* footer with breathing space */}
      <footer className="mt-8 text-gray-500 text-xs text-center z-10">
        © 2025 NHCE Seminar Management Portal — NHCE AquaGlass
      </footer>
    </div>
  );
}
