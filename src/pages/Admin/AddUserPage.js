// src/pages/UserRegisterPage.js
import React, { useState, useEffect } from "react";
import api from "../../utils/api";

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

const UserRegisterPage = () => {
  const [role, setRole] = useState("DEPARTMENT");
  const [department, setDepartment] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loadingDepts, setLoadingDepts] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchDepts = async () => {
      setLoadingDepts(true);
      try {
        // try /departments
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
        } catch (err) {
          // ignore, fallback to other sources
        }

        // try deriving from /users
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
        } catch (err) {
          // ignore
        }

        // final fallback
        setDepartments(fallbackDepts);
        setDepartment((prev) => (prev && fallbackDepts.includes(prev) ? prev : fallbackDepts[0]));
      } catch (err) {
        console.error("Failed to load departments (unexpected):", err);
        setDepartments(fallbackDepts);
        setDepartment((prev) => (prev && fallbackDepts.includes(prev) ? prev : fallbackDepts[0]));
      } finally {
        if (mounted) setLoadingDepts(false);
      }
    };

    fetchDepts();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!error && !success) return;
    const t = setTimeout(() => {
      setError("");
      setSuccess("");
    }, 5000);
    return () => clearTimeout(t);
  }, [error, success]);

  const isValidEmail = (mail) =>
    /^[a-zA-Z0-9._%+-]+@newhorizonindia\.edu$/.test((mail || "").trim().toLowerCase());

  const isValidPhone = (num) => {
    if (!/^[6-9][0-9]{9}$/.test(num)) return false;
    const invalids = [
      "1234567890",
      "0987654321",
      "1111111111",
      "2222222222",
      "3333333333",
      "4444444444",
      "5555555555",
      "6666666666",
      "7777777777",
      "8888888888",
      "9999999999",
    ];
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

    if (!nameTrim) {
      setError("Name is required");
      return;
    }
    if (!isValidEmail(emailNorm)) {
      setError("Email must end with @newhorizonindia.edu");
      return;
    }
    if (!isValidPhone(phoneTrim)) {
      setError("Phone must be 10 digits, start with 6/7/8/9 and not be trivial");
      return;
    }
    if (!isMediumPassword(password)) {
      setError("Password must be at least 6 chars and include letters & numbers");
      return;
    }

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
      // reset form
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
      let msg = "";
      if (!data) {
        msg = err?.message || "Failed to register. Try again.";
      } else if (typeof data === "string") {
        msg = data;
      } else if (data?.error) {
        msg = data.error;
      } else if (data?.message) {
        msg = data.message;
      } else {
        msg = JSON.stringify(data);
      }
      setError(msg ? msg : "Failed to register");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white shadow rounded-lg p-6 sm:p-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">User Registration</h2>
          <p className="text-sm text-gray-500 mb-4">
            Create a user account. Department users must use the institutional email (ending in <code className="bg-gray-100 px-1 rounded">@newhorizonindia.edu</code>).
          </p>

          <form onSubmit={handleSubmit} aria-live="polite" aria-busy={loading ? "true" : "false"}>
            {/* Name + Role */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  id="name"
                  autoFocus
                  autoComplete="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                  className="mt-1 block w-full rounded-md border border-gray-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700">Role</label>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  <option value="ADMIN">Admin</option>
                  <option value="DEPARTMENT">Department</option>
                </select>
              </div>
            </div>

            {/* Department + Email */}
            {role === "DEPARTMENT" ? (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="department" className="block text-sm font-medium text-gray-700">Department</label>
                  <select
                    id="department"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    disabled={loadingDepts}
                    className="mt-1 block w-full rounded-md border border-gray-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                  >
                    {(departments.length > 0 ? departments : fallbackDepts).map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    id="email"
                    autoComplete="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@newhorizonindia.edu"
                    required
                    className="mt-1 block w-full rounded-md border border-gray-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <label htmlFor="email-alt" className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  id="email-alt"
                  autoComplete="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@newhorizonindia.edu"
                  required
                  className="mt-1 block w-full rounded-md border border-gray-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
            )}

            {/* Phone + Password */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone</label>
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
                  className="mt-1 block w-full rounded-md border border-gray-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                <input
                  id="password"
                  autoComplete="new-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  className="mt-1 block w-full rounded-md border border-gray-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
            </div>

            {/* actions */}
            <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                type="button"
                onClick={generateSuggestions}
                disabled={loading}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50"
              >
                Suggest Passwords
              </button>

              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                {loading ? "Registering..." : "Register"}
              </button>
            </div>
          </form>

          {/* suggestions */}
          {suggestions.length > 0 && (
            <div className="mt-4 border-t pt-4">
              <p className="text-sm text-gray-600 mb-2">Suggestions</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPassword(s)}
                    className="rounded-md border border-gray-200 px-3 py-1 text-sm hover:bg-gray-50"
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
              <div className="rounded-md bg-rose-50 border border-rose-100 p-3 text-sm text-rose-700" role="alert" aria-live="assertive">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-md bg-emerald-50 border border-emerald-100 p-3 text-sm text-emerald-700" role="status" aria-live="polite">
                {success}
              </div>
            )}
          </div>

          <div className="mt-4 text-xs text-gray-500">
            <strong>Note:</strong> If you create or update a user's email, that changes how they log in. If you update your own email while logged in, you may need to re-login.
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserRegisterPage;
