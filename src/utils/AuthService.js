// src/utils/AuthService.js
import api from "./api";

/**
 * Role-specific storage keys
 */
const STORAGE_KEYS = {
  ADMIN: {
    token: "admin_token",
    role: "admin_role",
    user: "admin_user",
  },
  DEPARTMENT: {
    token: "dept_token",
    role: "dept_role",
    user: "dept_user",
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
   */
  logout(role) {
    if (!role) {
      Object.values(STORAGE_KEYS).forEach((group) =>
        Object.values(group).forEach((key) => localStorage.removeItem(key))
      );
      return;
    }

    const keys = STORAGE_KEYS[role.toUpperCase()] || STORAGE_KEYS.DEPARTMENT;
    Object.values(keys).forEach((k) => localStorage.removeItem(k));
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
   * ✅ FIXED VERSION — Auto-detect correct session based on current tab path
   */
  autoLogin() {
    try {
      const path = window.location?.pathname || "";

      // Prefer session based on active path
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

      // Fallback (for login page or unexpected path)
      for (const role of ["ADMIN", "DEPARTMENT"]) {
        const token = this.getToken(role);
        const user = this.getCurrentUser(role);
        const storedRole = this.getRole(role);
        if (token && user && storedRole) {
          return { token, role: storedRole, user };
        }
      }

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
