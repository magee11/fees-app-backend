const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const reportService = require('../services/report.service');
const { streamExcel, streamCSV, streamTablePDF } = require('../services/export.service');

function respond(res, format, filename, { title, columns, rows, summary }) {
  if (format === 'excel') {
    return streamExcel(res, { sheetName: title.slice(0, 31), columns, rows, filename });
  }
  if (format === 'csv') {
    return streamCSV(res, { columns, rows, filename });
  }
  if (format === 'pdf') {
    return streamTablePDF(res, { title, columns, rows, filename });
  }
  return sendSuccess(res, { message: `${title} fetched successfully`, data: { title, columns, rows, summary } });
}

const revenueReport = asyncHandler(async (req, res) => {
  const report = await reportService.revenueReport(req.query);
  respond(res, req.query.format, 'revenue-report', report);
});

const pendingReport = asyncHandler(async (req, res) => {
  const report = await reportService.pendingReport(req.query);
  respond(res, req.query.format, 'pending-report', report);
});

const activityReport = asyncHandler(async (req, res) => {
  const report = await reportService.activityReport(req.query);
  respond(res, req.query.format, 'activity-report', report);
});

const studentLedger = asyncHandler(async (req, res) => {
  const report = await reportService.studentLedger(req.params.studentId, req.query);
  respond(res, req.query.format, 'student-ledger', report);
});

const monthlyCollection = asyncHandler(async (req, res) => {
  const report = await reportService.monthlyCollection(req.query);
  respond(res, req.query.format, 'monthly-collection', report);
});

const yearlyCollection = asyncHandler(async (req, res) => {
  const report = await reportService.yearlyCollection(req.query);
  respond(res, req.query.format, 'yearly-collection', report);
});

module.exports = {
  revenueReport,
  pendingReport,
  activityReport,
  studentLedger,
  monthlyCollection,
  yearlyCollection,
};
