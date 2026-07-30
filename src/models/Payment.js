const { Schema, model } = require('mongoose');
const { PAYMENT_STATUS, PAYMENT_MODE } = require('../constants');

const paymentSchema = new Schema(
  {
    receiptNo: { type: String, required: true, unique: true, trim: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    activityId: { type: Schema.Types.ObjectId, ref: 'Activity', required: true },
    months: [{ type: Number, min: 1, max: 12, required: true }],
    year: { type: Number, required: true },
    amount: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    lateFee: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    paymentMode: { type: String, enum: Object.values(PAYMENT_MODE), required: true },
    referenceNo: { type: String, default: '' },
    collectedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    paymentDate: { type: Date, default: Date.now },
    remarks: { type: String, default: '' },
    status: { type: String, enum: Object.values(PAYMENT_STATUS), default: PAYMENT_STATUS.SUCCESS },
  },
  { timestamps: true }
);

paymentSchema.index({ studentId: 1 });
paymentSchema.index({ activityId: 1 });
paymentSchema.index({ paymentDate: -1 });
paymentSchema.index({ studentId: 1, activityId: 1, year: 1 });

module.exports = model('Payment', paymentSchema);
