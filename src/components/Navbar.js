// src/components/Navbar.js
import React, { useState, useEffect, useRef, useCallback } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";
import AnimatedButton from "../components/AnimatedButton";
import api from "../utils/api";
import { useNotification } from "./NotificationsProvider";
import ServerStatusIndicator from "./ServerStatusIndicator"; // <- added
import AuthService from "../utils/AuthService"; // ✅ added as requested

/* Links arrays (unchanged) */
const LINKS_ADMIN = [
  { to: "/admin", label: "Dashboard", exact: true },
  { to: "/admin/add-user", label: "Add User" },
  { to: "/admin/add-seminar", label: "Add Seminar" },
  { to: "/admin/requests", label: "Requests" },
  { to: "/admin/seminars", label: "Venue" },
  { to: "/admin/departments", label: "Dept Creds" },
  { to: "/admin/manage-departments", label: "Manage Depts" },
  { to: "/admin/halls", label: "Manage Halls" },
  { to: "/admin/operators", label: "Venue Operaters" },
];

const LINKS_DEPT = [
  { to: "/dept", label: "Dashboard", exact: true },
  { to: "/dept/history", label: "Approved Halls" },
  { to: "/dept/status", label: "Status" },
];

export default function Navbar({ user = {}, handleLogout }) {
  const navigate = useNavigate();
  const { notify } = useNotification();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  const navContainerRef = useRef(null);
  const measureContainerRef = useRef(null);
  const measureLinkRefs = useRef([]);
  const measureMoreRef = useRef(null);
  const moreWrapRef = useRef(null);
  const userWrapRef = useRef(null);

  const [visibleCount, setVisibleCount] = useState(Infinity);
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );

  // notification state
  const [newReqCount, setNewReqCount] = useState(0);
  const [shake, setShake] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [requestsList, setRequestsList] = useState([]); // array of items to show in dropdown
  const [loadingRequests, setLoadingRequests] = useState(false);

  const role = (user?.role || "ADMIN").toString().toUpperCase();
  const LINKS = role === "DEPARTMENT" ? LINKS_DEPT : LINKS_ADMIN;

  /* ======= layout measurement (kept from your original) ======= */
  const computeVisibleCount = useCallback(() => {
    const container = navContainerRef.current;
    const measureContainer = measureContainerRef.current;
    if (!container || !measureContainer) {
      return LINKS.length;
    }

    const available = Math.max(0, container.clientWidth); // px available for inline items
    const measured = LINKS.map((_, i) => {
      const el = measureLinkRefs.current[i];
      return el ? Math.ceil(el.getBoundingClientRect().width) : 120;
    });

    const moreWidth = measureMoreRef.current
      ? Math.ceil(measureMoreRef.current.getBoundingClientRect().width)
      : 84;
    const GAP = 8; // spacing between items
    let used = 0;
    let count = 0;

    for (let i = 0; i < LINKS.length; i++) {
      const w = measured[i];
      const newUsed = used + (count > 0 ? GAP : 0) + w;
      const remaining = LINKS.length - (i + 1);
      const needMore = remaining > 0;
      const reserveMore = needMore ? GAP + moreWidth : 0;
      if (newUsed + reserveMore <= available) {
        used = newUsed;
        count++;
      } else {
        break;
      }
    }

    if (count === 0 && LINKS.length > 0) {
      if (measured[0] + GAP <= available || available > 120) count = 1;
    }

    return count;
  }, [LINKS]);

  useEffect(() => {
    let raf = null;
    const doMeasure = () => {
      if (typeof window === "undefined") return;
      setIsMobile(window.innerWidth < 768); // <-- Fix 6: Already implemented here

      try {
        const v = computeVisibleCount();
        setVisibleCount(v);
      } catch (e) {
        setVisibleCount(LINKS.length);
      }
    };

    const onResize = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(doMeasure);
    };

    window.addEventListener("resize", onResize);

    const t = setTimeout(doMeasure, 120);
    const t2 = setTimeout(doMeasure, 600);

    const ro = new ResizeObserver(() => doMeasure());
    if (navContainerRef.current) ro.observe(navContainerRef.current);

    doMeasure();
    return () => {
      window.removeEventListener("resize", onResize);
      if (raf) cancelAnimationFrame(raf);
      clearTimeout(t);
      clearTimeout(t2);
      ro.disconnect();
    };
  }, [computeVisibleCount, LINKS.length]);

  useEffect(() => {
    const onDoc = (e) => {
      if (moreOpen && moreWrapRef.current && !moreWrapRef.current.contains(e.target))
        setMoreOpen(false);
      if (userOpen && userWrapRef.current && !userWrapRef.current.contains(e.target))
        setUserOpen(false);
    };
    if (moreOpen || userOpen || notifOpen) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [moreOpen, userOpen, notifOpen]);

  useEffect(() => {
    if (drawerOpen) {
      const prevOverflow = document.body.style.overflow;
      const prevTouch = document.body.style.touchAction;
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
      return () => {
        document.body.style.overflow = prevOverflow || "";
        document.body.style.touchAction = prevTouch || "";
      };
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    };
  }, [drawerOpen]);

  // ✅ Updated logout to match global event system
  const onLogout = useCallback(() => {
    try {
      const path = (window.location && window.location.pathname) || "";
      const detectedRole = path.startsWith("/admin")
        ? "ADMIN"
        : path.startsWith("/dept")
        ? "DEPARTMENT"
        : null;

      // ✅ Clear correct session + trigger logout event
      AuthService.logout(detectedRole);

      // ✅ If parent handleLogout exists, run it (for state clear)
      if (typeof handleLogout === "function") {
        handleLogout();
      }

      // ✅ Smooth redirect — no hard reload
      navigate("/", { replace: true });
    } catch (err) {
      console.error("Navbar logout error:", err);
      navigate("/", { replace: true });
    }
  }, [handleLogout, navigate]);

  const effectiveVisibleCount = visibleCount === Infinity ? LINKS.length : visibleCount;
  const visibleLinks = LINKS.slice(0, effectiveVisibleCount);
  const hiddenLinks = LINKS.slice(effectiveVisibleCount);

  /* ======= Fix 4: Real-time polling ======= */
  useEffect(() => {
    if (role !== "ADMIN") return; // Only admin polls

    let lastKnownCount = -1; // Use local var to track count, -1 to force first update

    const poll = async () => {
      try {
        const res = await api.get("/seminars");
        const all = Array.isArray(res?.data) ? res.data : (res?.data?.seminars || []);
        const pending = all.filter((s) =>
          ["PENDING", "CANCEL_REQUESTED"].includes((s.status || "").toUpperCase())
        );
        
        if (lastKnownCount === -1) {
          lastKnownCount = pending.length; // Initialize
        } else if (pending.length > lastKnownCount) {
          // New request arrived!
          setShake(true); // Trigger shake
        }
        
        lastKnownCount = pending.length;
        setNewReqCount(pending.length); // Update count

      } catch (err) {
        console.warn("Navbar polling failed:", err.message);
      }
    };

    poll(); // Run once on mount
    const interval = setInterval(poll, 1000); // Poll every 1 second
    
    return () => clearInterval(interval); // Cleanup
  }, [role]); // Only depends on role

  /* ======= Fix 5: Shake animation reset ======= */
  // This effect resets the shake animation after it plays
  useEffect(() => {
    if (shake) { // When shake is set to true
      const t = setTimeout(() => setShake(false), 820); // Reset it after animation
      return () => clearTimeout(t);
    }
    return undefined;
  }, [shake]); // Only depends on shake state

  // When user clicks requests link, clear badge (existing behavior)
  const onRequestsClick = () => {
    setNewReqCount(0);
  };

  // helper: fetch current pending/cancel requests (on-demand)
  const fetchPendingAndCancels = async () => {
    setLoadingRequests(true);
    try {
      const res = await api.get("/seminars");
      const all = Array.isArray(res?.data) ? res.data : (res?.data?.seminars || []);
      const normalized = (all || []).map((s) => ({
        id: s._id ?? s.id ?? s._key ?? null,
        hallName: s.hallName || s.hall || (s.hallObj && (s.hallObj.name || s.hallObj.title)) || "",
        title: s.slotTitle || s.title || s.name || s.bookingName || "Untitled",
        department: s.department || s.dept || "",
        date: s.date || s.startDate || null,
        startTime: s.startTime || s.start_time || s.from || "",
        endTime: s.endTime || s.end_time || s.to || "",
        status: (s.status || "").toString().toUpperCase(),
        raw: s,
      }));

      // filter PENDING and CANCEL_REQUESTED
      const interesting = normalized.filter((n) => ["PENDING", "CANCEL_REQUESTED"].includes(n.status));
      // sort newest first by date/appliedAt fallback
      interesting.sort((a, b) => {
        const da = new Date(a.date || 0).getTime() || 0;
        const db = new Date(b.date || 0).getTime() || 0;
        return db - da;
      });

      setRequestsList(interesting);
    } catch (err) {
      console.error("Navbar: failed to fetch requests", err);
      notify && notify("Failed to fetch requests", "error", 3000);
    } finally {
      setLoadingRequests(false);
    }
  };

  // When notification dropdown opens, fetch items
  useEffect(() => {
    if (notifOpen) {
      // clear badge (user is checking)
      setNewReqCount(0);
      fetchPendingAndCancels();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifOpen]);

  /* ======= Action handlers shown in dropdown ======= */
  const handleApprove = async (item) => {
    if (!item?.id) return;
    try {
      await api.put(`/seminars/${encodeURIComponent(item.id)}`, { status: "APPROVED" });
      notify("Request approved", "success", 2000);
      setRequestsList((prev) => prev.filter((p) => p.id !== item.id));
    } catch (err) {
      console.error("approve error", err);
      notify(err?.response?.data?.message || "Failed to approve", "error", 3500);
    }
  };

  const handleReject = async (item) => {
    if (!item?.id) return;
    const remark = window.prompt("Enter rejection reason (will be saved):", "Rejected by Admin");
    if (remark === null) return;
    try {
      await api.put(`/seminars/${encodeURIComponent(item.id)}`, { status: "REJECTED", remarks: remark });
      notify("Request rejected", "success", 2000);
      setRequestsList((prev) => prev.filter((p) => p.id !== item.id));
    } catch (err) {
      console.error("reject error", err);
      notify(err?.response?.data?.message || "Failed to reject", "error", 3500);
    }
  };

  const handleConfirmCancel = async (item) => {
    if (!item?.id) return;
    try {
      await api.put(`/seminars/${encodeURIComponent(item.id)}`, { status: "CANCELLED", remarks: "Cancel confirmed by Admin" });
      notify("Cancellation confirmed", "success", 2000);
      setRequestsList((prev) => prev.filter((p) => p.id !== item.id));
    } catch (err) {
      console.error("confirm cancel error", err);
      notify(err?.response?.data?.message || "Failed to confirm cancel", "error", 3500);
    }
  };

  const handleRejectCancel = async (item) => {
    if (!item?.id) return;
    try {
      await api.put(`/seminars/${encodeURIComponent(item.id)}`, { status: "APPROVED", remarks: "Cancel rejected by Admin" });
      notify("Cancellation rejected", "success", 2000);
      setRequestsList((prev) => prev.filter((p) => p.id !== item.id));
    } catch (err) {
      console.error("reject cancel error", err);
      notify(err?.response?.data?.message || "Failed to reject", "error", 3500);
    }
  };

  /* helper to go to requests page for full view */
  const goToRequestsPage = (item) => {
    setNotifOpen(false);
    navigate("/admin/requests", { state: { highlightId: item?.id } });
  };

  /* small UI helpers */
  const truncate = (s, n = 40) => (s && s.length > n ? `${s.slice(0, n - 1)}…` : s || "—");

  /* refs for notif popup click outside */
  const notifWrapRef = useRef(null);
  useEffect(() => {
    const onDoc = (e) => {
      if (notifOpen && notifWrapRef.current && !notifWrapRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    if (notifOpen) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [notifOpen]);

  /* render */
  return (
    <>
      <style>{`
        /* Fix 9: Smooth Bell Animation */
        @keyframes bellShake {
          0% { transform: rotate(0deg); }
          20% { transform: rotate(-10deg); }
          40% { transform: rotate(10deg); }
          60% { transform: rotate(-6deg); }
          80% { transform: rotate(6deg); }
          100% { transform: rotate(0deg); }
        }
        .notif-bell.shake {
          animation: bellShake 820ms ease;
        }
        
        /* Fix 7: Red Dot Position */
        .nav-red-dot {
          position: absolute;
          right: -3px;
          top: -3px;
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: linear-gradient(90deg,#ef4444,#f97316);
          box-shadow: 0 0 0 3px rgba(249,115,22,0.08);
        }
      `}</style>

      <header className="w-full fixed top-0 left-0 z-50 h-16">
        {/* Fix 8: Background Transparency */}
        <div className="w-full h-full backdrop-blur-xl bg-white/60 border-b border-white/20 shadow-sm dark:bg-black/40 dark:border-white/6">
          <div className="max-w-7xl mx-auto flex items-center justify-between px-4 md:px-6 h-full">
            {/* Left: brand + mobile control */}
            <div className="flex items-center gap-3">
              {isMobile ? (
                <button
                  onClick={() => setDrawerOpen(true)}
                  className="text-2xl px-2 text-slate-700 dark:text-slate-200"
                  aria-label="Open menu"
                >
                  ⋮
                </button>
              ) : null}

              <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(role === "DEPARTMENT" ? "/dept" : "/admin")}>
                <img
                  src="https://res.cloudinary.com/duhki4wze/image/upload/v1756755114/nhce_25-scaled-2_a6givc.png"
                  alt="NHCE"
                  className="h-10 w-auto object-contain"
                />
                {/* Fix 1: Removed "NHCE Seminars" text span */}
              </div>
            </div>

            {/* Middle: inline links */}
            <div className="flex-1 px-4" style={{ minWidth: 0 }}>
              <nav ref={navContainerRef} className="flex items-center gap-2 whitespace-nowrap" aria-label="Primary navigation">
                {!isMobile &&
                  visibleLinks.map((l) => {
                    const isRequests = l.to === "/admin/requests" || l.label === "Requests";
                    return (
                      <div key={l.to} style={{ flex: "0 0 auto" }} className="relative">
                        <NavLink
                          to={l.to}
                          end={l.exact}
                          onClick={isRequests ? onRequestsClick : undefined}
                          className={({ isActive }) =>
                            `px-3 py-1.5 rounded-md text-sm font-medium transition ${
                              isActive
                                ? "bg-gradient-to-r from-blue-500 to-cyan-400 text-white shadow"
                                : "text-slate-700 hover:text-blue-600 hover:bg-white/60 dark:text-slate-200 dark:hover:bg-black/20"
                            }`
                          }
                        >
                          {l.label}
                        </NavLink>

                        {isRequests && newReqCount > 0 && <span className="nav-red-dot" aria-hidden />}
                      </div>
                    );
                  })}

                {/* More menu */}
                {!isMobile && hiddenLinks.length > 0 && (
                  <div className="relative" ref={moreWrapRef}>
                    <button
                      onClick={() => setMoreOpen((s) => !s)}
                      className="px-3 py-1.5 rounded-md text-sm font-medium text-slate-700 hover:text-blue-600 hover:bg-white/60 transition flex items-center gap-2 dark:text-slate-200"
                      aria-expanded={moreOpen}
                      aria-haspopup="true"
                    >
                      More ▾
                      <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full text-slate-700">{hiddenLinks.length}</span>
                    </button>

                    {moreOpen && (
                      <div className="absolute right-0 mt-2 w-56 bg-white/95 backdrop-blur-md border border-slate-200 rounded-lg shadow-lg z-50 dark:bg-black/80 dark:border-white/6">
                        {hiddenLinks.map((l) => (
                          <NavLink
                            key={l.to}
                            to={l.to}
                            end={l.exact}
                            className={({ isActive }) =>
                              `block px-4 py-2 text-sm transition ${isActive ? "text-blue-600 font-semibold" : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-black/20"}`
                            }
                            onClick={() => setMoreOpen(false)}
                          >
                            {l.label}
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </nav>

              {/* measurement nodes (hidden) */}
              <div
                ref={measureContainerRef}
                aria-hidden
                style={{
                  position: "absolute",
                  left: -9999,
                  top: -9999,
                  visibility: "hidden",
                  height: 0,
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                }}
              >
                {LINKS.map((l, i) => (
                  <span key={l.to} ref={(el) => (measureLinkRefs.current[i] = el)} className="px-3 py-1.5 text-sm font-medium">
                    {l.label}
                  </span>
                ))}
                <span ref={measureMoreRef} className="px-3 py-1.5 text-sm font-medium">
                  More ▾
                </span>
              </div>
            </div>

            {/* Right: notifications (ADMIN only), server status, user pill + theme toggle */}
            {/* Fix 3: Updated gap for mobile responsiveness */}
            <div className="flex items-center gap-2 md:gap-3">
              {/* Notification bell (ADMIN only) */}
              {role === "ADMIN" && (
                // Fix 2: Added flex items-center justify-center
                <div className="relative flex items-center justify-center" ref={notifWrapRef}>
                  <button
                    title="Notifications"
                    onClick={() => setNotifOpen((s) => !s)}
                    // Fix 2: Updated hover class
                    className={`notif-bell ${shake ? "shake" : ""} relative p-2 rounded-md hover:bg-slate-100 dark:hover:bg-white/10`}
                    aria-expanded={notifOpen}
                  >
                    <svg className={`w-6 h-6 ${newReqCount > 0 ? "text-orange-500" : "text-slate-600 dark:text-slate-200"}`} viewBox="0 0 24 24" fill="none">
                      <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118.6 14.6V11a6 6 0 10-12 0v3.6c0 .538-.214 1.055-.595 1.445L4 17h5m6 0a3 3 0 11-6 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {newReqCount > 0 && <span className="nav-red-dot" aria-hidden />}
                  </button>

                  {/* Notification dropdown */}
                  {notifOpen && (
                    /* ===== FIX: Mobile positioning (center, smaller) + Desktop (right-aligned) ===== */
                    <div
                      className={`absolute top-full mt-2 
                      ${isMobile ? "left-1/2 -translate-x-1/2 w-[260px]" : "right-0 w-[320px]"} 
                      max-w-[90vw] bg-white/95 backdrop-blur-md border border-slate-200 rounded-lg shadow-lg z-50
                      dark:bg-black/80 dark:border-white/6 p-2 md:p-3 transition-all duration-300`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold">Recent Requests</div>
                        <div className="text-xs text-slate-500">{loadingRequests ? "Loading..." : `${requestsList.length} shown`}</div>
                      </div>

                      <div style={{ maxHeight: "46vh", overflowY: "auto", paddingRight: 6 }}>
                        {requestsList.length === 0 && !loadingRequests && (
                          <div className="text-sm text-slate-500 py-6 text-center">No pending requests</div>
                        )}

                        {requestsList.map((it) => {
                          const isCancel = (it.status || "").toUpperCase() === "CANCEL_REQUESTED";
                          return (
                            /* ===== FIX: Smaller padding and gap ===== */
                            <div key={it.id} className="p-1.5 md:p-2 rounded-md hover:bg-slate-50 dark:hover:bg-white/5 flex gap-2 md:gap-3 items-start">
                              <div className="w-2.5 h-2.5 rounded-full mt-1" style={{ background: isCancel ? "#f97316" : "#06b6d4" }} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <div className="font-medium text-sm truncate">{truncate(it.title, 40)}</div>
                                  <div className="text-xs text-slate-500">{(it.date || "").split("T")[0]}</div>
                                </div>
                                <div className="text-xs text-slate-500 mt-1 truncate">{truncate(`${it.hallName || "—"} • ${it.department || "—"}`, 40)}</div>

                                {/* ===== FIX: Smaller buttons and gap ===== */ }
                                <div className="mt-2 flex flex-wrap gap-1.5 md:gap-2">
                                  {isCancel ? (
                                    <>
                                      <button onClick={() => handleConfirmCancel(it)} className="px-1.5 py-0.5 md:px-2 md:py-1 text-[10px] md:text-xs rounded-md bg-green-600 text-white">Confirm</button>
                                      <button onClick={() => handleRejectCancel(it)} className="px-1.5 py-0.5 md:px-2 md:py-1 text-[10px] md:text-xs rounded-md bg-red-600 text-white">Reject</button>
                                    </>
                                  ) : (
                                    <>
                                      <button onClick={() => handleApprove(it)} className="px-1.5 py-0.5 md:px-2 md:py-1 text-[10px] md:text-xs rounded-md bg-green-600 text-white">Approve</button>
                                      <button onClick={() => handleReject(it)} className="px-1.5 py-0.5 md:px-2 md:py-1 text-[10px] md:text-xs rounded-md bg-red-600 text-white">Reject</button>
                                    </>
                                  )}

                                  <button onClick={() => goToRequestsPage(it)} className="px-1.5 py-0.5 md:px-2 md:py-1 text-[10px] md:text-xs rounded-md bg-white border text-slate-700">More</button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-3 text-right">
                        <button onClick={() => { setNotifOpen(false); navigate("/admin/requests"); }} className="text-sm text-blue-600 hover:underline">Open Requests Page</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Show server status here (top-right) */}
              <ServerStatusIndicator />

              {/* Fix 3: Theme toggle now visible on mobile */}
              <ThemeToggle />

              {/* Desktop user pill / Mobile logout button */}
              {!isMobile ? (
                <div className="relative" ref={userWrapRef}>
                  <button
                    onClick={() => setUserOpen((s) => !s)}
                    className="flex items-center gap-2 px-2 py-1 rounded-full bg-white/60 border border-white/30 backdrop-blur-sm dark:bg-black/40"
                    aria-expanded={userOpen}
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                      {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                    </div>
                    <div className="text-xs leading-tight">
                      <div className="font-medium text-slate-900 dark:text-slate-100">{user?.name || "User"}</div>
                      <div className="text-slate-500 dark:text-slate-300">{role || "ADMIN"}</div>
                    </div>
                  </button>

                  {userOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white/95 backdrop-blur-md border border-slate-200 rounded-lg shadow-lg z-50 dark:bg-black/80">
                      <div className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
                        <div className="font-semibold">{user?.name || "User"}</div>
                        {/* fix overflow by truncating and showing full email on hover (title attr) */}
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate" title={user?.email || ""}>{user?.email || ""}</div>
                      </div>
                      <div className="border-t border-slate-100" />
                      <AnimatedButton
                        onClick={() => {
                          setUserOpen(false);
                          onLogout();
                        }}
                        className="w-full text-left px-4 py-2 text-sm"
                      >
                        Logout
                      </AnimatedButton>
                    </div>
                  )}
                </div>
              ) : (
                <AnimatedButton onClick={onLogout} className="px-3 py-1.5 text-sm rounded-md">
                  Logout
                </AnimatedButton>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile drawer overlay + panel (unchanged) */}
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-300 ${drawerOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={() => setDrawerOpen(false)}
      >
        <div className="absolute inset-0 bg-black/40 backdrop-blur-md" />

        <div
          className={`absolute right-0 w-11/12 sm:w-3/4 bg-white/95 shadow-2xl p-4 transform transition-transform duration-300 dark:bg-black/90 backdrop-blur-md border-l border-white/10`}
          style={{ top: "64px", height: "calc(100vh - 64px)", zIndex: 45 }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-hidden={!drawerOpen}
        >
          <div className="flex items-center justify-between pb-2 border-b dark:border-white/6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
              </div>
              <div>
                <div className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{user?.name || "User"}</div>
                <div className="text-xs text-slate-500 dark:text-slate-300">{role || "ADMIN"}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="mr-2"><ThemeToggle /></div>

              <button
                className="text-2xl text-slate-700 dark:text-slate-200 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-white/6 focus:outline-none focus:ring-2 focus:ring-blue-300"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>
          </div>

          <nav
            className="mt-3 flex flex-col gap-1 overflow-y-auto text-sm"
            style={{
              maxHeight: "calc(100vh - 160px)",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.exact}
                onClick={() => setDrawerOpen(false)}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-md font-medium transition ${isActive ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-black/20"}`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-4">
            <AnimatedButton onClick={() => { setDrawerOpen(false); onLogout(); }} className="w-full py-2 rounded-md text-sm">
              Logout
            </AnimatedButton>
          </div>

          {/* Server status inside the drawer (centered) */}
          <div className="mt-4 flex justify-center">
            <ServerStatusIndicator />
          </div>
        </div>
      </div>
    </>
  );
}
