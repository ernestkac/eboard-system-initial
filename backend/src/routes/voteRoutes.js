import express from 'express';
import { voteController } from '../controllers/voteController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import {
  validateRequired,
  validateIdParam,
  validateEnum
} from '../middleware/validateMiddleware.js';

const router = express.Router();

// Cast or update a vote on an active motion (FR-3.2 & FR-3.3)
router.post(
  '/',
  authenticate,
  validateRequired(['motionId', 'voteChoice']),
  validateEnum('voteChoice', ['FOR', 'AGAINST', 'ABSTAIN']),
  voteController.castVote
);

// Live vote tally (FR-3.4)
router.get(
  '/motion/:motionId/tally',
  authenticate,
  validateIdParam('motionId'),
  voteController.getLiveTally
);

// Requesting user's cast vote
router.get(
  '/motion/:motionId/my-vote',
  authenticate,
  validateIdParam('motionId'),
  voteController.getMyVote
);

// Individual votes audit for a motion (FR-3.7)
router.get(
  '/motion/:motionId',
  authenticate,
  validateIdParam('motionId'),
  voteController.getVotesByMotion
);

export default router;
