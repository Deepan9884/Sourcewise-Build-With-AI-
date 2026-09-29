const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error('http.error', {
    requestId: req?.id,
    method: req?.method,
    path: req?.originalUrl,
    status: err.statusCode || 500,
    err,
  });

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
