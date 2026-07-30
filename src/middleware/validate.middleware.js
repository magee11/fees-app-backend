const { ZodError } = require('zod');
const ApiError = require('../utils/ApiError');

/**
 * Validates req.{body,query,params} against a Zod schema shaped as
 * z.object({ body, query, params }) and assigns the parsed (coerced) values back.
 */
const validate = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    if (parsed.body) req.body = parsed.body;
    if (parsed.query) req.query = parsed.query;
    if (parsed.params) req.params = parsed.params;
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return next(ApiError.badRequest('Validation failed', errors));
    }
    next(error);
  }
};

module.exports = validate;
