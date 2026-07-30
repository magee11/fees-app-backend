const { Schema, model } = require('mongoose');
const { MONTH_STATUS } = require('../constants');

const monthEntrySchema = new Schema(
  {
    month: { type: Number, required: true, min: 1, max: 12 },
    status: { type: String, enum: Object.values(MONTH_STATUS), default: MONTH_STATUS.NONE },
    amount: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    paidDate: { type: Date, default: null },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', default: null },
  },
  { _id: false }
);

const monthlyStatusSchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    activityId: { type: Schema.Types.ObjectId, ref: 'Activity', required: true },
    year: { type: Number, required: true },
    months: {
      type: [monthEntrySchema],
      validate: {
        validator: (arr) => arr.length === 12,
        message: 'months must contain exactly 12 entries',
      },
    },
  },
  { timestamps: true }
);

monthlyStatusSchema.index({ studentId: 1, activityId: 1, year: 1 }, { unique: true });
monthlyStatusSchema.index({ activityId: 1, year: 1 });

module.exports = model('MonthlyStatus', monthlyStatusSchema);
