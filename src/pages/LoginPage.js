import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import AuthService from "../utils/AuthService";

const LoginPage = ({ setUser }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await AuthService.login(email, password);
      const user = data.user;
      const role = (data.role || user?.role || "DEPARTMENT")
        .toString()
        .toUpperCase();

      setUser && setUser(user);

      if (role === "ADMIN") navigate("/admin", { replace: true });
      else navigate("/dept", { replace: true });
    } catch (err) {
      const backendErr =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Login failed. Please try again.";
      setError(backendErr);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row overflow-hidden bg-gradient-to-br from-[#f8fbff] via-[#edf6ff] to-[#e9f5ff] relative">
      {/* Floating ambient background */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute top-10 left-10 w-72 h-72 bg-blue-300/30 rounded-full blur-[120px] animate-pulse"
        ></motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2, ease: "easeOut" }}
          className="absolute bottom-10 right-10 w-96 h-96 bg-cyan-200/40 rounded-full blur-[140px] animate-pulse-slow"
        ></motion.div>
      </div>

      {/* Left side with background image + logo */}
      <motion.div
        initial={{ x: -80, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.9, ease: "easeOut" }}
        className="flex-1 relative flex flex-col justify-center items-center p-8 bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://res.cloudinary.com/duhki4wze/image/upload/v1757228960/NHCE_Photo_jhutdr.webp')",
        }}
      >
        <div className="absolute inset-0 bg-white/60 backdrop-blur-md"></div>
        <div className="relative z-10 flex flex-col items-center text-center">
          <img
            src="https://res.cloudinary.com/duhki4wze/image/upload/v1756755114/nhce_25-scaled-2_a6givc.png"
            alt="NHCE Logo"
            className="w-44 md:w-56 drop-shadow-xl mb-5 transition-transform duration-700 ease-out hover:scale-105"
          />
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800">
            New Horizon College of Engineering
          </h1>
          <p className="mt-2 text-gray-600 text-sm md:text-base">
            Hall Booking & Seminar Management Portal
          </p>
        </div>
      </motion.div>

      {/* Right side login card */}
      <motion.div
        initial={{ x: 80, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.9, ease: [0.25, 0.8, 0.25, 1] }}
        className="flex-1 flex justify-center items-center relative p-6 md:p-10"
      >
        {/* Subtle background motion orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 2, delay: 0.3 }}
            className="absolute -top-20 right-20 w-80 h-80 bg-blue-200/50 rounded-full blur-[100px]"
          ></motion.div>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 2.2, delay: 0.6 }}
            className="absolute bottom-0 left-20 w-72 h-72 bg-cyan-200/40 rounded-full blur-[100px]"
          ></motion.div>
        </div>

        {/* Glass card */}
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{
            duration: 0.8,
            type: "spring",
            stiffness: 100,
            damping: 15,
          }}
          whileHover={{
            scale: 1.02,
            boxShadow: "0 0 40px rgba(59,130,246,0.25)",
          }}
          className="relative z-10 w-full max-w-md bg-white/70 backdrop-blur-2xl border border-white/50 rounded-3xl shadow-2xl p-8"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-800 mb-6">
            Admin & User Login
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="text-gray-700 text-sm font-medium">
                Email
              </label>
              <input
                type="email"
                className="w-full mt-2 rounded-xl bg-white/70 border border-gray-300 text-gray-800 placeholder-gray-400 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                placeholder="example@newhorizonindia.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div>
              <label className="text-gray-700 text-sm font-medium">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className="w-full mt-2 rounded-xl bg-white/70 border border-gray-300 text-gray-800 placeholder-gray-400 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm hover:text-blue-500 transition"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-red-500 text-sm bg-red-100/70 p-2 rounded-lg border border-red-300/40 text-center"
              >
                {error}
              </motion.p>
            )}

            {/* Login Button */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              whileHover={{
                scale: 1.04,
                background:
                  "linear-gradient(90deg, rgba(59,130,246,1) 0%, rgba(56,189,248,1) 100%)",
                boxShadow: "0 0 25px rgba(59,130,246,0.35)",
              }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 18,
              }}
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-lg bg-gradient-to-r from-blue-400 to-cyan-400 text-white shadow-md hover:shadow-lg transition-all"
            >
              {loading ? "Signing in..." : "Login"}
            </motion.button>
          </form>

          {/* Links */}
          <div className="flex justify-center gap-2 text-sm text-gray-600 mt-5">
            <a href="/forgot" className="hover:text-blue-500 transition">
              Forgot password?
            </a>
            <span>•</span>
            <a
              href="https://dtaofficial.netlify.app"
              className="hover:text-blue-500 transition"
            >
              Contact IT
            </a>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
