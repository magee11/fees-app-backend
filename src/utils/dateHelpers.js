const { MONTH_NAMES, MONTH_SHORT } = require('../constants');

/** Academic-agnostic: month is 1-12 (calendar month), independent of fiscal year start. */
function getCurrentMonthYear() {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

function monthName(month) {
  return MONTH_NAMES[month - 1];
}

function monthShort(month) {
  return MONTH_SHORT[month - 1];
}

function isMonthInFuture(month, year) {
  const { month: curMonth, year: curYear } = getCurrentMonthYear();
  if (year > curYear) return true;
  if (year === curYear && month > curMonth) return true;
  return false;
}

function isCurrentMonth(month, year) {
  const { month: curMonth, year: curYear } = getCurrentMonthYear();
  return month === curMonth && year === curYear;
}

function buildEmptyMonths(year, fee) {
  const months = [];
  for (let m = 1; m <= 12; m += 1) {
    months.push({
      month: m,
      status: isMonthInFuture(m, year) ? 'none' : 'pending',
      amount: fee,
      paidAmount: 0,
      paidDate: null,
      paymentId: null,
    });
  }
  return months;
}

module.exports = {
  getCurrentMonthYear,
  monthName,
  monthShort,
  isMonthInFuture,
  isCurrentMonth,
  buildEmptyMonths,
};
