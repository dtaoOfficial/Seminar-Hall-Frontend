// src/utils/generateCardPDF.js
import jsPDF from "jspdf";

// ✅ Generate Themed College Style Invitation Card PDF
export const generateCardPDF = (req) => {
  const doc = new jsPDF("p", "pt", "a4");

  // ====== COLORS ======
  const nhceBlue = [0, 33, 71]; // deep NHCE blue
  const nhceGold = [255, 215, 0]; // golden yellow

  // ====== BACKGROUND ======
  doc.setFillColor(...nhceBlue);
  doc.rect(0, 0, 600, 842, "F");

  // ====== CARD CONTAINER ======
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(60, 60, 480, 700, 20, 20, "F");

  // ====== LOGO ======
  const nhceLogo =
    "https://res.cloudinary.com/duhki4wze/image/upload/v1756755114/nhce_25-scaled-2_a6givc.png";
  doc.addImage(nhceLogo, "PNG", 230, 80, 140, 70);

  // ====== TITLE ======
  doc.setFont("times", "bold");
  doc.setFontSize(24);
  doc.setTextColor(...nhceGold);
  doc.text(req.slotTitle?.toUpperCase() || "SEMINAR", 300, 180, {
    align: "center",
  });

  // ====== SUB-TITLE ======
  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.setTextColor(60, 60, 60);
  doc.text("New Horizon College of Engineering", 300, 205, {
    align: "center",
  });

  // ====== DETAILS BOX ======
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(90, 240, 420, 380, 12, 12, "F");

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...nhceBlue);

  let y = 270;
  const details = [
    ["Faculty", req.bookingName],
    ["Department", req.department],
    ["Hall", req.hallName],
    ["Date", req.date],
    ["Time", `${req.startTime} – ${req.endTime}`],
    ["Remarks", req.remarks || "—"],
  ];

  details.forEach(([label, value]) => {
    doc.text(`${label}:`, 110, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 30, 30);
    doc.text(value || "—", 220, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...nhceBlue);
    y += 45;
  });

  // ====== APPROVED STAMP ======
  const approvedStamp =
    "https://res.cloudinary.com/duhki4wze/image/upload/v1764305190/NHCE-Logo_uy7odw.png";
  doc.addImage(approvedStamp, "PNG", 370, 580, 120, 120);

  // ====== FOOTER ======
  doc.setFont("helvetica", "italic");
  doc.setFontSize(11);
  doc.setTextColor(...nhceGold);
  doc.text(
    "Approved by NHCE Seminar Hall Booking System",
    300,
    730,
    { align: "center" }
  );

  doc.save(`Invitation_${req.slotTitle || "Seminar"}.pdf`);
};
