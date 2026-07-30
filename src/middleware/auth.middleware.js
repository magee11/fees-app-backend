const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { verifyAccessToken } = require('../utils/jwt');
const { User } = require('../models');

const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    throw ApiError.unauthorized('Authentication token missing');
  }

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (error) {
    throw ApiError.unauthorized('Invalid or expired token');
  }

  const user = await User.findById(decoded.sub);
  if (!user || !user.isActive) {
    throw ApiError.unauthorized('User no longer exists or is inactive');
  }

  req.user = user;
  next();
});

module.exports = { protect };
