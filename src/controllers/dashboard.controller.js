const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const dashboardService = require('../services/dashboard.service');

const getDashboard = asyncHandler(async (req, res) => {
  const data = await dashboardService.getDashboard();
  sendSuccess(res, { message: 'Dashboard fetched successfully', data });
});

module.exports = { getDashboard };
