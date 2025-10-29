// src/utils/AuthService.js
import api from "./api";

const AuthService = {
  /**
   * Login and store token + user in localStorage (role-based)
   */
  async login(email, password, rememberMe = false) {
    const res = await api.post("/users/login", { email, password, rememberMe });
    const data = res.data;

    if (!data) return null;

    const role = (data.role || data.user?.role || "DEPARTMENT").toUpperCase();

    // ✅ Store token separately per role
    if (data?.token) {
      localStorage.setItem(`${role.toLowerCase()}_token`, data.token);
      localStorage.setItem(`${role.toLowerCase()}_tokenExpiresIn`, String(data.expiresIn || ""));
    }

    if (data?.user) {
      localStorage.setItem(`${role.toLowerCase()}_user`, JSON.stringify(data.user));
      localStorage.setItem(`${role.toLowerCase()}_role`, role);
    }

    if (data?.users && role === "ADMIN") {
      localStorage.setItem("admin_users", JSON.stringify(data.users));
    }

    return data;
  },

  /**
   * Logout: clear storage for specific role
   */
  logout(role = null) {
    const r = (role || this.getRole() || "").toLowerCase();
    if (r) {
      localStorage.removeItem(`${r}_token`);
      localStorage.removeItem(`${r}_tokenExpiresIn`);
      localStorage.removeItem(`${r}_user`);
      localStorage.removeItem(`${r}_role`);
    }

    // Only admins store admin_users
    if (r === "admin") localStorage.removeItem("admin_users");
  },

  /**
   * Get current user object (role-based)
   */
  getCurrentUser() {
    const role = this.getRole();
    const raw = localStorage.getItem(`${role.toLowerCase()}_user`);
    return raw ? JSON.parse(raw) : null;
  },

  /**
   * Get active token based on URL path or current role
   */
  getActiveToken() {
    const path = window.location.pathname.toLowerCase();
    if (path.startsWith("/admin")) {
      return localStorage.getItem("admin_token");
    }
    if (path.startsWith("/dept")) {
      return localStorage.getItem("department_token");
    }

    // fallback to current role token
    const role = this.getRole();
    return localStorage.getItem(`${role.toLowerCase()}_token`);
  },

  /**
   * Get token (current user role)
   */
  getToken() {
    const role = this.getRole();
    return localStorage.getItem(`${role.toLowerCase()}_token`);
  },

  /**
   * Check if logged in (current role)
   */
  isAuthenticated() {
    const token = this.getActiveToken();
    return !!token;
  },

  /**
   * Get role (ADMIN/DEPARTMENT)
   */
  getRole() {
    // detect from pathname first (for multiple sessions)
    const path = window.location.pathname.toLowerCase();
    if (path.startsWith("/admin")) return "ADMIN";
    if (path.startsWith("/dept")) return "DEPARTMENT";

    // fallback to last saved role
    const role =
      localStorage.getItem("admin_role") ||
      localStorage.getItem("department_role") ||
      "";
    return role.toUpperCase();
  },
};

export default AuthService;
