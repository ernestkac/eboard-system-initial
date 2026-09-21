import { motionService } from '../services/motionService.js';
import { successResponse } from '../utils/responseHandler.js';

export const motionController = {
  /**
   * POST /api/motions
   * Officer or Admin - FR-3.1
   */
  async createMotion(req, res, next) {
    try {
      const {
        title,
        description,
        meetingId,
        agendaItemId,
        thresholdType,
        thresholdPercentage,
        eligiblePoolType,
        targetCommittee,
        customVoterIds
      } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;

      const motion = await motionService.createMotion(
        req.user,
        {
          title,
          description,
          meetingId,
          agendaItemId,
          thresholdType,
          thresholdPercentage,
          eligiblePoolType,
          targetCommittee,
          customVoterIds
        },
        ipAddress
      );

      return successResponse(res, 201, 'Motion created successfully', motion);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/motions/:id/close
   * Officer or Admin - FR-3.5 & FR-3.6
   */
  async closeMotion(req, res, next) {
    try {
      const { id } = req.params;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const motion = await motionService.closeMotion(req.user, id, ipAddress);
      return successResponse(res, 200, `Motion closed successfully with result: ${motion.result}`, motion);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/motions/:id/withdraw
   * Officer or Admin - FR-3.8
   */
  async withdrawMotion(req, res, next) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const motion = await motionService.withdrawMotion(req.user, id, reason, ipAddress);
      return successResponse(res, 200, 'Motion withdrawn successfully', motion);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/motions/:id
   * Any member - FR-3.4 (live tally) & FR-3.7 (permanent record)
   */
  async getMotionDetails(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user ? req.user.id : null;
      const motion = await motionService.getMotionDetails(id, userId);
      return successResponse(res, 200, 'Motion details retrieved', motion);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/motions
   * Any member
   */
  async listMotions(req, res, next) {
    try {
      const { meetingId, agendaItemId, status, result, limit = 50, offset = 0 } = req.query;
      const { motions, total } = await motionService.listMotions({
        meetingId,
        agendaItemId,
        status,
        result,
        limit,
        offset
      });
      return successResponse(res, 200, 'Motions retrieved', motions, { total, limit: Number(limit), offset: Number(offset) });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/motions/:id
   * Admin only
   */
  async deleteMotion(req, res, next) {
    try {
      const { id } = req.params;
      const ipAddress = req.ip || req.connection.remoteAddress;
      await motionService.deleteMotion(req.user, id, ipAddress);
      return successResponse(res, 200, 'Motion deleted successfully', { id });
    } catch (error) {
      next(error);
    }
  }
};
