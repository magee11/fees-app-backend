/* eslint-disable no-await-in-loop */
require('dotenv').config();
const { connectDB, disconnectDB } = require('../config/db');
const logger = require('../config/logger');
const env = require('../config/env');
const { createPrng } = require('./prng');
const activitiesData = require('./data/activities.data');
const { FIRST_NAMES, LAST_NAMES, STANDARDS, SECTIONS } = require('./data/names.data');

const {
  User,
  Student,
  Activity,
  StudentActivity,
  Payment,
  MonthlyStatus,
  Settings,
  Counter,
} = require('../models');

const { generateStudentId, generateReceiptNo } = require('../utils/generateId');
const { getCurrentMonthYear } = require('../utils/dateHelpers');
const { MONTH_STATUS, PAYMENT_MODE, STUDENT_STATUS } = require('../constants');

const prng = createPrng(42);

async function clearDatabase() {
  await Promise.all([
    User.deleteMany({}),
    Student.deleteMany({}),
    Activity.deleteMany({}),
    StudentActivity.deleteMany({}),
    Payment.deleteMany({}),
    MonthlyStatus.deleteMany({}),
    Settings.deleteMany({}),
    Counter.deleteMany({}),
  ]);
  logger.info('Cleared existing collections');
}

async function seedUsers() {
  const admin = await User.create({
    name: 'Admin User',
    email: env.seedAdmin.email,
    password: env.seedAdmin.password,
    role: 'admin',
  });
  const staff = await User.create({
    name: 'Staff Member',
    email: 'staff@feeflow.app',
    password: 'Staff@12345',
    role: 'staff',
  });
  logger.info(`Seeded users: ${admin.email} (admin), ${staff.email} (staff)`);
  return { admin, staff };
}

async function seedActivities() {
  const activities = await Activity.insertMany(activitiesData);
  logger.info(`Seeded ${activities.length} activities`);
  return activities;
}

async function seedSettings() {
  const settings = await Settings.create({
    schoolName: 'Sunrise Public School',
    schoolAddress: '221 MG Road, Bengaluru, Karnataka 560001',
    schoolPhone: '+91 80 4567 8901',
    schoolEmail: 'admin@sunrisepublicschool.edu.in',
    academicYear: '2026-2027',
    receiptPrefix: env.business.receiptPrefix,
    partialPaymentPercentage: env.business.partialPaymentPercentage,
    currency: 'INR',
  });
  logger.info('Seeded settings');
  return settings;
}

function buildStudentsPayload(count = 20) {
  const students = [];
  for (let i = 0; i < count; i += 1) {
    const first = FIRST_NAMES[i % FIRST_NAMES.length];
    const last = prng.pick(LAST_NAMES);

    students.push({
      admissionNo: `ADM${String(1000 + i).padStart(4, '0')}`,
      name: `${first} ${last}`,
      standard: prng.pick(STANDARDS),
      section: prng.pick(SECTIONS),
      joinedDate: new Date(2026, 0, prng.randInt(1, 28)),
      activityCount: prng.randInt(1, 2),
    });
  }
  return students;
}

/**
 * Builds one academic year of month history for a student+activity pairing,
 * mirroring the frontend prototype's shape: paid through a random month with
 * an occasional gap (missed month) and an occasional partial current month.
 */
function buildMonthPlan(currentMonth, monthlyFee, partialPercentage) {
  const payThrough = prng.randInt(3, currentMonth);
  const hasPartial = prng.rand() < 0.25;
  const hasGap = prng.rand() < 0.2;
  const gapMonth = hasGap && payThrough - 2 >= 1 ? payThrough - 2 : null;

  const plan = [];
  for (let month = 1; month <= 12; month += 1) {
    if (month > currentMonth) {
      plan.push({ month, status: MONTH_STATUS.NONE, amount: monthlyFee, paidAmount: 0 });
      continue;
    }
    if (gapMonth && month === gapMonth) {
      plan.push({ month, status: MONTH_STATUS.PENDING, amount: monthlyFee, paidAmount: 0 });
      continue;
    }
    if (month === payThrough && hasPartial) {
      const paidAmount = Math.round(monthlyFee * (partialPercentage / 100));
      plan.push({ month, status: MONTH_STATUS.PARTIAL, amount: monthlyFee, paidAmount });
      continue;
    }
    if (month <= payThrough) {
      plan.push({ month, status: MONTH_STATUS.PAID, amount: monthlyFee, paidAmount: monthlyFee });
      continue;
    }
    plan.push({ month, status: MONTH_STATUS.PENDING, amount: monthlyFee, paidAmount: 0 });
  }
  return plan;
}

