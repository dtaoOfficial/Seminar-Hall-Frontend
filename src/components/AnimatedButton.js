// src/components/AnimatedButton.js
import React from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * AnimatedButton
 * Props:
 *  - variant: "primary" | "ghost" (matches CSS .btn-primary / .btn-ghost)
 *  - size: "sm" | "md" | "lg"
 *  - className: additional classes
 *  - ...props: native button props
 *
 * Usage:
 *  <AnimatedButton onClick={...}>Save</AnimatedButton>
 *  <AnimatedButton variant="ghost" size="sm">Cancel</AnimatedButton>
 */
export default function AnimatedButton({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}) {
  const reduce = useReducedMotion();

  const baseClass = `btn ${variant === "primary" ? "btn-primary" : "btn-ghost"} ${
    size === "sm" ? "btn-sm" : size === "lg" ? "btn-lg" : ""
  } ${className}`;

  // micro interactions: press/hover. If user prefers reduced motion, disable.
  const whileTap = reduce ? {} : { scale: 0.992, y: 0.6 };
  const whileHover = reduce ? {} : { y: -2, scale: 1.002 };

  return (
    <motion.button
      {...props}
      whileTap={whileTap}
      whileHover={whileHover}
      transition={{ type: "spring", stiffness: 500, damping: 40, mass: 0.6 }}
      className={baseClass + " animated-press"}
    >
      {children}
    </motion.button>
  );
}
