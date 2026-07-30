const path = require('path');
const ExcelJS = require('exceljs');
const { Student, Activity } = require('../models');
const ApiError = require('../utils/ApiError');
const { escapeRegex } = require('../utils/pagination');
const { getCurrentMonthYear } = require('../utils/dateHelpers');
const { createStudentSchema } = require('../validators/student.validator');
const { createStudent, computeOutstandingMap } = require('./student.service');
const { streamCSV } = require('./export.service');

const MAX_IMPORT_ROWS = 2000;

const EXPORT_COLUMNS = [
  { header: 'Admission No', key: 'admissionNo', width: 16 },
  { header: 'Student ID', key: 'studentId', width: 14 },
  { header: 'Name', key: 'name', width: 22 },
  { header: 'Standard', key: 'standard', width: 10 },
  { header: 'Section', key: 'section', width: 10 },
  { header: 'Gender', key: 'gender', width: 8 },
  { header: 'DOB', key: 'dob', width: 12 },
  { header: 'Parent Name', key: 'parentName', width: 20 },
  { header: 'Phone', key: 'phone', width: 14 },
  { header: 'Email', key: 'email', width: 24 },
  { header: 'Address', key: 'address', width: 28 },
  { header: 'Activities', key: 'activities', width: 26 },
  { header: 'Status', key: 'status', width: 10 },
  { header: 'Outstanding', key: 'outstanding', width: 14 },
];

const TEMPLATE_COLUMNS = [
  { header: 'Admission No', key: 'admissionNo', width: 16 },
  { header: 'Name', key: 'name', width: 22 },
  { header: 'Standard', key: 'standard', width: 10 },
  { header: 'Section', key: 'section', width: 10 },
  { header: 'Gender', key: 'gender', width: 8 },
  { header: 'DOB', key: 'dob', width: 12 },
  { header: 'Parent Name', key: 'parentName', width: 20 },
  { header: 'Phone', key: 'phone', width: 14 },
  { header: 'Email', key: 'email', width: 24 },
  { header: 'Address', key: 'address', width: 28 },
  { header: 'Activities', key: 'activities', width: 26 },
  { header: 'Joined Date', key: 'joinedDate', width: 14 },
];

const TEMPLATE_SAMPLE_ROWS = [
  {
    admissionNo: '',
    name: 'Aarav Mehta',
    standard: '5th',
    section: 'A',
    gender: 'M',
    dob: '2015-06-10',
    parentName: 'Rohit Mehta',
    phone: '9876543210',
    email: 'rohit.mehta@example.com',
    address: '12 MG Road, Chennai',
    activities: 'Karate, Chess',
    joinedDate: '2026-06-01',
  },
  {
    admissionNo: '',
    name: 'Diya Kapoor',
    standard: '3rd',
    section: 'B',
    gender: 'F',
    dob: '2017-02-22',
    parentName: 'Neha Kapoor',
    phone: '9123456780',
    email: '',
    address: '',
    activities: 'Dance',
    joinedDate: '2026-06-01',
  },
];

const FIELD_ALIASES = {
  'admission no': 'admissionNo',
  'admission number': 'admissionNo',
  admissionno: 'admissionNo',
  name: 'name',
  'student name': 'name',
  standard: 'standard',
  class: 'standard',
  section: 'section',
  gender: 'gender',
  dob: 'dob',
  'date of birth': 'dob',
  'parent name': 'parentName',
  parentname: 'parentName',
  parent: 'parentName',
  phone: 'phone',
  mobile: 'phone',
  'phone number': 'phone',
  email: 'email',
  address: 'address',
  activities: 'activities',
  activity: 'activities',
  'joined date': 'joinedDate',
  joineddate: 'joinedDate',
};

function normalizeHeader(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function cellToPlainValue(value) {
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    // ExcelJS hyperlink/formula/rich-text cells
    if ('text' in value) return value.text;
    if ('result' in value) return value.result;
  }
  return value;
}

async function loadRowsFromFile(filePath, mimetype) {
  const workbook = new ExcelJS.Workbook();
  const isCsv = mimetype === 'text/csv' || path.extname(filePath).toLowerCase() === '.csv';

  const worksheet = isCsv
    ? await workbook.csv.readFile(filePath)
    : (await workbook.xlsx.readFile(filePath)).worksheets[0];

  if (!worksheet) {
    throw ApiError.badRequest('The uploaded file has no readable sheet');
  }

  const headerValues = (worksheet.getRow(1).values || []).slice(1);
  const headers = headerValues.map((h) => FIELD_ALIASES[normalizeHeader(h)] || null);

  if (!headers.includes('name')) {
    throw ApiError.badRequest('The file is missing a required "Name" column. Download the import template for the expected format.');
  }

  const rows = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const values = (row.values || []).slice(1);
    const record = {};
    headers.forEach((field, i) => {
      if (!field) return;
      record[field] = cellToPlainValue(values[i]);
    });
    const hasData = Object.values(record).some((v) => v !== undefined && v !== null && String(v).trim() !== '');
    if (hasData) rows.push({ rowNumber, record });
  });

  if (rows.length > MAX_IMPORT_ROWS) {
    throw ApiError.badRequest(`Too many rows (${rows.length}). Split the file into batches of ${MAX_IMPORT_ROWS} or fewer.`);
  }

  return rows;
}

