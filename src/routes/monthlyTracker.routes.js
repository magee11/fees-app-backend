const express = require('express');
const trackerController = require('../controllers/monthlyTracker.controller');
const validate = require('../middleware/validate.middleware');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const { ROLES } = require('../constants');
const {
  listTrackerQuerySchema,
  trackerDetailParamsSchema,
  payMonthsSchema,
} = require('../validators/monthlyTracker.validator');

const router = express.Router();

router.use(protect);

router.get('/', validate(listTrackerQuerySchema), trackerController.listTracker);
router.get(
  '/:studentId/:activityId',
  validate(trackerDetailParamsSchema),
  trackerController.getTrackerDetail
);
router.patch(
  '/pay',
  authorize(ROLES.ADMIN, ROLES.STAFF),
  validate(payMonthsSchema),
  trackerController.payMonths
);

module.exports = router;
