const { Types } = require('mongoose');
const { Payment, Activity, MonthlyStatus, Student } = require('../models');
const ApiError = require('../utils/ApiError');
const { getCurrentMonthYear } = require('../utils/dateHelpers');
const { MONTH_STATUS } = require('../constants');

function dateRangeFilter(query) {
  const filter = {};
  if (query.fromDate || query.toDate) {
    filter.paymentDate = {};
    if (query.fromDate) filter.paymentDate.$gte = new Date(query.fromDate);
    if (query.toDate) filter.paymentDate.$lte = new Date(query.toDate);
  } else if (query.year) {
    const month = query.month;
    const start = month ? new Date(query.year, month - 1, 1) : new Date(query.year, 0, 1);
    const end = month ? new Date(query.year, month, 1) : new Date(Number(query.year) + 1, 0, 1);
    filter.paymentDate = { $gte: start, $lt: end };
  }
  return filter;
}

async function revenueReport(query) {
  const filter = dateRangeFilter(query);
  if (query.activityId) filter.activityId = query.activityId;

  const payments = await Payment.find(filter)
    .populate('studentId', 'name admissionNo')
    .populate('activityId', 'name')
    .sort({ paymentDate: -1 })
    .lean();

  const rows = payments.map((p) => ({
    date: new Date(p.paymentDate).toLocaleDateString('en-IN'),
    receiptNo: p.receiptNo,
    student: p.studentId?.name || '-',
    admissionNo: p.studentId?.admissionNo || '-',
    activity: p.activityId?.name || '-',
    amount: p.amount,
    discount: p.discount,
    lateFee: p.lateFee,
    total: p.total,
    mode: p.paymentMode,
  }));

  const columns = [
    { header: 'Date', key: 'date' },
    { header: 'Receipt No', key: 'receiptNo' },
    { header: 'Student', key: 'student' },
    { header: 'Admission No', key: 'admissionNo' },
    { header: 'Activity', key: 'activity' },
    { header: 'Amount', key: 'amount' },
    { header: 'Discount', key: 'discount' },
    { header: 'Late Fee', key: 'lateFee' },
    { header: 'Total', key: 'total' },
    { header: 'Mode', key: 'mode' },
  ];

  const summary = {
    totalPayments: rows.length,
    totalRevenue: Math.round(rows.reduce((s, r) => s + r.total, 0) * 100) / 100,
  };

  return { title: 'Revenue Report', columns, rows, summary };
}

async function pendingReport(query) {
  const year = Number(query.year) || getCurrentMonthYear().year;
  const { month: currentMonth } = getCurrentMonthYear();

  const match = { year };
  const rows = await MonthlyStatus.aggregate([
    { $match: match },
    { $unwind: '$months' },
    {
      $match: {
        'months.month': { $lte: currentMonth },
        'months.status': { $in: [MONTH_STATUS.PENDING, MONTH_STATUS.PARTIAL] },
        ...(query.activityId ? { activityId: new Types.ObjectId(query.activityId) } : {}),
      },
    },
    {
      $group: {
        _id: { studentId: '$studentId', activityId: '$activityId' },
        outstanding: { $sum: { $subtract: ['$months.amount', '$months.paidAmount'] } },
        pendingMonths: { $sum: 1 },
      },
    },
    {
      $lookup: { from: 'students', localField: '_id.studentId', foreignField: '_id', as: 'student' },
    },
    { $unwind: '$student' },
    {
      $lookup: { from: 'activities', localField: '_id.activityId', foreignField: '_id', as: 'activity' },
    },
    { $unwind: '$activity' },
    { $sort: { outstanding: -1 } },
  ]);

  const data = rows.map((r) => ({
    student: r.student.name,
    admissionNo: r.student.admissionNo,
    standard: r.student.standard,
    section: r.student.section,
    activity: r.activity.name,
    pendingMonths: r.pendingMonths,
    outstanding: Math.round(r.outstanding * 100) / 100,
  }));

  const columns = [
    { header: 'Student', key: 'student' },
    { header: 'Admission No', key: 'admissionNo' },
    { header: 'Class', key: 'standard' },
    { header: 'Section', key: 'section' },
    { header: 'Activity', key: 'activity' },
    { header: 'Pending Months', key: 'pendingMonths' },
    { header: 'Outstanding', key: 'outstanding' },
  ];

  const summary = {
    totalStudentsWithDues: new Set(rows.map((r) => String(r._id.studentId))).size,
    totalOutstanding: Math.round(data.reduce((s, r) => s + r.outstanding, 0) * 100) / 100,
  };

  return { title: 'Pending Report', columns, rows: data, summary };
}

