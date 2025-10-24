// src/components/Navbar.js
import React, { useState, useEffect, useRef, useCallback } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";
import AnimatedButton from "../components/AnimatedButton"; // ← added

/* Links arrays (unchanged) */
const LINKS_ADMIN = [
  { to: "/admin", label: "Dashboard", exact: true },
  { to: "/admin/add-user", label: "Add User" },
  { to: "/admin/add-seminar", label: "Add Seminar" },
  { to: "/admin/requests", label: "Requests" },
  { to: "/admin/seminars", label: "All Seminars" },
  { to: "/admin/departments", label: "Dept Creds" },
  { to: "/admin/manage-departments", label: "Manage Depts" },
  { to: "/admin/halls", label: "Manage Halls" },
  { to: "/admin/operators", label: "Hall Operaters" },
];

const LINKS_DEPT = [
  { to: "/dept", label: "Dashboard", exact: true },
  { to: "/dept/history", label: "Status" },
  { to: "/dept/status", label: "Requests" },
];

export default function Navbar({ user = {}, handleLogout }) {
  const navigate = useNavigate();
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

  const [newReqCount, setNewReqCount] = useState(0);

  const role = (user?.role || "ADMIN").toString().toUpperCase();
  const LINKS = role === "DEPARTMENT" ? LINKS_DEPT : LINKS_ADMIN;

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
      setIsMobile(window.innerWidth < 768);

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
    if (moreOpen || userOpen) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [moreOpen, userOpen]);

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

  const onLogout = useCallback(() => {
    if (typeof handleLogout === "function") {
      handleLogout();
    } else {
      try {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
      } catch {}
      navigate("/");
    }
  }, [handleLogout, navigate]);

  const effectiveVisibleCount = visibleCount === Infinity ? LINKS.length : visibleCount;
  const visibleLinks = LINKS.slice(0, effectiveVisibleCount);
  const hiddenLinks = LINKS.slice(effectiveVisibleCount);

  useEffect(() => {
    const handler = (e) => {
      const n = (e && e.detail && Number(e.detail.count)) || 0;
      if (Number.isFinite(n) && n > 0) {
        setNewReqCount((prev) => Math.max(prev, n));
      }
    };
    window.addEventListener("new-requests", handler);
    return () => window.removeEventListener("new-requests", handler);
  }, []);

  const onRequestsClick = () => {
    setNewReqCount(0);
  };

  return (
    <>
      <header className="w-full fixed top-0 left-0 z-50 h-16">
        {/* stronger glass on header: increased blur + slightly more opaque bg for light mode */}
        <div className="w-full h-full backdrop-blur-xl bg-white/55 border-b border-white/20 shadow-sm dark:bg-black/30 dark:border-white/6">
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
                <span className="ml-2 font-semibold text-slate-900 dark:text-slate-100 text-lg">NHCE Seminars</span>
              </div>
            </div>

            {/* Middle: inline links */}
            <div className="flex-1 px-4" style={{ minWidth: 0 }}>
              <nav
                ref={navContainerRef}
                className="flex items-center gap-2 whitespace-nowrap"
                aria-label="Primary navigation"
              >
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

                        {isRequests && newReqCount > 0 && (
                          <span className="nav-red-dot" aria-hidden />
                        )}
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

            {/* Right: user pill + logout + theme toggle */}
            <div className="flex items-center gap-3">
              {/* Desktop user pill */}
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
                    <div className="absolute right-0 mt-2 w-48 bg-white/95 backdrop-blur-md border border-slate-200 rounded-lg shadow-lg z-50 dark:bg-black/80">
                      <div className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
                        <div className="font-semibold">{user?.name || "User"}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{user?.email || ""}</div>
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

              {/* Desktop Theme toggle (hidden on mobile) */}
              {!isMobile ? (
                <ThemeToggle />
              ) : null}

              {/* Desktop logout duplicate removed (keeps exactly your earlier layout) */}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile drawer overlay + panel */}
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-300 ${drawerOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={() => setDrawerOpen(false)}
      >
        {/* stronger backdrop blur for better contrast */}
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

            {/* Mobile Theme toggle + close button */}
            <div className="flex items-center gap-2">
              <div className="mr-2">
                <ThemeToggle />
              </div>

              {/* FIX: explicit light/dark color + hover so X is always visible */}
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
        </div>
      </div>
    </>
  );
}
