import express from 'express';
import { announcementController } from '../controllers/announcementController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { requireOfficerOrAdmin } from '../middleware/roleMiddleware.js';
import { validateRequired, validateIdParam } from '../middleware/validateMiddleware.js';

const router = express.Router();

// View announcements in reverse chronological order (FR-4.3)
router.get('/', authenticate, announcementController.listAnnouncements);
router.get('/:id', authenticate, validateIdParam('id'), announcementController.getAnnouncementById);

// Create, edit, remove announcements (FR-4.1 & FR-4.5)
router.post(
  '/',
  authenticate,
  requireOfficerOrAdmin,
  validateRequired(['title', 'body']),
  announcementController.createAnnouncement
);

router.put(
  '/:id',
  authenticate,
  requireOfficerOrAdmin,
  validateIdParam('id'),
  announcementController.updateAnnouncement
);

router.delete(
  '/:id',
  authenticate,
  requireOfficerOrAdmin,
  validateIdParam('id'),
  announcementController.deleteAnnouncement
);

export default router;