async function activityReport() {
  const activities = await Activity.find().lean();
  const revenueByActivity = await Payment.aggregate([
    { $group: { _id: '$activityId', revenue: { $sum: '$total' }, paymentsCount: { $sum: 1 } } },
  ]);
  const revenueMap = new Map(revenueByActivity.map((r) => [String(r._id), r]));

  const rows = activities.map((a) => {
    const rev = revenueMap.get(String(a._id));
    return {
      name: a.name,
      coach: a.coach,
      monthlyFee: a.monthlyFee,
      capacity: a.capacity,
      enrolled: a.enrolled,
      status: a.status,
      revenue: rev ? Math.round(rev.revenue * 100) / 100 : 0,
      paymentsCount: rev ? rev.paymentsCount : 0,
    };
  });

  const columns = [
    { header: 'Activity', key: 'name' },
    { header: 'Coach', key: 'coach' },
    { header: 'Monthly Fee', key: 'monthlyFee' },
    { header: 'Capacity', key: 'capacity' },
    { header: 'Enrolled', key: 'enrolled' },
    { header: 'Status', key: 'status' },
    { header: 'Revenue', key: 'revenue' },
    { header: 'Payments', key: 'paymentsCount' },
  ];

  return { title: 'Activity Report', columns, rows, summary: {} };
}

async function studentLedger(studentId, query) {
  const student = await Student.findById(studentId).populate('activities', 'name monthlyFee');
  if (!student) throw ApiError.notFound('Student not found');

  const year = Number(query.year) || getCurrentMonthYear().year;

  const payments = await Payment.find({ studentId, year })
    .populate('activityId', 'name')
    .sort({ paymentDate: 1 })
    .lean();

  const statuses = await MonthlyStatus.find({ studentId, year }).populate('activityId', 'name').lean();

  const rows = payments.map((p) => ({
    date: new Date(p.paymentDate).toLocaleDateString('en-IN'),
    receiptNo: p.receiptNo,
    activity: p.activityId?.name || '-',
    months: p.months.join(', '),
    amount: p.amount,
    discount: p.discount,
    lateFee: p.lateFee,
    total: p.total,
    mode: p.paymentMode,
  }));

  const columns = [
    { header: 'Date', key: 'date' },
    { header: 'Receipt No', key: 'receiptNo' },
    { header: 'Activity', key: 'activity' },
    { header: 'Months', key: 'months' },
    { header: 'Amount', key: 'amount' },
    { header: 'Discount', key: 'discount' },
    { header: 'Late Fee', key: 'lateFee' },
    { header: 'Total', key: 'total' },
    { header: 'Mode', key: 'mode' },
  ];

  const outstanding = statuses.reduce((sum, doc) => {
    const due = doc.months
      .filter((m) => [MONTH_STATUS.PENDING, MONTH_STATUS.PARTIAL].includes(m.status))
      .reduce((s, m) => s + (m.amount - m.paidAmount), 0);
    return sum + due;
  }, 0);

  return {
    title: `Student Ledger - ${student.name}`,
    columns,
    rows,
    summary: {
      student: { name: student.name, admissionNo: student.admissionNo, standard: student.standard, section: student.section },
      year,
      totalPaid: Math.round(rows.reduce((s, r) => s + r.total, 0) * 100) / 100,
      outstanding: Math.round(outstanding * 100) / 100,
      monthlyStatus: statuses,
    },
  };
}

async function monthlyCollection(query) {
  const year = Number(query.year) || getCurrentMonthYear().year;
  const month = Number(query.month) || getCurrentMonthYear().month;
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

  const rows = await Payment.aggregate([
    { $match: { paymentDate: { $gte: start, $lt: end } } },
    {
      $group: {
        _id: { $dayOfMonth: '$paymentDate' },
        total: { $sum: '$total' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const data = rows.map((r) => ({ day: r._id, total: Math.round(r.total * 100) / 100, count: r.count }));
  const columns = [
    { header: 'Day', key: 'day' },
    { header: 'Payments', key: 'count' },
    { header: 'Total', key: 'total' },
  ];

  return {
    title: `Monthly Collection - ${month}/${year}`,
    columns,
    rows: data,
    summary: { totalRevenue: Math.round(data.reduce((s, r) => s + r.total, 0) * 100) / 100 },
  };
}

async function yearlyCollection(query) {
  const year = Number(query.year) || getCurrentMonthYear().year;

  const rows = await Payment.aggregate([
    { $match: { paymentDate: { $gte: new Date(year, 0, 1), $lt: new Date(year + 1, 0, 1) } } },
    {
      $group: {
        _id: { $month: '$paymentDate' },
        total: { $sum: '$total' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const byMonth = new Map(rows.map((r) => [r._id, r]));
  const data = Array.from({ length: 12 }, (_, i) => {
    const r = byMonth.get(i + 1);
    return { month: i + 1, total: r ? Math.round(r.total * 100) / 100 : 0, count: r ? r.count : 0 };
  });

  const columns = [
    { header: 'Month', key: 'month' },
    { header: 'Payments', key: 'count' },
    { header: 'Total', key: 'total' },
  ];

  return {
    title: `Yearly Collection - ${year}`,
    columns,
    rows: data,
    summary: { totalRevenue: Math.round(data.reduce((s, r) => s + r.total, 0) * 100) / 100 },
  };
}

module.exports = {
  revenueReport,
  pendingReport,
  activityReport,
  studentLedger,
  monthlyCollection,
  yearlyCollection,
};
