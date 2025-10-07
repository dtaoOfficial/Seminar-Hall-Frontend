import api from "./api";

const AuthService = {
  /**
   * Login and store token + user in localStorage
   */
  async login(email, password, rememberMe = false) {
    const res = await api.post("/users/login", { email, password, rememberMe });
    const data = res.data;

    if (data?.token) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("tokenExpiresIn", String(data.expiresIn || ""));
    }

    if (data?.user) {
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem(
        "role",
        (data.role || data.user.role || "DEPARTMENT").toString().toUpperCase()
      );
    }

    if (data?.users) {
      localStorage.setItem("admin_users", JSON.stringify(data.users));
    }

    return data;
  },

  /**
   * Logout: clear storage
   */
  logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("tokenExpiresIn");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    localStorage.removeItem("admin_users");
  },

  /**
   * Get current user object (or null)
   */
  getCurrentUser() {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  },

  /**
   * Get token
   */
  getToken() {
    return localStorage.getItem("token");
  },

  /**
   * Check if logged in
   */
  isAuthenticated() {
    return !!localStorage.getItem("token");
  },

  /**
   * Get role (ADMIN/DEPARTMENT)
   */
  getRole() {
    return (localStorage.getItem("role") || "").toUpperCase();
  },
};

export default AuthService;
