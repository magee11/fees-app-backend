const express = require('express');
const activityController = require('../controllers/activity.controller');
const validate = require('../middleware/validate.middleware');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const { ROLES } = require('../constants');
const {
  createActivitySchema,
  updateActivitySchema,
  idParamSchema,
  listActivitiesQuerySchema,
} = require('../validators/activity.validator');

const router = express.Router();

router.use(protect);

router.get('/', validate(listActivitiesQuerySchema), activityController.listActivities);
router.get('/:id', validate(idParamSchema), activityController.getActivity);
router.post('/', authorize(ROLES.ADMIN), validate(createActivitySchema), activityController.createActivity);
router.put('/:id', authorize(ROLES.ADMIN), validate(updateActivitySchema), activityController.updateActivity);
router.delete('/:id', authorize(ROLES.ADMIN), validate(idParamSchema), activityController.deleteActivity);

module.exports = router;
