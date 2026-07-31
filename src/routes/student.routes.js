const express = require('express');
const studentController = require('../controllers/student.controller');
const validate = require('../middleware/validate.middleware');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const { uploadImportFile } = require('../middleware/upload.middleware');
const { ROLES } = require('../constants');
const {
  createStudentSchema,
  updateStudentSchema,
  idParamSchema,
  listStudentsQuerySchema,
  exportStudentsQuerySchema,
  importTemplateQuerySchema,
} = require('../validators/student.validator');

const router = express.Router();

router.use(protect);

router.get('/', validate(listStudentsQuerySchema), studentController.listStudents);
router.get('/export', validate(exportStudentsQuerySchema), studentController.exportStudents);
router.get('/import-template', validate(importTemplateQuerySchema), studentController.downloadImportTemplate);
router.post(
  '/import',
  authorize(ROLES.ADMIN, ROLES.STAFF),
  uploadImportFile.single('file'),
  studentController.importStudents
);
router.get('/:id', validate(idParamSchema), studentController.getStudent);
router.get('/:id/payment-history', validate(idParamSchema), studentController.getPaymentHistory);
router.get('/:id/monthly-status', validate(idParamSchema), studentController.getMonthlyStatus);

router.post(
  '/',
  authorize(ROLES.ADMIN, ROLES.STAFF),
  validate(createStudentSchema),
  studentController.createStudent
);
router.put(
  '/:id',
  authorize(ROLES.ADMIN, ROLES.STAFF),
  validate(updateStudentSchema),
  studentController.updateStudent
);
router.delete('/:id', authorize(ROLES.ADMIN), validate(idParamSchema), studentController.deleteStudent);

module.exports = router;
