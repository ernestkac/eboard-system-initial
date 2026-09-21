import express from 'express';
import { auditController } from '../controllers/auditController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Administrator-only audit inspection
router.get('/', authenticate, requireAdmin, auditController.getAuditLogs);

export default router;
