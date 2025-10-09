// src/hooks/useScrollReveal.js
import { useEffect } from "react";

/**
 * useScrollReveal
 * Adds fade-up animation to elements with [data-reveal]
 * Usage:
 *   useScrollReveal();          // activate in a page or layout
 *   <div data-reveal>content</div>
 */
export default function useScrollReveal(selector = "[data-reveal]") {
  useEffect(() => {
    if (typeof window === "undefined") return; // SSR safe
    const prefersReduced =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return; // accessibility respect

    const els = Array.from(document.querySelectorAll(selector));
    if (!els.length) return;

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal-active");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    els.forEach(el => {
      el.classList.add("reveal");
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, [selector]);
}
