const bcrypt = require('bcryptjs');
const User = require('../../models/User.model');

/**
 * User Service
 * Handles all user-related business logic and database operations
 * This separates business logic from the data model
 */
class UserService {
  /**
   * Find user by email with password field included
   * @param {string} email - User's email
   * @returns {Promise<Object|null>} - User object with password or null
   */
  async findByEmailWithPassword(email) {
    return await User.findOne({ email, isActive: true }).select('+password');
  }

  /**
   * Find user by username
   * @param {string} username - User's username
   * @returns {Promise<Object|null>} - User object or null
   */
  async findByUsername(username) {
    return await User.findOne({ username, isActive: true });
  }

  /**
   * Find user by ID
   * @param {string} userId - User's ID
   * @returns {Promise<Object|null>} - User object or null
   */
  async findById(userId) {
    return await User.findById(userId);
  }

  /**
   * Check if email already exists
   * @param {string} email - Email to check
   * @param {string} excludeUserId - User ID to exclude from check (for updates)
   * @returns {Promise<boolean>} - True if email exists, false otherwise
   */
  async emailExists(email, excludeUserId = null) {
    const query = { email, isActive: true };
    if (excludeUserId) {
      query._id = { $ne: excludeUserId };
    }
    
    const user = await User.findOne(query);
    return !!user;
  }

  /**
   * Check if username already exists
   * @param {string} username - Username to check
   * @param {string} excludeUserId - User ID to exclude from check (for updates)
   * @returns {Promise<boolean>} - True if username exists, false otherwise
   */
  async usernameExists(username, excludeUserId = null) {
    const query = { username, isActive: true };
    if (excludeUserId) {
      query._id = { $ne: excludeUserId };
    }
    
    const user = await User.findOne(query);
    return !!user;
  }

  /**
   * Verify password against user's stored password
   * @param {string} candidatePassword - Password to verify
   * @param {string} hashedPassword - User's hashed password
   * @returns {Promise<boolean>} - True if password matches, false otherwise
   */
  async verifyPassword(candidatePassword, hashedPassword) {
    return await bcrypt.compare(candidatePassword, hashedPassword);
  }

  /**
   * Hash a password
   * @param {string} password - Plain text password
   * @returns {Promise<string>} - Hashed password
   */
  async hashPassword(password) {
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Check if user changed password after JWT was issued
   * @param {Object} user - User object
   * @param {number} jwtTimestamp - JWT issued at timestamp
   * @returns {boolean} - True if password was changed after JWT was issued
   */
  passwordChangedAfterJWT(user, jwtTimestamp) {
    if (user.passwordChangedAt) {
      const changedTimestamp = parseInt(user.passwordChangedAt.getTime() / 1000, 10);
      return jwtTimestamp < changedTimestamp;
    }
    
    // False means NOT changed
    return false;
  }

  /**
   * Create a new user
   * @param {Object} userData - User data
   * @returns {Promise<Object>} - Created user
   */
  async createUser(userData) {
    const user = new User(userData);
    return await user.save();
  }

  /**
   * Update user by ID
   * @param {string} userId - User ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} - Updated user
   */
  async updateUser(userId, updateData) {
    return await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    );
  }

  /**
   * Update user password
   * @param {string} userId - User ID
   * @param {string} newPassword - New password (plain text)
   * @returns {Promise<Object>} - Updated user
   */
  async updatePassword(userId, newPassword) {
    const hashedPassword = await this.hashPassword(newPassword);
    
    return await User.findByIdAndUpdate(
      userId,
      { 
        password: hashedPassword,
        passwordChangedAt: new Date()
      },
      { new: true, runValidators: true }
    );
  }

  /**
   * Deactivate user account
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Updated user
   */
  async deactivateUser(userId) {
    return await User.findByIdAndUpdate(
      userId,
      { isActive: false },
      { new: true }
    );
  }

  /**
   * Update user's last login time
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Updated user
   */
  async updateLastLogin(userId) {
    return await User.findByIdAndUpdate(
      userId,
      { lastLogin: new Date() },
      { new: true }
    );
  }

  /**
   * Get user statistics
   * @returns {Promise<Object>} - User statistics
   */
  async getUserStats() {
    const stats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          activeUsers: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
          },
          inactiveUsers: {
            $sum: { $cond: [{ $eq: ['$isActive', false] }, 1, 0] }
          }
        }
      }
    ]);

    return stats[0] || { totalUsers: 0, activeUsers: 0, inactiveUsers: 0 };
  }

  /**
   * Search users by username or email
   * @param {string} searchTerm - Search term
   * @param {Object} options - Search options
   * @returns {Promise<Array>} - Array of users
   */
  async searchUsers(searchTerm, options = {}) {
    const { page = 1, limit = 10, activeOnly = true } = options;
    const skip = (page - 1) * limit;

    const query = {
      $or: [
        { username: new RegExp(searchTerm, 'i') },
        { email: new RegExp(searchTerm, 'i') }
      ]
    };

    if (activeOnly) {
      query.isActive = true;
    }

    const users = await User.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    return {
      users,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        limit
      }
    };
  }
}

module.exports = new UserService();