const { z } = require('zod');
const { Types } = require('mongoose');

const objectId = z.string().refine((val) => Types.ObjectId.isValid(val), {
  message: 'Invalid id format',
});

const phone = z
  .string()
  .regex(/^[6-9]\d{9}$/, 'Phone must be a valid 10-digit Indian mobile number');

const email = z.string().email('Invalid email address');

const paginationQuery = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

module.exports = { objectId, phone, email, paginationQuery };
