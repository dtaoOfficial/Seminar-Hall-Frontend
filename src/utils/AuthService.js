import api from "./api";

/**
 * Add origin-based prefix to isolate sessions per environment
 */
const STORAGE_PREFIX = window.location.origin + "_seminarhall_";

/**
 * Role-specific storage keys (now prefixed)
 */
const STORAGE_KEYS = {
  ADMIN: {
    token: STORAGE_PREFIX + "admin_token",
    role: STORAGE_PREFIX + "admin_role",
    user: STORAGE_PREFIX + "admin_user",
  },
  DEPARTMENT: {
    token: STORAGE_PREFIX + "dept_token",
    role: STORAGE_PREFIX + "dept_role",
    user: STORAGE_PREFIX + "dept_user",
  },
};

const AuthService = {
  /**
   * ✅ Login function (saves token + user for specific role)
   */
  async login(email, password) {
    const res = await api.post("/users/login", { email, password });
    const data = res.data;

    if (!data) throw new Error("Invalid login response");

    const role = (data.role || data.user?.role || "DEPARTMENT").toUpperCase();
    const keys = STORAGE_KEYS[role] || STORAGE_KEYS.DEPARTMENT;

    // Clear old session only for this role
    Object.values(keys).forEach((k) => localStorage.removeItem(k));

    // Save new session
    localStorage.setItem(keys.role, role);
    if (data.token) localStorage.setItem(keys.token, data.token);
    if (data.user) localStorage.setItem(keys.user, JSON.stringify(data.user));

    return { ...data, role };
  },

  /**
   * ✅ Logout function (can clear specific role or all)
   * 🧩 Emits global logout event for real-time detection
   */
  logout(role) {
    try {
      if (!role) {
        Object.values(STORAGE_KEYS).forEach((group) =>
          Object.values(group).forEach((key) => localStorage.removeItem(key))
        );
      } else {
        const keys =
          STORAGE_KEYS[role.toUpperCase()] || STORAGE_KEYS.DEPARTMENT;
        Object.values(keys).forEach((k) => localStorage.removeItem(k));
      }

      // 🧠 Notify all listeners (ProtectedRoute, Navbar, etc.)
      window.dispatchEvent(new Event("logout"));
    } catch (err) {
      console.error("Logout error:", err);
    }
  },

  getToken(role) {
    const keys = STORAGE_KEYS[role?.toUpperCase()] || STORAGE_KEYS.DEPARTMENT;
    return localStorage.getItem(keys.token);
  },

  getRole(role) {
    const keys = STORAGE_KEYS[role?.toUpperCase()] || STORAGE_KEYS.DEPARTMENT;
    return localStorage.getItem(keys.role);
  },

  getCurrentUser(role) {
    const keys = STORAGE_KEYS[role?.toUpperCase()] || STORAGE_KEYS.DEPARTMENT;
    const user = localStorage.getItem(keys.user);
    return user ? JSON.parse(user) : null;
  },

  /**
   * ✅ FINAL FIX — Prevent old sessions from loading when on root
   * and only restore sessions if inside a protected path
   */
  autoLogin() {
    try {
      const path = window.location?.pathname || "";

      // 🚫 Skip restoring any session on root or login page
      if (path === "/" || path.startsWith("/login")) {
        return null;
      }

      // ✅ Restore based on path
      if (path.startsWith("/admin")) {
        const token = this.getToken("ADMIN");
        const user = this.getCurrentUser("ADMIN");
        const role = this.getRole("ADMIN");
        if (token && user && role) return { token, role, user };
      }

      if (path.startsWith("/dept")) {
        const token = this.getToken("DEPARTMENT");
        const user = this.getCurrentUser("DEPARTMENT");
        const role = this.getRole("DEPARTMENT");
        if (token && user && role) return { token, role, user };
      }

      // ❌ No fallback restore
      return null;
    } catch (err) {
      console.error("autoLogin error:", err);
      return null;
    }
  },

  getActiveToken() {
    const active = this.autoLogin();
    return active?.token || null;
  },

  isAuthenticated() {
    return !!this.autoLogin();
  },
};

export default AuthService;
