require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const databaseConfig = require('./config/database');
const { globalErrorHandler, notFoundHandler } = require('./middleware/error.middleware');
const { 
  rateLimiters, 
  helmetConfig, 
  getSecurityInfo 
} = require('./middleware/security.config');
const { 
  corsOptions, 
  requestLogger, 
  securityHeaders 
} = require('./middleware/security.middleware');
const webSocketService = require('./services/websocket.service');

// Import routers
const authRouter = require('./modules/auth/auth.router');
const taskRouter = require('./modules/task/task.router');

/**
 * Task Management Application Server
 * Express.js server with MongoDB, JWT authentication, and task management
 */
class Server {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.port = process.env.PORT || 3000;
    
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeWebSocket();
    this.initializeErrorHandling();
  }

  /**
   * Initialize middleware
   */
  initializeMiddleware() {
    // Security middleware
    this.app.use(helmetConfig);
    this.app.use(securityHeaders);
    
    // CORS middleware
    this.app.use(cors(corsOptions));
    
    // Request logging
    if (process.env.NODE_ENV === 'development') {
      this.app.use(requestLogger);
    }
    
    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // General rate limiting (configurable based on environment)
    this.app.use('/api/', rateLimiters.general);
  }

  /**
   * Initialize routes
   */
  initializeRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        success: true,
        message: 'Server is running successfully',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0'
      });
    });

    // API routes with specific rate limiting
    this.app.use('/api/auth', rateLimiters.auth, authRouter);
    this.app.use('/api/tasks', rateLimiters.tasks, taskRouter);
    
    // Apply bulk operation rate limiting to specific endpoints
    this.app.use('/api/tasks/bulk/*', rateLimiters.bulk);

    // API info endpoint
    this.app.get('/api', (req, res) => {
      res.status(200).json({
        success: true,
        message: 'Task Management API',
        version: '1.0.0',
        endpoints: {
          auth: '/api/auth',
          tasks: '/api/tasks',
          health: '/health'
        },
        documentation: 'https://github.com/your-repo/task-management-api'
      });
    });
  }

  /**
   * Initialize WebSocket service
   */
  initializeWebSocket() {
    webSocketService.initialize(this.server);
  }

  /**
   * Initialize error handling
   */
  initializeErrorHandling() {
    // Handle 404 errors
    this.app.use(notFoundHandler);
    
    // Global error handler
    this.app.use(globalErrorHandler);
  }

  /**
   * Start the server
   */
  async start() {
    try {
      // Connect to database
      await databaseConfig.connect();
      
      // Start server
      this.server.listen(this.port,'0.0.0.0', () => {
        const securityInfo = getSecurityInfo();
        
        console.log(`Server running on port ${this.port}`);
        console.log(`API Documentation: http://localhost:${this.port}/api`);
        console.log(`Health Check: http://localhost:${this.port}/health`);
        console.log(`Environment: ${securityInfo.environment}`);
        console.log(`Security: Rate Limiting ${securityInfo.rateLimitingEnabled ? 'ON' : 'OFF'}, Helmet ${securityInfo.helmetEnabled ? 'ON' : 'OFF'}`);
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`Auth Endpoints: http://localhost:${this.port}/api/auth`);
          console.log(`Task Endpoints: http://localhost:${this.port}/api/tasks`);
          if (!securityInfo.rateLimitingEnabled) {
            console.log(`Rate limiting is DISABLED for development`);
          }
        }
      });
    } catch (error) {
      console.error('Failed to start server:', error.message);
      process.exit(1);
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    try {
      console.log('Shutting down server gracefully...');
      
      // Close database connection
      await databaseConfig.disconnect();
      
      console.log('Server shut down successfully');
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error.message);
      process.exit(1);
    }
  }
}

// Create and start server
const server = new Server();

// Start server
server.start();

// Handle graceful shutdown
process.on('SIGTERM', () => server.shutdown());
process.on('SIGINT', () => server.shutdown());

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err.message);
  console.error('Stack:', err.stack);
  server.shutdown();
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
  console.error('Stack:', err.stack);
  server.shutdown();
});

module.exports = server;
