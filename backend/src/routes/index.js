import express from 'express';
import authRoutes from './authRoutes.js';
import memberRoutes from './memberRoutes.js';
import meetingRoutes from './meetingRoutes.js';
import agendaItemRoutes from './agendaItemRoutes.js';
import motionRoutes from './motionRoutes.js';
import voteRoutes from './voteRoutes.js';
import announcementRoutes from './announcementRoutes.js';
import documentRoutes from './documentRoutes.js';
import auditRoutes from './auditRoutes.js';

const router = express.Router();

// Health Check Endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    system: 'ADMARC Limited Executive Board Management System (eBoard) REST API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Mount module routes
router.use('/auth', authRoutes);
router.use('/members', memberRoutes);
router.use('/meetings', meetingRoutes);
router.use('/agenda-items', agendaItemRoutes);
router.use('/motions', motionRoutes);
router.use('/votes', voteRoutes);
router.use('/announcements', announcementRoutes);
router.use('/documents', documentRoutes);
router.use('/audit-logs', auditRoutes);

export default router;
