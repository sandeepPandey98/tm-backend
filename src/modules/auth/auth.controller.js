const authService = require('./auth.service');
const {
  sendSuccess,
  sendError,
  sendCreated,
  sendUpdated,
  sendConflictError,
  sendNotFoundError,
  sendAuthError
} = require('../../utils/response.util');


class AuthController {
  
  async register(req, res) {
    try {
      const userData = req.body;
      const result = await authService.register(userData);
      
      return sendCreated(res, result, 'User registered successfully');
    } catch (error) {
      if (error.message.includes('already registered') || error.message.includes('already taken')) {
        return sendConflictError(res, error.message);
      }
      
      return sendError(res, error.message || 'Registration failed', 400);
    }
  }

  
  async login(req, res) {
    try {
      const loginData = req.body;
      const result = await authService.login(loginData);
      
      return sendSuccess(res, result, 'Login successful');
    } catch (error) {
      if (error.message.includes('Invalid email or password')) {
        return sendAuthError(res, 'Invalid email or password', 'INVALID_CREDENTIALS');
      }
      
      return sendError(res, error.message || 'Login failed', 400);
    }
  }

  
  async getProfile(req, res) {
    try {
      const userId = req.user._id;
      const profile = await authService.getProfile(userId);
      
      return sendSuccess(res, profile, 'Profile retrieved successfully');
    } catch (error) {
      if (error.message === 'User not found') {
        return sendNotFoundError(res, 'User not found', 'user');
      }
      
      return sendError(res, error.message || 'Failed to get profile', 500);
    }
  }

  
  async updateProfile(req, res) {
    try {
      const userId = req.user._id;
      const updateData = req.body;
      const updatedProfile = await authService.updateProfile(userId, updateData);
      
      return sendUpdated(res, updatedProfile, 'Profile updated successfully');
    } catch (error) {
      if (error.message === 'User not found') {
        return sendNotFoundError(res, 'User not found', 'user');
      }
      
      if (error.message.includes('already taken') || error.message.includes('already registered')) {
        return sendConflictError(res, error.message);
      }
      
      return sendError(res, error.message || 'Failed to update profile', 400);
    }
  }

  
  async changePassword(req, res) {
    try {
      const userId = req.user._id;
      const passwordData = req.body;
      const result = await authService.changePassword(userId, passwordData);
      
      return sendSuccess(res, result, 'Password changed successfully');
    } catch (error) {
      if (error.message === 'User not found') {
        return sendNotFoundError(res, 'User not found', 'user');
      }
      
      if (error.message === 'Current password is incorrect') {
        return sendAuthError(res, 'Current password is incorrect', 'INVALID_CURRENT_PASSWORD');
      }
      
      return sendError(res, error.message || 'Failed to change password', 400);
    }
  }

  
  async deactivateAccount(req, res) {
    try {
      const userId = req.user._id;
      const result = await authService.deactivateAccount(userId);
      
      return sendSuccess(res, result, 'Account deactivated successfully');
    } catch (error) {
      if (error.message === 'User not found') {
        return sendNotFoundError(res, 'User not found', 'user');
      }
      
      return sendError(res, error.message || 'Failed to deactivate account', 500);
    }
  }

  
  async checkUsername(req, res) {
    try {
      const { username } = req.params;
      const exists = await authService.checkUsernameExists(username);
      
      return sendSuccess(res, { 
        username, 
        available: !exists,
        exists 
      }, 'Username availability checked');
    } catch (error) {
      return sendError(res, error.message || 'Failed to check username', 500);
    }
  }


  async checkEmail(req, res) {
    try {
      const { email } = req.params;
      const exists = await authService.checkEmailExists(email);
      
      return sendSuccess(res, { 
        email, 
        available: !exists,
        exists 
      }, 'Email availability checked');
    } catch (error) {
      return sendError(res, error.message || 'Failed to check email', 500);
    }
  }

  
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return sendAuthError(res, 'Refresh token is required', 'REFRESH_TOKEN_REQUIRED');
      }
      
      const result = await authService.refreshToken(refreshToken);
      
      return sendSuccess(res, result, 'Token refreshed successfully');
    } catch (error) {
      return sendAuthError(res, error.message || 'Failed to refresh token', 'INVALID_REFRESH_TOKEN');
    }
  }

  
  async logout(req, res) {
    // Since we're using stateless JWT tokens, logout is handled client-side
    // This endpoint mainly serves as a confirmation and for any server-side cleanup
    try {
      return sendSuccess(res, null, 'Logged out successfully');
    } catch (error) {
      return sendError(res, 'Logout failed', 500);
    }
  }
}

module.exports = new AuthController();
