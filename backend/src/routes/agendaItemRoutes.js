import express from 'express';
import { agendaItemController } from '../controllers/agendaItemController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { requireOfficerOrAdmin } from '../middleware/roleMiddleware.js';
import {
  validateRequired,
  validateIdParam,
  validateEnum
} from '../middleware/validateMiddleware.js';

const router = express.Router();

// View agenda items
router.get('/meeting/:meetingId', authenticate, validateIdParam('meetingId'), agendaItemController.getByMeetingId);
router.get('/:id', authenticate, validateIdParam('id'), agendaItemController.getById);

// Reorder agenda items (FR-2.2)
router.post(
  '/reorder',
  authenticate,
  requireOfficerOrAdmin,
  validateRequired(['meetingId', 'items']),
  agendaItemController.reorderAgendaItems
);

// Create, update, delete agenda items (FR-2.2)
router.post(
  '/',
  authenticate,
  requireOfficerOrAdmin,
  validateRequired(['meetingId', 'title']),
  agendaItemController.createAgendaItem
);

router.put(
  '/:id',
  authenticate,
  requireOfficerOrAdmin,
  validateIdParam('id'),
  validateEnum('status', ['pending', 'in_progress', 'completed', 'deferred'], false),
  agendaItemController.updateAgendaItem
);

router.delete(
  '/:id',
  authenticate,
  requireOfficerOrAdmin,
  validateIdParam('id'),
  agendaItemController.deleteAgendaItem
);

export default router;
