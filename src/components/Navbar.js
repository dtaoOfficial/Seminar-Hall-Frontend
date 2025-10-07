// src/components/Navbar.js
import React, { useState, useEffect, useRef, useCallback } from "react";
import { NavLink, useNavigate } from "react-router-dom";

/* Links */
const LINKS_ADMIN = [
  { to: "/admin", label: "Dashboard", exact: true },
  { to: "/admin/add-user", label: "Add User" },
  { to: "/admin/add-seminar", label: "Add Seminar" },
  { to: "/admin/requests", label: "Requests" },
  { to: "/admin/seminars", label: "All Seminars" },
  { to: "/admin/departments", label: "Dept Creds" },
  { to: "/admin/manage-departments", label: "Manage Depts" },
  { to: "/admin/halls", label: "Manage Halls" },
  { to: "/admin/operators", label: "Hall Ops" },
];

const LINKS_DEPT = [
  { to: "/dept", label: "Dashboard", exact: true },
  { to: "/dept/history", label: "My Seminars" },
  { to: "/dept/status", label: "Requests" },
];

export default function Navbar({ user = {}, handleLogout }) {
  const navigate = useNavigate();

  // UI state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  // measurement/visibility refs
  const navContainerRef = useRef(null);
  const measureContainerRef = useRef(null);
  const measureLinkRefs = useRef([]);
  const measureMoreRef = useRef(null);
  const moreWrapRef = useRef(null);
  const userWrapRef = useRef(null);

  const [visibleCount, setVisibleCount] = useState(Infinity);
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);

  // notification badge count for requests
  const [newReqCount, setNewReqCount] = useState(0);

  // role & links
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

    const moreWidth = measureMoreRef.current ? Math.ceil(measureMoreRef.current.getBoundingClientRect().width) : 84;
    const GAP = 8; // spacing between items
    let used = 0;
    let count = 0;

    for (let i = 0; i < LINKS.length; i++) {
      const w = measured[i];
      const newUsed = used + (count > 0 ? GAP : 0) + w;
      const remaining = LINKS.length - (i + 1);
      const needMore = remaining > 0;
      const reserveMore = needMore ? (GAP + moreWidth) : 0;
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

  // close popovers on outside click
  useEffect(() => {
    const onDoc = (e) => {
      if (moreOpen && moreWrapRef.current && !moreWrapRef.current.contains(e.target)) setMoreOpen(false);
      if (userOpen && userWrapRef.current && !userWrapRef.current.contains(e.target)) setUserOpen(false);
    };
    if (moreOpen || userOpen) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [moreOpen, userOpen]);

  // lock body scroll when mobile drawer open
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

  // logout handler
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

  // derive arrays for visible/hidden links
  const effectiveVisibleCount = visibleCount === Infinity ? LINKS.length : visibleCount;
  const visibleLinks = LINKS.slice(0, effectiveVisibleCount);
  const hiddenLinks = LINKS.slice(effectiveVisibleCount);

  // listen for new-requests event to set badge
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

  // clicking Requests link should clear badge (mark as read)
  const onRequestsClick = () => {
    setNewReqCount(0);
  };

  return (
    <>
      <header className="fixed top-0 left-0 w-full z-50">
        <div className="backdrop-blur-lg bg-white/40 border-b border-white/30 shadow-sm">
          <div className="max-w-7xl mx-auto flex items-center justify-between px-4 md:px-6 py-3">
            {/* Left: brand + mobile control */}
            <div className="flex items-center gap-3">
              {isMobile ? (
                <button
                  onClick={() => setDrawerOpen(true)}
                  className="text-2xl px-2 text-slate-700"
                  aria-label="Open menu"
                >
                  ⋮
                </button>
              ) : null}

              <div
                className="flex items-center gap-3 cursor-pointer"
                onClick={() => navigate("/admin")}
              >
                <img
                  src="https://res.cloudinary.com/duhki4wze/image/upload/v1756755114/nhce_25-scaled-2_a6givc.png"
                  alt="NHCE"
                  className="h-10 w-auto object-contain"
                />
                <span className="ml-2 font-semibold text-slate-900 text-lg">NHCE Seminars</span>
              </div>
            </div>

            {/* Middle: inline links */}
            <div className="flex-1 px-4" style={{ minWidth: 0 }}>
              <nav
                ref={navContainerRef}
                className="flex items-center gap-2 whitespace-nowrap"
                aria-label="Primary navigation"
              >
                {!isMobile && visibleLinks.map((l) => {
                  // special handling to render requests link with dot badge
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
                              : "text-slate-700 hover:text-blue-600 hover:bg-white/60"
                          }`
                        }
                      >
                        {l.label}
                      </NavLink>

                      {/* small badge for new requests */}
                      {isRequests && newReqCount > 0 && (
                        <span className="absolute -top-1 -right-2 w-3 h-3 rounded-full bg-red-500 ring-2 ring-white" aria-hidden />
                      )}
                    </div>
                  );
                })}

                {/* More menu */}
                {!isMobile && hiddenLinks.length > 0 && (
                  <div className="relative" ref={moreWrapRef}>
                    <button
                      onClick={() => setMoreOpen((s) => !s)}
                      className="px-3 py-1.5 rounded-md text-sm font-medium text-slate-700 hover:text-blue-600 hover:bg-white/60 transition flex items-center gap-2"
                      aria-expanded={moreOpen}
                      aria-haspopup="true"
                    >
                      More ▾
                      <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full text-slate-700">{hiddenLinks.length}</span>
                    </button>

                    {moreOpen && (
                      <div className="absolute right-0 mt-2 w-56 bg-white/95 backdrop-blur-md border border-slate-200 rounded-lg shadow-lg z-50">
                        {hiddenLinks.map((l) => (
                          <NavLink
                            key={l.to}
                            to={l.to}
                            end={l.exact}
                            className={({ isActive }) =>
                              `block px-4 py-2 text-sm transition ${isActive ? "text-blue-600 font-semibold" : "text-slate-700 hover:bg-slate-100"}`
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
              <div ref={measureContainerRef} aria-hidden style={{ position: "absolute", left: -9999, top: -9999, visibility: "hidden", height: 0, overflow: "hidden", whiteSpace: "nowrap" }}>
                {LINKS.map((l, i) => (
                  <span key={l.to} ref={(el) => (measureLinkRefs.current[i] = el)} className="px-3 py-1.5 text-sm font-medium">
                    {l.label}
                  </span>
                ))}
                <span ref={measureMoreRef} className="px-3 py-1.5 text-sm font-medium">More ▾</span>
              </div>
            </div>

            {/* Right: user pill + logout */}
            <div className="flex items-center gap-3">
              {!isMobile ? (
                <div className="relative" ref={userWrapRef}>
                  <button
                    onClick={() => setUserOpen((s) => !s)}
                    className="flex items-center gap-2 px-2 py-1 rounded-full bg-white/60 border border-white/30 backdrop-blur-sm"
                    aria-expanded={userOpen}
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                      {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                    </div>
                    <div className="text-xs leading-tight">
                      <div className="font-medium text-slate-900">{user?.name || "User"}</div>
                      <div className="text-slate-500">{role || "ADMIN"}</div>
                    </div>
                  </button>

                  {userOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white/95 backdrop-blur-md border border-slate-200 rounded-lg shadow-lg z-50">
                      <div className="px-4 py-3 text-sm text-slate-700">
                        <div className="font-semibold">{user?.name || "User"}</div>
                        <div className="text-xs text-slate-500">{user?.email || ""}</div>
                      </div>
                      <div className="border-t border-slate-100" />
                      <button
                        onClick={() => { setUserOpen(false); onLogout(); }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-slate-100"
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button onClick={onLogout} className="px-3 py-1.5 text-sm rounded-md bg-gradient-to-r from-blue-600 to-cyan-400 text-white font-semibold">
                  Logout
                </button>
              )}

              {!isMobile ? (
                <button onClick={onLogout} className="px-3 py-1.5 text-sm rounded-md bg-gradient-to-r from-blue-600 to-cyan-400 text-white font-semibold">
                  Logout
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile drawer overlay + panel */}
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-300 ${drawerOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={() => setDrawerOpen(false)}
      >
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
        <div
          className={`absolute right-0 top-0 h-full w-3/4 sm:w-1/2 bg-white shadow-2xl p-5 transform transition-transform duration-300 ${drawerOpen ? "translate-x-0" : "translate-x-full"}`}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-hidden={!drawerOpen}
        >
          <div className="flex items-center justify-between pb-3 border-b">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
              </div>
              <div>
                <div className="font-semibold text-slate-800">{user?.name || "User"}</div>
                <div className="text-xs text-slate-500">{role || "ADMIN"}</div>
              </div>
            </div>
            <button className="text-2xl" onClick={() => setDrawerOpen(false)} aria-label="Close menu">✕</button>
          </div>

          <nav
            className="mt-4 flex flex-col gap-2 overflow-y-auto"
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
                  `block px-4 py-2 rounded-md text-sm font-medium transition ${isActive ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-100"}`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>

          <button onClick={() => { setDrawerOpen(false); onLogout(); }} className="mt-auto w-full py-2 rounded-md bg-gradient-to-r from-blue-600 to-cyan-400 text-white font-semibold">
            Logout
          </button>
        </div>
      </div>
    </>
  );
}
