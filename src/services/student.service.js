const { Student, Activity, StudentActivity, Payment, MonthlyStatus } = require('../models');
const ApiError = require('../utils/ApiError');
const { parsePagination, buildMeta, escapeRegex } = require('../utils/pagination');
const { generateStudentId, generateAdmissionNo } = require('../utils/generateId');
const { getCurrentMonthYear } = require('../utils/dateHelpers');
const { getOrCreateMonthlyStatus } = require('./monthlyStatus.service');
const { STUDENT_STATUS, MONTH_STATUS, AUDIT_ACTION, AUDIT_RESOURCE_TYPE } = require('../constants');
const { logAudit, buildChanges } = require('./auditLog.service');

async function computeOutstandingMap(studentIds, year) {
  if (!studentIds.length) return new Map();
  const rows = await MonthlyStatus.aggregate([
    { $match: { studentId: { $in: studentIds }, year } },
    { $unwind: '$months' },
    { $match: { 'months.status': { $in: [MONTH_STATUS.PENDING, MONTH_STATUS.PARTIAL] } } },
    {
      $group: {
        _id: '$studentId',
        outstanding: { $sum: { $subtract: ['$months.amount', '$months.paidAmount'] } },
      },
    },
  ]);
  return new Map(rows.map((r) => [String(r._id), Math.round(r.outstanding * 100) / 100]));
}

async function listStudents(query) {
  const { page, limit, skip } = parsePagination(query);
  const { year } = getCurrentMonthYear();

  const filter = {};
  if (query.standard) filter.standard = query.standard;
  if (query.section) filter.section = query.section;
  if (query.status) filter.status = query.status;
  if (query.activityId) filter.activities = query.activityId;
  if (query.search) {
    const regex = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [{ name: regex }, { admissionNo: regex }, { phone: regex }, { parentName: regex }];
  }

  if (query.outstanding) {
    const candidateIds = await Student.find(filter).distinct('_id');
    const outstandingMap = await computeOutstandingMap(candidateIds, year);
    const wantOutstanding = query.outstanding === 'true';
    filter._id = {
      $in: candidateIds.filter((id) => {
        const val = outstandingMap.get(String(id)) || 0;
        return wantOutstanding ? val > 0 : val <= 0;
      }),
    };
  }

  const sortField = query.sortBy || 'createdAt';
  const sortOrder = query.sortOrder === 'asc' ? 1 : -1;

  const [students, total] = await Promise.all([
    Student.find(filter)
      .populate('activities', 'name monthlyFee color icon coach')
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean(),
    Student.countDocuments(filter),
  ]);

  const outstandingMap = await computeOutstandingMap(students.map((s) => s._id), year);
  const data = students.map((s) => ({
    ...s,
    outstanding: outstandingMap.get(String(s._id)) || 0,
  }));

  return { data, meta: buildMeta({ page, limit, total }) };
}

async function getStudentById(id) {
  const student = await Student.findById(id).populate('activities', 'name monthlyFee color icon coach status');
  if (!student) throw ApiError.notFound('Student not found');
  return student;
}

async function assertActivitiesExistAndHaveCapacity(activityIds) {
  if (!activityIds.length) return [];
  const activities = await Activity.find({ _id: { $in: activityIds } });
  if (activities.length !== activityIds.length) {
    throw ApiError.badRequest('One or more activities do not exist');
  }
  const full = activities.filter((a) => a.capacity > 0 && a.enrolled >= a.capacity);
  if (full.length) {
    throw ApiError.badRequest(
      `Activity at full capacity: ${full.map((a) => a.name).join(', ')}`
    );
  }
  return activities;
}

async function enrollStudentInActivities(student, activities) {
  const { year } = getCurrentMonthYear();
  for (const activity of activities) {
    await StudentActivity.findOneAndUpdate(
      { studentId: student._id, activityId: activity._id },
      { $setOnInsert: { joinedDate: new Date() }, $set: { active: true } },
      { upsert: true }
    );
    await Activity.findByIdAndUpdate(activity._id, { $inc: { enrolled: 1 } });
    await getOrCreateMonthlyStatus({
      studentId: student._id,
      activityId: activity._id,
      year,
      monthlyFee: activity.monthlyFee,
    });
  }
}

async function unenrollStudentFromActivities(studentId, activityIds) {
  if (!activityIds.length) return;
  await StudentActivity.updateMany(
    { studentId, activityId: { $in: activityIds }, active: true },
    { $set: { active: false } }
  );
  await Activity.updateMany({ _id: { $in: activityIds }, enrolled: { $gt: 0 } }, { $inc: { enrolled: -1 } });
}

async function createStudent(payload, actor) {
  let admissionNo = payload.admissionNo;
  if (admissionNo) {
    const existing = await Student.findOne({ admissionNo });
    if (existing) {
      throw ApiError.conflict('Admission number already exists', [
        { field: 'admissionNo', message: 'Admission number must be unique' },
      ]);
    }
  } else {
    admissionNo = await generateAdmissionNo();
  }

  const activityIds = payload.activities || [];
  const activities = await assertActivitiesExistAndHaveCapacity(activityIds);

  const studentId = await generateStudentId();
  const student = await Student.create({ ...payload, admissionNo, studentId, activities: activityIds });

  await enrollStudentInActivities(student, activities);

  await logAudit({
    actor,
    action: AUDIT_ACTION.CREATE,
    resourceType: AUDIT_RESOURCE_TYPE.STUDENT,
    resourceId: student._id,
    resourceLabel: `${student.name} (${student.admissionNo})`,
  });

  return getStudentById(student._id);
}

