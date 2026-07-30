const express = require('express');
const userController = require('../controllers/user.controller');
const validate = require('../middleware/validate.middleware');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const { ROLES } = require('../constants');
const { createUserSchema, updateUserSchema, idParamSchema } = require('../validators/user.validator');

const router = express.Router();

router.use(protect, authorize(ROLES.ADMIN));

router.get('/', userController.listUsers);
router.post('/', validate(createUserSchema), userController.createUser);
router.put('/:id', validate(updateUserSchema), userController.updateUser);
router.delete('/:id', validate(idParamSchema), userController.deleteUser);

module.exports = router;
