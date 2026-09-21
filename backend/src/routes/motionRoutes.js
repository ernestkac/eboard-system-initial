import express from 'express';
import { motionController } from '../controllers/motionController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { requireAdmin, requireOfficerOrAdmin } from '../middleware/roleMiddleware.js';
import {
  validateRequired,
  validateIdParam,
  validateEnum
} from '../middleware/validateMiddleware.js';

const router = express.Router();

// View motions and motion details with live tally (FR-3.4 & FR-3.7)
router.get('/', authenticate, motionController.listMotions);
router.get('/:id', authenticate, validateIdParam('id'), motionController.getMotionDetails);

// Propose a motion (FR-3.1)
router.post(
  '/',
  authenticate,
  requireOfficerOrAdmin,
  validateRequired(['title', 'description']),
  validateEnum('thresholdType', ['simple_majority', 'two_thirds', 'percentage'], false),
  validateEnum('eligiblePoolType', ['all_officers', 'committee', 'custom'], false),
  motionController.createMotion
);

// Close a motion and calculate outcome (FR-3.5 & FR-3.6)
router.post(
  '/:id/close',
  authenticate,
  requireOfficerOrAdmin,
  validateIdParam('id'),
  motionController.closeMotion
);

// Withdraw a motion before it closes (FR-3.8)
router.post(
  '/:id/withdraw',
  authenticate,
  requireOfficerOrAdmin,
  validateIdParam('id'),
  motionController.withdrawMotion
);

// Administrator-only deletion
router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  validateIdParam('id'),
  motionController.deleteMotion
);

export default router;
