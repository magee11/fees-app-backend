const crypto = require('crypto');
const { User } = require('../models');
const ApiError = require('../utils/ApiError');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function buildTokens(user) {
  const payload = { sub: user._id.toString(), role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  return { accessToken, refreshToken };
}

async function register({ name, email, password, role }) {
  const existing = await User.findOne({ email });
  if (existing) {
    throw ApiError.conflict('A user with this email already exists', [
      { field: 'email', message: 'Email already registered' },
    ]);
  }
  const user = await User.create({ name, email, password, role });
  const tokens = buildTokens(user);
  user.refreshTokenHash = hashToken(tokens.refreshToken);
  await user.save();
  return { user, ...tokens };
}

async function login({ email, password }) {
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Invalid email or password');
  }
  if (!user.isActive) {
    throw ApiError.forbidden('Your account has been deactivated');
  }

  const tokens = buildTokens(user);
  user.refreshTokenHash = hashToken(tokens.refreshToken);
  user.lastLoginAt = new Date();
  await user.save();

  return { user, ...tokens };
}

async function refresh({ refreshToken }) {
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (error) {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const user = await User.findById(decoded.sub).select('+refreshTokenHash');
  if (!user || !user.isActive || user.refreshTokenHash !== hashToken(refreshToken)) {
    throw ApiError.unauthorized('Refresh token is no longer valid');
  }

  const tokens = buildTokens(user);
  user.refreshTokenHash = hashToken(tokens.refreshToken);
  await user.save();

  return { user, ...tokens };
}

async function logout(userId) {
  await User.findByIdAndUpdate(userId, { $unset: { refreshTokenHash: 1 } });
}

async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await User.findById(userId).select('+password');
  if (!user || !(await user.comparePassword(currentPassword))) {
    throw ApiError.badRequest('Current password is incorrect');
  }
  user.password = newPassword;
  await user.save();
}

module.exports = { register, login, refresh, logout, changePassword };
