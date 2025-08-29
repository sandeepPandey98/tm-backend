const { ZodError } = require('zod');

//Middleware to validate request data using Zod schemas
 
const validate = (schema) => {
  return (req, res, next) => {
    try {
      // Parse and validate the request data
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params
      });

      // Update request objects with parsed data
      req.body = parsed.body || req.body;
      req.query = parsed.query || req.query;
      req.params = parsed.params || req.params;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Format Zod validation errors
        const validationErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validationErrors,
          timestamp: new Date().toISOString()
        });
      }

      // Handle other types of errors
      return res.status(500).json({
        success: false,
        message: 'Internal server error during validation',
        timestamp: new Date().toISOString()
      });
    }
  };
};

//Middleware to validate only request body using Zod schema
 
const validateBody = (schema) => {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req.body);
      req.body = parsed;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        return res.status(400).json({
          success: false,
          message: 'Request body validation failed',
          errors: validationErrors,
          timestamp: new Date().toISOString()
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Internal server error during body validation',
        timestamp: new Date().toISOString()
      });
    }
  };
};

//Middleware to validate only query parameters using Zod schema

const validateQuery = (schema) => {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req.query);
      req.query = parsed;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        return res.status(400).json({
          success: false,
          message: 'Query parameters validation failed',
          errors: validationErrors,
          timestamp: new Date().toISOString()
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Internal server error during query validation',
        timestamp: new Date().toISOString()
      });
    }
  };
};

//Middleware to validate only route parameters using Zod schema

const validateParams = (schema) => {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req.params);
      req.params = parsed;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        return res.status(400).json({
          success: false,
          message: 'Route parameters validation failed',
          errors: validationErrors,
          timestamp: new Date().toISOString()
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Internal server error during params validation',
        timestamp: new Date().toISOString()
      });
    }
  };
};

module.exports = {
  validate,
  validateBody,
  validateQuery,
  validateParams
};
