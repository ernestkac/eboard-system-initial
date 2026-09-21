import { meetingService } from '../services/meetingService.js';
import { successResponse } from '../utils/responseHandler.js';

export const meetingController = {
  /**
   * POST /api/meetings
   * Officer or Admin - FR-2.1
   */
  async createMeeting(req, res, next) {
    try {
      const { title, meetingDate, location } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const meeting = await meetingService.createMeeting(
        req.user.id,
        { title, meetingDate, location },
        ipAddress
      );
      return successResponse(res, 201, 'Meeting created successfully', meeting);
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/meetings/:id
   * Officer or Admin
   */
  async updateMeeting(req, res, next) {
    try {
      const { id } = req.params;
      const { title, meetingDate, location, status } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const meeting = await meetingService.updateMeeting(
        req.user,
        id,
        { title, meetingDate, location, status },
        ipAddress
      );
      return successResponse(res, 200, 'Meeting updated successfully', meeting);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/meetings/:id/cancel
   * Officer or Admin - FR-2.6
   */
  async cancelMeeting(req, res, next) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const meeting = await meetingService.cancelMeeting(req.user, id, reason, ipAddress);
      return successResponse(res, 200, 'Meeting cancelled successfully', meeting);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/meetings/:id/minutes
   * Officer or Admin - FR-2.3
   */
  async recordMinutes(req, res, next) {
    try {
      const { id } = req.params;
      const { minutesText, minutesStatus } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const meeting = await meetingService.recordMinutes(
        req.user,
        id,
        { minutesText, minutesStatus },
        ipAddress
      );
      return successResponse(res, 200, 'Meeting minutes recorded successfully', meeting);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/meetings
   * Any authenticated user - FR-2.4 (Chronological order)
   */
  async listMeetings(req, res, next) {
    try {
      const { status, fromDate, toDate, limit = 50, offset = 0 } = req.query;
      const { meetings, total } = await meetingService.listMeetings({
        status,
        fromDate,
        toDate,
        limit,
        offset
      });
      return successResponse(res, 200, 'Meetings retrieved chronologically', meetings, { total, limit: Number(limit), offset: Number(offset) });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/meetings/:id
   * Any authenticated user
   */
  async getMeetingDetails(req, res, next) {
    try {
      const { id } = req.params;
      const meeting = await meetingService.getMeetingDetails(id);
      return successResponse(res, 200, 'Meeting details retrieved', meeting);
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/meetings/:id
   * Admin only
   */
  async deleteMeeting(req, res, next) {
    try {
      const { id } = req.params;
      const ipAddress = req.ip || req.connection.remoteAddress;
      await meetingService.deleteMeeting(req.user.id, id, ipAddress);
      return successResponse(res, 200, 'Meeting deleted successfully', { id });
    } catch (error) {
      next(error);
    }
  }
};