async function createPaymentForMonth({ student, activity, monthEntry, year, collectors }) {
  const day = Math.min(28, prng.randInt(1, 28));
  const paymentDate = new Date(year, monthEntry.month - 1, day);
  const paymentMode = prng.pick(Object.values(PAYMENT_MODE));
  const hasLateFee = prng.rand() < 0.15;
  const hasDiscount = prng.rand() < 0.1;

  const lateFee = hasLateFee ? 50 : 0;
  const discount = hasDiscount ? Math.round(monthEntry.amount * 0.1) : 0;
  const total = Math.max(0, monthEntry.paidAmount + lateFee - discount);

  const receiptNo = await generateReceiptNo({
    prefix: env.business.receiptPrefix,
    startNumber: env.business.receiptStartNumber,
  });

  const payment = await Payment.create({
    receiptNo,
    studentId: student._id,
    activityId: activity._id,
    months: [monthEntry.month],
    year,
    amount: monthEntry.amount,
    discount,
    lateFee,
    total,
    paymentMode,
    referenceNo: paymentMode === 'Cash' ? '' : `REF${prng.randInt(100000, 999999)}`,
    collectedBy: prng.pick(collectors)._id,
    paymentDate,
    remarks: '',
  });

  return payment;
}

async function seedStudentsAndEnrollments(activities, collectors) {
  const { month: currentMonth, year } = getCurrentMonthYear();
  const partialPercentage = env.business.partialPaymentPercentage;
  const studentsPayload = buildStudentsPayload(20);

  let totalPayments = 0;

  for (const payload of studentsPayload) {
    const { activityCount, ...studentFields } = payload;
    const assignedActivities = prng.pickMany(activities, activityCount);

    const studentId = await generateStudentId();
    const isInactive = prng.rand() < 0.05;

    const student = await Student.create({
      ...studentFields,
      studentId,
      activities: assignedActivities.map((a) => a._id),
      status: isInactive ? STUDENT_STATUS.INACTIVE : STUDENT_STATUS.ACTIVE,
    });

    let studentHasOverdue = false;

    for (const activity of assignedActivities) {
      await StudentActivity.create({ studentId: student._id, activityId: activity._id, active: true });
      await Activity.findByIdAndUpdate(activity._id, { $inc: { enrolled: 1 } });

      const months = buildMonthPlan(currentMonth, activity.monthlyFee, partialPercentage);

      for (const monthEntry of months) {
        if (monthEntry.paidAmount > 0) {
          const payment = await createPaymentForMonth({ student, activity, monthEntry, year, collectors });
          monthEntry.paidDate = payment.paymentDate;
          monthEntry.paymentId = payment._id;
          totalPayments += 1;
        } else {
          monthEntry.paidDate = null;
          monthEntry.paymentId = null;
        }
        if (monthEntry.month <= currentMonth && monthEntry.status !== MONTH_STATUS.PAID) {
          studentHasOverdue = true;
        }
      }

      await MonthlyStatus.create({ studentId: student._id, activityId: activity._id, year, months });
    }

    if (!isInactive && studentHasOverdue) {
      student.status = STUDENT_STATUS.OVERDUE;
      await student.save();
    }
  }

  logger.info(`Seeded ${studentsPayload.length} students with enrollments and ${totalPayments} payments`);
}

async function destroy() {
  await connectDB();
  await clearDatabase();
  logger.info('Database destroyed');
  await disconnectDB();
  process.exit(0);
}

async function run() {
  await connectDB();
  await clearDatabase();

  const { admin, staff } = await seedUsers();
  const activities = await seedActivities();
  await seedSettings();
  await seedStudentsAndEnrollments(activities, [admin, staff]);

  logger.info('Seed complete');
  await disconnectDB();
  process.exit(0);
}

if (process.argv.includes('--destroy')) {
  destroy().catch((error) => {
    logger.error(`Seed destroy failed: ${error.stack || error.message}`);
    process.exit(1);
  });
} else {
  run().catch((error) => {
    logger.error(`Seed failed: ${error.stack || error.message}`);
    process.exit(1);
  });
}
