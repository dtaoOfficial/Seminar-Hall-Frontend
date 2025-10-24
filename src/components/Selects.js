// src/components/Selects.jsx
import React, { useEffect, useRef, useState } from "react";
import { useTheme } from "../contexts/ThemeContext";

/**
 * Dropdown
 * - options: string[] or { value, label }[]
 * - value: selected value
 * - onChange: (v) => void
 * - placeholder: string
 */
export function Dropdown({ options = [], value, onChange, className = "", ariaLabel = "Select", placeholder = "" }) {
  const { theme } = useTheme() || {};
  const isDtao = theme === "dtao";
  const ref = useRef(null);
  const [open, setOpen] = useState(false);

  const normalized = options.map((o) => (typeof o === "string" ? { value: o, label: o } : { value: o.value, label: o.label ?? o.value }));
  const selectedLabel = (normalized.find((o) => String(o.value) === String(value)) || {}).label ?? "";

  useEffect(() => {
    function onDoc(e) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const onKeyDownRoot = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen((s) => !s);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const onOptionKey = (e, opt) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onChange(opt.value);
      setOpen(false);
    }
  };

  return (
    <div ref={ref} className={`relative inline-block w-full ${className}`}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((s) => !s)}
        onKeyDown={onKeyDownRoot}
        className={`w-full text-left rounded-md px-3 py-2 border flex items-center justify-between ${isDtao ? "bg-transparent border-violet-700 text-slate-100" : "bg-white border-gray-200 text-gray-800"}`}
      >
        <span className={`${selectedLabel ? "" : (isDtao ? "text-slate-400" : "text-gray-400")}`}>{selectedLabel || placeholder}</span>
        <svg className={`w-4 h-4 ml-2 ${isDtao ? "text-slate-300" : "text-slate-600"}`} viewBox="0 0 24 24" fill="none">
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          tabIndex={-1}
          className={`absolute z-50 mt-1 w-full rounded-md shadow-lg ${isDtao ? "bg-black/80 border border-violet-800 text-slate-100" : "bg-white border"}`}
          style={{ maxHeight: `${5 * 40}px`, overflowY: "auto" }}
        >
          {normalized.map((opt) => (
            <div
              key={opt.value}
              role="option"
              aria-selected={String(opt.value) === String(value)}
              tabIndex={0}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              onKeyDown={(e) => onOptionKey(e, opt)}
              className={`px-3 py-2 cursor-pointer ${isDtao ? "hover:bg-violet-900/60" : "hover:bg-gray-100"} ${String(opt.value) === String(value) ? (isDtao ? "bg-violet-900/70 font-medium" : "bg-blue-50 font-medium") : ""}`}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * TimeSelect
 * - value: "HH:MM"
 * - onChange: (v) => void
 * - options: array of HH:MM strings (default 15-min grid)
 */
export function TimeSelect({ value, onChange, options = null, className = "", ariaLabel = "Select time" }) {
  const { theme } = useTheme() || {};
  const isDtao = theme === "dtao";
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  const TIME_OPTIONS = options || (() => {
    const out = [];
    for (let h = 8; h <= 18; h++) for (let m = 0; m < 60; m += 15) { if (h === 18 && m > 0) continue; out.push(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`); }
    return out;
  })();

  useEffect(() => {
    function onDoc(e) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (open) {
      const el = ref.current?.querySelector(`[data-val="${value}"]`);
      if (el?.scrollIntoView) el.scrollIntoView({ block: "nearest" });
    }
  }, [open, value]);

  const to12Label = (hhmm) => {
    if (!hhmm) return "";
    const [hh, mm] = hhmm.split(":").map(Number);
    const period = hh >= 12 ? "PM" : "AM";
    const hour12 = ((hh + 11) % 12) + 1;
    return `${String(hour12).padStart(2,"0")}:${String(mm).padStart(2,"0")} ${period}`;
  };

  return (
    <div ref={ref} className={`relative inline-block ${className}`}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((s) => !s)}
        className={`w-full text-left rounded-md px-3 py-2 border flex items-center justify-between ${isDtao ? "bg-transparent border-violet-700 text-slate-100" : ""}`}
      >
        <span>{to12Label(value)}</span>
        <svg className={`w-4 h-4 ml-2 ${isDtao ? "text-slate-300" : "text-slate-600"}`} viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>

      {open && (
        <div
          role="listbox"
          tabIndex={-1}
          className={`absolute z-50 mt-1 w-full rounded-md shadow-lg ${isDtao ? "bg-black/80 border border-violet-800 text-slate-100" : "bg-white border"}`}
          style={{ maxHeight: `${5 * 40}px`, overflowY: "auto" }}
        >
          {TIME_OPTIONS.map((opt) => (
            <div
              key={opt}
              role="option"
              data-val={opt}
              aria-selected={opt === value}
              tabIndex={0}
              onClick={() => { onChange(opt); setOpen(false); }}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onChange(opt); setOpen(false); } }}
              className={`px-3 py-2 cursor-pointer ${isDtao ? "hover:bg-violet-900/60" : "hover:bg-gray-100"} ${opt === value ? (isDtao ? "bg-violet-900/70 font-semibold" : "bg-blue-50 font-semibold") : ""}`}
            >
              {to12Label(opt)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
