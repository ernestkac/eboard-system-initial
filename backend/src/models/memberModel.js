import { query, withTransaction } from '../config/database.js';

export const memberModel = {
  async findById(id) {
    const sql = `
      SELECT m.*, u.role as user_system_role, u.status as user_status
      FROM members m
      LEFT JOIN users u ON m.user_id = u.id
      WHERE m.id = ?
      LIMIT 1
    `;
    const [rows] = await query(sql, [id]);
    return rows[0] || null;
  },

  async findByEmail(email) {
    const sql = `SELECT * FROM members WHERE email = ? LIMIT 1`;
    const [rows] = await query(sql, [email.trim().toLowerCase()]);
    return rows[0] || null;
  },

  async findAll({ search, name, role, committee, limit = 50, offset = 0 } = {}) {
    let sql = `
      SELECT m.*, u.role as user_system_role, u.status as user_status
      FROM members m
      LEFT JOIN users u ON m.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      sql += ` AND (m.name LIKE ? OR m.email LIKE ? OR m.role LIKE ? OR m.committee LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }
    if (name) {
      sql += ` AND m.name LIKE ?`;
      params.push(`%${name}%`);
    }
    if (role) {
      sql += ` AND m.role LIKE ?`;
      params.push(`%${role}%`);
    }
    if (committee) {
      sql += ` AND m.committee LIKE ?`;
      params.push(`%${committee}%`);
    }

    sql += ` ORDER BY m.name ASC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const [rows] = await query(sql, params);
    return rows;
  },

  async countAll({ search, name, role, committee } = {}) {
    let sql = `SELECT COUNT(*) as total FROM members WHERE 1=1`;
    const params = [];

    if (search) {
      sql += ` AND (name LIKE ? OR email LIKE ? OR role LIKE ? OR committee LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }
    if (name) {
      sql += ` AND name LIKE ?`;
      params.push(`%${name}%`);
    }
    if (role) {
      sql += ` AND role LIKE ?`;
      params.push(`%${role}%`);
    }
    if (committee) {
      sql += ` AND committee LIKE ?`;
      params.push(`%${committee}%`);
    }

    const [rows] = await query(sql, params);
    return rows[0]?.total || 0;
  },

  async create({ name, email, role, committee, joinDate, userId = null, createdBy = null }) {
    const sql = `
      INSERT INTO members (name, email, role, committee, join_date, user_id, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await query(sql, [
      name.trim(),
      email.trim().toLowerCase(),
      role.trim(),
      committee.trim(),
      joinDate,
      userId,
      createdBy,
      createdBy
    ]);
    return result.insertId;
  },

  async update(id, { name, email, role, committee, joinDate, updatedBy = null }) {
    const sql = `
      UPDATE members
      SET name = COALESCE(?, name),
          email = COALESCE(?, email),
          role = COALESCE(?, role),
          committee = COALESCE(?, committee),
          join_date = COALESCE(?, join_date),
          updated_by = ?
      WHERE id = ?
    `;
    await query(sql, [
      name ? name.trim() : null,
      email ? email.trim().toLowerCase() : null,
      role ? role.trim() : null,
      committee ? committee.trim() : null,
      joinDate || null,
      updatedBy,
      id
    ]);
  },

  async delete(id) {
    const sql = `DELETE FROM members WHERE id = ?`;
    const [result] = await query(sql, [id]);
    return result.affectedRows > 0;
  },

  /**
   * Role history record insertion
   */
  async addRoleHistory({ memberId, oldRole, newRole, oldCommittee, newCommittee, changedBy, notes }) {
    const sql = `
      INSERT INTO member_role_history (member_id, old_role, new_role, old_committee, new_committee, changed_by, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await query(sql, [
      memberId,
      oldRole || null,
      newRole,
      oldCommittee || null,
      newCommittee,
      changedBy,
      notes || null
    ]);
    return result.insertId;
  },

  async getRoleHistory(memberId) {
    const sql = `
      SELECT mrh.*, u.email as changed_by_email
      FROM member_role_history mrh
      LEFT JOIN users u ON mrh.changed_by = u.id
      WHERE mrh.member_id = ?
      ORDER BY mrh.changed_at DESC
    `;
    const [rows] = await query(sql, [memberId]);
    return rows;
  }
};
