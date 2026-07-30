const path = require('path');
const winston = require('winston');
require('winston-daily-rotate-file');
const env = require('./env');

const logDir = path.join(process.cwd(), 'logs');

const fileRotateTransport = new winston.transports.DailyRotateFile({
  filename: path.join(logDir, '%DATE%-combined.log'),
  datePattern: 'YYYY-MM-DD',
  maxFiles: '14d',
  level: 'info',
});

const errorRotateTransport = new winston.transports.DailyRotateFile({
  filename: path.join(logDir, '%DATE%-error.log'),
  datePattern: 'YYYY-MM-DD',
  maxFiles: '30d',
  level: 'error',
});

const logger = winston.createLogger({
  level: env.isProduction ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'feeflow-backend' },
  transports: [fileRotateTransport, errorRotateTransport],
});

if (!env.isProduction) {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, stack }) => {
          return `${timestamp} [${level}]: ${stack || message}`;
        })
      ),
    })
  );
}

logger.stream = {
  write: (message) => logger.info(message.trim()),
};

module.exports = logger;
