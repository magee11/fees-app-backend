const { z } = require('zod');
const { objectId, paginationQuery } = require('./common');
const { AUDIT_ACTION, AUDIT_RESOURCE_TYPE } = require('../constants');

const listAuditLogsQuerySchema = z.object({
  query: paginationQuery.extend({
    resourceType: z.enum(Object.values(AUDIT_RESOURCE_TYPE)).optional(),
    action: z.enum(Object.values(AUDIT_ACTION)).optional(),
    userId: objectId.optional(),
    fromDate: z.coerce.date().optional(),
    toDate: z.coerce.date().optional(),
  }),
});

module.exports = { listAuditLogsQuerySchema };
