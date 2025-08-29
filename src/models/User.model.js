const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * User Model Schema
 * Represents users in the task management system
 */
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [30, 'Username must not exceed 30 characters'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'],
    index: true
  },
  
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    minlength: [5, 'Email must be at least 5 characters long'],
    maxlength: [255, 'Email must not exceed 255 characters'],
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email address'],
    index: true
  },
  
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long'],
    maxlength: [128, 'Password must not exceed 128 characters'],
    select: false // Don't include password in query results by default
  },
  
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  lastLogin: {
    type: Date,
    default: null
  },
  
  passwordChangedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt fields automatically
  versionKey: false,
  toJSON: {
    transform: function(doc, ret) {
      // Remove sensitive fields from JSON output
      delete ret.password;
      delete ret.__v;
      return ret;
    }
  },
  toObject: {
    transform: function(doc, ret) {
      // Remove sensitive fields from object output
      delete ret.password;
      delete ret.__v;
      return ret;
    }
  }
});

/**
 * Indexes for better query performance
 */
userSchema.index({ email: 1, isActive: 1 });
userSchema.index({ username: 1, isActive: 1 });
userSchema.index({ createdAt: -1 });

/**
 * Pre-save middleware to hash password
 */
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    // Hash password with cost of 12
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to update passwordChangedAt field

userSchema.pre('save', function(next) {
  if (!this.isModified('password') || this.isNew) return next();
  
  this.passwordChangedAt = Date.now() - 1000; // Subtract 1 second to ensure JWT is created after password change
  next();
});


/**
 * Note: Business logic methods have been moved to UserService
 * This model now focuses purely on data structure, validation, and essential middleware
 * 
 * Methods moved to UserService:
 * - correctPassword() -> userService.verifyPassword()
 * - changedPasswordAfter() -> userService.passwordChangedAfterJWT()
 * - findByEmailWithPassword() -> userService.findByEmailWithPassword()
 * - findByUsername() -> userService.findByUsername()
 * - emailExists() -> userService.emailExists()
 * - usernameExists() -> userService.usernameExists()
 */

const User = mongoose.model('User', userSchema);

module.exports = User;
