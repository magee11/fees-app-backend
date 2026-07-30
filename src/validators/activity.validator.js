const { z } = require('zod');
const { objectId, paginationQuery } = require('./common');
const { ACTIVITY_STATUS } = require('../constants');

const createActivitySchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name is required'),
    coach: z.string().min(2, 'Coach is required'),
    monthlyFee: z.coerce.number().nonnegative(),
    schedule: z.string().optional(),
    capacity: z.coerce.number().int().nonnegative().optional(),
    status: z.enum(Object.values(ACTIVITY_STATUS)).optional(),
    description: z.string().optional(),
    color: z.string().optional(),
    icon: z.string().optional(),
  }),
});

const updateActivitySchema = z.object({
  params: z.object({ id: objectId }),
  body: createActivitySchema.shape.body.partial(),
});

const idParamSchema = z.object({
  params: z.object({ id: objectId }),
});

const listActivitiesQuerySchema = z.object({
  query: paginationQuery.extend({
    search: z.string().optional(),
    status: z.enum(Object.values(ACTIVITY_STATUS)).optional(),
  }),
});

module.exports = {
  createActivitySchema,
  updateActivitySchema,
  idParamSchema,
  listActivitiesQuerySchema,
};
