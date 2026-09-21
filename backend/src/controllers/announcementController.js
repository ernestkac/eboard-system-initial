import { announcementService } from '../services/announcementService.js';
import { successResponse } from '../utils/responseHandler.js';

export const announcementController = {
  /**
   * POST /api/announcements
   * Officer or Admin - FR-4.1
   */
  async createAnnouncement(req, res, next) {
    try {
      const { title, body, publishedDate } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const announcement = await announcementService.createAnnouncement(
        req.user.id,
        { title, body, publishedDate },
        ipAddress
      );
      return successResponse(res, 201, 'Announcement posted successfully', announcement);
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/announcements/:id
   * Officer or Admin - FR-4.5
   */
  async updateAnnouncement(req, res, next) {
    try {
      const { id } = req.params;
      const { title, body, publishedDate } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const announcement = await announcementService.updateAnnouncement(
        req.user.id,
        id,
        { title, body, publishedDate },
        ipAddress
      );
      return successResponse(res, 200, 'Announcement updated successfully', announcement);
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/announcements/:id
   * Admin or Officer author - FR-4.5
   */
  async deleteAnnouncement(req, res, next) {
    try {
      const { id } = req.params;
      const ipAddress = req.ip || req.connection.remoteAddress;
      await announcementService.deleteAnnouncement(req.user.id, id, ipAddress);
      return successResponse(res, 200, 'Announcement removed successfully', { id });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/announcements
   * Any authenticated user - FR-4.3 (Reverse chronological order)
   */
  async listAnnouncements(req, res, next) {
    try {
      const { search, limit = 50, offset = 0 } = req.query;
      const { announcements, total } = await announcementService.listAnnouncements({ search, limit, offset });
      return successResponse(
        res,
        200,
        'Announcements retrieved in reverse chronological order',
        announcements,
        { total, limit: Number(limit), offset: Number(offset) }
      );
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/announcements/:id
   */
  async getAnnouncementById(req, res, next) {
    try {
      const { id } = req.params;
      const announcement = await announcementService.getAnnouncementById(id);
      return successResponse(res, 200, 'Announcement retrieved', announcement);
    } catch (error) {
      next(error);
    }
  }
};
