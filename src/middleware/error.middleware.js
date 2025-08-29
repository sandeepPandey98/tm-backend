const { sendError } = require('../utils/response.util');

/**
 * Global error handling middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const globalErrorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error for debugging
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Mongoose bad ObjectId error
  if (err.name === 'CastError') {
    const message = 'Invalid resource ID format';
    return sendError(res, message, 400, null, 'INVALID_ID');
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    const message = `${field.charAt(0).toUpperCase() + field.slice(1)} '${value}' already exists`;
    return sendError(res, message, 409, null, 'DUPLICATE_FIELD');
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(val => ({
      field: val.path,
      message: val.message
    }));
    return sendError(res, 'Validation failed', 400, errors, 'VALIDATION_ERROR');
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return sendError(res, 'Invalid token. Please log in again!', 401, null, 'INVALID_TOKEN');
  }

  if (err.name === 'TokenExpiredError') {
    return sendError(res, 'Your token has expired! Please log in again.', 401, null, 'TOKEN_EXPIRED');
  }

  // Default error
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';
  
  return sendError(res, message, statusCode, null, 'INTERNAL_ERROR');
};

//Handle 404 errors for undefined routes
 
const notFoundHandler = (req, res, next) => {
  const message = `Route ${req.originalUrl} not found`;
  return sendError(res, message, 404, null, 'ROUTE_NOT_FOUND');
};


const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

module.exports = {
  globalErrorHandler,
  notFoundHandler,
  catchAsync
};
