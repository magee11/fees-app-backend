const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

async function streamExcel(res, { sheetName = 'Sheet1', columns, rows, filename }) {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  sheet.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width || 18 }));
  sheet.getRow(1).font = { bold: true };
  rows.forEach((row) => sheet.addRow(row));

  await workbook.xlsx.write(res);
  res.end();
}

function csvEscape(value) {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function streamCSV(res, { columns, rows, filename }) {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);

  const header = columns.map((c) => csvEscape(c.header)).join(',');
  const lines = rows.map((row) => columns.map((c) => csvEscape(row[c.key])).join(','));
  res.send([header, ...lines].join('\n'));
}

function streamTablePDF(res, { title, columns, rows, filename }) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}.pdf"`);

  const doc = new PDFDocument({ size: 'A4', margin: 36, layout: 'landscape' });
  doc.pipe(res);

  doc.fontSize(16).font('Helvetica-Bold').text(title, { align: 'center' });
  doc.moveDown();

  const colWidth = (doc.page.width - doc.page.margins.left - doc.page.margins.right) / columns.length;
  const startX = doc.page.margins.left;
  let y = doc.y;

  doc.fontSize(9).font('Helvetica-Bold');
  columns.forEach((c, i) => {
    doc.text(c.header, startX + i * colWidth, y, { width: colWidth, ellipsis: true });
  });
  y += 18;
  doc.moveTo(startX, y).lineTo(doc.page.width - doc.page.margins.right, y).stroke();
  y += 4;

  doc.font('Helvetica').fontSize(8.5);
  rows.forEach((row) => {
    if (y > doc.page.height - doc.page.margins.bottom - 20) {
      doc.addPage({ size: 'A4', margin: 36, layout: 'landscape' });
      y = doc.page.margins.top;
    }
    columns.forEach((c, i) => {
      const value = row[c.key];
      doc.text(value === null || value === undefined ? '-' : String(value), startX + i * colWidth, y, {
        width: colWidth,
        ellipsis: true,
      });
    });
    y += 16;
  });

  doc.end();
}

module.exports = { streamExcel, streamCSV, streamTablePDF };
