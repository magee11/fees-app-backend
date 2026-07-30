const { Schema, model } = require('mongoose');
const { STUDENT_STATUS } = require('../constants');

const studentSchema = new Schema(
  {
    admissionNo: { type: String, required: true, unique: true, trim: true },
    studentId: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    standard: { type: String, required: true, trim: true },
    section: { type: String, required: true, trim: true },
    gender: { type: String, enum: ['M', 'F', 'Other'], required: false },
    dob: { type: Date, required: false },
    parentName: { type: String, default: '', trim: true },
    phone: {
      type: String,
      default: '',
      trim: true,
      match: [/^$|^[6-9]\d{9}$/, 'Invalid phone number'],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
      match: [/^$|^\S+@\S+\.\S+$/, 'Invalid email address'],
    },
    address: { type: String, default: '' },
    photo: { type: String, default: '' },
    joinedDate: { type: Date, default: Date.now },
    activities: [{ type: Schema.Types.ObjectId, ref: 'Activity', default: [] }],
    status: { type: String, enum: Object.values(STUDENT_STATUS), default: STUDENT_STATUS.ACTIVE },
  },
  { timestamps: true }
);

studentSchema.index({ standard: 1, section: 1 });
studentSchema.index({ status: 1 });
studentSchema.index({ name: 'text', parentName: 'text', phone: 'text', admissionNo: 'text' });

module.exports = model('Student', studentSchema);
