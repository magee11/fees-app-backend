const { Student, Activity, Payment, MonthlyStatus } = require('../models');
const { getCurrentMonthYear } = require('../utils/dateHelpers');
const { STUDENT_STATUS, ACTIVITY_STATUS, MONTH_STATUS } = require('../constants');

async function getTotals() {
  const [totalStudents, activeActivities] = await Promise.all([
    Student.countDocuments({ status: { $ne: STUDENT_STATUS.INACTIVE } }),
    Activity.countDocuments({ status: { $in: [ACTIVITY_STATUS.ACTIVE, ACTIVITY_STATUS.FULL] } }),
  ]);
  return { totalStudents, activeActivities };
}

async function getMonthlyRevenue(month, year) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  const [result] = await Payment.aggregate([
    { $match: { paymentDate: { $gte: start, $lt: end } } },
    { $group: { _id: null, total: { $sum: '$total' } } },
  ]);
  return result ? result.total : 0;
}

async function getOutstandingAndCollection(year, currentMonth) {
  const statuses = await MonthlyStatus.find({ year }).lean();

  let outstanding = 0;
  const perStudentDue = new Map();

  statuses.forEach((doc) => {
    let studentOwesForCurrentMonth = false;
    doc.months.forEach((m) => {
      if (m.month > currentMonth) return;
      if ([MONTH_STATUS.PENDING, MONTH_STATUS.PARTIAL].includes(m.status)) {
        outstanding += m.amount - m.paidAmount;
      }
      if (m.month === currentMonth && m.status !== MONTH_STATUS.PAID) {
        studentOwesForCurrentMonth = true;
      }
    });
    const key = String(doc.studentId);
    perStudentDue.set(key, perStudentDue.get(key) || studentOwesForCurrentMonth);
  });

  const studentsWithDues = [...perStudentDue.values()].filter(Boolean).length;
  const totalTrackedStudents = perStudentDue.size;
  const paidStudents = totalTrackedStudents - studentsWithDues;
  const collectionPercentage = totalTrackedStudents
    ? Math.round((paidStudents / totalTrackedStudents) * 10000) / 100
    : 100;

  return {
    outstanding: Math.round(outstanding * 100) / 100,
    pendingCount: studentsWithDues,
    collectionPercentage,
  };
}

async function getRecentPayments(limit = 8) {
  return Payment.find()
    .populate('studentId', 'name admissionNo')
    .populate('activityId', 'name color icon')
    .sort({ paymentDate: -1 })
    .limit(limit)
    .lean();
}

async function getRecentRegistrations(limit = 5) {
  return Student.find()
    .populate('activities', 'name')
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('name admissionNo standard section createdAt activities')
    .lean();
}

async function getMonthlyRevenueChart(year) {
  const rows = await Payment.aggregate([
    { $match: { paymentDate: { $gte: new Date(year, 0, 1), $lt: new Date(year + 1, 0, 1) } } },
    {
      $group: {
        _id: { $month: '$paymentDate' },
        revenue: { $sum: '$total' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const byMonth = new Map(rows.map((r) => [r._id, r.revenue]));
  return Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    revenue: Math.round((byMonth.get(i + 1) || 0) * 100) / 100,
  }));
}

async function getActivityRevenue() {
  const rows = await Payment.aggregate([
    {
      $group: {
        _id: '$activityId',
        revenue: { $sum: '$total' },
        paymentsCount: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: 'activities',
        localField: '_id',
        foreignField: '_id',
        as: 'activity',
      },
    },
    { $unwind: '$activity' },
    {
      $project: {
        _id: 0,
        activityId: '$_id',
        name: '$activity.name',
        color: '$activity.color',
        icon: '$activity.icon',
        revenue: 1,
        paymentsCount: 1,
      },
    },
    { $sort: { revenue: -1 } },
  ]);
  return rows;
}

async function getPendingStudents(year, currentMonth, limit = 8) {
  const rows = await MonthlyStatus.aggregate([
    { $match: { year } },
    { $unwind: '$months' },
    {
      $match: {
        'months.month': { $lte: currentMonth },
        'months.status': { $in: [MONTH_STATUS.PENDING, MONTH_STATUS.PARTIAL] },
      },
    },
    {
      $group: {
        _id: '$studentId',
        outstanding: { $sum: { $subtract: ['$months.amount', '$months.paidAmount'] } },
      },
    },
    { $sort: { outstanding: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'students',
        localField: '_id',
        foreignField: '_id',
        as: 'student',
      },
    },
    { $unwind: '$student' },
    {
      $project: {
        _id: 0,
        studentId: '$_id',
        name: '$student.name',
        admissionNo: '$student.admissionNo',
        standard: '$student.standard',
        section: '$student.section',
        outstanding: { $round: ['$outstanding', 2] },
      },
    },
  ]);
  return rows;
}

async function getDashboard() {
  const { month, year } = getCurrentMonthYear();

  const [
    totals,
    monthlyRevenue,
    outstandingAndCollection,
    recentPayments,
    recentRegistrations,
    monthlyRevenueChart,
    activityRevenue,
    pendingStudents,
  ] = await Promise.all([
    getTotals(),
    getMonthlyRevenue(month, year),
    getOutstandingAndCollection(year, month),
    getRecentPayments(),
    getRecentRegistrations(),
    getMonthlyRevenueChart(year),
    getActivityRevenue(),
    getPendingStudents(year, month),
  ]);

  return {
    totalStudents: totals.totalStudents,
    activeActivities: totals.activeActivities,
    monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
    outstandingBalance: outstandingAndCollection.outstanding,
    collectionPercentage: outstandingAndCollection.collectionPercentage,
    pendingCount: outstandingAndCollection.pendingCount,
    recentPayments,
    recentRegistrations,
    monthlyRevenueChart,
    activityRevenue,
    pendingStudents,
    currentMonth: month,
    currentYear: year,
  };
}

module.exports = { getDashboard };
