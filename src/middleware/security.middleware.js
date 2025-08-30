const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

/**
 * Security middleware configurations
 */

// General rate limiting middleware

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

/**
 * Strict rate limiting for authentication endpoints
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs for auth endpoints
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});

/**
 * Moderate rate limiting for task operations
 */
const taskLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 task operations per minute
  message: {
    success: false,
    message: 'Too many task operations, please slow down.',
    code: 'TASK_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Very strict rate limiting for bulk operations
 */
const bulkOperationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3, // Limit each IP to 3 bulk operations per 5 minutes
  message: {
    success: false,
    message: 'Too many bulk operations, please wait before trying again.',
    code: 'BULK_OPERATION_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Helmet configuration for security headers
 */
const helmetConfig = helmet({
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

/**
 * CORS configuration
 */
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      process.env.CORS_ORIGIN || 'http://localhost:4200',
      'http://localhost:3000',
      'http://localhost:4000',
      'http://localhost:4200',
      'http://192.168.1.36:4200',
      'http://192.168.1.36:3000',
      'http://192.168.1.34:4200',
      'http://192.168.1.34:3000',
      'http://192.168.1.37:4200',
      'http://192.168.1.37:3000',
      'http://task-management-alb-1343488495.eu-north-1.elb.amazonaws.com'
    ];
    
    const allowedPatterns = [
      /^http:\/\/192\.168\.\d+\.\d+:4200$/, // Allow any 192.168.x.x:4200
      /^http:\/\/192\.168\.\d+\.\d+:3000$/, // Allow any 192.168.x.x:3000
      /^http:\/\/10\.\d+\.\d+\.\d+:4200$/,  // Allow any 10.x.x.x:4200
      /^http:\/\/10\.\d+\.\d+\.\d+:3000$/   // Allow any 10.x.x.x:3000
    ];
    
    // Check exact matches first
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    
    // Check regex patterns
    for (const pattern of allowedPatterns) {
      if (pattern.test(origin)) {
        callback(null, true);
        return;
      }
    }
    
    // If no match found
    console.log(`CORS: Origin ${origin} not allowed`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'Pragma'
  ]
};

/**
 * Request logging middleware
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.url} - ${res.statusCode} - ${duration}ms - ${req.ip}`);
  });
  
  next();
};

/**
 * Security headers middleware
 */
const securityHeaders = (req, res, next) => {
  // Remove X-Powered-By header
  res.removeHeader('X-Powered-By');
  
  // Add custom security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  next();
};

module.exports = {
  generalLimiter,
  authLimiter,
  taskLimiter,
  bulkOperationLimiter,
  helmetConfig,
  corsOptions,
  requestLogger,
  securityHeaders
};
