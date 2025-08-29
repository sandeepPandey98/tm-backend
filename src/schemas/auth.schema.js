const { z } = require('zod');

/**
 * Authentication related Zod validation schemas
 */

// User registration schema
const registerSchema = z.object({
  body: z.object({
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters long')
      .max(30, 'Username must not exceed 30 characters')
      .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
    
    email: z
      .string()
      .email('Please provide a valid email address')
      .min(5, 'Email must be at least 5 characters long')
      .max(255, 'Email must not exceed 255 characters')
      .toLowerCase(),
    
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .max(128, 'Password must not exceed 128 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      )
  })
});

// User login schema
const loginSchema = z.object({
  body: z.object({
    email: z
      .string()
      .email('Please provide a valid email address')
      .min(5, 'Email must be at least 5 characters long')
      .max(255, 'Email must not exceed 255 characters')
      .toLowerCase(),
    
    password: z
      .string()
      .min(1, 'Password is required')
      .max(128, 'Password must not exceed 128 characters')
  })
});

// Change password schema
const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z
      .string()
      .min(1, 'Current password is required'),
    
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters long')
      .max(128, 'New password must not exceed 128 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      )
  })
});

// Forgot password schema
const forgotPasswordSchema = z.object({
  body: z.object({
    email: z
      .string()
      .email('Please provide a valid email address')
      .min(5, 'Email must be at least 5 characters long')
      .max(255, 'Email must not exceed 255 characters')
      .toLowerCase()
  })
});

module.exports = {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema
};
