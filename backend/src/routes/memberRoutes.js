import express from 'express';
import { memberController } from '../controllers/memberController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/roleMiddleware.js';
import {
  validateRequired,
  validateEmail,
  validateDate,
  validateIdParam
} from '../middleware/validateMiddleware.js';

const router = express.Router();

// Any authenticated member can search and view directory (FR-1.4 & FR-1.5)
router.get('/', authenticate, memberController.listMembers);
router.get('/:id', authenticate, validateIdParam('id'), memberController.getMemberById);
router.get('/:id/role-history', authenticate, validateIdParam('id'), memberController.getRoleHistory);

// Administrator-only directory modifications (FR-1.1, FR-1.2, FR-1.3)
router.post(
  '/',
  authenticate,
  requireAdmin,
  validateRequired(['name', 'email', 'role', 'committee', 'joinDate']),
  validateEmail('email'),
  validateDate('joinDate'),
  memberController.createMember
);

router.put(
  '/:id',
  authenticate,
  requireAdmin,
  validateIdParam('id'),
  validateEmail('email'),
  memberController.updateMember
);

router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  validateIdParam('id'),
  memberController.deleteMember
);

export default router;
