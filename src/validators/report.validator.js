const { z } = require('zod');
const { objectId } = require('./common');

const reportQuerySchema = z.object({
  query: z.object({
    fromDate: z.coerce.date().optional(),
    toDate: z.coerce.date().optional(),
    year: z.coerce.number().int().min(2000).max(2100).optional(),
    month: z.coerce.number().int().min(1).max(12).optional(),
    activityId: objectId.optional(),
    format: z.enum(['json', 'pdf', 'excel', 'csv']).optional(),
  }),
});

const studentLedgerQuerySchema = z.object({
  params: z.object({ studentId: objectId }),
  query: z.object({
    year: z.coerce.number().int().min(2000).max(2100).optional(),
    format: z.enum(['json', 'pdf', 'excel', 'csv']).optional(),
  }),
});

module.exports = { reportQuerySchema, studentLedgerQuerySchema };
