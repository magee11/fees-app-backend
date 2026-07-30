const swaggerJSDoc = require('swagger-jsdoc');
const env = require('./env');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'FeeFlow API',
      version: '1.0.0',
      description:
        'REST API for FeeFlow — an Extra Curricular Activity Fee Management SaaS. ' +
        'Covers students, activities, payments, the monthly tracker, dashboard analytics, ' +
        'reports, and settings.',
    },
    servers: [{ url: `http://localhost:${env.port}${env.apiPrefix}`, description: 'Local server' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        ApiSuccess: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: { type: 'object' },
          },
        },
        ApiError: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            errors: { type: 'array', items: { type: 'object' } },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.js', './src/docs/*.js'],
};

module.exports = swaggerJSDoc(options);
