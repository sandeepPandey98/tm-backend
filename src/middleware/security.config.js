/**
 * Configurable Security Middleware
 * Allows enabling/disabling security features based on environment
 */

const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

/**
 * Security configuration based on environment
 */
const securityConfig = {
  development: {
    enableRateLimit: false, // Disable for easier testing
    enableHelmet: true,     // Keep helmet for security headers
    rateLimitWindow: 1 * 60 * 1000, // 1 minute for testing
    rateLimitMax: 1000      // High limit for development
  },
  
  production: {
    enableRateLimit: true,  // Essential for production
    enableHelmet: true,     // Essential for production
    rateLimitWindow: 15 * 60 * 1000, // 15 minutes
    rateLimitMax: 100       // Conservative limit
  },
  
  test: {
    enableRateLimit: false, // Disable for testing
    enableHelmet: false,    // Disable for testing
    rateLimitWindow: 1000,  // Short window
    rateLimitMax: 1000      // High limit
  }
};

/**
 * Get security configuration for current environment
 */
const getConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  return securityConfig[env] || securityConfig.development;
};

/**
 * Create rate limiter based on configuration
 */
const createRateLimiter = (options = {}) => {
  const config = getConfig();
  
  if (!config.enableRateLimit) {
    // Return a no-op middleware if rate limiting is disabled
    return (req, res, next) => next();
  }
  
  return rateLimit({
    windowMs: options.windowMs || config.rateLimitWindow,
    max: options.max || config.rateLimitMax,
    message: options.message || {
      success: false,
      message: 'Too many requests from this IP, please try again later.',
      code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    ...options
  });
};

/**
 * Create helmet configuration based on environment
 */
const createHelmetConfig = () => {
  const config = getConfig();
  
  if (!config.enableHelmet) {
    // Return a no-op middleware if helmet is disabled
    return (req, res, next) => next();
  }
  
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  });
};

/**
 * Pre-configured rate limiters for different use cases
 */
const rateLimiters = {
  // General API rate limiting
  general: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: {
      success: false,
      message: 'Too many requests from this IP, please try again later.',
      code: 'RATE_LIMIT_EXCEEDED'
    }
  }),
  
  // Strict authentication rate limiting
  auth: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Only 5 auth attempts per window
    message: {
      success: false,
      message: 'Too many authentication attempts, please try again later.',
      code: 'AUTH_RATE_LIMIT_EXCEEDED'
    },
    skipSuccessfulRequests: true // Don't count successful logins
  }),
  
  // Moderate task operations rate limiting
  tasks: createRateLimiter({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // 30 task operations per minute
    message: {
      success: false,
      message: 'Too many task operations, please slow down.',
      code: 'TASK_RATE_LIMIT_EXCEEDED'
    }
  }),
  
  // Very strict bulk operations
  bulk: createRateLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 3, // Only 3 bulk operations per 5 minutes
    message: {
      success: false,
      message: 'Too many bulk operations, please wait before trying again.',
      code: 'BULK_OPERATION_RATE_LIMIT_EXCEEDED'
    }
  })
};

/**
 * Security information for logging/monitoring
 */
const getSecurityInfo = () => {
  const config = getConfig();
  return {
    environment: process.env.NODE_ENV || 'development',
    rateLimitingEnabled: config.enableRateLimit,
    helmetEnabled: config.enableHelmet,
    rateLimitWindow: config.rateLimitWindow,
    rateLimitMax: config.rateLimitMax
  };
};

module.exports = {
  rateLimiters,
  helmetConfig: createHelmetConfig(),
  getSecurityInfo,
  createRateLimiter,
  createHelmetConfig
};
