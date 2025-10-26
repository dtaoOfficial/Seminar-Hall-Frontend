// src/pages/UserRegisterPage.js
import React, { useState, useEffect, useRef, useCallback } from "react";
import api from "../../utils/api";
import { useTheme } from "../../contexts/ThemeContext";

// --- Eye icons (SVG) ---
const EyeOpenIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const EyeClosedIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
  </svg>
);
// --- End Eye icons ---

const fallbackDepts = [
  "CSE-1",
  "CSE-2",
  "DS",
  "ISE",
  "AI&ML",
  "EEE",
  "ECE",
  "ME",
  "MBA",
  "MCA",
  "MTech",
];

/* ---------- Small accessible Dropdown (replaces native select) ---------- */
function Dropdown({ options = [], value, onChange, className = "", ariaLabel = "Select", placeholder = "" }) {
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
        <span className={`${selectedLabel ? "" : "text-slate-400"}`}>{selectedLabel || placeholder}</span>
        <svg className={`w-4 h-4 ml-2 ${isDtao ? "text-slate-300" : "text-slate-600"}`} viewBox="0 0 24 24" fill="none">
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          tabIndex={-1}
          className={`absolute z-50 mt-1 w-full rounded-md shadow-lg ${isDtao ? "bg-black/80 border border-violet-800 text-slate-100" : "bg-white border"}`}
          style={{ maxHeight: `${5 * 40}px`, overflowY: "auto" }} // show ~5 rows
        >
          {normalized.map((opt) => (
            <div
              key={opt.value}
              role="option"
              aria-selected={String(opt.value) === String(value)}
              tabIndex={0}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              onKeyDown={(e) => onOptionKey(e, opt)}
              className={`px-3 py-2 cursor-pointer hover:${isDtao ? "bg-violet-900/60" : "bg-gray-100"} ${String(opt.value) === String(value) ? (isDtao ? "bg-violet-900/70 font-medium" : "bg-blue-50 font-medium") : ""}`}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Component ---------- */
const UserRegisterPage = () => {
  const { theme } = useTheme() || {};
  const isDtao = theme === "dtao";

  const [role, setRole] = useState("DEPARTMENT");
  const [department, setDepartment] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); // <-- 1. Added state
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);

  // refs for smooth scrolling
  const messagesRef = useRef(null);
  const suggestionsRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    const fetchDepts = async () => {
      try {
        try {
          const res = await api.get("/departments");
          if (!mounted) return;
          const list = (Array.isArray(res.data) ? res.data : [])
            .map((d) => (typeof d === "string" ? d : d?.name || ""))
            .filter(Boolean);
          if (list.length > 0) {
            setDepartments(list);
            setDepartment((prev) => (prev && list.includes(prev) ? prev : list[0]));
            return;
          }
        } catch (err) { /* ignore */ }

        try {
          const resUsers = await api.get("/users");
          if (!mounted) return;
          const users = Array.isArray(resUsers.data) ? resUsers.data : [];
          const deptSet = new Set();
          users.forEach((u) => {
            if (u?.department && typeof u.department === "string") {
              const val = u.department.trim();
              if (val) deptSet.add(val);
            }
          });
          const derived = Array.from(deptSet).sort();
          if (derived.length > 0) {
            setDepartments(derived);
            setDepartment((prev) => (prev && derived.includes(prev) ? prev : derived[0]));
            return;
          }
        } catch (err) { /* ignore */ }

        setDepartments(fallbackDepts);
        setDepartment((prev) => (prev && fallbackDepts.includes(prev) ? prev : fallbackDepts[0]));
      } catch (err) {
        console.error("Failed to load departments (unexpected):", err);
        setDepartments(fallbackDepts);
        setDepartment((prev) => (prev && fallbackDepts.includes(prev) ? prev : fallbackDepts[0]));
      }
    };

    fetchDepts();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!error && !success) return;
    const t = setTimeout(() => { setError(""); setSuccess(""); }, 5000);
    return () => clearTimeout(t);
  }, [error, success]);

  useEffect(() => {
    if (error || success) {
      if (messagesRef.current && messagesRef.current.scrollIntoView) {
        messagesRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
        try { messagesRef.current.focus({ preventScroll: true }); } catch (e) {}
      }
    }
  }, [error, success]);

  useEffect(() => {
    if (suggestions && suggestions.length > 0) {
      if (suggestionsRef.current && suggestionsRef.current.scrollIntoView) {
        suggestionsRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [suggestions]);

  const isValidEmail = (mail) =>
    /^[a-zA-Z0-9._%+-]+@newhorizonindia\.edu$/.test((mail || "").trim().toLowerCase());

  const isValidPhone = (num) => {
    if (!/^[6-9][0-9]{9}$/.test(num)) return false;
    const invalids = ["1234567890", "0987654321", "1111111111", "2222222222", "3333333333", "4444444444", "5555555555", "6666666666", "7777777777", "8888888888", "9999999999"];
    return !invalids.includes(num);
  };

  const isMediumPassword = (pwd) =>
    /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{6,}$/.test(pwd);

  const generateSuggestions = () => {
    const sampleWords = ["nh2025", "CseUser", "Dept", "Horizon", "Campus"];
    const symbols = ["@", "#", "$", "&", "!"];
    const arr = Array.from({ length: 3 }, () => {
      const w = sampleWords[Math.floor(Math.random() * sampleWords.length)];
      const n = Math.floor(Math.random() * 100);
      const s = symbols[Math.floor(Math.random() * symbols.length)];
      return `${w}${s}${n}`;
    });
    setSuggestions(arr);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    const nameTrim = (name || "").trim();
    const emailNorm = (email || "").trim().toLowerCase();
    const phoneTrim = (phone || "").trim();

    if (!nameTrim) { setError("Name is required"); return; }
    if (!isValidEmail(emailNorm)) { setError("Email must end with @newhorizonindia.edu"); return; }
    if (!isValidPhone(phoneTrim)) { setError("Phone must be 10 digits, start with 6/7/8/9 and not be trivial"); return; }
    if (!isMediumPassword(password)) { setError("Password must be at least 6 chars and include letters & numbers"); return; }

    const payload = {
      name: nameTrim,
      role: (role || "DEPARTMENT").toUpperCase(),
      department: (role || "").toUpperCase() === "DEPARTMENT" ? department || "" : null,
      email: emailNorm,
      phone: phoneTrim,
      password,
    };

    try {
      setLoading(true);
      await api.post("/users", payload);
      setSuccess("User registered successfully!");
      setRole("DEPARTMENT");
      setDepartment(departments && departments.length > 0 ? departments[0] : fallbackDepts[0]);
      setName("");
      setEmail("");
      setPhone("");
      setPassword("");
      setSuggestions([]);
    } catch (err) {
      console.error("Error registering user:", err);
      const data = err?.response?.data;
      let msg = !data ? err?.message || "Failed to register. Try again."
              : typeof data === "string" ? data
              : data?.error ? data.error
              : data?.message ? data.message
              : JSON.stringify(data);
      setError(msg || "Failed to register");
    } finally {
      setLoading(false);
    }
  };

  const inputBaseClasses = `mt-1 block w-full rounded-md px-3 py-2 focus:outline-none focus:ring-2`;
  const lightInput = `bg-white border border-gray-200 text-gray-800 focus:ring-blue-300`;
  const darkInput = `bg-transparent border border-violet-700 text-slate-100 focus:ring-violet-700`;
  const primaryBtnLight = `bg-blue-600 hover:bg-blue-700 text-white`;
  const primaryBtnDark = `bg-violet-600 hover:bg-violet-700 text-white`;
  const secondaryBtnLight = `bg-white hover:bg-gray-50 border border-gray-200`;
  const secondaryBtnDark = `bg-transparent hover:bg-black/20 border border-violet-700 text-slate-100`;
  const hintTextLight = "text-sm text-gray-500";
  const hintTextDark = "text-sm text-slate-300";

  const roleOptions = useCallback(() => ["ADMIN", "DEPARTMENT"], []);
  const deptOptions = useCallback(() => (departments.length ? departments : fallbackDepts), [departments]);

  return (
    <div className={`min-h-screen py-8 scroll-smooth ${isDtao ? "bg-[#08050b] text-slate-100" : "bg-gradient-to-b from-gray-50 to-white text-slate-900"}`}>
      <div className="max-w-3xl mx-auto px-4">
        <div className={`rounded-lg p-6 sm:p-8 shadow ${isDtao ? "bg-black/40 border border-violet-900" : "bg-white border border-gray-200"}`}>
          <h2 className={`text-2xl font-semibold mb-2 ${isDtao ? "text-slate-100" : "text-gray-800"}`}>User Registration</h2>
          <p className={`${isDtao ? "text-slate-300" : "text-sm text-gray-500"} mb-4`}>
            Create a user account. Department users must use the institutional email (ending in{" "}
            <code className={`${isDtao ? "bg-black/20 px-1 rounded text-slate-200" : "bg-gray-100 px-1 rounded"}`}>@newhorizonindia.edu</code>).
          </p>

          <form onSubmit={handleSubmit} aria-live="polite" aria-busy={loading ? "true" : "false"}>
            {/* Name + Role */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className={`block text-sm font-medium ${isDtao ? "text-slate-200" : "text-gray-700"}`}>Name</label>
                <input
                  id="name"
                  autoFocus
                  autoComplete="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                  className={`${inputBaseClasses} ${isDtao ? darkInput : lightInput}`}
                />
              </div>

              <div>
                <label htmlFor="role" className={`block text-sm font-medium ${isDtao ? "text-slate-200" : "text-gray-700"}`}>Role</label>
                <Dropdown
                  options={roleOptions()}
                  value={role}
                  onChange={(v) => setRole(v)}
                  ariaLabel="Select role"
                  placeholder="Select role"
                />
              </div>
            </div>

            {/* Department + Email */}
            {role === "DEPARTMENT" ? (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="department" className={`block text-sm font-medium ${isDtao ? "text-slate-200" : "text-gray-700"}`}>Department</label>
                  <Dropdown
                    options={deptOptions()}
                    value={department}
                    onChange={(v) => setDepartment(v)}
                    ariaLabel="Select department"
                    placeholder="Select department"
                  />
                </div>

                <div>
                  <label htmlFor="email" className={`block text-sm font-medium ${isDtao ? "text-slate-200" : "text-gray-700"}`}>Email</label>
                  <input
                    id="email"
                    autoComplete="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@newhorizonindia.edu"
                    required
                    className={`${inputBaseClasses} ${isDtao ? darkInput : lightInput}`}
                  />
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <label htmlFor="email-alt" className={`block text-sm font-medium ${isDtao ? "text-slate-200" : "text-gray-700"}`}>Email</label>
                <input
                  id="email-alt"
                  autoComplete="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@newhorizonindia.edu"
                  required
                  className={`${inputBaseClasses} ${isDtao ? darkInput : lightInput}`}
                />
              </div>
            )}

            {/* Phone + Password */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="phone" className={`block text-sm font-medium ${isDtao ? "text-slate-200" : "text-gray-700"}`}>Phone</label>
                <input
                  id="phone"
                  inputMode="numeric"
                  pattern="[6-9][0-9]{9}"
                  autoComplete="tel"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  placeholder="10 digit Indian number"
                  required
                  className={`${inputBaseClasses} ${isDtao ? darkInput : lightInput}`}
                />
              </div>

              {/* === Password Field with Show/Hide === */}
              <div className="relative">
                <label htmlFor="password" className={`block text-sm font-medium ${isDtao ? "text-slate-200" : "text-gray-700"}`}>Password</label>
                <input
                  id="password"
                  autoComplete="new-password"
                  // 2. Change type based on state
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  // Added pr-10 for padding-right to make space for the button
                  className={`${inputBaseClasses} ${isDtao ? darkInput : lightInput} pr-10`}
                />
                {/* 3. Added Toggle Button */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute inset-y-0 right-0 top-6 pr-3 flex items-center text-sm leading-5 ${isDtao ? 'text-slate-400 hover:text-slate-200' : 'text-gray-500 hover:text-gray-700'}`}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOpenIcon className="h-5 w-5" />
                  ) : (
                    <EyeClosedIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
              {/* === End Password Field === */}
            </div>

            {/* actions */}
            <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                type="button"
                onClick={generateSuggestions}
                disabled={loading}
                className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium ${isDtao ? secondaryBtnDark : secondaryBtnLight}`}
              >
                Suggest Passwords
              </button>

              <button
                type="submit"
                disabled={loading}
                className={`w-full sm:w-auto inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold ${isDtao ? primaryBtnDark : primaryBtnLight}`}
              >
                {loading ? "Registering..." : "Register"}
              </button>
            </div>
          </form>

          {/* suggestions */}
          {suggestions.length > 0 && (
            <div ref={suggestionsRef} className="mt-4 border-t pt-4">
              <p className={`${isDtao ? hintTextDark : hintTextLight} mb-2`}>Suggestions</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPassword(s)}
                    className={`rounded-md px-3 py-1 text-sm ${isDtao ? "border border-violet-700 hover:bg-black/20 text-slate-100" : "border border-gray-200 hover:bg-gray-50 text-gray-800"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* messages */}
          <div className="mt-4">
            {error && (
              <div
                ref={messagesRef}
                tabIndex={-1}
                className={`${isDtao ? "rounded-md bg-rose-900/30 border border-rose-700 p-3 text-sm text-rose-300" : "rounded-md bg-rose-50 border border-rose-100 p-3 text-sm text-rose-700"}`}
                role="alert"
                aria-live="assertive"
              >
                {error}
              </div>
            )}
            {success && (
              <div
                ref={messagesRef}
                tabIndex={-1}
                className={`${isDtao ? "rounded-md bg-emerald-900/25 border border-emerald-700 p-3 text-sm text-emerald-200" : "rounded-md bg-emerald-50 border border-emerald-100 p-3 text-sm text-emerald-700"}`}
                role="status"
                aria-live="polite"
              >
                {success}
              </div>
            )}
          </div>

          <div className={`${isDtao ? "mt-4 text-xs text-slate-400" : "mt-4 text-xs text-gray-500"}`}>
            <strong>Note:</strong> If you create or update a user's email, that changes how they log in. If you update your own email while logged in, you may need to re-login.
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserRegisterPage;