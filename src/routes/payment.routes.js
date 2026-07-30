const express = require('express');
const paymentController = require('../controllers/payment.controller');
const validate = require('../middleware/validate.middleware');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const { ROLES } = require('../constants');
const {
  createPaymentSchema,
  idParamSchema,
  listPaymentsQuerySchema,
} = require('../validators/payment.validator');

const router = express.Router();

router.use(protect);

router.get('/', validate(listPaymentsQuerySchema), paymentController.listPayments);
router.get('/:id', validate(idParamSchema), paymentController.getPayment);
router.get('/:id/receipt', validate(idParamSchema), paymentController.downloadReceipt);
router.post('/', authorize(ROLES.ADMIN, ROLES.STAFF), validate(createPaymentSchema), paymentController.createPayment);
router.delete('/:id', authorize(ROLES.ADMIN), validate(idParamSchema), paymentController.deletePayment);

module.exports = router;
