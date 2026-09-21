import { votingService } from '../services/votingService.js';
import { voteModel } from '../models/voteModel.js';
import { successResponse } from '../utils/responseHandler.js';

export const voteController = {
  /**
   * POST /api/votes
   * Cast or change a vote on an active motion - FR-3.2 & FR-3.3
   */
  async castVote(req, res, next) {
    try {
      const { motionId, voteChoice } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;

      const result = await votingService.castVote(
        req.user,
        motionId,
        voteChoice,
        ipAddress
      );

      return successResponse(res, 200, result.message, result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/votes/motion/:motionId/tally
   * Live vote tally - FR-3.4
   */
  async getLiveTally(req, res, next) {
    try {
      const { motionId } = req.params;
      const tally = await votingService.getLiveTally(motionId);
      return successResponse(res, 200, 'Live vote tally retrieved', tally);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/votes/motion/:motionId/my-vote
   * Inspect currently cast vote of requesting user
   */
  async getMyVote(req, res, next) {
    try {
      const { motionId } = req.params;
      const myVote = await votingService.getMyVote(motionId, req.user.id);
      return successResponse(res, 200, 'User vote retrieved', myVote);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/votes/motion/:motionId
   * Permanent read-only record of individual votes (FR-3.7)
   */
  async getVotesByMotion(req, res, next) {
    try {
      const { motionId } = req.params;
      const votes = await voteModel.getVotesByMotion(motionId);
      return successResponse(res, 200, 'Individual votes retrieved', votes);
    } catch (error) {
      next(error);
    }
  }
};
