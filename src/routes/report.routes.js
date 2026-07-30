const express = require('express');
const reportController = require('../controllers/report.controller');
const validate = require('../middleware/validate.middleware');
const { protect } = require('../middleware/auth.middleware');
const { reportQuerySchema, studentLedgerQuerySchema } = require('../validators/report.validator');

const router = express.Router();

router.use(protect);

router.get('/revenue', validate(reportQuerySchema), reportController.revenueReport);
router.get('/pending', validate(reportQuerySchema), reportController.pendingReport);
router.get('/activity', validate(reportQuerySchema), reportController.activityReport);
router.get('/monthly-collection', validate(reportQuerySchema), reportController.monthlyCollection);
router.get('/yearly-collection', validate(reportQuerySchema), reportController.yearlyCollection);
router.get(
  '/student-ledger/:studentId',
  validate(studentLedgerQuerySchema),
  reportController.studentLedger
);

module.exports = router;
