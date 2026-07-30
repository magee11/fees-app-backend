const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const activityService = require('../services/activity.service');

const listActivities = asyncHandler(async (req, res) => {
  const { data, meta } = await activityService.listActivities(req.query);
  sendSuccess(res, { message: 'Activities fetched successfully', data, meta });
});

const getActivity = asyncHandler(async (req, res) => {
  const activity = await activityService.getActivityById(req.params.id);
  sendSuccess(res, { message: 'Activity fetched successfully', data: { activity } });
});

const createActivity = asyncHandler(async (req, res) => {
  const activity = await activityService.createActivity(req.body, req.user);
  sendSuccess(res, { statusCode: 201, message: 'Activity created successfully', data: { activity } });
});

const updateActivity = asyncHandler(async (req, res) => {
  const activity = await activityService.updateActivity(req.params.id, req.body, req.user);
  sendSuccess(res, { message: 'Activity updated successfully', data: { activity } });
});

const deleteActivity = asyncHandler(async (req, res) => {
  await activityService.deleteActivity(req.params.id, req.user);
  sendSuccess(res, { message: 'Activity deleted successfully' });
});

module.exports = { listActivities, getActivity, createActivity, updateActivity, deleteActivity };
