const { Payment, Student, Activity, StudentActivity, MonthlyStatus } = require('../models');
const ApiError = require('../utils/ApiError');
const { parsePagination, buildMeta } = require('../utils/pagination');
const { generateReceiptNo } = require('../utils/generateId');
const env = require('../config/env');
const { applyPaymentToMonths, reversePayment } = require('./monthlyStatus.service');
const { recomputeStudentStatus } = require('./student.service');
const { MONTH_STATUS, AUDIT_ACTION, AUDIT_RESOURCE_TYPE } = require('../constants');
const { logAudit } = require('./auditLog.service');

async function assertNoDuplicatePayment({ studentId, activityId, year, months }) {
  const doc = await MonthlyStatus.findOne({ studentId, activityId, year });
  if (!doc) return;

  const alreadyPaid = months.filter((monthNum) => {
    const entry = doc.months.find((m) => m.month === monthNum);
    return entry && entry.status === MONTH_STATUS.PAID;
  });

  if (alreadyPaid.length) {
    throw ApiError.conflict(
      `Payment already recorded for month(s): ${alreadyPaid.join(', ')}`,
      alreadyPaid.map((m) => ({ field: 'months', message: `Month ${m} is already paid` }))
    );
  }
}

async function createPayment(payload, actor) {
  const { studentId, activityId, months, year, discount = 0, lateFee = 0, paymentMode, referenceNo, remarks } = payload;

  const [student, activity] = await Promise.all([
    Student.findById(studentId),
    Activity.findById(activityId),
  ]);
  if (!student) throw ApiError.notFound('Student not found');
  if (!activity) throw ApiError.notFound('Activity not found');

  const enrollment = await StudentActivity.findOne({ studentId, activityId, active: true });
  if (!enrollment) {
    throw ApiError.badRequest('Student is not enrolled in this activity');
  }

  const uniqueMonths = [...new Set(months)].sort((a, b) => a - b);
  await assertNoDuplicatePayment({ studentId, activityId, year, months: uniqueMonths });

  const amount = activity.monthlyFee * uniqueMonths.length;
  const total = Math.max(0, amount + Number(lateFee) - Number(discount));

  const receiptNo = await generateReceiptNo({
    prefix: env.business.receiptPrefix,
    startNumber: env.business.receiptStartNumber,
  });

  const payment = await Payment.create({
    receiptNo,
    studentId,
    activityId,
    months: uniqueMonths,
    year,
    amount,
    discount,
    lateFee,
    total,
    paymentMode,
    referenceNo,
    collectedBy: actor._id,
    remarks,
  });

  await applyPaymentToMonths({
    studentId,
    activityId,
    year,
    months: uniqueMonths,
    amount,
    paymentId: payment._id,
    paymentDate: payment.paymentDate,
    monthlyFee: activity.monthlyFee,
  });

  await recomputeStudentStatus(studentId);

  await logAudit({
    actor,
    action: AUDIT_ACTION.CREATE,
    resourceType: AUDIT_RESOURCE_TYPE.PAYMENT,
    resourceId: payment._id,
    resourceLabel: payment.receiptNo,
  });

  return getPaymentById(payment._id);
}

async function listPayments(query) {
  const { page, limit, skip } = parsePagination(query);

  const filter = {};
  if (query.studentId) filter.studentId = query.studentId;
  if (query.activityId) filter.activityId = query.activityId;
  if (query.paymentMode) filter.paymentMode = query.paymentMode;
  if (query.receiptNo) filter.receiptNo = new RegExp(query.receiptNo, 'i');
  if (query.fromDate || query.toDate) {
    filter.paymentDate = {};
    if (query.fromDate) filter.paymentDate.$gte = new Date(query.fromDate);
    if (query.toDate) filter.paymentDate.$lte = new Date(query.toDate);
  }

  const [payments, total] = await Promise.all([
    Payment.find(filter)
      .populate('studentId', 'name admissionNo studentId')
      .populate('activityId', 'name color icon')
      .populate('collectedBy', 'name')
      .sort({ paymentDate: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Payment.countDocuments(filter),
  ]);

  return { data: payments, meta: buildMeta({ page, limit, total }) };
}

async function getPaymentById(id) {
  const payment = await Payment.findById(id)
    .populate('studentId', 'name admissionNo studentId standard section')
    .populate('activityId', 'name color icon monthlyFee')
    .populate('collectedBy', 'name email');
  if (!payment) throw ApiError.notFound('Payment not found');
  return payment;
}

async function deletePayment(id, actor) {
  const payment = await Payment.findById(id);
  if (!payment) throw ApiError.notFound('Payment not found');

  await reversePayment({
    studentId: payment.studentId,
    activityId: payment.activityId,
    year: payment.year,
    months: payment.months,
    paymentId: payment._id,
  });

  await Payment.deleteOne({ _id: id });
  await recomputeStudentStatus(payment.studentId);

  await logAudit({
    actor,
    action: AUDIT_ACTION.DELETE,
    resourceType: AUDIT_RESOURCE_TYPE.PAYMENT,
    resourceId: payment._id,
    resourceLabel: payment.receiptNo,
  });
}

module.exports = { createPayment, listPayments, getPaymentById, deletePayment };
