const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const authService = require('../services/auth.service');

const register = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.register(req.body);
  sendSuccess(res, {
    statusCode: 201,
    message: 'User registered successfully',
    data: { user, accessToken, refreshToken },
  });
});

const login = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.login(req.body);
  sendSuccess(res, { message: 'Login successful', data: { user, accessToken, refreshToken } });
});

const refresh = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.refresh(req.body);
  sendSuccess(res, { message: 'Token refreshed', data: { user, accessToken, refreshToken } });
});

const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.user._id);
  sendSuccess(res, { message: 'Logged out successfully' });
});

const getMe = asyncHandler(async (req, res) => {
  sendSuccess(res, { message: 'Current user', data: { user: req.user } });
});

const changePassword = asyncHandler(async (req, res) => {
  await authService.changePassword(req.user._id, req.body);
  sendSuccess(res, { message: 'Password changed successfully' });
});

module.exports = { register, login, refresh, logout, getMe, changePassword };
