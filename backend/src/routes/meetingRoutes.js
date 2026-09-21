import express from 'express';
import { meetingController } from '../controllers/meetingController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { requireAdmin, requireOfficerOrAdmin } from '../middleware/roleMiddleware.js';
import {
  validateRequired,
  validateDate,
  validateIdParam,
  validateEnum
} from '../middleware/validateMiddleware.js';

const router = express.Router();

// Any authenticated user can view meetings chronologically (FR-2.4)
router.get('/', authenticate, meetingController.listMeetings);
router.get('/:id', authenticate, validateIdParam('id'), meetingController.getMeetingDetails);

// Officers and Administrators can create and manage meetings (FR-2.1)
router.post(
  '/',
  authenticate,
  requireOfficerOrAdmin,
  validateRequired(['title', 'meetingDate', 'location']),
  validateDate('meetingDate'),
  meetingController.createMeeting
);

router.put(
  '/:id',
  authenticate,
  requireOfficerOrAdmin,
  validateIdParam('id'),
  validateEnum('status', ['scheduled', 'completed', 'cancelled'], false),
  meetingController.updateMeeting
);

// Mark meeting as cancelled without deleting (FR-2.6)
router.post(
  '/:id/cancel',
  authenticate,
  requireOfficerOrAdmin,
  validateIdParam('id'),
  meetingController.cancelMeeting
);

// Record and publish minutes (FR-2.3)
router.post(
  '/:id/minutes',
  authenticate,
  requireOfficerOrAdmin,
  validateIdParam('id'),
  validateRequired(['minutesText']),
  validateEnum('minutesStatus', ['draft', 'published'], false),
  meetingController.recordMinutes
);

// Administrator-only hard deletion
router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  validateIdParam('id'),
  meetingController.deleteMeeting
);

export default router;
