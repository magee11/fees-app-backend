const mongoose = require('mongoose');
const env = require('./env');
const logger = require('./logger');

mongoose.set('strictQuery', true);

function maskMongoUri(uri) {
  return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
}

async function connectDB() {
  const target = maskMongoUri(env.mongoUri);
  logger.info(`Connecting to MongoDB: ${target}`);

  mongoose.connection.on('connecting', () => logger.info('MongoDB connecting...'));
  mongoose.connection.on('connected', () =>
    logger.info(`MongoDB connected (host: ${mongoose.connection.host}, db: ${mongoose.connection.name})`)
  );
  mongoose.connection.on('error', (err) => logger.error(`MongoDB connection error: ${err.message}`));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
  mongoose.connection.on('reconnected', () => logger.info('MongoDB reconnected'));

  try {
    await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 10000 });
    return mongoose.connection;
  } catch (error) {
    logger.error(`Failed to connect to MongoDB (${target}): ${error.message}`);
    if (error.name === 'MongooseServerSelectionError' || error.name === 'MongoServerSelectionError') {
      logger.error(
        'Server selection failed — check that the URI/credentials are correct and that this machine\'s IP is allow-listed in Atlas (Network Access).'
      );
    }
    process.exit(1);
  }
}

async function disconnectDB() {
  await mongoose.connection.close();
}

module.exports = { connectDB, disconnectDB, mongoose };
