import React, { useEffect, useState } from "react";
import { checkBackendStatus } from "../utils/BackendStatus";
import { motion } from "framer-motion";

/**
 * ✅ Auto-refreshing backend indicator
 * - Checks backend every 10s
 * - Instantly updates parent (LoginPage)
 * - Smooth animation on transitions
 */
export default function BackendIndicator({ onStatusChange }) {
  const [status, setStatus] = useState("checking"); // "checking" | "online" | "offline"

  useEffect(() => {
    let interval;

    const check = async () => {
      const res = await checkBackendStatus(4000);
      const newStatus = res.online ? "online" : "offline";
      setStatus((prev) => (prev !== newStatus ? newStatus : prev));

      // ✅ Notify parent (LoginPage)
      if (onStatusChange) onStatusChange(newStatus);
    };

    // first check
    check();

    // ✅ Auto recheck every 10s
    interval = setInterval(check, 10000);

    return () => clearInterval(interval);
  }, [onStatusChange]);

  return (
    <motion.div
      className="flex items-center gap-2 text-sm font-medium"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <motion.div
        className="w-3 h-3 rounded-full"
        animate={{
          backgroundColor:
            status === "checking"
              ? "#fbbf24" // yellow
              : status === "online"
              ? "#22c55e" // green
              : "#ef4444", // red
          scale:
            status === "checking" || status === "offline"
              ? [1, 1.25, 1]
              : [1, 1.05, 1],
          boxShadow:
            status === "online"
              ? "0 0 8px #22c55e"
              : status === "checking"
              ? "0 0 6px #fbbf24"
              : "0 0 6px #ef4444",
        }}
        transition={{
          repeat: Infinity,
          duration: 1.5,
          ease: "easeInOut",
        }}
      />
      <span className="text-gray-700">
        {status === "checking" && "Checking backend..."}
        {status === "online" && "Backend Online"}
        {status === "offline" && "Backend Sleeping (Waking up...)"}
      </span>
    </motion.div>
  );
}
