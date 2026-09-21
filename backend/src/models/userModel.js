import { query } from '../config/database.js';

export const userModel = {
  async findByEmail(email) {
    const sql = `
      SELECT u.*, m.id as member_id, m.name as member_name, m.committee as member_committee
      FROM users u
      LEFT JOIN members m ON m.user_id = u.id
      WHERE u.email = ?
      LIMIT 1
    `;
    const [rows] = await query(sql, [email.trim().toLowerCase()]);
    return rows[0] || null;
  },

  async findById(id) {
    const sql = `
      SELECT u.id, u.email, u.role, u.status, u.last_login_at, u.created_at, u.updated_at,
             m.id as member_id, m.name as member_name, m.role as member_role, m.committee as member_committee
      FROM users u
      LEFT JOIN members m ON m.user_id = u.id
      WHERE u.id = ?
      LIMIT 1
    `;
    const [rows] = await query(sql, [id]);
    return rows[0] || null;
  },

  async create({ email, passwordHash, role = 'MEMBER', status = 'active' }) {
    const sql = `
      INSERT INTO users (email, password_hash, role, status)
      VALUES (?, ?, ?, ?)
    `;
    const [result] = await query(sql, [email.trim().toLowerCase(), passwordHash, role, status]);
    return result.insertId;
  },

  async updateLastLogin(id) {
    const sql = `UPDATE users SET last_login_at = NOW() WHERE id = ?`;
    await query(sql, [id]);
  },

  async updateRole(id, role) {
    const sql = `UPDATE users SET role = ? WHERE id = ?`;
    await query(sql, [role, id]);
  },

  async findAll() {
    const sql = `
      SELECT u.id, u.email, u.role, u.status, u.last_login_at, u.created_at,
             m.id as member_id, m.name as member_name, m.committee
      FROM users u
      LEFT JOIN members m ON m.user_id = u.id
      ORDER BY u.id ASC
    `;
    const [rows] = await query(sql);
    return rows;
  }
};
