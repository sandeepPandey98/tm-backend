const mongoose = require('mongoose');

class DatabaseConfig {
  constructor() {
    // Build MongoDB URI from separate environment variables (more secure)
    if (process.env.DB_USERNAME && process.env.DB_PASSWORD && process.env.DB_CLUSTER) {
      this.mongoUri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_CLUSTER}/${process.env.DB_NAME || 'task-management'}?retryWrites=true&w=majority&appName=Cluster0`;
    } else {
      // Fallback to full connection string or local MongoDB
      this.mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/task-management';
    }
  }

  /**
   * Connect to MongoDB database
   * @returns {Promise<void>}
   */
  async connect() {
    try {
      const options = {
        maxPoolSize: 10, // Maintain up to 10 socket connections
        serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
        socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        family: 4 // Use IPv4, skip trying IPv6
      };

      await mongoose.connect(this.mongoUri, options);
      
      // Log connection success without exposing credentials
      const dbHost = this.mongoUri.includes('mongodb+srv://') 
        ? this.mongoUri.match(/@([^/]+)/)?.[1] || 'MongoDB Atlas'
        : 'Local MongoDB';
      console.log(`Connected to MongoDB successfully (${dbHost})`);
      
      // Handle connection events
      this.setupConnectionEvents();
    } catch (error) {
      console.error('MongoDB connection error:', error.message);
      process.exit(1);
    }
  }

  /**
   * Setup MongoDB connection event listeners
   */
  setupConnectionEvents() {
    mongoose.connection.on('error', (error) => {
      console.error('MongoDB connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
    });

    // Handle application termination
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed through app termination');
      process.exit(0);
    });
  }

  //Disconnect from MongoDB
  async disconnect() {
    try {
      await mongoose.connection.close();
      console.log('MongoDB connection closed');
    } catch (error) {
      console.error('Error closing MongoDB connection:', error.message);
    }
  }
}

module.exports = new DatabaseConfig();
