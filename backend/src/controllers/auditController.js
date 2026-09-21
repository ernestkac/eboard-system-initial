import { auditService } from '../services/auditService.js';
import { successResponse } from '../utils/responseHandler.js';

export const auditController = {
  /**
   * GET /api/audit-logs
   * Admin only - Inspection of governance audit trail
   */
  async getAuditLogs(req, res, next) {
    try {
      const { entity, userId, recordId, limit = 50, offset = 0 } = req.query;
      const { logs, total } = await auditService.getAuditTrail({
        entity,
        userId,
        recordId,
        limit,
        offset
      });
      return successResponse(res, 200, 'Audit logs retrieved', logs, { total, limit: Number(limit), offset: Number(offset) });
    } catch (error) {
      next(error);
    }
  }
};
