const express = require('express');
const authController = require('./auth.controller');
const { protect } = require('../../middleware/auth.middleware');
const { validate } = require('../../middleware/validate.middleware');
const {
  registerSchema,
  loginSchema,
  changePasswordSchema
} = require('../../schemas/auth.schema');

const router = express.Router();



// Public routes (no authentication required)
router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh-token', authController.refreshToken);

// Username and email availability check routes
router.get('/check/username/:username', authController.checkUsername);
router.get('/check/email/:email', authController.checkEmail);

// Protected routes (authentication required)
router.use(protect); // Apply authentication middleware to all routes below

router.get('/profile', authController.getProfile);
router.patch('/profile', authController.updateProfile);
router.patch('/change-password', validate(changePasswordSchema), authController.changePassword);
router.delete('/deactivate', authController.deactivateAccount);
router.post('/logout', authController.logout);

module.exports = router;
