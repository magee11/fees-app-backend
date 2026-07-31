const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const swaggerUi = require('swagger-ui-express');
const path = require('path');

const env = require('./config/env');
const logger = require('./config/logger');
const swaggerSpec = require('./config/swagger');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/error.middleware');
const { apiLimiter } = require('./middleware/rateLimiter.middleware');

const app = express();

// Netlify gives every deploy preview / branch deploy its own subdomain
// (e.g. deploy-preview-12--feesapp.netlify.app), so an exact-match allowlist alone
// breaks those. Allow any *.netlify.app origin automatically, on top of the
// explicit allowlist (which covers custom domains and local dev) from env.corsOrigin.
const ALWAYS_ALLOWED_ORIGIN_SUFFIXES = ['.netlify.app'];

function isOriginAllowed(origin) {
  if (!origin) return true; // non-browser clients (curl, server-to-server, Postman) send no Origin header
  if (env.corsOrigin.includes(origin)) return true;
  try {
    const { hostname } = new URL(origin);
    return ALWAYS_ALLOWED_ORIGIN_SUFFIXES.some(
      (suffix) => hostname === suffix.slice(1) || hostname.endsWith(suffix)
    );
  } catch {
    return false;
  }
}

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) return callback(null, true);
      logger.warn(`Blocked CORS request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    // Content-Disposition carries the real filename for receipt/report downloads —
    // browsers don't expose it to JS cross-origin unless explicitly listed here.
    exposedHeaders: ['Content-Disposition'],
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(mongoSanitize());
app.use(xss());
app.use(compression());
app.use(morgan(env.isProduction ? 'combined' : 'dev', { stream: logger.stream }));

app.use(`${env.apiPrefix}`, apiLimiter);
app.use('/uploads', express.static(path.join(process.cwd(), env.upload.dir)));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(env.apiPrefix, routes);

app.get('/', (req, res) => {
  res.json({ success: true, message: 'FeeFlow API', docs: '/api-docs' });
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;
