const { Schema, model } = require('mongoose');
const { ACTIVITY_STATUS } = require('../constants');

const activitySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    coach: { type: String, required: true, trim: true },
    monthlyFee: { type: Number, required: true, min: 0 },
    schedule: { type: String, default: '' },
    capacity: { type: Number, required: true, min: 0, default: 0 },
    enrolled: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: Object.values(ACTIVITY_STATUS), default: ACTIVITY_STATUS.ACTIVE },
    description: { type: String, default: '' },
    color: { type: String, default: '#3B82F6' },
    icon: { type: String, default: 'activity' },
  },
  { timestamps: true }
);

activitySchema.index({ name: 'text', coach: 'text' });
activitySchema.index({ status: 1 });

activitySchema.virtual('isFull').get(function isFull() {
  return this.capacity > 0 && this.enrolled >= this.capacity;
});

activitySchema.set('toJSON', { virtuals: true });

module.exports = model('Activity', activitySchema);
