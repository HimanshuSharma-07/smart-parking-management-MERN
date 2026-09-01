import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface InvoiceData {
  bookingRef: string;
  parkingLotName: string;
  parkingLotAddress: string;
  spot: string;
  floor: number;
  vehicleNumber: string;
  startTime: string;
  endTime: string;
  duration: number;
  totalPrice: number;
  paymentStatus: string;
  paymentMethod?: string;
  userName?: string;
}

export function generateInvoicePDF(data: InvoiceData): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // ── Brand Header Banner ──
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 48, 'F');

  // Accent Line under banner
  doc.setFillColor(16, 185, 129); // emerald-500
  doc.rect(0, 46, pageWidth, 2, 'F');

  // Logo / Brand Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text('PARKIFY', 20, 24);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('Smart Parking & Gate Operations System', 20, 33);

  // Invoice Title & Metadata
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text('INVOICE / RECEIPT', pageWidth - 20, 20, { align: 'right' });

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(`Ref: ${data.bookingRef}`, pageWidth - 20, 28, { align: 'right' });
  doc.text(`Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, pageWidth - 20, 35, { align: 'right' });

  // ── Payment Status & Method Badges ──
  const badgeY = 56;
  const isPaid = data.paymentStatus === 'paid';
  
  doc.setFillColor(isPaid ? 236 : 254, isPaid ? 253 : 243, isPaid ? 245 : 199); // emerald-50 / amber-50
  doc.roundedRect(20, badgeY, 60, 11, 2.5, 2.5, 'F');
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(isPaid ? 5 : 180, isPaid ? 150 : 83, isPaid ? 105 : 9); // emerald-600 / amber-700
  doc.text(isPaid ? '✓  PAYMENT RECEIVED' : '⏳  PAYMENT PENDING', 24, badgeY + 7.5);

  if (data.paymentMethod) {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Method: ${data.paymentMethod.toUpperCase()}`, 88, badgeY + 7.5);
  }

  // ── Section Title ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('RESERVATION SUMMARY', 20, 78);

  // Decorative Accent bar for Section Title
  doc.setFillColor(99, 102, 241); // indigo-500
  doc.rect(20, 81, 24, 1.5, 'F');

  // ── Booking Details Table ──
  const startDate = new Date(data.startTime);
  const endDate = new Date(data.endTime);

  const formatINDate = (d: Date) =>
    d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });

  const tableData: string[][] = [];

  if (data.userName) {
    tableData.push(['Customer Name', data.userName]);
  }

  tableData.push(
    ['Parking Location', data.parkingLotName],
    ['Address', data.parkingLotAddress || '—'],
    ['Reserved Spot', `Spot ${data.spot}  (Floor ${data.floor})`],
    ['Vehicle Registration', data.vehicleNumber],
    ['Check-In Time', formatINDate(startDate)],
    ['Check-Out Time', formatINDate(endDate)],
    ['Duration Reserved', `${data.duration} hour${data.duration > 1 ? 's' : ''}`]
  );

  autoTable(doc, {
    startY: 86,
    head: [['BOOKING PARAMETER', 'DETAILS']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42], // slate-900
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      cellPadding: 5,
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [30, 41, 59], // slate-800
      cellPadding: 4.5,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // slate-50
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 55, textColor: [71, 85, 105] },
      1: { cellWidth: 'auto' }
    },
    margin: { left: 20, right: 20 },
  });

  // ── Total Amount Summary Box ──
  const finalY = (doc as any).lastAutoTable?.finalY ?? 170;
  const boxY = finalY + 12;

  // Background box
  doc.setFillColor(236, 253, 245); // emerald-50
  doc.roundedRect(20, boxY, pageWidth - 40, 24, 4, 4, 'F');
  doc.setDrawColor(167, 243, 208); // emerald-200
  doc.setLineWidth(0.5);
  doc.roundedRect(20, boxY, pageWidth - 40, 24, 4, 4, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(6, 95, 70); // emerald-800
  doc.text('TOTAL AMOUNT PAID', 30, boxY + 15);

  doc.setFontSize(15);
  doc.setTextColor(5, 150, 105); // emerald-600
  // Note: Using 'INR ' instead of '₹' symbol prevents PDF font rendering corruption (e.g. ¹ 1 0 0)
  doc.text(`INR ${data.totalPrice}.00`, pageWidth - 30, boxY + 15, { align: 'right' });

  // ── Footer ──
  const footerY = boxY + 45;
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.3);
  doc.line(20, footerY, pageWidth - 20, footerY);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('This is an official computer-generated receipt from Parkify Management System.', pageWidth / 2, footerY + 8, { align: 'center' });
  doc.text('For queries or support, please contact support@parkify.app — Have a safe journey!', pageWidth / 2, footerY + 14, { align: 'center' });

  // Save PDF
  doc.save(`Parkify_Invoice_${data.bookingRef}.pdf`);
}
