import { query } from '../config/database.js';

export const documentModel = {
  async findById(id) {
    const sql = `
      SELECT d.*, m.title as meeting_title, u.email as creator_email
      FROM documents d
      LEFT JOIN meetings m ON d.meeting_id = m.id
      LEFT JOIN users u ON d.created_by = u.id
      WHERE d.id = ?
      LIMIT 1
    `;
    const [rows] = await query(sql, [id]);
    return rows[0] || null;
  },

  async findAll({ search, category, meetingId, limit = 50, offset = 0 } = {}) {
    let sql = `
      SELECT d.*, m.title as meeting_title, u.email as creator_email
      FROM documents d
      LEFT JOIN meetings m ON d.meeting_id = m.id
      LEFT JOIN users u ON d.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      sql += ` AND (d.title LIKE ? OR d.description LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term);
    }
    if (category) {
      sql += ` AND d.category = ?`;
      params.push(category);
    }
    if (meetingId) {
      sql += ` AND d.meeting_id = ?`;
      params.push(meetingId);
    }

    sql += ` ORDER BY d.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const [rows] = await query(sql, params);
    return rows;
  },

  async countAll({ search, category, meetingId } = {}) {
    let sql = `SELECT COUNT(*) as total FROM documents WHERE 1=1`;
    const params = [];
    if (search) {
      sql += ` AND (title LIKE ? OR description LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term);
    }
    if (category) {
      sql += ` AND category = ?`;
      params.push(category);
    }
    if (meetingId) {
      sql += ` AND meeting_id = ?`;
      params.push(meetingId);
    }
    const [rows] = await query(sql, params);
    return rows[0]?.total || 0;
  },

  async create({ title, description, linkOrReference, category = 'general', meetingId = null, createdBy }) {
    const sql = `
      INSERT INTO documents (title, description, link_or_reference, category, meeting_id, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await query(sql, [
      title.trim(),
      description ? description.trim() : null,
      linkOrReference.trim(),
      category,
      meetingId,
      createdBy,
      createdBy
    ]);
    return result.insertId;
  },

  async update(id, { title, description, linkOrReference, category, meetingId, updatedBy }) {
    const sql = `
      UPDATE documents
      SET title = COALESCE(?, title),
          description = COALESCE(?, description),
          link_or_reference = COALESCE(?, link_or_reference),
          category = COALESCE(?, category),
          meeting_id = COALESCE(?, meeting_id),
          updated_by = ?
      WHERE id = ?
    `;
    await query(sql, [
      title ? title.trim() : null,
      description !== undefined ? (description ? description.trim() : null) : null,
      linkOrReference ? linkOrReference.trim() : null,
      category || null,
      meetingId !== undefined ? meetingId : null,
      updatedBy,
      id
    ]);
  },

  async delete(id) {
    const sql = `DELETE FROM documents WHERE id = ?`;
    const [result] = await query(sql, [id]);
    return result.affectedRows > 0;
  }
};