function normalizeGender(raw) {
  const v = String(raw || '').trim().toLowerCase();
  if (!v) return undefined;
  if (v === 'm' || v === 'male') return 'M';
  if (v === 'f' || v === 'female') return 'F';
  return 'Other';
}

function resolveActivityIds(raw, activityMap) {
  const names = String(raw || '')
    .split(/[,;]/)
    .map((n) => n.trim())
    .filter(Boolean);

  const ids = [];
  const unknown = [];
  names.forEach((n) => {
    const id = activityMap.get(n.toLowerCase());
    if (id) ids.push(id);
    else unknown.push(n);
  });

  if (unknown.length) {
    throw new Error(`Unknown activity name(s): ${unknown.join(', ')}`);
  }
  return ids;
}

function buildStudentPayload(record, activityMap) {
  const payload = {
    admissionNo: record.admissionNo ? String(record.admissionNo).trim() : undefined,
    name: String(record.name || '').trim(),
    standard: String(record.standard || '').trim(),
    section: String(record.section || '').trim(),
    gender: normalizeGender(record.gender),
    dob: record.dob,
    parentName: String(record.parentName || '').trim(),
    phone: String(record.phone || '').trim(),
    email: record.email ? String(record.email).trim() : undefined,
    address: record.address ? String(record.address).trim() : undefined,
    activities: resolveActivityIds(record.activities, activityMap),
    joinedDate: record.joinedDate || undefined,
  };
  Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);
  return payload;
}

function formatImportError(error) {
  if (error.name === 'ZodError') {
    return error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
  }
  if (error instanceof ApiError) return error.message;
  return error.message;
}

async function importStudentsFromFile({ filePath, mimetype, actor }) {
  const rows = await loadRowsFromFile(filePath, mimetype);

  const activities = await Activity.find({}, 'name');
  const activityMap = new Map(activities.map((a) => [a.name.trim().toLowerCase(), String(a._id)]));

  const result = { totalRows: rows.length, created: 0, failed: 0, errors: [] };

  for (const { rowNumber, record } of rows) {
    try {
      const payload = buildStudentPayload(record, activityMap);
      const parsed = createStudentSchema.shape.body.parse(payload);
      await createStudent(parsed, actor);
      result.created += 1;
    } catch (error) {
      result.failed += 1;
      result.errors.push({ row: rowNumber, message: formatImportError(error) });
    }
  }

  return result;
}

async function exportStudents(query) {
  const filter = {};
  if (query.standard) filter.standard = query.standard;
  if (query.section) filter.section = query.section;
  if (query.status) filter.status = query.status;
  if (query.activityId) filter.activities = query.activityId;
  if (query.search) {
    const regex = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [{ name: regex }, { admissionNo: regex }, { phone: regex }, { parentName: regex }];
  }

  const students = await Student.find(filter)
    .populate('activities', 'name')
    .sort({ name: 1 })
    .lean();

  const { year } = getCurrentMonthYear();
  const outstandingMap = await computeOutstandingMap(students.map((s) => s._id), year);

  const rows = students.map((s) => ({
    admissionNo: s.admissionNo,
    studentId: s.studentId,
    name: s.name,
    standard: s.standard,
    section: s.section,
    gender: s.gender || '',
    dob: s.dob ? new Date(s.dob).toISOString().slice(0, 10) : '',
    parentName: s.parentName || '',
    phone: s.phone || '',
    email: s.email || '',
    address: s.address || '',
    activities: (s.activities || []).map((a) => a.name).join(', '),
    status: s.status,
    outstanding: outstandingMap.get(String(s._id)) || 0,
  }));

  return { columns: EXPORT_COLUMNS, rows };
}

async function streamImportTemplate(res, format) {
  if (format === 'csv') {
    return streamCSV(res, {
      columns: TEMPLATE_COLUMNS,
      rows: TEMPLATE_SAMPLE_ROWS,
      filename: 'student-import-template',
    });
  }

  const activities = await Activity.find({}, 'name monthlyFee').sort({ name: 1 }).lean();

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Import Students');
  sheet.columns = TEMPLATE_COLUMNS;
  sheet.getRow(1).font = { bold: true };
  TEMPLATE_SAMPLE_ROWS.forEach((row) => sheet.addRow(row));

  const infoSheet = workbook.addWorksheet('Valid Activity Names');
  infoSheet.columns = [
    { header: 'Activity Name (type exactly as shown, comma-separate multiple)', key: 'name', width: 55 },
    { header: 'Monthly Fee', key: 'monthlyFee', width: 14 },
  ];
  infoSheet.getRow(1).font = { bold: true };
  activities.forEach((a) => infoSheet.addRow({ name: a.name, monthlyFee: a.monthlyFee }));

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="student-import-template.xlsx"');
  await workbook.xlsx.write(res);
  res.end();
}

module.exports = { importStudentsFromFile, exportStudents, streamImportTemplate };
