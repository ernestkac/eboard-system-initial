import { documentService } from '../services/documentService.js';
import { successResponse } from '../utils/responseHandler.js';

export const documentController = {
  /**
   * POST /api/documents
   * Officer or Admin - FR-4.2
   */
  async createDocument(req, res, next) {
    try {
      const { title, description, linkOrReference, category, meetingId } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const doc = await documentService.createDocument(
        req.user.id,
        { title, description, linkOrReference, category, meetingId },
        ipAddress
      );
      return successResponse(res, 201, 'Document entry added successfully', doc);
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/documents/:id
   * Officer or Admin - FR-4.5
   */
  async updateDocument(req, res, next) {
    try {
      const { id } = req.params;
      const { title, description, linkOrReference, category, meetingId } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const doc = await documentService.updateDocument(
        req.user.id,
        id,
        { title, description, linkOrReference, category, meetingId },
        ipAddress
      );
      return successResponse(res, 200, 'Document entry updated successfully', doc);
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/documents/:id
   * Admin or Officer - FR-4.5
   */
  async deleteDocument(req, res, next) {
    try {
      const { id } = req.params;
      const ipAddress = req.ip || req.connection.remoteAddress;
      await documentService.deleteDocument(req.user.id, id, ipAddress);
      return successResponse(res, 200, 'Document entry removed successfully', { id });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/documents
   * Any authenticated user - FR-4.4 (Search by title, filter by category)
   */
  async listDocuments(req, res, next) {
    try {
      const { search, category, meetingId, limit = 50, offset = 0 } = req.query;
      const { documents, total } = await documentService.listDocuments({
        search,
        category,
        meetingId,
        limit,
        offset
      });
      return successResponse(res, 200, 'Documents retrieved', documents, { total, limit: Number(limit), offset: Number(offset) });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/documents/:id
   */
  async getDocumentById(req, res, next) {
    try {
      const { id } = req.params;
      const doc = await documentService.getDocumentById(id);
      return successResponse(res, 200, 'Document entry retrieved', doc);
    } catch (error) {
      next(error);
    }
  }
};
