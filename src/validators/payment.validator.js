const { z } = require('zod');
const { objectId, paginationQuery } = require('./common');
const { PAYMENT_MODE } = require('../constants');

const createPaymentSchema = z.object({
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

const idParamSchema = z.object({
  params: z.object({ id: objectId }),
});

const listPaymentsQuerySchema = z.object({
  query: paginationQuery.extend({
    studentId: objectId.optional(),
    activityId: objectId.optional(),
    paymentMode: z.enum(Object.values(PAYMENT_MODE)).optional(),
    receiptNo: z.string().optional(),
    fromDate: z.coerce.date().optional(),
    toDate: z.coerce.date().optional(),
  }),
});

module.exports = { createPaymentSchema, idParamSchema, listPaymentsQuerySchema };
