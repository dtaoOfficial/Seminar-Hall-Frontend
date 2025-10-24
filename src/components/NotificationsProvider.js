import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

/**
 * NotificationsProvider
 *
 * Usage:
 *  - Wrap your app once (you already did in index.js)
 *  - In components: const { notify } = useNotification();
 *  - notify("Saved", "success", { autoDismiss: 2000, fullscreen: false });
 *
 * Options:
 *  - autoDismiss: ms (false/0 = do not auto dismiss)
 *  - fullscreen: boolean -> true for full page overlay (blur background)
 *  - sound: boolean -> play sound
 *  - icon: react node (optional)
 */

const NotificationsContext = createContext(null);

let portalRoot = null;
function ensurePortalRoot() {
  if (typeof document === "undefined") return null;
  if (!portalRoot) {
    portalRoot = document.getElementById("global-notification-root");
    if (!portalRoot) {
      portalRoot = document.createElement("div");
      portalRoot.id = "global-notification-root";
      // extremely high z-index to keep above any header (but avoid overflow issues)
      portalRoot.style.zIndex = String(2147483645); // large but avoid overflow on some browsers
      portalRoot.style.position = "fixed";
      portalRoot.style.inset = "0";
      portalRoot.style.pointerEvents = "none"; // default none; notifications themselves enable pointer-events
      document.body.appendChild(portalRoot);
      // debug log (remove if noisy)
      // console.info("[NotificationsProvider] created portal root", portalRoot.id);
    }
  }
  return portalRoot;
}

// subtle webaudio sound (short)
const playBeep = (type = "info") => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    // different pitch for types
    const pitchMap = { success: 660, error: 220, warn: 330, info: 440 };
    o.frequency.value = pitchMap[type] || 440;
    g.gain.value = 0;
    o.connect(g);
    g.connect(ctx.destination);
    const now = ctx.currentTime;
    o.start(now);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    o.stop(now + 0.2);
    setTimeout(() => {
      try { ctx.close(); } catch {}
    }, 600);
  } catch (err) {
    // ignore audio errors silently
  }
};

const DEFAULT_AUTO_DISMISS = 3500;

