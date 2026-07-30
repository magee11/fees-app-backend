const { MonthlyStatus, Settings } = require('../models');
const { isMonthInFuture } = require('../utils/dateHelpers');
const { MONTH_STATUS } = require('../constants');

/**
 * A month is 'partial' only once paidAmount crosses the configurable threshold
 * (Settings.partialPaymentPercentage); below that it still reads as 'pending'
 * even though a small amount may have been recorded against it.
 */
function computeMonthStatus(amount, paidAmount, partialPercentage) {
  if (amount <= 0) return MONTH_STATUS.PAID;
  const ratio = (paidAmount / amount) * 100;
  if (ratio >= 100) return MONTH_STATUS.PAID;
  if (ratio >= partialPercentage) return MONTH_STATUS.PARTIAL;
  return MONTH_STATUS.PENDING;
}

async function getPartialPercentage() {
  const settings = await Settings.getSingleton();
  return settings.partialPaymentPercentage;
}

async function getOrCreateMonthlyStatus({ studentId, activityId, year, monthlyFee }, session) {
  let doc = await MonthlyStatus.findOne({ studentId, activityId, year }).session(session || null);
  if (doc) return doc;

  const months = [];
  for (let m = 1; m <= 12; m += 1) {
    months.push({
      month: m,
      status: isMonthInFuture(m, year) ? MONTH_STATUS.NONE : MONTH_STATUS.PENDING,
      amount: monthlyFee,
      paidAmount: 0,
      paidDate: null,
      paymentId: null,
    });
  }

  const created = await MonthlyStatus.create([{ studentId, activityId, year, months }], { session });
  return created[0];
}

/**
 * Applies a payment's amount evenly across the paid months (remainder absorbed by
 * the first month) and recomputes each month's status.
 */
async function applyPaymentToMonths({ studentId, activityId, year, months, amount, paymentId, paymentDate, monthlyFee }, session) {
  const doc = await getOrCreateMonthlyStatus({ studentId, activityId, year, monthlyFee }, session);
  const partialPercentage = await getPartialPercentage();

  const perMonth = Math.floor((amount / months.length) * 100) / 100;
  let remainder = Math.round((amount - perMonth * months.length) * 100) / 100;

  months.forEach((monthNum) => {
    const entry = doc.months.find((m) => m.month === monthNum);
    if (!entry) return;
    let share = perMonth;
    if (remainder !== 0) {
      share = Math.round((share + remainder) * 100) / 100;
      remainder = 0;
    }
    entry.paidAmount = Math.round((entry.paidAmount + share) * 100) / 100;
    entry.paidDate = paymentDate;
    entry.paymentId = paymentId;
    entry.status = computeMonthStatus(entry.amount, entry.paidAmount, partialPercentage);
  });

  await doc.save({ session });
  return doc;
}

async function reversePayment({ studentId, activityId, year, months, paymentId }, session) {
  const doc = await MonthlyStatus.findOne({ studentId, activityId, year }).session(session || null);
  if (!doc) return null;
  const partialPercentage = await getPartialPercentage();

  months.forEach((monthNum) => {
    const entry = doc.months.find((m) => m.month === monthNum);
    if (!entry || String(entry.paymentId) !== String(paymentId)) return;
    entry.paidAmount = 0;
    entry.paidDate = null;
    entry.paymentId = null;
    entry.status = isMonthInFuture(monthNum, year)
      ? MONTH_STATUS.NONE
      : computeMonthStatus(entry.amount, 0, partialPercentage);
  });

  await doc.save({ session });
  return doc;
}

module.exports = {
  computeMonthStatus,
  getPartialPercentage,
  getOrCreateMonthlyStatus,
  applyPaymentToMonths,
  reversePayment,
};
