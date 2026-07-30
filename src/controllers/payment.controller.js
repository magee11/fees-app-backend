const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const paymentService = require('../services/payment.service');
const { streamReceiptPDF } = require('../services/receipt.service');

const createPayment = asyncHandler(async (req, res) => {
  const payment = await paymentService.createPayment(req.body, req.user);
  sendSuccess(res, { statusCode: 201, message: 'Payment recorded successfully', data: { payment } });
});

const listPayments = asyncHandler(async (req, res) => {
  const { data, meta } = await paymentService.listPayments(req.query);
  sendSuccess(res, { message: 'Payments fetched successfully', data, meta });
});

const getPayment = asyncHandler(async (req, res) => {
  const payment = await paymentService.getPaymentById(req.params.id);
  sendSuccess(res, { message: 'Payment fetched successfully', data: { payment } });
});

const deletePayment = asyncHandler(async (req, res) => {
  await paymentService.deletePayment(req.params.id, req.user);
  sendSuccess(res, { message: 'Payment deleted successfully' });
});

const downloadReceipt = asyncHandler(async (req, res) => {
  const payment = await paymentService.getPaymentById(req.params.id);
  await streamReceiptPDF(payment, res);
});

module.exports = { createPayment, listPayments, getPayment, deletePayment, downloadReceipt };
