const jwt = require('jsonwebtoken');

const generateToken = (userId, options = {}) => {
  const payload = {
    id: userId,
    iat: Math.floor(Date.now() / 1000) // Current timestamp
  };

  const tokenOptions = {
    expiresIn: options.expiresIn || process.env.JWT_EXPIRES_IN || '7d',
    issuer: options.issuer || 'task-management-app',
    audience: options.audience || 'task-management-users'
  };

  return jwt.sign(payload, process.env.JWT_SECRET, tokenOptions);
};


const generateRefreshToken = (userId) => {
  const payload = {
    id: userId,
    type: 'refresh',
    iat: Math.floor(Date.now() / 1000)
  };

  const tokenOptions = {
    expiresIn: '30d', // Refresh tokens last longer
    issuer: 'task-management-app',
    audience: 'task-management-users'
  };

  return jwt.sign(payload, process.env.JWT_SECRET, tokenOptions);
};

/**
 * Verify JWT token
 * @param {string} token - Token to verify
 * @returns {Object} - Decoded token payload
 * @throws {Error} - If token is invalid or expired
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    } else if (error.name === 'NotBeforeError') {
      throw new Error('Token not active yet');
    }
    throw new Error('Token verification failed');
  }
};


const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    return null;
  }
};


const isTokenExpired = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) {
      return true;
    }
    
    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch (error) {
    return true;
  }
};

/**
 * Get token expiration time
 * @param {string} token - Token to check
 * @returns {Date|null} - Expiration date or null if invalid
 */
const getTokenExpiration = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) {
      return null;
    }
    
    return new Date(decoded.exp * 1000);
  } catch (error) {
    return null;
  }
};

/**
 * Generate both access and refresh tokens
 * @param {string} userId - User ID
 * @returns {Object} - Object containing both tokens
 */
const generateTokenPair = (userId) => {
  return {
    accessToken: generateToken(userId),
    refreshToken: generateRefreshToken(userId)
  };
};

/**
 * Extract token from authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} - Extracted token or null
 */
const extractTokenFromHeader = (authHeader) => {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
};

/**
 * Create token response object for API responses
 * @param {Object} user - User object
 * @param {string} accessToken - Access token
 * @param {string} refreshToken - Refresh token (optional)
 * @returns {Object} - Token response object
 */
const createTokenResponse = (user, accessToken, refreshToken = null) => {
  const response = {
    user: {
      _id: user._id,
      id: user._id, // Keep both for compatibility
      username: user.username,
      email: user.email,
      createdAt: user.createdAt
    },
    tokens: {
      accessToken,
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    }
  };

  if (refreshToken) {
    response.tokens.refreshToken = refreshToken;
  }

  return response;
};

module.exports = {
  generateToken,
  generateRefreshToken,
  verifyToken,
  decodeToken,
  isTokenExpired,
  getTokenExpiration,
  generateTokenPair,
  extractTokenFromHeader,
  createTokenResponse
};
