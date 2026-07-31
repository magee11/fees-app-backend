require('dotenv').config();

function toNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  port: toNumber(process.env.PORT, 5000),
  apiPrefix: process.env.API_PREFIX || '/api/v1',

  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/feeflow',

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // Always allow local dev regardless of what CORS_ORIGIN is set to in the deployed
  // env, so the frontend can point at either a local or the deployed API during
  // development without editing backend config. Explicit origins from CORS_ORIGIN
  // (comma-separated) are merged in on top — e.g. the production Netlify URL,
  // or a future custom domain.
  corsOrigin: Array.from(
    new Set([
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      ...(process.env.CORS_ORIGIN || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    ])
  ),

  rateLimit: {
    windowMs: toNumber(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    max: toNumber(process.env.RATE_LIMIT_MAX, 300),
  },

  business: {
    partialPaymentPercentage: toNumber(process.env.PARTIAL_PAYMENT_PERCENTAGE, 50),
    receiptPrefix: process.env.RECEIPT_PREFIX || 'RCT',
    receiptStartNumber: toNumber(process.env.RECEIPT_START_NUMBER, 100000),
  },

  mail: {
    host: process.env.SMTP_HOST || '',
    port: toNumber(process.env.SMTP_PORT, 587),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || 'FeeFlow <no-reply@feeflow.app>',
  },

  upload: {
    dir: process.env.UPLOAD_DIR || 'uploads',
    maxFileSizeMb: toNumber(process.env.MAX_FILE_SIZE_MB, 5),
  },

  seedAdmin: {
    email: process.env.SEED_ADMIN_EMAIL || 'admin@feeflow.app',
    password: process.env.SEED_ADMIN_PASSWORD || 'Admin@12345',
  },
};

module.exports = env;
