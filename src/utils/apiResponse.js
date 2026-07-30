function sendSuccess(res, { statusCode = 200, message = 'Success', data = {}, meta } = {}) {
  const body = { success: true, message, data };
  if (meta) body.meta = meta;
  return res.status(statusCode).json(body);
}

function sendError(res, { statusCode = 500, message = 'Something went wrong', errors = [] } = {}) {
  return res.status(statusCode).json({ success: false, message, errors });
}

module.exports = { sendSuccess, sendError };
