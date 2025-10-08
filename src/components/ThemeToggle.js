import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { motion } from "framer-motion";

export default function ThemeToggle({ className = "" }) {
  const { theme, setTheme } = useTheme();
  const isDtao = theme === "dtao";

  const toggle = () => setTheme(isDtao ? "light" : "dtao");

  return (
    <button
      onClick={toggle}
      aria-pressed={isDtao}
      aria-label="Toggle theme"
      className={`flex items-center gap-2 px-3 py-1 rounded-full transition-shadow focus:outline-none focus:ring-2 focus:ring-offset-1 ${className} ${
        isDtao ? "bg-violet-700/95 text-white shadow-lg" : "bg-white/90 text-slate-800 shadow-sm"
      }`}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 420, damping: 26 }}
        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
          isDtao ? "bg-black/85 text-white" : "bg-yellow-400 text-black"
        }`}
      >
        {isDtao ? "D" : "L"}
      </motion.span>
      <span className="text-xs font-medium select-none">{isDtao ? "dtao" : "light"}</span>
    </button>
  );
}