async function updateStudent(id, payload, actor) {
  const student = await Student.findById(id);
  if (!student) throw ApiError.notFound('Student not found');

  if (payload.admissionNo && payload.admissionNo !== student.admissionNo) {
    const dup = await Student.findOne({ admissionNo: payload.admissionNo, _id: { $ne: id } });
    if (dup) {
      throw ApiError.conflict('Admission number already exists', [
        { field: 'admissionNo', message: 'Admission number must be unique' },
      ]);
    }
  }

  if (payload.activities) {
    const currentIds = student.activities.map((a) => String(a));
    const nextIds = payload.activities.map((a) => String(a));
    const added = nextIds.filter((a) => !currentIds.includes(a));
    const removed = currentIds.filter((a) => !nextIds.includes(a));

    const addedActivities = await assertActivitiesExistAndHaveCapacity(added);
    await enrollStudentInActivities(student, addedActivities);
    await unenrollStudentFromActivities(student._id, removed);
  }

  const before = student.toObject();
  Object.assign(student, payload);
  await student.save();

  await logAudit({
    actor,
    action: AUDIT_ACTION.UPDATE,
    resourceType: AUDIT_RESOURCE_TYPE.STUDENT,
    resourceId: student._id,
    resourceLabel: `${student.name} (${student.admissionNo})`,
    changes: buildChanges(before, payload),
  });

  return getStudentById(student._id);
}

async function deleteStudent(id, actor) {
  const student = await Student.findById(id);
  if (!student) throw ApiError.notFound('Student not found');

  await unenrollStudentFromActivities(student._id, student.activities);
  await StudentActivity.deleteMany({ studentId: student._id });
  await MonthlyStatus.deleteMany({ studentId: student._id });
  await Student.deleteOne({ _id: student._id });

  await logAudit({
    actor,
    action: AUDIT_ACTION.DELETE,
    resourceType: AUDIT_RESOURCE_TYPE.STUDENT,
    resourceId: student._id,
    resourceLabel: `${student.name} (${student.admissionNo})`,
  });
}

async function getPaymentHistory(studentId, query) {
  const student = await Student.findById(studentId);
  if (!student) throw ApiError.notFound('Student not found');

  const { page, limit, skip } = parsePagination(query);
  const filter = { studentId };
  if (query.activityId) filter.activityId = query.activityId;

  const [payments, total] = await Promise.all([
    Payment.find(filter)
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

async function getMonthlyStatusForStudent(studentId, query) {
  const student = await Student.findById(studentId).populate('activities');
  if (!student) throw ApiError.notFound('Student not found');

  const year = Number(query.year) || getCurrentMonthYear().year;

  const results = [];
  for (const activity of student.activities) {
    const doc = await getOrCreateMonthlyStatus({
      studentId: student._id,
      activityId: activity._id,
      year,
      monthlyFee: activity.monthlyFee,
    });
    const paidMonths = doc.months.filter((m) => m.status === MONTH_STATUS.PAID).length;
    const outstanding = doc.months
      .filter((m) => [MONTH_STATUS.PENDING, MONTH_STATUS.PARTIAL].includes(m.status))
      .reduce((sum, m) => sum + (m.amount - m.paidAmount), 0);
    const paidAmount = doc.months.reduce((sum, m) => sum + m.paidAmount, 0);

    results.push({
      activityId: activity._id,
      activityName: activity.name,
      monthlyFee: activity.monthlyFee,
      year,
      months: doc.months,
      progressPercent: Math.round((paidMonths / 12) * 100),
      outstanding: Math.round(outstanding * 100) / 100,
      paidAmount: Math.round(paidAmount * 100) / 100,
    });
  }

  return results;
}

async function recomputeStudentStatus(studentId) {
  const student = await Student.findById(studentId);
  if (!student || student.status === STUDENT_STATUS.INACTIVE) return;

  const { month: currentMonth, year } = getCurrentMonthYear();
  const activeEnrollments = await StudentActivity.find({ studentId, active: true }).select('activityId');
  const activityIds = activeEnrollments.map((e) => e.activityId);

  let overdue = false;
  if (activityIds.length) {
    const statuses = await MonthlyStatus.find({ studentId, activityId: { $in: activityIds }, year }).lean();
    overdue = statuses.some((doc) =>
      doc.months.some(
        (m) => m.month <= currentMonth && [MONTH_STATUS.PENDING, MONTH_STATUS.PARTIAL].includes(m.status)
      )
    );
  }

  const nextStatus = overdue ? STUDENT_STATUS.OVERDUE : STUDENT_STATUS.ACTIVE;
  if (student.status !== nextStatus) {
    student.status = nextStatus;
    await student.save();
  }
}

module.exports = {
  listStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  getPaymentHistory,
  getMonthlyStatusForStudent,
  computeOutstandingMap,
  recomputeStudentStatus,
};
