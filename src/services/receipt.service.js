const PDFDocument = require('pdfkit');
const { getSettings } = require('./settings.service');
const { monthName } = require('../utils/dateHelpers');

/**
 * Streams a receipt PDF for a (populated) payment document directly onto `res`.
 * Kept as a stream (not a buffered return value) since receipts can be large
 * with remarks/line items and we don't want to hold the whole file in memory.
 */
async function streamReceiptPDF(payment, res) {
  const settings = await getSettings();
  const doc = new PDFDocument({ size: 'A5', margin: 40 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${payment.receiptNo}.pdf"`);
  doc.pipe(res);

  doc.fontSize(18).font('Helvetica-Bold').text(settings.schoolName, { align: 'center' });
  if (settings.schoolAddress) {
    doc.fontSize(9).font('Helvetica').text(settings.schoolAddress, { align: 'center' });
  }
  doc.moveDown(0.5);
  doc.fontSize(13).font('Helvetica-Bold').text('Fee Payment Receipt', { align: 'center' });
  doc.moveDown();

  doc.fontSize(10).font('Helvetica');
  const student = payment.studentId;
  const activity = payment.activityId;
  const collector = payment.collectedBy;

  const rows = [
    ['Receipt No', payment.receiptNo],
    ['Date', new Date(payment.paymentDate).toLocaleDateString('en-IN')],
    ['Student Name', student?.name || '-'],
    ['Admission No', student?.admissionNo || '-'],
    ['Class / Section', student ? `${student.standard} - ${student.section}` : '-'],
    ['Activity', activity?.name || '-'],
    ['Month(s)', payment.months.map((m) => monthName(m)).join(', ')],
    ['Year', String(payment.year)],
    ['Payment Mode', payment.paymentMode],
    ['Reference No', payment.referenceNo || '-'],
    ['Collected By', collector?.name || '-'],
  ];

  rows.forEach(([label, value]) => {
    doc.font('Helvetica-Bold').text(`${label}:`, { continued: true, width: 150 });
    doc.font('Helvetica').text(` ${value}`);
  });

  doc.moveDown();
  doc.moveTo(doc.x, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
  doc.moveDown(0.5);

  const amountRows = [
    ['Amount', payment.amount],
    ['Late Fee', payment.lateFee],
    ['Discount', -payment.discount],
  ];
  amountRows.forEach(([label, value]) => {
    doc.font('Helvetica').text(`${label}:`, { continued: true, width: 150 });
    doc.text(` ${settings.currency} ${value.toFixed(2)}`);
  });

  doc.moveDown(0.3);
  doc.font('Helvetica-Bold').fontSize(12).text(`Total Paid: ${settings.currency} ${payment.total.toFixed(2)}`);

  if (payment.remarks) {
    doc.moveDown();
    doc.fontSize(9).font('Helvetica-Oblique').text(`Remarks: ${payment.remarks}`);
  }

  doc.moveDown(2);
  doc.fontSize(8).font('Helvetica').text('This is a system-generated receipt.', { align: 'center' });

  doc.end();
}

module.exports = { streamReceiptPDF };
