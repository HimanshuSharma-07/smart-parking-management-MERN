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

  // ── Brand Header ──
  doc.setFillColor(17, 24, 39); // gray-900
  doc.rect(0, 0, pageWidth, 42, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(255, 255, 255);
  doc.text('PARKIFY', 20, 22);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(156, 163, 175); // gray-400
  doc.text('Smart Parking Management', 20, 32);

  // ── Invoice Title ──
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('INVOICE / RECEIPT', pageWidth - 20, 18, { align: 'right' });

  doc.setFontSize(9);
  doc.setTextColor(156, 163, 175);
  doc.text(`Ref: ${data.bookingRef}`, pageWidth - 20, 26, { align: 'right' });
  doc.text(`Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, pageWidth - 20, 33, { align: 'right' });

  // ── Payment Status Badge ──
  const badgeY = 52;
  const isPaid = data.paymentStatus === 'paid';
  
  doc.setFillColor(isPaid ? 220 : 254, isPaid ? 252 : 226, isPaid ? 231 : 226); // green-50 / amber-50
  doc.roundedRect(20, badgeY, 56, 10, 2, 2, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(isPaid ? 22 : 146, isPaid ? 101 : 64, isPaid ? 52 : 14); // green-800 / amber-800
  doc.text(isPaid ? '✓ PAYMENT RECEIVED' : '⏳ PAYMENT PENDING', 24, badgeY + 7);

  if (data.paymentMethod) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    doc.text(`Method: ${data.paymentMethod.toUpperCase()}`, 82, badgeY + 7);
  }

  // ── Booking Details Table ──
  const startDate = new Date(data.startTime);
  const endDate = new Date(data.endTime);

  const tableData = [
    ['Parking Lot', data.parkingLotName],
    ['Address', data.parkingLotAddress || '—'],
    ['Spot / Floor', `Spot ${data.spot} · Floor ${data.floor}`],
    ['Vehicle Number', data.vehicleNumber],
    ['Check-In', startDate.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })],
    ['Check-Out', endDate.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })],
    ['Duration', `${data.duration} hour${data.duration > 1 ? 's' : ''}`],
  ];

  if (data.userName) {
    tableData.unshift(['Customer', data.userName]);
  }

  autoTable(doc, {
    startY: 70,
    head: [['Field', 'Details']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [17, 24, 39],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [55, 65, 81],
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 45 },
    },
    margin: { left: 20, right: 20 },
  });

  // ── Total Amount Box ──
  const finalY = (doc as any).lastAutoTable?.finalY ?? 180;
  const boxY = finalY + 10;

  doc.setFillColor(240, 253, 244); // green-50
  doc.roundedRect(20, boxY, pageWidth - 40, 22, 3, 3, 'F');
  doc.setDrawColor(187, 247, 208); // green-200
  doc.roundedRect(20, boxY, pageWidth - 40, 22, 3, 3, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(55, 65, 81);
  doc.text('Total Amount', 28, boxY + 14);

  doc.setFontSize(16);
  doc.setTextColor(21, 128, 61); // green-700
  doc.text(`₹${data.totalPrice}`, pageWidth - 28, boxY + 14, { align: 'right' });

  // ── Footer ──
  const footerY = boxY + 40;
  doc.setDrawColor(229, 231, 235);
  doc.line(20, footerY, pageWidth - 20, footerY);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(156, 163, 175);
  doc.text('This is a computer-generated invoice. No signature required.', pageWidth / 2, footerY + 8, { align: 'center' });
  doc.text('Thank you for choosing Parkify — Drive Safe!', pageWidth / 2, footerY + 14, { align: 'center' });

  // ── Save ──
  doc.save(`Parkify_Invoice_${data.bookingRef}.pdf`);
}
