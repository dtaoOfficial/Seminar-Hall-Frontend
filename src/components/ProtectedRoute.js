// src/components/ProtectedRoute.js
import React from "react";
import { Navigate } from "react-router-dom";
import AuthService from "../utils/AuthService";

/**
 * ✅ Enhanced ProtectedRoute
 * - Works with admin_token / dept_token logic
 * - Prevents mixing sessions
 * - Redirects by correct role
 */
export default function ProtectedRoute({ requiredRole, children }) {
  const session = AuthService.autoLogin();

  // 🚫 No active session
  if (!session?.token) {
    return <Navigate to="/" replace />;
  }

  const { role } = session;

  // ✅ If a role is required, check it
  if (requiredRole) {
    const normalizedRequired = requiredRole.toUpperCase();

    // ❌ If the role doesn’t match, redirect accordingly
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
  }

  // ✅ Session valid and role allowed
  return children;
}
