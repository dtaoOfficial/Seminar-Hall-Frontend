// src/pages/SeminarDetails.jsx
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../utils/api";

const ymd = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const hh = String(i).padStart(2, "0");
  return { label: `${hh}:00`, index: i };
});

const SeminarDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.state?.returnTo || "/admin/add-seminar";
  const preselectedHall = location.state?.selectedHall || null;
  const preselectedDate = location.state?.date ? new Date(location.state.date) : new Date();

  const [halls, setHalls] = useState([]);
  const [seminars, setSeminars] = useState([]);
  const [loading, setLoading] = useState(true);

  // UI state
  const [selectedHall, setSelectedHall] = useState(preselectedHall || "");
  const [selectedHallObj, setSelectedHallObj] = useState(null);
  const [selectedDate, setSelectedDate] = useState(preselectedDate);
  const [bookedHours, setBookedHours] = useState(new Set());
  const [ownersByHour, setOwnersByHour] = useState(new Map()); // hour -> info string
  const [selectedRange, setSelectedRange] = useState(null); // { start, endExclusive }
  const [selectedFeatures, setSelectedFeatures] = useState(new Set());
  const notifRef = useRef(null);
  const [notification, setNotification] = useState("");

  // Viewer modal state (image or video)
  const [viewer, setViewer] = useState({
    open: false,
    type: null,
    srcList: [],
    index: 0,
    autoplayMuted: true,
  });
  const videoRef = useRef(null);
  const viewerRef = useRef(null);

  // preserve body overflow & scroll pos while modal open
  const savedBodyOverflow = useRef("");
  const savedScrollY = useRef(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [resH, resS] = await Promise.all([api.get("/halls"), api.get("/seminars")]);
      const hallsList = Array.isArray(resH.data) ? resH.data : [];
      const seminarsList = Array.isArray(resS.data) ? resS.data : [];
      setHalls(hallsList);
      setSeminars(seminarsList);

      if (preselectedHall) {
        const obj = hallsList.find((h) => h.name === preselectedHall) || null;
        setSelectedHallObj(obj);
        setSelectedHall(obj?.name || preselectedHall);
        if (obj && Array.isArray(obj.features)) {
          setSelectedFeatures(new Set(obj.features));
        }
      }
    } catch (err) {
      console.error("Error fetching halls/seminars:", err);
      setHalls([]);
      setSeminars([]);
    } finally {
      setLoading(false);
    }
  }, [preselectedHall]);

  useEffect(() => {
    fetchData();
    // copy ref values into locals so cleanup uses stable values (avoids linter warning)
    const savedOverflowAtEffect = savedBodyOverflow.current;
    const savedScrollYAtEffect = savedScrollY.current;

    return () => {
      if (notifRef.current) clearTimeout(notifRef.current);
      try {
        document.body.style.overflow = savedOverflowAtEffect || "";
        window.scrollTo(0, savedScrollYAtEffect || 0);
      } catch {}
    };
  }, [fetchData]);

  useEffect(() => {
    if (!selectedHall) {
      setSelectedHallObj(null);
      setSelectedFeatures(new Set());
      return;
    }
    const obj = halls.find((h) => h.name === selectedHall) || null;
    setSelectedHallObj(obj);
    if (obj && Array.isArray(obj.features)) {
      setSelectedFeatures(new Set(obj.features));
    }
  }, [selectedHall, halls]);

  // robust date comparison helper (handles strings or Date)
  const normalizeDateOnly = (val) => {
    if (!val) return "";
    try {
      if (val instanceof Date) return ymd(val);
      const s = String(val);
      return s.split("T")[0];
    } catch {
      return String(val).split("T")[0];
    }
  };

  useEffect(() => {
    if (!selectedHall) {
      setBookedHours(new Set());
      setOwnersByHour(new Map());
      setSelectedRange(null);
      return;
    }
    const dayStr = normalizeDateOnly(selectedDate);

    // ONLY APPROVED seminars should block hours
    const daySeminars = seminars.filter((s) => {
      if (String((s.status || "").toUpperCase()) !== "APPROVED") return false;
      if (normalizeDateOnly(s.date) !== dayStr) return false;

      // robust hall matching: compare hallName (string), hallId, or nested hall.name
      const hallName = (s.hallName || s.hall?.name || "").toString().trim();
      const hallId = (s.hallId || s.hall?._id || s.hall?.id || "").toString().trim();
      const sel = (selectedHall || "").toString().trim();
      if (!sel) return false;
      return hallName === sel || hallId === sel || sel === s.hall?._id || sel === s.hall?.id;
    });

    const bh = new Set();
    const ownersMap = new Map();

    daySeminars.forEach((s) => {
      if (!s.startTime || !s.endTime) return;
      const parse = (t) => {
        const m = String(t || "").trim().match(/^(\d{1,2}):(\d{2})/);
        if (!m) return null;
        return { h: parseInt(m[1], 10), m: parseInt(m[2], 10) };
      };
      const st = parse(s.startTime);
      const et = parse(s.endTime);
      if (!st || !et) return;
      let startIdx = st.h;
      let endIdx = et.h;
      if (et.m > 0) {
        endIdx = Math.min(24, endIdx + 1);
      }

      // owner info string for tooltip
      const ownerInfo = `${s.slotTitle || s.bookingName || "Booked"} — ${s.startTime} to ${s.endTime} — ${s.email || "no contact"}`;

      for (let hr = startIdx; hr < endIdx; hr++) {
        if (hr >= 0 && hr <= 23) {
          bh.add(hr);
          // if multiple seminars overlap same hour, join them with separator
          const prev = ownersMap.get(hr);
          ownersMap.set(hr, prev ? `${prev}\n---\n${ownerInfo}` : ownerInfo);
        }
      }
    });

    setBookedHours(bh);
    setOwnersByHour(ownersMap);
    setSelectedRange(null);
  }, [selectedHall, selectedDate, seminars]);

  const showNotification = (msg, ms = 4000) => {
    setNotification(msg);
    if (notifRef.current) clearTimeout(notifRef.current);
    if (ms > 0) notifRef.current = setTimeout(() => setNotification(""), ms);
  };

  const closeViewer = async () => {
    try {
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
      }
    } catch (_) {}
    try {
      const exitFS = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
      if (exitFS && (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement)) {
        exitFS.call(document);
      }
    } catch (_) {}
    setViewer((v) => ({ ...v, open: false }));
    setTimeout(() => {
      setViewer({ open: false, type: null, srcList: [], index: 0, autoplayMuted: true });
      try {
        document.body.style.overflow = savedBodyOverflow.current || "";
        window.scrollTo(0, savedScrollY.current || 0);
      } catch {}
    }, 260);
  };

  const goNext = () => setViewer((v) => ({ ...v, index: Math.min(v.srcList.length - 1, v.index + 1) }));
  const goPrev = () => setViewer((v) => ({ ...v, index: Math.max(0, v.index - 1) }));

  // keyboard handling for viewer
  useEffect(() => {
    if (!viewer.open) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeViewer();
      } else if (e.key === "ArrowRight") {
        goNext();
      } else if (e.key === "ArrowLeft") {
        goPrev();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [viewer.open]);

  // HOUR SELECTION
  const hourClicked = (idx) => {
    // if booked, show booking details but do not allow selection
    if (bookedHours.has(idx)) {
      const dayStr = normalizeDateOnly(selectedDate);
      const owners = seminars.filter((s) => {
        if (normalizeDateOnly(s.date) !== dayStr) return false;
        // same robust hall matching as above
        const hallName = (s.hallName || s.hall?.name || "").toString().trim();
        const hallId = (s.hallId || s.hall?._id || s.hall?.id || "").toString().trim();
        const sel = (selectedHall || "").toString().trim();
        if (!(hallName === sel || hallId === sel || sel === s.hall?._id || sel === s.hall?.id)) return false;
        // only APPROVED
        if (String((s.status || "").toUpperCase()) !== "APPROVED") return false;
        const parse = (t) => {
          const m = String(t || "").trim().match(/^(\d{1,2}):(\d{2})/);
          if (!m) return null;
          return { h: parseInt(m[1], 10), m: parseInt(m[2], 10) };
        };
        const st = parse(s.startTime);
        const et = parse(s.endTime);
        if (!st || !et) return false;
        let startIdx = st.h;
        let endIdx = et.h;
        if (et.m > 0) endIdx = Math.min(24, endIdx + 1);
        return idx >= startIdx && idx < endIdx;
      });

      if (owners.length > 0) {
        const info = owners
          .map((o) => `${o.slotTitle || o.bookingName || "Booked"} — ${o.startTime} to ${o.endTime} — ${o.email || "no contact"}`)
          .join("\n---\n");
        showNotification(`🛑 Slot already booked:\n${info}`, 7000);
      } else {
        const t = ownersByHour.get(idx) || "🛑 Slot already booked";
        showNotification(t, 5000);
      }
      return;
    }

    if (!selectedRange) {
      setSelectedRange({ start: idx, end: idx + 1 });
      return;
    }
    const s = selectedRange.start;
    const e = selectedRange.end;
    if (idx >= s && idx < e) {
      setSelectedRange(null);
      return;
    }
    const newStart = Math.min(s, idx);
    const newEndExclusive = Math.max(e - 1, idx) + 1;
    for (let hr = newStart; hr < newEndExclusive; hr++) {
      if (bookedHours.has(hr)) {
        showNotification("❌ Cannot select range — contains booked hour(s).", 3000);
        return;
      }
    }
    setSelectedRange({ start: newStart, end: newEndExclusive });
  };

  const selectedHoursCount = selectedRange ? Math.max(0, selectedRange.end - selectedRange.start) : 0;
  const selectedStartTime = selectedRange ? `${String(selectedRange.start).padStart(2, "0")}:00` : "";
  const selectedEndTime = selectedRange ? `${String(selectedRange.end).padStart(2, "0")}:00` : "";

  const selectAndReturn = () => {
    if (!selectedHall) return showNotification("Please select a hall first", 2500);
    if (selectedHoursCount === 0) return showNotification("Please select at least one hour", 2500);
    navigate(returnTo, {
      state: {
        selectedHall,
        selectedStartTime,
        selectedEndTime,
        selectedFeatures: Array.from(selectedFeatures),
        date: ymd(selectedDate),
      },
    });
  };

  if (loading) {
    return (
      <div className="min-h-[200px] flex items-center justify-center">
        <div className="text-gray-500">Loading halls...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      {/* notification */}
      {notification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4">
          <div className="bg-white border border-gray-200 shadow rounded px-4 py-2 text-sm whitespace-pre-wrap">
            {notification}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* left: hall list */}
          <aside className="lg:col-span-1 bg-white rounded-lg shadow p-3 sm:p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Seminar Halls</h3>
            <div className="space-y-3 max-h-[70vh] overflow-auto pr-1">
              {halls.length === 0 ? (
                <div className="text-sm text-gray-500">No halls available</div>
              ) : (
                halls.map((h) => (
                  <button
                    key={h.id ?? h._id ?? h.name}
                    onClick={() => setSelectedHall(h.name)}
                    className={`w-full text-left flex items-center gap-3 p-3 rounded-lg border ${selectedHall === h.name ? "border-blue-300 bg-blue-50" : "border-gray-100 bg-white"} hover:shadow-sm transition`}
                    title={h.name}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-800 truncate">{h.name}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </aside>

          {/* right: details */}
          <main className="lg:col-span-3 bg-white rounded-lg shadow p-4 sm:p-6">
            {/* header + actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-xl font-semibold text-gray-800 truncate">{selectedHallObj?.name || selectedHall || "Select a seminar hall"}</h3>
              </div>

              <div className="flex-shrink-0 flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => navigate(returnTo)}
                  className="px-3 py-2 rounded-md border border-gray-200 bg-white text-sm whitespace-nowrap"
                >
                  Back
                </button>

                <button
                  onClick={selectAndReturn}
                  className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm whitespace-nowrap"
                >
                  Select & Return
                </button>
              </div>
            </div>

            {/* Date + Hours */}
            <section className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Date</label>
                <input
                  type="date"
                  value={ymd(selectedDate)}
                  onChange={(e) => setSelectedDate(new Date(e.target.value))}
                  className="px-3 py-2 rounded-md border border-gray-200 bg-white w-full"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hourly Availability</label>
                  <div className="text-sm text-gray-500 mb-2 flex items-center gap-3">
                    <span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-200 border border-emerald-300" /> Free</span>
                    <span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-rose-200 border border-rose-300" /> Booked</span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="mx-auto" style={{ maxWidth: 980 }}>
                    <div
                      className="grid gap-3"
                      style={{
                        gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))",
                        alignItems: "center",
                      }}
                    >
                      {HOURS.map((h) => {
                        const isBooked = bookedHours.has(h.index);
                        const inSelection = selectedRange && h.index >= selectedRange.start && h.index < selectedRange.end;

                        // pill base
                        const base = "text-center font-semibold select-none transition transform active:scale-95";
                        const pillPadding = "px-3 py-2 text-base";
                        const bookedCls = `${base} ${pillPadding} rounded-2xl bg-rose-50 text-rose-700 border border-rose-100 shadow-sm cursor-not-allowed opacity-95`;
                        const freeCls = `${base} ${pillPadding} rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-100 shadow-sm`;
                        const selectedCls = `${base} ${pillPadding} rounded-2xl bg-emerald-800 text-white shadow-md`;

                        const cls = isBooked ? bookedCls : inSelection ? selectedCls : freeCls;
                        const title = isBooked ? (ownersByHour.get(h.index) || "Already booked") : undefined;

                        return (
                          <button
                            key={h.index}
                            type="button"
                            onClick={() => { if (!isBooked) hourClicked(h.index); }}
                            title={title}
                            className={cls}
                            aria-pressed={inSelection}
                            disabled={isBooked}
                          >
                            {h.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="text-sm text-gray-500 mt-3">
                  Selected: <strong className="text-gray-800">{selectedHoursCount}</strong> hour(s) {selectedRange ? ` — ${selectedStartTime} to ${selectedEndTime}` : ""}
                </div>
              </div>
            </section>
          </main>
        </div>

        <div className="mt-4 text-center text-sm text-gray-500">
          Tip: Click a free hour to start selection, click another hour to expand range. Click a booked hour to view booking details.
        </div>
      </div>

      {/* Viewer Modal */}
      {viewer.open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" onClick={closeViewer}>
          <div className="relative w-full max-w-4xl bg-black rounded-lg overflow-hidden" ref={viewerRef} onClick={(e) => e.stopPropagation()}>
            <button className="absolute top-3 right-3 z-20 bg-white/90 rounded-full p-1 text-black" aria-label="Close" onClick={closeViewer}>✕</button>

            {viewer.srcList.length > 1 && (
              <>
                <button className="absolute left-3 top-1/2 -translate-y-1/2 z-20 bg-white/90 rounded-full p-1 text-black" onClick={goPrev} disabled={viewer.index === 0}>◀</button>
                <button className="absolute right-12 top-1/2 -translate-y-1/2 z-20 bg-white/90 rounded-full p-1 text-black" onClick={goNext} disabled={viewer.index === viewer.srcList.length - 1}>▶</button>
              </>
            )}

            <div className="flex items-center justify-center bg-black" style={{ minHeight: "60vh", maxHeight: "90vh" }}>
              {viewer.type === "image" ? (
                <img src={viewer.srcList[viewer.index]} alt={`media-${viewer.index}`} className="object-contain max-h-[90vh] w-full" />
              ) : (
                <video ref={videoRef} src={viewer.srcList[viewer.index]} controls playsInline className="w-full max-h-[90vh]" muted={viewer.autoplayMuted} />
              )}
            </div>

            <div className="flex items-center justify-between gap-3 px-4 py-3 bg-black/70">
              <div className="text-white text-sm">{viewer.index + 1} / {viewer.srcList.length} — {viewer.type === "image" ? "Image" : "Video"}</div>

              <div className="flex items-center gap-2">
                {viewer.type === "video" && (
                  <>
                    <button className="px-3 py-1 rounded-md bg-white text-sm" onClick={() => {
                      const v = videoRef.current;
                      if (!v) return;
                      try {
                        if (v.muted) { v.muted = false; v.play().catch(()=>{}); setViewer((s) => ({ ...s, autoplayMuted: false })); }
                        else { v.muted = true; setViewer((s) => ({ ...s, autoplayMuted: true })); }
                      } catch (_) {}
                    }}>{videoRef.current && !videoRef.current.muted ? "🔊" : "🔇"}</button>
                    <button className="px-3 py-1 rounded-md bg-white text-sm" onClick={() => { const v = videoRef.current; if (!v) return; try { v.currentTime = Math.max(0,(v.currentTime||0)-10);} catch(e){} }}>-10s</button>
                    <button className="px-3 py-1 rounded-md bg-white text-sm" onClick={() => { const v = videoRef.current; if (!v) return; try { v.currentTime = Math.min(v.duration||0,(v.currentTime||0)+10);} catch(e){} }}>+10s</button>
                  </>
                )}

                <button className="px-3 py-1 rounded-md bg-white text-sm" onClick={() => {
                  const url = viewer.srcList[viewer.index];
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = url.split("/").pop().split("?")[0] || `file`;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                }}>⬇</button>

                <button className="px-3 py-1 rounded-md bg-white text-sm" onClick={() => {
                  const el = viewerRef.current;
                  const requestFS = el?.requestFullscreen || el?.webkitRequestFullscreen || el?.mozRequestFullScreen || el?.msRequestFullscreen;
                  if (requestFS) {
                    try { requestFS.call(el); } catch (e) { showNotification("Fullscreen not allowed"); }
                  } else {
                    showNotification("Fullscreen not supported");
                  }
                }}>⤢</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SeminarDetails;
