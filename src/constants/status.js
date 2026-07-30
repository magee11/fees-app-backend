const STUDENT_STATUS = Object.freeze({
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  OVERDUE: 'overdue',
});

const ACTIVITY_STATUS = Object.freeze({
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  FULL: 'full',
});

const MONTH_STATUS = Object.freeze({
  PAID: 'paid',
  PENDING: 'pending',
  PARTIAL: 'partial',
  NONE: 'none',
});

const PAYMENT_STATUS = Object.freeze({
  SUCCESS: 'success',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
});

const PAYMENT_MODE = Object.freeze({
  CASH: 'Cash',
  UPI: 'UPI',
  CARD: 'Card',
  BANK: 'Bank',
});

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTH_SHORT = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

const AUDIT_ACTION = Object.freeze({
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
});

const AUDIT_RESOURCE_TYPE = Object.freeze({
  STUDENT: 'student',
  ACTIVITY: 'activity',
  PAYMENT: 'payment',
  SETTINGS: 'settings',
  USER: 'user',
});

module.exports = {
  STUDENT_STATUS,
  ACTIVITY_STATUS,
  MONTH_STATUS,
  PAYMENT_STATUS,
  PAYMENT_MODE,
  MONTH_NAMES,
  MONTH_SHORT,
  AUDIT_ACTION,
  AUDIT_RESOURCE_TYPE,
};
