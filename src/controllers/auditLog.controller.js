const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const auditLogService = require('../services/auditLog.service');

const listAuditLogs = asyncHandler(async (req, res) => {
  const { data, meta } = await auditLogService.listAuditLogs(req.query);
  sendSuccess(res, { message: 'Audit logs fetched successfully', data, meta });
});

module.exports = { listAuditLogs };
