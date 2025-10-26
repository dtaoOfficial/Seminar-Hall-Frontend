// src/App.js
import React, { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "./pages/LoginPage";
import DeptDashboard from "./components/DeptDashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import AquaGlassLayout from "./layouts/AquaGlassLayout";
import AdminDashboard from "./components/AdminDashboard";

import ForgotPassword from "./pages/ForgotPassword";
import VerifyOtp from "./pages/VerifyOtp";
import ResetPassword from "./pages/ResetPassword";

// ✅ Added imports
import { ThemeProvider } from "./contexts/ThemeContext";
import GlobalStyles from "./styles/GlobalStyles";

function App() {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  });

  return (
    // ✅ Added global ThemeProvider + GlobalStyles
    <ThemeProvider>
      <GlobalStyles />
      <Routes>
        {/* Public auth routes: NO layout / NO navbar */}
        <Route path="/" element={<LoginPage setUser={setUser} />} />
        <Route path="/forgot" element={<ForgotPassword />} />
        <Route path="/verify" element={<VerifyOtp />} />
        <Route path="/reset" element={<ResetPassword />} />

        {/* Admin route: protected + AquaGlass wrapper */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute requiredRole="ADMIN">
              <AquaGlassLayout user={user} setUser={setUser}>
                <AdminDashboard user={user} setUser={setUser} />
              </AquaGlassLayout>
            </ProtectedRoute>
          }
        />

        {/* Dept route: also inside AquaGlassLayout if you want same theme */}
        <Route
          path="/dept/*"
          element={
            <ProtectedRoute requiredRole="DEPARTMENT">
              <AquaGlassLayout user={user} setUser={setUser}>
                <DeptDashboard user={user} setUser={setUser} />
              </AquaGlassLayout>
            </ProtectedRoute>
          }
        />

        {/* fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ThemeProvider>
  );
}

export default App;
