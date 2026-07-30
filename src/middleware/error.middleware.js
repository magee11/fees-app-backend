const ApiError = require('../utils/ApiError');
const { sendError } = require('../utils/apiResponse');
const logger = require('../config/logger');
const env = require('../config/env');

function notFound(req, res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

function convertToApiError(err) {
  if (err instanceof ApiError) return err;

  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    return ApiError.badRequest('Validation failed', errors);
  }

  if (err.name === 'CastError') {
    return ApiError.badRequest(`Invalid value for field '${err.path}': ${err.value}`);
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return ApiError.conflict(`Duplicate value for '${field}'`, [
      { field, message: `${field} already exists` },
    ]);
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return ApiError.unauthorized('Invalid or expired token');
  }

  return new ApiError(err.statusCode || 500, err.message || 'Internal server error');
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const apiError = convertToApiError(err);

  if (apiError.statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl} - ${err.stack || err.message}`);
  } else {
    logger.warn(`${req.method} ${req.originalUrl} - ${apiError.message}`);
  }

  sendError(res, {
    statusCode: apiError.statusCode,
    message: apiError.message,
    errors: apiError.errors,
    ...(env.isProduction ? {} : { stack: err.stack }),
  });
}

module.exports = { notFound, errorHandler };
