// src/pages/Admin/AdminDashboard.js
import React from "react";
import ComponentAdminDashboard from "../../components/AdminDashboard";

/**
 * Page wrapper for Admin Dashboard.
 * Receives `user` and `setUser` from App and forwards them.
 * This keeps your routing clean: App -> pages/Admin/AdminDashboard -> components/AdminDashboard
 */
export default function AdminDashboardPage({ user, setUser }) {
  return <ComponentAdminDashboard user={user} setUser={setUser} />;
}
