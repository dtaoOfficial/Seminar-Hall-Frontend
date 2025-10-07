// src/pages/Admin/ExportPage.jsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const headers = [
  "Hall",
  "Title",
  "Booked By",
  "Email",
  "Department",
  "Phone",
  "Booked Date",
  "Event Date",
  "Start Time",
  "End Time",
  "Status",
  "Remarks",
];

const MIN_COL_PX = 48;
const LOGO_URL =
  "https://res.cloudinary.com/duhki4wze/image/upload/v1756755114/nhce_25-scaled-2_a6givc.png";
const LOCALSTORAGE_KEY = "export_col_widths_v1";

const ExportPage = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [generating, setGenerating] = useState(false);
  const previewRef = useRef(null);

  // column widths (pixels)
  const [colWidthsPx, setColWidthsPx] = useState(null);

  // pan & drag refs
  const panRef = useRef({
    isPanning: false,
    startX: 0,
    startY: 0,
    startScrollLeft: 0,
    startScrollTop: 0,
  });
  const dragRef = useRef({
    dragging: false,
    colIndex: -1,
    startX: 0,
    startWidths: null,
  });

  // combined rows from state (seminars + requests)
  const combinedRows = useMemo(() => {
    const seminars = Array.isArray(state?.seminars) ? state.seminars : [];
    const requests = Array.isArray(state?.requests) ? state.requests : [];

    const mapRow = (s) => ({
      hall: s.hallName || "--",
      title: s.slotTitle || "--",
      bookedBy: s.bookingName || "--",
      email: s.email || "--",
      department: s.department || "--",
      phone: s.phone || "--",
      bookedDate: (s.appliedAt || "").split("T")[0] || "--",
      eventDate: (s.date || "").split("T")[0] || "--",
      startTime: s.startTime || "--",
      endTime: s.endTime || "--",
      status: s.status || "--",
      remarks: s.remarks || "--",
      source: s.source || "seminar",
    });
    return [...seminars.map(mapRow), ...requests.map(mapRow)];
  }, [state?.seminars, state?.requests]);

  const title = state?.title || "Seminars & Requests Export";

  // ---------- utilities ----------
  const measureTextPx = useCallback((text, font) => {
    const canvas = measureTextPx._canvas || (measureTextPx._canvas = document.createElement("canvas"));
    const ctx = canvas.getContext("2d");
    ctx.font = font || "13px Arial";
    return ctx.measureText(String(text ?? "")).width;
  }, []);

  // auto-fit a single column (measured in preview font)
  const autoFitColumn = useCallback(
    (idx) => {
      const container = previewRef.current;
      if (!container) return;
      const cs = window.getComputedStyle(container);
      const fontFamily = cs.fontFamily || "Arial";
      const fontSize = cs.fontSize || "13px";
      const font = `${fontSize} ${fontFamily}`;

      let maxPx = measureTextPx(headers[idx] || "", font);

      combinedRows.forEach((r) => {
        const vals = [
          r.hall,
          r.title,
          r.bookedBy,
          r.email,
          r.department,
          r.phone,
          r.bookedDate,
          r.eventDate,
          r.startTime,
          r.endTime,
          r.status,
          r.remarks,
        ];
        const w = measureTextPx(String(vals[idx] ?? ""), font);
        if (w > maxPx) maxPx = w;
      });

      const paddingPx = 24;
      const newWidth = Math.max(MIN_COL_PX, Math.round(maxPx + paddingPx));

      setColWidthsPx((prev) => {
        const next = (prev || []).slice();
        while (next.length < headers.length) next.push(120);
        next[idx] = newWidth;
        try {
          localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(next));
        } catch {}
        return next;
      });
    },
    [combinedRows, measureTextPx]
  );

  const autoFitAll = useCallback(() => {
    const container = previewRef.current;
    if (!container) return;
    const cs = window.getComputedStyle(container);
    const fontFamily = cs.fontFamily || "Arial";
    const fontSize = cs.fontSize || "13px";
    const font = `${fontSize} ${fontFamily}`;

    const next = [];
    for (let idx = 0; idx < headers.length; idx++) {
      let maxPx = measureTextPx(headers[idx] || "", font);
      combinedRows.forEach((r) => {
        const vals = [
          r.hall,
          r.title,
          r.bookedBy,
          r.email,
          r.department,
          r.phone,
          r.bookedDate,
          r.eventDate,
          r.startTime,
          r.endTime,
          r.status,
          r.remarks,
        ];
        const w = measureTextPx(String(vals[idx] ?? ""), font);
        if (w > maxPx) maxPx = w;
      });
      const paddingPx = 24;
      next[idx] = Math.max(MIN_COL_PX, Math.round(maxPx + paddingPx));
    }
    setColWidthsPx(next);
    try {
      localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(next));
    } catch {}
  }, [combinedRows, measureTextPx]);

  // ---------- init column widths (load from localStorage or auto-fit) ----------
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCALSTORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length === headers.length) {
          setColWidthsPx(parsed.map((n) => Number(n) || MIN_COL_PX));
          return;
        }
      }
    } catch {
      // ignore
    }

    // compute a conservative initial fit using measureText
    const container = previewRef.current;
    const containerWidth = (container && container.clientWidth) || 1000;
    const usableWidth = Math.max(600, containerWidth - 48);
    // quick estimate: evenly distribute then autoFitAll will refine
    const even = Math.floor(usableWidth / headers.length);
    setColWidthsPx(headers.map(() => Math.max(MIN_COL_PX, even)));
    // refine on next tick
    const t = setTimeout(() => autoFitAll(), 80);
    return () => clearTimeout(t);
  }, [combinedRows, autoFitAll]);

  // ---------- resizer drag handlers ----------
  const onPointerMove = useCallback(
    (e) => {
      const d = dragRef.current;
      if (!d.dragging) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const delta = clientX - d.startX;
      const idx = d.colIndex;
      const newWidths = d.startWidths.slice();
      const nextIdx = idx + 1;

      const prev = newWidths[idx];
      let next = typeof newWidths[nextIdx] !== "undefined" ? newWidths[nextIdx] : null;

      let proposed = prev + delta;
      if (proposed < MIN_COL_PX) proposed = MIN_COL_PX;
      let consumed = proposed - prev;

      if (next !== null) {
        let nextProposed = next - consumed;
        if (nextProposed < MIN_COL_PX) {
          const maxConsumed = next - MIN_COL_PX;
          consumed = Math.max(Math.min(consumed, maxConsumed), -999999);
          proposed = prev + consumed;
          nextProposed = next - consumed;
        }
        newWidths[idx] = proposed;
        newWidths[nextIdx] = nextProposed;
      } else {
        newWidths[idx] = proposed;
      }

      setColWidthsPx(newWidths);
      try {
        localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(newWidths));
      } catch {}
    },
    []
  );

  const onPointerUp = useCallback(() => {
    dragRef.current.dragging = false;
    window.removeEventListener("mousemove", onPointerMove);
    window.removeEventListener("mouseup", onPointerUp);
    window.removeEventListener("touchmove", onPointerMove);
    window.removeEventListener("touchend", onPointerUp);
  }, [onPointerMove]);

  const onPointerDown = useCallback(
    (e, idx) => {
      e.stopPropagation?.();
      e.preventDefault?.();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      dragRef.current = {
        dragging: true,
        colIndex: idx,
        startX: clientX,
        startWidths: (colWidthsPx || []).slice(),
      };
      window.addEventListener("mousemove", onPointerMove);
      window.addEventListener("mouseup", onPointerUp);
      window.addEventListener("touchmove", onPointerMove, { passive: false });
      window.addEventListener("touchend", onPointerUp);
    },
    [colWidthsPx, onPointerMove, onPointerUp]
  );

  // ---------- pan (drag) to scroll preview ----------
  const onPanMove = useCallback((e) => {
    if (!panRef.current.isPanning) return;
    const container = previewRef.current;
    if (!container) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const dx = clientX - panRef.current.startX;
    const dy = clientY - panRef.current.startY;
    container.scrollLeft = panRef.current.startScrollLeft - dx;
    container.scrollTop = panRef.current.startScrollTop - dy;
    if (e.touches) e.preventDefault?.();
  }, []);

  const onPanEnd = useCallback(() => {
    panRef.current.isPanning = false;
    const container = previewRef.current;
    window.removeEventListener("mousemove", onPanMove);
    window.removeEventListener("mouseup", onPanEnd);
    window.removeEventListener("touchmove", onPanMove);
    window.removeEventListener("touchend", onPanEnd);
    if (container) container.classList.remove("cursor-grabbing");
  }, [onPanMove]);

  const onPanStart = useCallback(
    (e) => {
      if (dragRef.current.dragging) return;
      const container = previewRef.current;
      if (!container) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      panRef.current.isPanning = true;
      panRef.current.startX = clientX;
      panRef.current.startY = clientY;
      panRef.current.startScrollLeft = container.scrollLeft;
      panRef.current.startScrollTop = container.scrollTop;
      window.addEventListener("mousemove", onPanMove);
      window.addEventListener("mouseup", onPanEnd);
      window.addEventListener("touchmove", onPanMove, { passive: false });
      window.addEventListener("touchend", onPanEnd);
      container.classList.add("cursor-grabbing");
    },
    [onPanMove, onPanEnd]
  );

  // ---------- load image helper ----------
  const loadImageData = useCallback((url) => {
    return new Promise((resolve) => {
      if (!url) return resolve(null);
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL("image/png");
          resolve({ dataUrl, width: img.naturalWidth, height: img.naturalHeight });
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = url;
      if (img.complete && img.naturalWidth) {
        setTimeout(() => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);
            const dataUrl = canvas.toDataURL("image/png");
            resolve({ dataUrl, width: img.naturalWidth, height: img.naturalHeight });
          } catch {
            resolve(null);
          }
        }, 0);
      }
    });
  }, []);

  // ---------- PDF generation ----------
  const computeColumnWidths = useCallback((rows, usableWidth, doc) => {
    // fallback measured widths based on character counts (simple)
    const maxChars = headers.map((h) => h.length);
    rows.forEach((r) => {
      const rowValues = [
        r.hall,
        r.title,
        r.bookedBy,
        r.email,
        r.department,
        r.phone,
        r.bookedDate,
        r.eventDate,
        r.startTime,
        r.endTime,
        r.status,
        r.remarks,
      ];
      rowValues.forEach((val, idx) => {
        const str = String(val ?? "");
        const len = str.length;
        if (len > maxChars[idx]) maxChars[idx] = len;
      });
    });

    const measured = maxChars.map((chars) => Math.max(30, Math.round(chars * 6.5)));
    const totalMeasured = measured.reduce((a, b) => a + b, 0) || measured.length;
    const raw = measured.map((m) => (m / totalMeasured) * usableWidth);

    // clamp / distribute
    const MIN = 48;
    const MAX_GENERAL = Math.max(usableWidth * 0.22, 260);
    const MAX_REMARKS = Math.max(usableWidth * 0.35, 420);
    const final = raw.map((w, idx) => {
      const hdr = headers[idx];
      const cap = hdr === "Remarks" ? MAX_REMARKS : MAX_GENERAL;
      return Math.min(Math.max(w, MIN), cap);
    });

    const totalAfterClamp = final.reduce((a, b) => a + b, 0);
    const delta = usableWidth - totalAfterClamp;
    if (Math.abs(delta) > 2) {
      const flexibleIdxs = final
        .map((fw, i) => {
          const hdr = headers[i];
          const cap = hdr === "Remarks" ? MAX_REMARKS : MAX_GENERAL;
          return fw > MIN + 1 && fw < cap - 1 ? i : -1;
        })
        .filter((i) => i >= 0);
      if (flexibleIdxs.length > 0) {
        const addPer = delta / flexibleIdxs.length;
        flexibleIdxs.forEach((i) => {
          const cap = headers[i] === "Remarks" ? MAX_REMARKS : MAX_GENERAL;
          final[i] = Math.max(MIN, Math.min(final[i] + addPer, cap));
        });
      } else {
        final[final.length - 1] = Math.max(MIN, final[final.length - 1] + delta);
      }
    }

    const sumFinal = final.reduce((a, b) => a + b, 0);
    const correction = usableWidth / (sumFinal || 1);
    return final.map((w) => w * correction);
  }, []);

  const generatePdf = useCallback(
    async (ev) => {
      if (!combinedRows || combinedRows.length === 0) {
        alert("No data to export.");
        return;
      }
      setGenerating(true);
      try {
        const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 36;
        const usableWidth = pageWidth - margin * 2;

        // logo
        const imgObj = await loadImageData(LOGO_URL);
        let currentY = 20;
        if (imgObj && imgObj.dataUrl) {
          const displayW = Math.min(120, usableWidth * 0.18);
          const displayH = (imgObj.height / imgObj.width) * displayW;
          const x = (pageWidth - displayW) / 2;
          doc.addImage(imgObj.dataUrl, "PNG", x, currentY, displayW, displayH);
          currentY += displayH + 8;
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text(title, pageWidth / 2, currentY + 16, { align: "center" });
        currentY += 32;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - margin, currentY - 6, { align: "right" });

        // column widths for PDF (scale preview widths)
        let colWidthsForPdf;
        if (colWidthsPx && previewRef.current) {
          const previewTotal = colWidthsPx.reduce((a, b) => a + b, 0) || 1;
          colWidthsForPdf = colWidthsPx.map((w) => (w / previewTotal) * usableWidth);
        } else {
          colWidthsForPdf = computeColumnWidths(combinedRows, usableWidth, doc);
        }

        const head = [headers];
        const body = combinedRows.map((r) => [
          r.hall,
          r.title,
          r.bookedBy,
          r.email,
          r.department,
          r.phone,
          r.bookedDate,
          r.eventDate,
          r.startTime,
          r.endTime,
          r.status,
          r.remarks,
        ]);

        const columnStyles = colWidthsForPdf.reduce((acc, w, idx) => {
          acc[idx] = { cellWidth: w };
          return acc;
        }, {});

        autoTable(doc, {
          startY: currentY + 8,
          head,
          body,
          theme: "grid",
          styles: {
            fontSize: 9,
            overflow: "linebreak",
            cellPadding: 6,
            halign: "left",
            valign: "middle",
          },
          headStyles: { fillColor: [25, 42, 86], textColor: 255, halign: "center" },
          columnStyles,
          didDrawPage: (data) => {
            const pageCount = doc.internal.getNumberOfPages();
            const pageIndex = doc.internal.getCurrentPageInfo().pageNumber;
            const footer = `Page ${pageIndex} of ${pageCount}`;
            doc.setFontSize(9);
            doc.text(footer, pageWidth / 2, pageHeight - 12, { align: "center" });
          },
          margin: { left: margin, right: margin, top: 10, bottom: 30 },
          pageBreak: "auto",
        });

        doc.save("seminars_requests_export.pdf");
      } catch (err) {
        console.error("PDF generation error:", err);
        alert("Error generating PDF. See console for details.");
      } finally {
        setGenerating(false);
      }
    },
    [colWidthsPx, combinedRows, computeColumnWidths, loadImageData, title]
  );

  // ---------- preview helpers ----------
  const tableWidthPx = useMemo(() => {
    if (colWidthsPx && colWidthsPx.length === headers.length) {
      return colWidthsPx.reduce((a, b) => a + b, 0);
    }
    const c = previewRef.current;
    const cw = (c && c.clientWidth) || 1000;
    return Math.max(900, cw - 48);
  }, [colWidthsPx]);

  const colElements = useMemo(() => {
    if (colWidthsPx && colWidthsPx.length === headers.length) {
      return colWidthsPx.map((w) => Math.max(MIN_COL_PX, Math.round(w)));
    }
    const even = Math.floor(tableWidthPx / headers.length);
    return headers.map(() => even);
  }, [colWidthsPx, tableWidthPx]);

  const handleResizerDoubleClick = useCallback((idx) => {
    autoFitColumn(idx);
  }, [autoFitColumn]);

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => navigate(-1)}
          className="px-3 py-2 rounded-md bg-white border border-gray-200 shadow-sm hover:bg-gray-50"
        >
          ← Back
        </button>

        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={autoFitAll}
            className="px-3 py-2 rounded-md bg-white border border-gray-200 text-sm hover:bg-gray-50"
          >
            Auto-fit
          </button>
          <button
            onClick={generatePdf}
            disabled={generating}
            className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {generating ? "Generating..." : "Download PDF"}
          </button>
        </div>
      </div>

      <h2 className="text-xl font-semibold mb-3">{title}</h2>

      <div
        ref={previewRef}
        onMouseDown={onPanStart}
        onTouchStart={onPanStart}
        className="border rounded-md overflow-auto relative"
        style={{ maxHeight: "68vh" }}
      >
        <table
          className="min-w-max border-collapse"
          style={{
            width: `${tableWidthPx}px`,
            tableLayout: "fixed",
            borderSpacing: 0,
          }}
        >
          <colgroup>
            {colElements.map((w, i) => (
              <col key={i} style={{ width: `${w}px` }} />
            ))}
          </colgroup>

          <thead>
            <tr className="bg-gray-100">
              {headers.map((h, idx) => (
                <th
                  key={h}
                  className="text-left font-semibold px-3 py-2 relative select-none"
                  title={h}
                  style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                >
                  <div
                    className="flex items-center gap-2"
                    onDoubleClick={() => autoFitColumn(idx)}
                    style={{ alignItems: "center" }}
                  >
                    <span className="flex-1 truncate">{h}</span>
                  </div>

                  {/* resizer handle */}
                  <div
                    role="separator"
                    aria-hidden
                    onMouseDown={(e) => onPointerDown(e, idx)}
                    onTouchStart={(e) => onPointerDown(e, idx)}
                    onDoubleClick={() => handleResizerDoubleClick(idx)}
                    className="absolute right-0 top-0 h-full w-2 cursor-col-resize"
                    style={{
                      transform: "translateX(50%)",
                      touchAction: "none",
                    }}
                  />
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {combinedRows.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className="text-center py-6 text-gray-500">
                  No data to preview.
                </td>
              </tr>
            ) : (
              combinedRows.map((r, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="px-3 py-2" title={r.hall}>{r.hall}</td>
                  <td className="px-3 py-2 font-semibold truncate" title={r.title}>{r.title}</td>
                  <td className="px-3 py-2 truncate" title={r.bookedBy}>{r.bookedBy}</td>
                  <td className="px-3 py-2 truncate" title={r.email}>{r.email}</td>
                  <td className="px-3 py-2 truncate" title={r.department}>{r.department}</td>
                  <td className="px-3 py-2 truncate" title={r.phone}>{r.phone}</td>
                  <td className="px-3 py-2" title={r.bookedDate}>{r.bookedDate}</td>
                  <td className="px-3 py-2" title={r.eventDate}>{r.eventDate}</td>
                  <td className="px-3 py-2" title={r.startTime}>{r.startTime}</td>
                  <td className="px-3 py-2" title={r.endTime}>{r.endTime}</td>
                  <td className="px-3 py-2" title={r.status}>{r.status}</td>
                  <td className="px-3 py-2 truncate" title={r.remarks}>{r.remarks}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ExportPage;
