const express = require('express');
const auditLogController = require('../controllers/auditLog.controller');
const validate = require('../middleware/validate.middleware');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const { ROLES } = require('../constants');
const { listAuditLogsQuerySchema } = require('../validators/auditLog.validator');

const router = express.Router();

router.use(protect, authorize(ROLES.ADMIN));

router.get('/', validate(listAuditLogsQuerySchema), auditLogController.listAuditLogs);

module.exports = router;
