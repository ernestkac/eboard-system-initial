import { auditModel } from '../models/auditModel.js';
import { logger } from '../utils/logger.js';

export const auditService = {
  /**
   * Log action safely without failing parent operation if audit table fails
   */
  async log(userId, action, entity, recordId = null, details = null, ipAddress = null) {
    try {
      return await auditModel.create({
        userId,
        action,
        entity,
        recordId,
        details,
        ipAddress
      });
    } catch (error) {
      logger.error(`Failed to record audit log: ${error.message}`, error);
      return null;
    }
  },

  async getAuditTrail(filters) {
    const logs = await auditModel.findAll(filters);
    const total = await auditModel.countAll(filters);
    return { logs, total };
  }
};
