import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import LoginPage from "./pages/LoginPage";
import DeptDashboard from "./components/DeptDashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import AquaGlassLayout from "./layouts/AquaGlassLayout";
import AdminDashboard from "./components/AdminDashboard";
import ForgotPassword from "./pages/ForgotPassword";
import VerifyOtp from "./pages/VerifyOtp";
import ResetPassword from "./pages/ResetPassword";

import { ThemeProvider } from "./contexts/ThemeContext";
import GlobalStyles from "./styles/GlobalStyles";
import AuthService from "./utils/AuthService";
import { motion, AnimatePresence } from "framer-motion";

const LoadingScreen = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.6 }}
    className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-cyan-50"
  >
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
      className="w-10 h-10 border-4 border-blue-400 border-t-transparent rounded-full"
    ></motion.div>
    <p className="ml-3 text-gray-600 font-medium text-lg">Checking session...</p>
  </motion.div>
);

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const location = useLocation();

  // ✅ Clear any old session only if visiting root manually
  useEffect(() => {
    if (location.pathname === "/" || location.pathname.startsWith("/login")) {
      AuthService.logout();
    }
  }, [location.pathname]);

  // ✅ Restore logged-in user on refresh for /admin and /dept
  useEffect(() => {
    let isMounted = true;
    const restore = AuthService.autoLogin();
    if (restore?.user && isMounted) {
      setUser(restore.user);
    }
    setTimeout(() => isMounted && setChecking(false), 300);
    return () => {
      isMounted = false;
    };
  }, [location.pathname]);

  // ✅ Sync logout event across tabs
  useEffect(() => {
    const onLogout = () => setUser(null);
    window.addEventListener("logout", onLogout);
    return () => window.removeEventListener("logout", onLogout);
  }, []);

  if (checking) {
    return (
      <AnimatePresence>
        <LoadingScreen key="loader" />
      </AnimatePresence>
    );
  }

  return (
    <ThemeProvider>
      <GlobalStyles />
      <Routes>
        <Route path="/" element={<LoginPage setUser={setUser} />} />
        <Route path="/forgot" element={<ForgotPassword />} />
        <Route path="/verify" element={<VerifyOtp />} />
        <Route path="/reset" element={<ResetPassword />} />

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

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ThemeProvider>
  );
}
