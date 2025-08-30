const jwt = require('jsonwebtoken');
const User = require('../models/User.model');

class WebSocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> socket mapping
  }

  initialize(server) {
    const { Server } = require('socket.io');
    
    this.io = new Server(server, {
      cors: {
        origin: [
          "http://localhost:4200",
          "http://task-management-alb-1343488495.eu-north-1.elb.amazonaws.com"
        ],
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    this.setupMiddleware();
    this.setupEventHandlers();
    
    console.log('WebSocket service initialized');
  }

  setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        
        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user) {
          return next(new Error('Authentication error: User not found'));
        }

        socket.userId = user._id.toString();
        socket.user = user;
        next();
      } catch (error) {
        console.error('WebSocket authentication error:', error.message);
        next(new Error('Authentication error: Invalid token'));
      }
    });
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`User ${socket.user.username} connected with socket ${socket.id}`);
      
      // Store user connection
      this.connectedUsers.set(socket.userId, socket);
      
      // Join user's personal room
      socket.join(`user_${socket.userId}`);
      
      // Handle user joining their room
      socket.on('join_user_room', (userId) => {
        if (userId === socket.userId) {
          socket.join(`user_${userId}`);
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`User ${socket.user.username} disconnected`);
        this.connectedUsers.delete(socket.userId);
      });
    });
  }

  // Emit task created event to user
  emitTaskCreated(userId, task) {
    this.io.to(`user_${userId}`).emit('task_created', task);
    console.log(`Task created event sent to user ${userId}`);
  }

  // Emit task updated event to user
  emitTaskUpdated(userId, task) {
    this.io.to(`user_${userId}`).emit('task_updated', task);
    console.log(`Task updated event sent to user ${userId}`);
  }

  // Emit task deleted event to user
  emitTaskDeleted(userId, taskId) {
    this.io.to(`user_${userId}`).emit('task_deleted', taskId);
    console.log(`Task deleted event sent to user ${userId}`);
  }

  // Emit to all connected users (for admin notifications, etc.)
  emitToAll(event, data) {
    this.io.emit(event, data);
    console.log(`Event ${event} sent to all connected users`);
  }

  // Get connected users count
  getConnectedUsersCount() {
    return this.connectedUsers.size;
  }

  // Check if user is connected
  isUserConnected(userId) {
    return this.connectedUsers.has(userId);
  }


}

module.exports = new WebSocketService();
