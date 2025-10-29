import React, { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";
import { motion } from "framer-motion";

export default function ServerStatusIndicator({ onStatusChange }) {
  const [online, setOnline] = useState(null); // null = checking
  const [checking, setChecking] = useState(false);
  const intervalRef = useRef(null);

  // ✅ Wrap in useCallback so dependency is stable
  const checkServer = useCallback(async () => {
    setChecking(true);
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/health`);
      const isOnline = res.data === "OK";
      setOnline(isOnline);
      onStatusChange?.(isOnline ? "online" : "offline");
    } catch {
      setOnline(false);
      onStatusChange?.("offline");
    } finally {
      setTimeout(() => setChecking(false), 800);
    }
  }, [onStatusChange]);

  useEffect(() => {
    checkServer();

    const setAdaptiveInterval = () => {
      clearInterval(intervalRef.current);
      const delay = online ? 20000 : 10000; // slower when online, faster when offline
      intervalRef.current = setInterval(checkServer, delay);
    };

    setAdaptiveInterval();

    return () => clearInterval(intervalRef.current);
  }, [online, checkServer]); // ✅ clean dependencies

  return (
    <div
      onClick={checkServer}
      title={
        checking
          ? "⏳ Checking server..."
          : online
          ? "🟢 Server Online — click to recheck"
          : "🔴 Server Offline — click to retry"
      }
      className="flex items-center gap-2 cursor-pointer select-none transition-all"
    >
      <motion.div
        className="w-4 h-4 rounded-full shadow"
        animate={{
          backgroundColor:
            online === null
              ? "#fbbf24"
              : online
              ? "#22c55e"
              : "#ef4444",
          scale: checking ? [1, 1.15, 1] : [1, 1.05, 1],
          boxShadow:
            online === null
              ? "0 0 8px rgba(251,191,36,0.6)"
              : online
              ? "0 0 10px rgba(34,197,94,0.5)"
              : "0 0 10px rgba(239,68,68,0.5)",
        }}
        transition={{
          duration: 1.8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.span
        className="text-sm font-medium text-gray-700 dark:text-gray-200"
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {checking
          ? "Checking..."
          : online
          ? "Server Online"
          : "Server Offline"}
      </motion.span>
    </div>
  );
}
