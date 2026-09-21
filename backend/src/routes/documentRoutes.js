import express from 'express';
import { documentController } from '../controllers/documentController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { requireOfficerOrAdmin } from '../middleware/roleMiddleware.js';
import {
  validateRequired,
  validateIdParam,
  validateEnum
} from '../middleware/validateMiddleware.js';

const router = express.Router();

// Search and browse document library (FR-4.4 & FR-4.6)
router.get('/', authenticate, documentController.listDocuments);
router.get('/:id', authenticate, validateIdParam('id'), documentController.getDocumentById);

// Create, update, remove document entry (FR-4.2, FR-4.5, FR-4.6)
router.post(
  '/',
  authenticate,
  requireOfficerOrAdmin,
  validateRequired(['title', 'linkOrReference']),
  validateEnum('category', ['bylaws', 'policies', 'financial_reports', 'minutes', 'general'], false),
  documentController.createDocument
);

router.put(
  '/:id',
  authenticate,
  requireOfficerOrAdmin,
  validateIdParam('id'),
  validateEnum('category', ['bylaws', 'policies', 'financial_reports', 'minutes', 'general'], false),
  documentController.updateDocument
);

router.delete(
  '/:id',
  authenticate,
  requireOfficerOrAdmin,
  validateIdParam('id'),
  documentController.deleteDocument
);

export default router;
