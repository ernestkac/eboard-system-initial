import { query } from '../config/database.js';

export const meetingModel = {
  async findById(id) {
    const sql = `
      SELECT m.*, u.email as creator_email
      FROM meetings m
      LEFT JOIN users u ON m.created_by = u.id
      WHERE m.id = ?
      LIMIT 1
    `;
    const [rows] = await query(sql, [id]);
    return rows[0] || null;
  },

  async findAllChronological({ status, fromDate, toDate, limit = 50, offset = 0 } = {}) {
    let sql = `
      SELECT m.*, 
             COUNT(DISTINCT a.id) as agenda_count,
             COUNT(DISTINCT d.id) as document_count,
             COUNT(DISTINCT mo.id) as motion_count
      FROM meetings m
      LEFT JOIN agenda_items a ON a.meeting_id = m.id
      LEFT JOIN documents d ON d.meeting_id = m.id
      LEFT JOIN motions mo ON mo.meeting_id = m.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += ` AND m.status = ?`;
      params.push(status);
    }
    if (fromDate) {
      sql += ` AND m.meeting_date >= ?`;
      params.push(fromDate);
    }
    if (toDate) {
      sql += ` AND m.meeting_date <= ?`;
      params.push(toDate);
    }

    sql += ` GROUP BY m.id ORDER BY m.meeting_date ASC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const [rows] = await query(sql, params);
    return rows;
  },

  async countAll({ status, fromDate, toDate } = {}) {
    let sql = `SELECT COUNT(*) as total FROM meetings WHERE 1=1`;
    const params = [];
    if (status) {
      sql += ` AND status = ?`;
      params.push(status);
    }
    if (fromDate) {
      sql += ` AND meeting_date >= ?`;
      params.push(fromDate);
    }
    if (toDate) {
      sql += ` AND meeting_date <= ?`;
      params.push(toDate);
    }
    const [rows] = await query(sql, params);
    return rows[0]?.total || 0;
  },

  async create({ title, meetingDate, location, createdBy }) {
    const sql = `
      INSERT INTO meetings (title, meeting_date, location, status, minutes_status, created_by, updated_by)
      VALUES (?, ?, ?, 'scheduled', 'none', ?, ?)
    `;
    const [result] = await query(sql, [title.trim(), meetingDate, location.trim(), createdBy, createdBy]);
    return result.insertId;
  },

  async update(id, { title, meetingDate, location, status, updatedBy }) {
    const sql = `
      UPDATE meetings
      SET title = COALESCE(?, title),
          meeting_date = COALESCE(?, meeting_date),
          location = COALESCE(?, location),
          status = COALESCE(?, status),
          updated_by = ?
      WHERE id = ?
    `;
    await query(sql, [
      title ? title.trim() : null,
      meetingDate || null,
      location ? location.trim() : null,
      status || null,
      updatedBy,
      id
    ]);
  },

  async markCancelled(id, reason, updatedBy) {
    const sql = `
      UPDATE meetings
      SET status = 'cancelled',
          cancellation_reason = ?,
          updated_by = ?
      WHERE id = ?
    `;
    await query(sql, [reason || 'Cancelled by board administration', updatedBy, id]);
  },

  async updateMinutes(id, { minutesText, minutesStatus, updatedBy }) {
    let sql = `
      UPDATE meetings
      SET minutes_text = ?,
          minutes_status = ?,
          updated_by = ?
    `;
    const params = [minutesText, minutesStatus, updatedBy];

    if (minutesStatus === 'published') {
      sql += `, minutes_published_at = NOW()`;
    }

    sql += ` WHERE id = ?`;
    params.push(id);

    await query(sql, params);
  },

  async delete(id) {
    const sql = `DELETE FROM meetings WHERE id = ?`;
    const [result] = await query(sql, [id]);
    return result.affectedRows > 0;
  }
};
