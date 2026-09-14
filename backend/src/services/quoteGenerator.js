import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export const generateQuotePDF = (lead, quote) => {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(20);
  doc.text('ETSON THERMAL PAPER', 14, 22);
  
  doc.setFontSize(10);
  doc.text('Quote Reference: ' + (quote.id || 'QT-DRAFT'), 14, 30);
  doc.text('Date: ' + new Date().toLocaleDateString(), 14, 35);
  doc.text('Validity: 15 Days', 14, 40);

  // Customer Details
  doc.setFontSize(12);
  doc.text('Customer Details:', 14, 55);
  doc.setFontSize(10);
  doc.text(`Name: ${lead.name || 'Valued Customer'}`, 14, 62);
  doc.text(`Phone: ${lead.phone || ''}`, 14, 67);
  doc.text(`City: ${lead.city || ''}`, 14, 72);

  // Table
  const tableData = [];
  let subtotal = 0;

  if (quote.items && quote.items.length > 0) {
    quote.items.forEach(item => {
      const total = item.qty * item.price;
      subtotal += total;
      tableData.push([
        item.product || item.description || item.name,
        item.qty,
        `Rs ${Number(item.price || 0).toFixed(2)}`,
        `Rs ${total.toFixed(2)}`
      ]);
    });
  } else {
    // Default placeholder
    tableData.push(['Thermal Paper Rolls', 100, 'Rs 15.00', 'Rs 1500.00']);
    subtotal = 1500;
  }

  doc.autoTable({
    startY: 85,
    head: [['Description', 'Qty', 'Unit Price', 'Total']],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: 10 }
  });

  const finalY = doc.lastAutoTable.finalY || 100;

  // Totals
  const gst = subtotal * 0.18;
  const grandTotal = subtotal + gst;

  doc.text(`Subtotal: Rs ${subtotal.toFixed(2)}`, 140, finalY + 10);
  doc.text(`GST (18%): Rs ${gst.toFixed(2)}`, 140, finalY + 16);
  doc.setFontSize(12);
  doc.text(`Grand Total: Rs ${grandTotal.toFixed(2)}`, 140, finalY + 24);

  // Terms
  doc.setFontSize(10);
  doc.text('Terms and Conditions:', 14, finalY + 40);
  doc.text('1. Payment: 100% advance', 14, finalY + 45);
  doc.text('2. Delivery: Within 3-5 business days', 14, finalY + 50);

  // Output as base64 string
  const dataUri = doc.output('datauristring');
  return dataUri.split(',')[1];
};
