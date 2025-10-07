// src/components/ProtectedRoute.js
import React from "react";
import { Navigate } from "react-router-dom";
import AuthService from "../utils/AuthService";

/**
 * Protects routes by role and authentication.
 *
 * Props:
 *  - requiredRole: "ADMIN" or "DEPARTMENT" (string). If omitted, just requires login.
 *  - children: component to render if allowed
 */
export default function ProtectedRoute({ requiredRole, children }) {
  const user = AuthService.getCurrentUser();
  const role = AuthService.getRole();
  const isAuth = AuthService.isAuthenticated();

  if (!isAuth || !user) {
    // not logged in
    return <Navigate to="/" replace />;
  }

  if (requiredRole) {
    const normalizedRole = role || (user.role || "DEPARTMENT").toUpperCase();

    // Admin required but user isn't admin -> redirect to dept
    if (requiredRole.toUpperCase() === "ADMIN" && normalizedRole !== "ADMIN") {
      return <Navigate to="/dept" replace />;
    }

    // Department required but user is admin -> redirect admin to admin
    if (requiredRole.toUpperCase() === "DEPARTMENT" && normalizedRole === "ADMIN") {
      return <Navigate to="/admin" replace />;
    }

    // Department required and user isn't department/admin -> go to login
    if (
      requiredRole.toUpperCase() === "DEPARTMENT" &&
      normalizedRole !== "DEPARTMENT" &&
      normalizedRole !== "ADMIN"
    ) {
      return <Navigate to="/" replace />;
    }
  }

  // ✅ allowed
  return children;
}
