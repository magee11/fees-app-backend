const { z } = require('zod');
const { objectId, paginationQuery } = require('./common');
const { PAYMENT_MODE } = require('../constants');

const listTrackerQuerySchema = z.object({
  query: paginationQuery.extend({
    search: z.string().optional(),
    activityId: objectId.optional(),
    status: z.enum(['paid', 'pending', 'partial', 'overdue']).optional(),
    year: z.coerce.number().int().min(2000).max(2100).optional(),
  }),
});

const trackerDetailParamsSchema = z.object({
  params: z.object({
    studentId: objectId,
    activityId: objectId,
  }),
  query: z.object({
    year: z.coerce.number().int().min(2000).max(2100).optional(),
  }),
});

const payMonthsSchema = z.object({
  body: z.object({
    studentId: objectId,
    activityId: objectId,
    months: z.array(z.coerce.number().int().min(1).max(12)).min(1, 'Select at least one month'),
    year: z.coerce.number().int().min(2000).max(2100),
    discount: z.coerce.number().nonnegative().optional().default(0),
    lateFee: z.coerce.number().nonnegative().optional().default(0),
    paymentMode: z.enum(Object.values(PAYMENT_MODE)),
    referenceNo: z.string().optional(),
    remarks: z.string().optional(),
  }),
});

module.exports = { listTrackerQuerySchema, trackerDetailParamsSchema, payMonthsSchema };
