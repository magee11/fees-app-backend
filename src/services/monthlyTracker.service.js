const { Student, StudentActivity } = require('../models');
const ApiError = require('../utils/ApiError');
const { parsePagination, buildMeta, escapeRegex } = require('../utils/pagination');
const { getCurrentMonthYear } = require('../utils/dateHelpers');
const { getOrCreateMonthlyStatus } = require('./monthlyStatus.service');
const paymentService = require('./payment.service');
const { MONTH_STATUS } = require('../constants');

function computeRowStatus(months, currentMonth) {
  const dueMonths = months.filter((m) => m.month <= currentMonth && m.status !== MONTH_STATUS.NONE);
  if (!dueMonths.length) return 'paid';
  const hasOverdue = dueMonths.some((m) => m.month < currentMonth && m.status === MONTH_STATUS.PENDING);
  if (hasOverdue) return 'overdue';
  const current = dueMonths.find((m) => m.month === currentMonth);
  if (current) {
    if (current.status === MONTH_STATUS.PARTIAL) return 'partial';
    if (current.status === MONTH_STATUS.PENDING) return 'pending';
  }
  const allPaid = dueMonths.every((m) => m.status === MONTH_STATUS.PAID);
  return allPaid ? 'paid' : 'pending';
}

async function buildRow(enrollment, year, currentMonth) {
  const student = enrollment.studentId;
  const activity = enrollment.activityId;

  const doc = await getOrCreateMonthlyStatus({
    studentId: student._id,
    activityId: activity._id,
    year,
    monthlyFee: activity.monthlyFee,
  });

  const paidAmount = doc.months.reduce((sum, m) => sum + m.paidAmount, 0);
  const outstanding = doc.months
    .filter((m) => [MONTH_STATUS.PENDING, MONTH_STATUS.PARTIAL].includes(m.status))
    .reduce((sum, m) => sum + (m.amount - m.paidAmount), 0);
  const paidMonthsCount = doc.months.filter((m) => m.status === MONTH_STATUS.PAID).length;

  return {
    studentId: student._id,
    studentName: student.name,
    admissionNo: student.admissionNo,
    standard: student.standard,
    section: student.section,
    activityId: activity._id,
    activityName: activity.name,
    monthlyFee: activity.monthlyFee,
    year,
    months: doc.months,
    progressPercent: Math.round((paidMonthsCount / 12) * 100),
    paidAmount: Math.round(paidAmount * 100) / 100,
    outstanding: Math.round(outstanding * 100) / 100,
    rowStatus: computeRowStatus(doc.months, currentMonth),
  };
}

async function listTracker(query) {
  const { page, limit } = parsePagination(query, { defaultLimit: 10 });
  const year = Number(query.year) || getCurrentMonthYear().year;
  const { month: currentMonth } = getCurrentMonthYear();

  const enrollmentFilter = { active: true };
  if (query.activityId) enrollmentFilter.activityId = query.activityId;

  if (query.search) {
    const regex = new RegExp(escapeRegex(query.search), 'i');
    const matchingStudentIds = await Student.find({
      $or: [{ name: regex }, { admissionNo: regex }],
    }).distinct('_id');
    enrollmentFilter.studentId = { $in: matchingStudentIds };
  }

  const enrollments = await StudentActivity.find(enrollmentFilter)
    .populate('studentId', 'name admissionNo standard section')
    .populate('activityId', 'name monthlyFee color icon')
    .lean();

  const validEnrollments = enrollments.filter((e) => e.studentId && e.activityId);

  let rows = await Promise.all(validEnrollments.map((e) => buildRow(e, year, currentMonth)));

  if (query.status) {
    rows = rows.filter((r) => r.rowStatus === query.status);
  }

  const total = rows.length;
  const start = (page - 1) * limit;
  const paged = rows.slice(start, start + limit);

  return { data: paged, meta: buildMeta({ page, limit, total }) };
}

async function getTrackerDetail(studentId, activityId, query) {
  const enrollment = await StudentActivity.findOne({ studentId, activityId })
    .populate('studentId')
    .populate('activityId');
  if (!enrollment || !enrollment.studentId || !enrollment.activityId) {
    throw ApiError.notFound('Enrollment not found for this student and activity');
  }

  const year = Number(query.year) || getCurrentMonthYear().year;
  const { month: currentMonth } = getCurrentMonthYear();
  const row = await buildRow(
    { studentId: enrollment.studentId, activityId: enrollment.activityId },
    year,
    currentMonth
  );

  const { Payment } = require('../models');
  const payments = await Payment.find({ studentId, activityId, year })
    .populate('collectedBy', 'name')
    .sort({ paymentDate: -1 })
    .lean();

  return { ...row, payments };
}

async function payMonths(payload, actor) {
  return paymentService.createPayment(payload, actor);
}

module.exports = { listTracker, getTrackerDetail, payMonths };
