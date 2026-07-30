const { Schema, model } = require('mongoose');

const settingsSchema = new Schema(
  {
    schoolName: { type: String, default: 'FeeFlow School' },
    schoolAddress: { type: String, default: '' },
    schoolPhone: { type: String, default: '' },
    schoolEmail: { type: String, default: '' },
    logo: { type: String, default: '' },
    academicYear: { type: String, default: '' },
    receiptPrefix: { type: String, default: 'RCT' },
    partialPaymentPercentage: { type: Number, default: 50, min: 0, max: 100 },
    currency: { type: String, default: 'INR' },
  },
  { timestamps: true }
);

// Singleton pattern: only one settings document should ever exist. Uses an atomic
// upsert (rather than find-then-create) so concurrent first-time callers can never
// race into creating two documents.
settingsSchema.statics.getSingleton = async function getSingleton() {
  return this.findOneAndUpdate(
    {},
    { $setOnInsert: {} },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
};

module.exports = model('Settings', settingsSchema);
