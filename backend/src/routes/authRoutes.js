import express from 'express';
import { authController } from '../controllers/authController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/roleMiddleware.js';
import { validateRequired, validateEmail, validateEnum } from '../middleware/validateMiddleware.js';

const router = express.Router();

// Public authentication endpoint
router.post(
  '/login',
  validateRequired(['email', 'password']),
  validateEmail('email'),
  authController.login
);

// Authenticated current user profile
router.get(
  '/me',
  authenticate,
  authController.getCurrentUser
);

// Admin-only user provisioning (Public self-registration is not allowed per FRS)
router.post(
  '/users',
  authenticate,
  requireAdmin,
  validateRequired(['email', 'password']),
  validateEmail('email'),
  validateEnum('role', ['ADMINISTRATOR', 'OFFICER', 'MEMBER'], false),
  authController.createUser
);

// Admin-only user listing
router.get(
  '/users',
  authenticate,
  requireAdmin,
  authController.listUsers
);

export default router;
