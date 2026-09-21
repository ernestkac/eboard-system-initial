import { query } from '../config/database.js';

export const announcementModel = {
  async findById(id) {
    const sql = `
      SELECT a.*, u.email as author_email, m.name as author_name
      FROM announcements a
      LEFT JOIN users u ON a.created_by = u.id
      LEFT JOIN members m ON m.user_id = u.id
      WHERE a.id = ?
      LIMIT 1
    `;
    const [rows] = await query(sql, [id]);
    return rows[0] || null;
  },

  /**
   * Return announcements in reverse chronological order (FR-4.3)
   */
  async findAllReverseChronological({ search, limit = 50, offset = 0 } = {}) {
    let sql = `
      SELECT a.*, u.email as author_email, m.name as author_name
      FROM announcements a
      LEFT JOIN users u ON a.created_by = u.id
      LEFT JOIN members m ON m.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      sql += ` AND (a.title LIKE ? OR a.body LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term);
    }

    sql += ` ORDER BY a.published_date DESC, a.id DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const [rows] = await query(sql, params);
    return rows;
  },

  async countAll({ search } = {}) {
    let sql = `SELECT COUNT(*) as total FROM announcements WHERE 1=1`;
    const params = [];
    if (search) {
      sql += ` AND (title LIKE ? OR body LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term);
    }
    const [rows] = await query(sql, params);
    return rows[0]?.total || 0;
  },

  async create({ title, body, publishedDate = null, createdBy }) {
    const sql = `
      INSERT INTO announcements (title, body, published_date, created_by, updated_by)
      VALUES (?, ?, COALESCE(?, NOW()), ?, ?)
    `;
    const [result] = await query(sql, [title.trim(), body.trim(), publishedDate, createdBy, createdBy]);
    return result.insertId;
  },

  async update(id, { title, body, publishedDate, updatedBy }) {
    const sql = `
      UPDATE announcements
      SET title = COALESCE(?, title),
          body = COALESCE(?, body),
          published_date = COALESCE(?, published_date),
          updated_by = ?
      WHERE id = ?
    `;
    await query(sql, [title ? title.trim() : null, body ? body.trim() : null, publishedDate || null, updatedBy, id]);
  },

  async delete(id) {
    const sql = `DELETE FROM announcements WHERE id = ?`;
    const [result] = await query(sql, [id]);
    return result.affectedRows > 0;
  }
};
