const fs = require('fs/promises');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const ApiError = require('../utils/ApiError');
const studentService = require('../services/student.service');
const studentBulkService = require('../services/studentBulk.service');
const { streamExcel, streamCSV } = require('../services/export.service');

const listStudents = asyncHandler(async (req, res) => {
  const { data, meta } = await studentService.listStudents(req.query);
  sendSuccess(res, { message: 'Students fetched successfully', data, meta });
});

const getStudent = asyncHandler(async (req, res) => {
  const student = await studentService.getStudentById(req.params.id);
  sendSuccess(res, { message: 'Student fetched successfully', data: { student } });
});

const createStudent = asyncHandler(async (req, res) => {
  const student = await studentService.createStudent(req.body, req.user);
  sendSuccess(res, { statusCode: 201, message: 'Student created successfully', data: { student } });
});

const updateStudent = asyncHandler(async (req, res) => {
  const student = await studentService.updateStudent(req.params.id, req.body, req.user);
  sendSuccess(res, { message: 'Student updated successfully', data: { student } });
});

const deleteStudent = asyncHandler(async (req, res) => {
  await studentService.deleteStudent(req.params.id, req.user);
  sendSuccess(res, { message: 'Student deleted successfully' });
});

const bulkDeleteStudents = asyncHandler(async (req, res) => {
  const result = await studentService.bulkDeleteStudents(req.body.ids, req.user);
  sendSuccess(res, {
    message: `Bulk delete complete: ${result.deleted} deleted, ${result.failed} failed out of ${result.totalRequested}`,
    data: result,
  });
});

const getPaymentHistory = asyncHandler(async (req, res) => {
  const { data, meta } = await studentService.getPaymentHistory(req.params.id, req.query);
  sendSuccess(res, { message: 'Payment history fetched successfully', data, meta });
});

const getMonthlyStatus = asyncHandler(async (req, res) => {
  const data = await studentService.getMonthlyStatusForStudent(req.params.id, req.query);
  sendSuccess(res, { message: 'Monthly status fetched successfully', data });
});

const exportStudents = asyncHandler(async (req, res) => {
  const { columns, rows } = await studentBulkService.exportStudents(req.query);
  const format = req.query.format || 'excel';
  if (format === 'csv') {
    return streamCSV(res, { columns, rows, filename: 'students-export' });
  }
  return streamExcel(res, { sheetName: 'Students', columns, rows, filename: 'students-export' });
});

const downloadImportTemplate = asyncHandler(async (req, res) => {
  await studentBulkService.streamImportTemplate(res, req.query.format || 'excel');
});

const importStudents = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw ApiError.badRequest('No file uploaded. Attach a CSV or Excel file as "file".');
  }
  const result = await studentBulkService.importStudentsFromFile({
    filePath: req.file.path,
    mimetype: req.file.mimetype,
    actor: req.user,
  });
  await fs.unlink(req.file.path).catch(() => {});
  sendSuccess(res, {
    message: `Import complete: ${result.created} created, ${result.failed} failed out of ${result.totalRows} row(s)`,
    data: result,
  });
});

module.exports = {
  listStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
  bulkDeleteStudents,
  getPaymentHistory,
  getMonthlyStatus,
  exportStudents,
  downloadImportTemplate,
  importStudents,
};
