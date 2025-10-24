// src/styles/GlobalStyles.js
import React, { useEffect } from "react";
import { motion } from "framer-motion";

/**
 * GlobalStyles (updated)
 * - Adds .dark -> theme overrides so dtao flips UI
 * - Keeps animated background (respects prefers-reduced-motion)
 * - Adds .toast-glow and simple .btn/.btn-primary helpers
 *
 * NOTE: nav-red-dot is intentionally kept in global CSS (src/index.css) to avoid duplication.
 */
export default function GlobalStyles() {
  useEffect(() => {
    // Prevent body flash: ensure we apply dark/light neutral tone quickly
    document.documentElement.style.backgroundColor = "transparent";
  }, []);

  return (
    <>
      <style>{`
        /* ========== iOS26-ish color palette (soft, pastel + slightly vivid accents) ========== */
        :root{
          --ios-26-bg-1: 244 249 255; /* very light azure (rgb) */
          --ios-26-bg-2: 235 247 255;
          --ios-26-accent-1: 57 175 255; /* cyan-blue */
          --ios-26-accent-2: 106 92 255; /* violet */
          --ios-26-accent-3: 90 220 170; /* mint */
          --ios-26-glass-alpha: 0.18;
          --ios-26-card-bg: 255 255 255; /* used with alpha to create frosted glass */
          --ios-26-text: 28 30 33;
          --max-blur: 140px;
          --soft-blur: 40px;
        }

        /* dark / dtao overrides */
        .dark, :root.dark {
          --ios-26-bg-1: 6 6 10;
          --ios-26-bg-2: 12 8 18;
          --ios-26-accent-1: 120 86 255; /* slightly vivid in dark */
          --ios-26-accent-2: 190 60 120;
          --ios-26-card-bg: 18 18 22;
          --ios-26-text: 238 238 242;
        }

        /* Smooth base gradient (not single color, not white/black) */
        body {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          color: rgb(var(--ios-26-text));
          background-image:
            radial-gradient(1200px 600px at 10% 10%, rgba(106,92,255,0.06), transparent 12%),
            radial-gradient(900px 500px at 90% 90%, rgba(57,175,255,0.05), transparent 14%),
            linear-gradient(180deg, rgba(var(--ios-26-bg-1),1) 0%, rgba(var(--ios-26-bg-2),1) 100%);
          background-attachment: fixed;
          background-size: cover;
          min-height: 100%;
          scroll-behavior: smooth;
        }

        /* Respect prefers-reduced-motion */
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; transition: none !important; scroll-behavior: auto !important; }
        }

        /* Smooth subtle page scroll snap on sections (opt-in by adding .page-snap on container) */
        .page-snap {
          scroll-snap-type: y proximity;
        }
        .page-snap > section {
          scroll-snap-align: start;
        }

        /* Glass card helper class (usable in Tailwind markup) */
        .glass {
          background: linear-gradient(180deg, rgba(var(--ios-26-card-bg), 0.72), rgba(var(--ios-26-card-bg), 0.52));
          backdrop-filter: blur(12px) saturate(120%);
          -webkit-backdrop-filter: blur(12px) saturate(120%);
          border: 1px solid rgba(255,255,255,0.12);
          box-shadow: 0 6px 30px rgba(22,23,24,0.06);
          border-radius: 16px;
        }

        /* dark glass tweak */
        .dark .glass {
          background: linear-gradient(180deg, rgba(12,12,16,0.68), rgba(18,18,22,0.4));
          border: 1px solid rgba(255,255,255,0.04);
        }

        /* Stronger glass (cards/header) */
        .glass-strong {
          background: linear-gradient(180deg, rgba(255,255,255,0.38), rgba(255,255,255,0.22));
          backdrop-filter: blur(18px) saturate(130%);
          -webkit-backdrop-filter: blur(18px) saturate(130%);
          border: 1px solid rgba(255,255,255,0.32);
          box-shadow: 0 10px 50px rgba(20,22,24,0.08);
          border-radius: 18px;
        }

        /* iOS-like pill / button glass */
        .glass-pill {
          background: rgba(255,255,255,0.12);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.12);
        }

        /* Custom scrollbar (desktop) */
        ::-webkit-scrollbar { width: 12px; height: 12px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, rgba(var(--ios-26-accent-1),0.22), rgba(var(--ios-26-accent-2),0.18));
          border-radius: 999px;
          border: 3px solid rgba(255,255,255,0.04);
          backdrop-filter: blur(6px);
        }

        /* Mobile-friendly reduced chrome */
        @media (max-width: 480px) {
          ::-webkit-scrollbar { display: none; }
        }

        /* Subtle entrance */
        .fade-up {
          opacity: 0;
          transform: translateY(6px);
          animation: fadeUp 520ms cubic-bezier(.2,.9,.2,1) forwards;
        }
        @keyframes fadeUp {
          to { opacity: 1; transform: translateY(0); }
        }

        /* Floating background shapes animations */
        @keyframes floatSlow {
          0% { transform: translateY(0) translateX(0) rotate(0deg); }
          50% { transform: translateY(-14px) translateX(6px) rotate(6deg); }
          100% { transform: translateY(0) translateX(0) rotate(0deg); }
        }
        @keyframes floatVerySlow {
          0% { transform: translateY(0) translateX(0); opacity: 1; }
          50% { transform: translateY(-30px) translateX(-10px); opacity: 0.85; }
          100% { transform: translateY(0) translateX(0); opacity: 1; }
        }
        @keyframes driftRight {
          0% { transform: translateX(0); }
          50% { transform: translateX(18px); }
          100% { transform: translateX(0); }
        }

        /* tiny decorative "smile" symbol */
        .smile-symbol {
          font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
          color: rgba(255,255,255,0.85);
          mix-blend-mode: screen;
          transform: translateZ(0);
          user-select: none;
        }

        /* Responsive scaling helper for background layer to keep shapes proportional */
        .bg-layer { transform-origin: center; }
        @media (max-width: 480px) { .bg-layer { transform: scale(1.05); } }
        @media (min-width: 1280px) { .bg-layer { transform: scale(1); } }

        /* ==================== Added helpers (Toast + Button) ==================== */

        /* subtle toast glow used by NotificationCard */
        .toast-glow {
          backdrop-filter: blur(8px) saturate(120%);
          -webkit-backdrop-filter: blur(8px) saturate(120%);
          border: 1px solid rgba(255,255,255,0.06);
          box-shadow: 0 4px 28px rgba(15,23,42,0.12);
          border-radius: 10px;
        }

        /* Simple button utilities if you prefer class-only swap instead of AnimatedButton */
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          user-select: none;
          border-radius: 8px;
          padding: 0.45rem 0.9rem;
          font-weight: 600;
          transition: transform 160ms ease, box-shadow 160ms ease, background-color 160ms ease;
        }
        .btn:active { transform: translateY(1px) scale(0.998); }
        .btn-primary {
          background: linear-gradient(90deg, #2563eb, #06b6d4);
          color: white;
          box-shadow: 0 6px 18px rgba(2,6,23,0.12);
        }
        .btn-primary:hover { filter: brightness(1.03); }

        /* Ensure reduced-motion disables the nav pulse if present */
        @media (prefers-reduced-motion: reduce) {
          .toast-glow { transition: none !important; animation: none !important; }
        }

        /* ================================================================================ */

      `}</style>

      {/* Animated background layer - pointer-events-none so it never blocks UI */}
      <div
        aria-hidden
        className="fixed inset-0 -z-10 pointer-events-none"
        style={{ willChange: "transform, opacity" }}
      >
        <div className="absolute inset-0 overflow-hidden bg-layer">
          {/* large soft orb (left-top) */}
          <motion.div
            initial={{ scale: 1, opacity: 0 }}
            animate={{ opacity: [0.7, 0.95, 0.7], scale: [1, 1.06, 1] }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -left-40 -top-28 w-[36rem] h-[36rem] rounded-full blur-[140px]"
            style={{
              background:
                "radial-gradient(circle at 35% 35%, rgba(106,92,255,0.18), rgba(57,175,255,0.06) 40%, transparent 65%)",
              mixBlendMode: "screen",
            }}
          />

          {/* medium orb (right-bottom) */}
          <motion.div
            initial={{ scale: 1 }}
            animate={{ opacity: [0.6, 0.9, 0.6], scale: [1, 1.08, 1] }}
            transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -right-36 -bottom-28 w-[40rem] h-[40rem] rounded-full blur-[160px]"
            style={{
              background:
                "radial-gradient(circle at 65% 60%, rgba(90,220,170,0.14), rgba(57,175,255,0.05) 35%, transparent 70%)",
              mixBlendMode: "screen",
            }}
          />

          {/* drifting square cluster - top-right, subtle */}
          <div className="absolute right-6 top-24 opacity-80">
            <div
              className="w-36 h-36 rounded-lg blur-[40px]"
              style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
                animation: "floatSlow 12s ease-in-out infinite",
                transformOrigin: "center",
              }}
            />
          </div>

          {/* a few floating mini shapes */}
          <div style={{ position: "absolute", left: "8%", top: "55%" }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: "rgba(106,92,255,0.18)",
                filter: "blur(8px)",
                animation: "floatVerySlow 16s ease-in-out infinite",
              }}
            />
          </div>

          <div style={{ position: "absolute", left: "24%", top: "18%" }}>
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: "rgba(57,175,255,0.22)",
                filter: "blur(6px)",
                animation: "driftRight 9s ease-in-out infinite",
                opacity: 0.95,
              }}
            />
          </div>

          {/* decorative tiny smile + dot particles drifting (keeps it friendly) */}
          <div style={{ position: "absolute", right: "12%", top: "40%", transform: "translateZ(0)" }}>
            <motion.div
              initial={{ y: 6, opacity: 0.85 }}
              animate={{ y: [0, -10, 0], rotate: [0, 3, 0] }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
              className="smile-symbol"
              style={{
                fontSize: 18,
                background: "linear-gradient(90deg, rgba(255,255,255,0.26), rgba(255,255,255,0.06))",
                padding: "6px 10px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.12)",
                backdropFilter: "blur(8px)",
              }}
            >
              ☺
            </motion.div>
          </div>

          {/* subtle repeating micro circles across bottom-left for texture */}
          <div style={{ position: "absolute", left: "-6%", bottom: "-6%", width: "42rem", height: "24rem" }}>
            <svg viewBox="0 0 100 60" preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
              <defs>
                <radialGradient id="g1" cx="50%" cy="50%">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.06)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0.00)" />
                </radialGradient>
              </defs>
              <g fill="url(#g1)">
                <circle cx="10" cy="8" r="3" />
                <circle cx="26" cy="16" r="2.3" />
                <circle cx="42" cy="6" r="2.6" />
                <circle cx="64" cy="18" r="3.5" />
                <circle cx="82" cy="10" r="2" />
              </g>
            </svg>
          </div>
        </div>
      </div>
    </>
  );
}
