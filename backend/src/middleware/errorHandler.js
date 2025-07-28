const winston = require('winston');

const logger = winston.createLogger({
  level: 'error',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log' })
  ]
});

const errorHandler = (err, req, res, next) => {
  // Log the error
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.body
  });

  // Prisma errors
  if (err.code && err.code.startsWith('P')) {
    switch (err.code) {
      case 'P2002':
        return res.status(409).json({
          error: 'Duplicate entry. This record already exists.',
          field: err.meta?.target
        });
      case 'P2025':
        return res.status(404).json({
          error: 'Record not found.'
        });
      case 'P2003':
        return res.status(400).json({
          error: 'Foreign key constraint failed.'
        });
      default:
        return res.status(500).json({
          error: 'Database error occurred.'
        });
    }
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expired'
    });
  }

  // Rate limit errors
  if (err.status === 429) {
    return res.status(429).json({
      error: 'Too many requests. Please try again later.'
    });
  }

  // Custom app errors
  if (err.status) {
    return res.status(err.status).json({
      error: err.message || 'An error occurred'
    });
  }

  // Default server error
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(500).json({
    error: 'Internal server error',
    ...(isDevelopment && { 
      message: err.message,
      stack: err.stack 
    })
  });
};

const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

const createError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

module.exports = {
  errorHandler,
  asyncHandler,
  createError
};