const { Schema, model } = require('mongoose');

const studentActivitySchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    activityId: { type: Schema.Types.ObjectId, ref: 'Activity', required: true },
    joinedDate: { type: Date, default: Date.now },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

studentActivitySchema.index({ studentId: 1, activityId: 1 }, { unique: true });
studentActivitySchema.index({ activityId: 1 });

module.exports = model('StudentActivity', studentActivitySchema);
