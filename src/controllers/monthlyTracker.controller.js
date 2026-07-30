const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const trackerService = require('../services/monthlyTracker.service');

const listTracker = asyncHandler(async (req, res) => {
  const { data, meta } = await trackerService.listTracker(req.query);
  sendSuccess(res, { message: 'Monthly tracker fetched successfully', data, meta });
});

const getTrackerDetail = asyncHandler(async (req, res) => {
  const data = await trackerService.getTrackerDetail(req.params.studentId, req.params.activityId, req.query);
  sendSuccess(res, { message: 'Monthly tracker detail fetched successfully', data });
});

const payMonths = asyncHandler(async (req, res) => {
  const payment = await trackerService.payMonths(req.body, req.user);
  sendSuccess(res, { statusCode: 201, message: 'Payment recorded successfully', data: { payment } });
});

module.exports = { listTracker, getTrackerDetail, payMonths };
