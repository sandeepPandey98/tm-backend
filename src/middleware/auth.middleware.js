const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const userService = require('../modules/auth/user.service');
const protect = async (req, res, next) => {
  try {
    // 1) Getting token and check if it exists
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'You are not logged in! Please log in to get access.',
        code: 'NO_TOKEN'
      });
    }

    // 2) Verification token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3) Check if user still exists
    const currentUser = await userService.findById(decoded.id);
    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this token does no longer exist.',
        code: 'USER_NOT_FOUND'
      });
    }

    // 4) Check if user is active
    if (!currentUser.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Your account has been deactivated. Please contact support.',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    // 5) Check if user changed password after the token was issued
    if (userService.passwordChangedAfterJWT(currentUser, decoded.iat)) {
      return res.status(401).json({
        success: false,
        message: 'User recently changed password! Please log in again.',
        code: 'PASSWORD_CHANGED'
      });
    }

    // Grant access to protected route
    req.user = currentUser;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Please log in again!',
        code: 'INVALID_TOKEN'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Your token has expired! Please log in again.',
        code: 'TOKEN_EXPIRED'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Something went wrong during authentication',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const restrictTo = (...roles) => {
  return (req, res, next) => {
    // For now, we don't have roles, but this is prepared for future enhancement
    if (!roles.includes(req.user.role || 'user')) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }
    next();
  };
};

const optionalAuth = async (req, res, next) => {
  try {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(); // Continue without authentication
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser || !currentUser.isActive) {
      return next(); // Continue without authentication
    }

    // Check if user changed password after the token was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
      return next(); // Continue without authentication
    }

    // Add user to request if authentication is successful
    req.user = currentUser;
    next();
  } catch (error) {
    // If there's any error with optional auth, just continue without authentication
    next();
  }
};

const checkResourceOwnership = (resourceUserField = 'user') => {
  return async (req, res, next) => {
    try {
      // This middleware assumes that the resource is already loaded in req.resource
      // or the user ID is available in req.params or req.body
      
      let resourceUserId;
      
      if (req.resource && req.resource[resourceUserField]) {
        resourceUserId = req.resource[resourceUserField].toString();
      } else if (req.params[resourceUserField]) {
        resourceUserId = req.params[resourceUserField];
      } else if (req.body[resourceUserField]) {
        resourceUserId = req.body[resourceUserField];
      }

      if (!resourceUserId) {
        return res.status(400).json({
          success: false,
          message: 'Resource ownership cannot be determined',
          code: 'OWNERSHIP_CHECK_FAILED'
        });
      }

      if (resourceUserId !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only access your own resources',
          code: 'ACCESS_DENIED'
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error checking resource ownership',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };
};

module.exports = {
  protect,
  restrictTo,
  optionalAuth,
  checkResourceOwnership
};