function NotificationCard({ n, onClose }) {
  // choose animation & color per type
  const type = n.type || "info";
  const colors = {
    success: { bg: "linear-gradient(90deg,#12B886,#06B6D4)", accent: "#10B981" },
    error: { bg: "linear-gradient(90deg,#EF4444,#F97316)", accent: "#EF4444" },
    warn: { bg: "linear-gradient(90deg,#F59E0B,#FB923C)", accent: "#F59E0B" },
    info: { bg: "linear-gradient(90deg,#3B82F6,#06B6D4)", accent: "#3B82F6" },
    default: { bg: "linear-gradient(90deg,#64748B,#94A3B8)", accent: "#64748B" },
  };
  const style = colors[type] || colors.default;

  // smoother, spring-based entrance & exit (UI-only change)
  const cardVariants = {
    initial: { y: n.fullscreen ? -40 : -14, opacity: 0, scale: 0.96 },
    animate: {
      y: 0,
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 420,
        damping: 30,
        mass: 0.5,
        bounce: 0.25,
      },
    },
    exit: {
      y: n.fullscreen ? 28 : -12,
      opacity: 0,
      scale: 0.96,
      transition: {
        duration: 0.35,
        ease: [0.25, 0.8, 0.3, 1],
      },
    },
  };

  const cardStyle = {
    pointerEvents: "auto",
    background: "rgba(255,255,255,0.98)",
    borderRadius: n.fullscreen ? 14 : 10,
    boxShadow: "0 10px 40px rgba(15,23,42,0.18)",
    padding: n.fullscreen ? "18px 26px" : "10px 14px",
    minWidth: n.fullscreen ? "min(1200px, 86vw)" : 320,
    maxWidth: "min(1200px, 92vw)",
    display: "flex",
    alignItems: "center",
    gap: 14,
    border: `1px solid rgba(0,0,0,0.06)`,
  };

  const textStyle = { margin: 0, color: "#111827", fontWeight: 600, fontSize: n.fullscreen ? 18 : 14, textAlign: "center", lineHeight: 1.1 };

  return (
    <motion.div
      layout
      variants={cardVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={cardStyle}
      className="toast-glow" // subtle CSS glow class (add CSS below)
      role="status"
      aria-live={type === "error" ? "assertive" : "polite"}
    >
      {/* accent bar / icon */}
      <div style={{ width: 10, height: 40, borderRadius: 8, background: style.accent }} aria-hidden />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={textStyle}>{n.message}</div>
        {n.detail ? <div style={{ marginTop: 6, fontSize: 13, color: "#6B7280", fontWeight: 500 }}>{n.detail}</div> : null}
      </div>

      {/* close button */}
      <button
        onClick={() => onClose(n.id)}
        aria-label="Close notification"
        style={{
          background: "transparent",
          border: 0,
          color: "#374151",
          cursor: "pointer",
          fontSize: 20,
          padding: 8,
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </motion.div>
  );
}

// quick adaptive timing for mobile vs desktop (UI-only helper)
const isMobileDevice = typeof window !== "undefined" && window.innerWidth < 768;

export function NotificationsProvider({ children }) {
  const [queue, setQueue] = useState([]); // queued notifications
  const [current, setCurrent] = useState(null); // currently visible
  const idRef = useRef(1);
  const portal = useMemo(() => ensurePortalRoot(), []);

  // show next queued
  useEffect(() => {
    if (!current && queue.length > 0) {
      setCurrent(queue[0]);
      setQueue((q) => q.slice(1));
    }
  }, [queue, current]);

  // auto-dismiss handling
  useEffect(() => {
    if (!current) {
      // remove aria-hidden when none
      try {
        const root = document.getElementById("root");
        if (root) root.removeAttribute("aria-hidden");
      } catch {}
      return;
    }

    // if full-screen, mark main root aria-hidden to avoid screenreader confusion
    try {
      if (current.fullscreen) {
        const root = document.getElementById("root");
        if (root) root.setAttribute("aria-hidden", "true");
      } else {
        const root = document.getElementById("root");
        if (root) root.removeAttribute("aria-hidden");
      }
    } catch {}

    if (current.sound) {
      playBeep(current.type);
    }

    const t = current.autoDismiss !== false && current.autoDismiss > 0
      ? setTimeout(() => {
          // dismiss
          setCurrent((c) => (c && c.id === current.id ? null : c));
        }, current.autoDismiss || DEFAULT_AUTO_DISMISS)
      : null;

    return () => {
      if (t) clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  // API function to push a notification
  const notify = (message = "", type = "info", opts = {}) => {
    const id = `n-${Date.now()}-${idRef.current++}`;
    const n = {
      id,
      message,
      type,
      detail: opts.detail || null,
      fullscreen: Boolean(opts.fullscreen),
      autoDismiss: typeof opts.autoDismiss === "number" ? opts.autoDismiss : (opts.fullscreen ? (opts.autoDismiss ?? 3500) : (opts.autoDismiss ?? 3000)),
      sound: Boolean(opts.sound),
      createdAt: Date.now(),
    };
    // if no current and empty queue -> show immediately
    if (!current) {
      setCurrent(n);
    } else {
      setQueue((q) => [...q, n]);
    }
    return id;
  };

  const close = (id) => {
    // if closing current
    if (current && current.id === id) {
      setCurrent(null);
      return;
    }
    // otherwise remove from queue
    setQueue((q) => q.filter((x) => x.id !== id));
  };

  const value = { notify, close };

  // Render portal UI
  const portalContent = (
    <div aria-hidden={false} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <AnimatePresence>
        {current && (
          <motion.div
            key={current.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: isMobileDevice ? 0.18 : 0.26 }} // adaptive for mobile vs desktop
            style={{
              position: "fixed",
              inset: 0,
              display: "flex",
              alignItems: current.fullscreen ? "center" : "flex-start",
              justifyContent: "center",
              padding: current.fullscreen ? 36 : 16,
              pointerEvents: "none",
              zIndex: 2147483646,
            }}
          >
            {/* background blur for fullscreen (softer timing) */}
            {current.fullscreen ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45, ease: [0.25, 0.8, 0.3, 1] }} // softened fade
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(15,23,42,0.25)",
                  backdropFilter: "blur(8px) saturate(120%)",
                  WebkitBackdropFilter: "blur(8px) saturate(120%)",
                  pointerEvents: "auto",
                }}
                onClick={() => close(current.id)}
              />
            ) : null}

            <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
              <div style={{ pointerEvents: "auto" }}>
                <NotificationCard n={current} onClose={close} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  useEffect(() => {
    // ensure portal exists on mount
    ensurePortalRoot();
  }, []);

  return (
    <NotificationsContext.Provider value={value}>
      {children}
      {portal ? createPortal(portalContent, portal) : null}
    </NotificationsContext.Provider>
  );
}

export function useNotification() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error("useNotification must be used inside NotificationsProvider");
  }
  return ctx;
}
