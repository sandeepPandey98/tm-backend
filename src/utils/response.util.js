
const sendSuccess = (res, data = null, message = 'Success', statusCode = 200) => {
  const response = {
    success: true,
    message,
    timestamp: new Date().toISOString()
  };

  if (data !== null) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};


const sendError = (res, message = 'Internal Server Error', statusCode = 500, errors = null, code = null) => {
  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString()
  };

  if (code) {
    response.code = code;
  }

  if (errors) {
    response.errors = errors;
  }

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development' && errors && errors.stack) {
    response.stack = errors.stack;
  }

  return res.status(statusCode).json(response);
};


const sendPaginatedResponse = (res, data, pagination, message = 'Data retrieved successfully', statusCode = 200) => {
  const response = {
    success: true,
    message,
    data,
    pagination: {
      current: pagination.current,
      pages: pagination.pages,
      total: pagination.total,
      limit: pagination.limit,
      hasNext: pagination.current < pagination.pages,
      hasPrev: pagination.current > 1
    },
    timestamp: new Date().toISOString()
  };

  return res.status(statusCode).json(response);
};


const sendValidationError = (res, validationErrors, message = 'Validation failed') => {
  return sendError(res, message, 400, validationErrors, 'VALIDATION_ERROR');
};


const sendAuthError = (res, message = 'Authentication failed', code = 'AUTH_ERROR') => {
  return sendError(res, message, 401, null, code);
};


const sendAuthorizationError = (res, message = 'Access denied') => {
  return sendError(res, message, 403, null, 'ACCESS_DENIED');
};


const sendNotFoundError = (res, message = 'Resource not found', resource = null) => {
  const code = resource ? `${resource.toUpperCase()}_NOT_FOUND` : 'NOT_FOUND';
  return sendError(res, message, 404, null, code);
};


const sendConflictError = (res, message = 'Resource already exists', field = null) => {
  const code = field ? `${field.toUpperCase()}_CONFLICT` : 'CONFLICT';
  return sendError(res, message, 409, null, code);
};


const sendRateLimitError = (res, message = 'Too many requests', retryAfter = null) => {
  if (retryAfter) {
    res.set('Retry-After', retryAfter);
  }
  return sendError(res, message, 429, null, 'RATE_LIMIT_EXCEEDED');
};


const sendCreated = (res, data, message = 'Resource created successfully') => {
  return sendSuccess(res, data, message, 201);
};


const sendUpdated = (res, data, message = 'Resource updated successfully') => {
  return sendSuccess(res, data, message, 200);
};


const sendDeleted = (res, message = 'Resource deleted successfully') => {
  return sendSuccess(res, null, message, 200);
};


const sendNoContent = (res) => {
  return res.status(204).send();
};

module.exports = {
  sendSuccess,
  sendError,
  sendPaginatedResponse,
  sendValidationError,
  sendAuthError,
  sendAuthorizationError,
  sendNotFoundError,
  sendConflictError,
  sendRateLimitError,
  sendCreated,
  sendUpdated,
  sendDeleted,
  sendNoContent
};
