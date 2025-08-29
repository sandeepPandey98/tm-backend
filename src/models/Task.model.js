const mongoose = require('mongoose');

/**
 * Task Model Schema
 * Represents tasks in the task management system
 */
const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
    minlength: [1, 'Task title cannot be empty'],
    maxlength: [100, 'Task title must not exceed 100 characters'],
    index: true
  },
  
  description: {
    type: String,
    required: [true, 'Task description is required'],
    trim: true,
    minlength: [1, 'Task description cannot be empty'],
    maxlength: [500, 'Task description must not exceed 500 characters']
  },
  
  status: {
    type: String,
    enum: {
      values: ['pending', 'in-progress', 'completed'],
      message: 'Status must be either pending, in-progress, or completed'
    },
    default: 'pending',
    index: true
  },
  
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Task must belong to a user'],
    index: true
  },
  
  priority: {
    type: String,
    enum: {
      values: ['low', 'medium', 'high', 'urgent'],
      message: 'Priority must be either low, medium, high, or urgent'
    },
    default: 'medium',
    index: true
  },
  
  dueDate: {
    type: Date,
    default: null,
    validate: {
      validator: function(value) {
        // If dueDate is provided, it should be a valid date
        // Allow past dates for flexibility (e.g., when importing old tasks)
        if (value && isNaN(value.getTime())) {
          return false;
        }
        return true;
      },
      message: 'Due date must be a valid date'
    }
  },
  
  completedAt: {
    type: Date,
    default: null
  },
  
  tags: [{
    type: String,
    trim: true,
    maxlength: [20, 'Tag must not exceed 20 characters']
  }]
}, {
  timestamps: true, // Adds createdAt and updatedAt fields automatically
  versionKey: false,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  },
  toObject: {
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});

/**
 * Indexes for better query performance
 */
taskSchema.index({ user: 1, status: 1 });
taskSchema.index({ user: 1, createdAt: -1 });
taskSchema.index({ user: 1, updatedAt: -1 });
// Individual indexes for better performance with regex searches
taskSchema.index({ user: 1, title: 1 });
taskSchema.index({ user: 1, description: 1 });
taskSchema.index({ user: 1, tags: 1 });
taskSchema.index({ user: 1, dueDate: 1 });
taskSchema.index({ user: 1, priority: 1 });

/**
 * Pre-save middleware to set completedAt when status changes to completed
 */
taskSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    if (this.status === 'completed' && !this.completedAt) {
      this.completedAt = new Date();
    } else if (this.status !== 'completed' && this.completedAt) {
      this.completedAt = null;
    }
  }
  next();
});

/**
 * Virtual for task duration (if completed)
 */
taskSchema.virtual('duration').get(function() {
  if (this.completedAt && this.createdAt) {
    return this.completedAt - this.createdAt;
  }
  return null;
});

/**
 * Virtual for checking if task is overdue
 */
taskSchema.virtual('isOverdue').get(function() {
  if (this.dueDate && this.status !== 'completed') {
    return new Date() > this.dueDate;
  }
  return false;
});

/**
 * Static method to get tasks by user with pagination and filtering
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} - Paginated tasks result
 */
taskSchema.statics.getTasksByUser = async function(userId, options = {}) {
  const {
    page = 1,
    limit = 10,
    status,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    search,
    priority,
    dueDate
  } = options;

  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  // Build query
  const query = { user: userId };
  
  if (status) {
    query.status = status;
  }
  
  if (priority) {
    query.priority = priority;
  }
  
  if (dueDate) {
    query.dueDate = { $lte: new Date(dueDate) };
  }
  
  if (search) {
    // Use regex for phrase-based search instead of word-based text search
    // This allows for partial phrase matching while being more precise
    const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [
      { title: searchRegex },
      { description: searchRegex },
      { tags: { $in: [searchRegex] } }
    ];
  }

  // Execute query with pagination
  const [tasks, total] = await Promise.all([
    this.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments(query)
  ]);

  return {
    tasks,
    pagination: {
      current: page,
      pages: Math.ceil(total / limit),
      total,
      limit
    }
  };
};

/**
 * Static method to get task statistics for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Task statistics
 */
taskSchema.statics.getTaskStats = async function(userId) {
  const stats = await this.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const result = {
    pending: 0,
    'in-progress': 0,
    completed: 0,
    total: 0
  };

  stats.forEach(stat => {
    result[stat._id] = stat.count;
    result.total += stat.count;
  });

  return result;
};

/**
 * Static method to get overdue tasks for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Array of overdue tasks
 */
taskSchema.statics.getOverdueTasks = function(userId) {
  return this.find({
    user: userId,
    status: { $ne: 'completed' },
    dueDate: { $lt: new Date() }
  }).sort({ dueDate: 1 });
};

/**
 * Instance method to mark task as completed
 */
taskSchema.methods.markAsCompleted = function() {
  this.status = 'completed';
  this.completedAt = new Date();
  return this.save();
};

/**
 * Instance method to check if user owns this task
 * @param {string} userId - User ID to check
 * @returns {boolean} - True if user owns the task
 */
taskSchema.methods.isOwnedBy = function(userId) {
  return this.user.toString() === userId.toString();
};

const Task = mongoose.model('Task', taskSchema);

module.exports = Task;
