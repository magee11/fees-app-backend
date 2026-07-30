const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const settingsService = require('../services/settings.service');

const getSettings = asyncHandler(async (req, res) => {
  const settings = await settingsService.getSettings();
  sendSuccess(res, { message: 'Settings fetched successfully', data: { settings } });
});

const updateSettings = asyncHandler(async (req, res) => {
  const settings = await settingsService.updateSettings(req.body, req.user);
  sendSuccess(res, { message: 'Settings updated successfully', data: { settings } });
});

const uploadLogo = asyncHandler(async (req, res) => {
  if (!req.file) {
    return sendSuccess(res, { statusCode: 400, message: 'No file uploaded' });
  }
  const logoPath = `/uploads/logos/${req.file.filename}`;
  const settings = await settingsService.updateSettings({ logo: logoPath }, req.user);
  sendSuccess(res, { message: 'Logo uploaded successfully', data: { settings } });
});

module.exports = { getSettings, updateSettings, uploadLogo };
