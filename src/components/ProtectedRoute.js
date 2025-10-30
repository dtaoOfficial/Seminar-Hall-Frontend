// src/components/ProtectedRoute.js
import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import AuthService from "../utils/AuthService";

/**
 * ✅ FINAL FIXED ProtectedRoute
 * - Works with admin_token / dept_token isolation
 * - Handles refresh persistence (stays logged in after reload)
 * - Prevents mixing sessions between tabs
 * - Rechecks auth on logout or navigation
 */
export default function ProtectedRoute({ requiredRole, children }) {
  const location = useLocation();
  const [session, setSession] = useState(() => AuthService.autoLogin());
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const recheck = () => {
      const current = AuthService.autoLogin();
      setSession(current);
      setChecking(false);
    };

    recheck();

    // Listen for logout across tabs
    window.addEventListener("logout", recheck);

    return () => {
      window.removeEventListener("logout", recheck);
    };
  }, [location.pathname]);

  // ⏳ Wait a bit while verifying session
  if (checking) return null;

  // 🚫 No active session — redirect to login
  if (!session?.token) {
    return <Navigate to="/" replace />;
  }

  const { role } = session;
  const normalizedRequired = requiredRole?.toUpperCase();

  // ✅ Check role access logic
  if (normalizedRequired === "ADMIN" && role !== "ADMIN") {
    return <Navigate to="/dept" replace />;
  }

  if (normalizedRequired === "DEPARTMENT" && role === "ADMIN") {
    return <Navigate to="/admin" replace />;
  }

  if (
    normalizedRequired === "DEPARTMENT" &&
    role !== "DEPARTMENT" &&
    role !== "ADMIN"
  ) {
    return <Navigate to="/" replace />;
  }

  // ✅ Session valid and role allowed
  return children;
}
