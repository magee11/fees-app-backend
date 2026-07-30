const express = require('express');
const settingsController = require('../controllers/settings.controller');
const validate = require('../middleware/validate.middleware');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const { uploadSchoolLogo } = require('../middleware/upload.middleware');
const { ROLES } = require('../constants');
const { updateSettingsSchema } = require('../validators/settings.validator');

const router = express.Router();

router.use(protect);

router.get('/', settingsController.getSettings);
router.put('/', authorize(ROLES.ADMIN), validate(updateSettingsSchema), settingsController.updateSettings);
router.post('/logo', authorize(ROLES.ADMIN), uploadSchoolLogo.single('logo'), settingsController.uploadLogo);

module.exports = router;
