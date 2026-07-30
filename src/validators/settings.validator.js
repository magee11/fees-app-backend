const { z } = require('zod');

const updateSettingsSchema = z.object({
  body: z.object({
    schoolName: z.string().min(1).optional(),
    schoolAddress: z.string().optional(),
    schoolPhone: z.string().optional(),
    schoolEmail: z.string().email().optional().or(z.literal('')),
    logo: z.string().optional(),
    academicYear: z.string().optional(),
    receiptPrefix: z.string().min(1).optional(),
    partialPaymentPercentage: z.coerce.number().min(0).max(100).optional(),
    currency: z.string().optional(),
  }),
});

module.exports = { updateSettingsSchema };
