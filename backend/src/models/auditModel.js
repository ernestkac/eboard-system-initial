import { query } from '../config/database.js';

export const auditModel = {
  /**
   * Insert audit log entry
   */
  async create({ userId, action, entity, recordId = null, details = null, ipAddress = null }) {
    const sql = `
      INSERT INTO audit_logs (user_id, action, entity, record_id, details, ip_address)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const detailsJson = details ? JSON.stringify(details) : null;
    const [result] = await query(sql, [userId, action, entity, recordId, detailsJson, ipAddress]);
    return result.insertId;
  },

  /**
   * Retrieve audit logs with optional filters
   */
  async findAll({ entity, userId, recordId, limit = 50, offset = 0 }) {
    let sql = `
      SELECT al.*, u.email as user_email, u.role as user_role
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (entity) {
      sql += ` AND al.entity = ?`;
      params.push(entity);
    }
    if (userId) {
      sql += ` AND al.user_id = ?`;
      params.push(userId);
    }
    if (recordId) {
      sql += ` AND al.record_id = ?`;
      params.push(recordId);
    }

    sql += ` ORDER BY al.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const [rows] = await query(sql, params);
    return rows;
  },

  /**
   * Count total logs for pagination
   */
  async countAll({ entity, userId, recordId }) {
    let sql = `SELECT COUNT(*) as total FROM audit_logs WHERE 1=1`;
    const params = [];
    if (entity) {
      sql += ` AND entity = ?`;
      params.push(entity);
    }
    if (userId) {
      sql += ` AND user_id = ?`;
      params.push(userId);
    }
    if (recordId) {
      sql += ` AND record_id = ?`;
      params.push(recordId);
    }
    const [rows] = await query(sql, params);
    return rows[0]?.total || 0;
  }
};
