const jwt = require('jsonwebtoken');
const User = require('../../models/User.model');
const userService = require('./user.service');
const { generateTokenPair, createTokenResponse, generateToken } = require('../../utils/jwt.util');
const { withOptionalTransaction, withRetryableTransaction } = require('../../utils/transaction.util');

class AuthService {
  
  async register(userData) {
    const { username, email, password } = userData;

    return await withRetryableTransaction(async (session) => {
      // Check if user already exists within transaction
      const [existingUserByEmail, existingUserByUsername] = await Promise.all([
        User.findOne({ email, isActive: true }).session(session),
        User.findOne({ username, isActive: true }).session(session)
      ]);

      if (existingUserByEmail) {
        throw new Error('Email already registered');
      }
      if (existingUserByUsername) {
        throw new Error('Username already taken');
      }

      // Create new user within transaction
      const newUser = new User({
        username,
        email,
        password,
        lastLogin: new Date() // Set initial login time
      });

      const savedUser = await newUser.save({ session });

      // Generate tokens
      const { accessToken, refreshToken } = generateTokenPair(savedUser._id);

      return createTokenResponse(savedUser, accessToken, refreshToken);
    }, 3); // Retry up to 3 times on transient errors
  }

  
  async login(loginData) {
    const { email, password } = loginData;

    // Find user with password field using service
    const user = await userService.findByEmailWithPassword(email);
    
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Check if password is correct using service
    const isPasswordCorrect = await userService.verifyPassword(password, user.password);
    
    if (!isPasswordCorrect) {
      throw new Error('Invalid email or password');
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokenPair(user._id);

    // Update last login using service
    await userService.updateLastLogin(user._id);

    return createTokenResponse(user, accessToken, refreshToken);
  }

  
  async getProfile(userId) {
    const user = await userService.findById(userId);
    
    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: user._id,
      username: user.username,
      email: user.email,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }

  
  async updateProfile(userId, updateData) {
    const { username, email } = updateData;

    return await withRetryableTransaction(async (session) => {
      // Check if new username/email already exists within transaction
      if (username || email) {
        const existingUser = await User.findOne({
          _id: { $ne: userId },
          isActive: true,
          $or: [
            ...(username ? [{ username }] : []),
            ...(email ? [{ email }] : [])
          ]
        }).session(session);

        if (existingUser) {
          if (existingUser.username === username) {
            throw new Error('Username already taken');
          }
          if (existingUser.email === email) {
            throw new Error('Email already registered');
          }
        }
      }

      // Update user within transaction
      const user = await User.findByIdAndUpdate(
        userId,
        { 
          ...updateData,
          updatedAt: new Date()
        },
        { 
          new: true, 
          runValidators: true,
          session
        }
      );

      if (!user) {
        throw new Error('User not found');
      }

      return {
        id: user._id,
        username: user.username,
        email: user.email,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };
    }, 3); // Retry up to 3 times on transient errors
  }

  
  async changePassword(userId, passwordData) {
    const { currentPassword, newPassword } = passwordData;

    return await withRetryableTransaction(async (session) => {
      // Find user with password within transaction
      const user = await User.findById(userId).select('+password').session(session);
      
      if (!user) {
        throw new Error('User not found');
      }

      // Check current password using userService
      const isCurrentPasswordCorrect = await userService.verifyPassword(currentPassword, user.password);
      
      if (!isCurrentPasswordCorrect) {
        throw new Error('Current password is incorrect');
      }

      // Check if new password is different from current password
      const isSamePassword = await userService.verifyPassword(newPassword, user.password);
      
      if (isSamePassword) {
        throw new Error('New password must be different from current password');
      }

      // Update password and passwordChangedAt within transaction
      user.password = newPassword;
      user.passwordChangedAt = new Date();
      await user.save({ session });

      return { 
        message: 'Password changed successfully',
        passwordChangedAt: user.passwordChangedAt
      };
    }, 3); // Retry up to 3 times on transient errors
  }

  
  async deactivateAccount(userId) {
    const user = await User.findByIdAndUpdate(
      userId,
      { isActive: false },
      { new: true }
    );

    if (!user) {
      throw new Error('User not found');
    }

    return { message: 'Account deactivated successfully' };
  }

  
  async checkUsernameExists(username) {
    return await userService.usernameExists(username);
  }

  
  async checkEmailExists(email) {
    return await userService.emailExists(email);
  }

  
  async refreshToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
      
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid refresh token');
      }

      const user = await User.findById(decoded.id);
      
      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }

      // Check if user changed password after refresh token was issued
      if (user.changedPasswordAfter(decoded.iat)) {
        throw new Error('User recently changed password! Please log in again.');
      }

      // Generate new access token
      const newAccessToken = generateToken(user._id);

      return {
        accessToken: newAccessToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
      };
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }
}

module.exports = new AuthService();
