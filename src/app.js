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

app.use(helmet());
app.use(
  cors({
    origin: env.corsOrigin,
    credentials: true,
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
