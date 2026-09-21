import { query, withTransaction } from '../config/database.js';

export const agendaItemModel = {
  async findById(id) {
    const sql = `
      SELECT a.*, m.title as meeting_title, m.status as meeting_status
      FROM agenda_items a
      JOIN meetings m ON a.meeting_id = m.id
      WHERE a.id = ?
      LIMIT 1
    `;
    const [rows] = await query(sql, [id]);
    return rows[0] || null;
  },

  async findByMeetingId(meetingId) {
    const sql = `
      SELECT a.*,
             COUNT(DISTINCT mo.id) as motion_count
      FROM agenda_items a
      LEFT JOIN motions mo ON mo.agenda_item_id = a.id
      WHERE a.meeting_id = ?
      GROUP BY a.id
      ORDER BY a.order_num ASC, a.id ASC
    `;
    const [rows] = await query(sql, [meetingId]);
    return rows;
  },

  async getNextOrderNum(meetingId) {
    const sql = `SELECT COALESCE(MAX(order_num), 0) + 1 as next_order FROM agenda_items WHERE meeting_id = ?`;
    const [rows] = await query(sql, [meetingId]);
    return rows[0]?.next_order || 1;
  },

  async create({ meetingId, title, description, orderNum, createdBy }) {
    const sql = `
      INSERT INTO agenda_items (meeting_id, title, description, order_num, status, created_by, updated_by)
      VALUES (?, ?, ?, ?, 'pending', ?, ?)
    `;
    const [result] = await query(sql, [
      meetingId,
      title.trim(),
      description ? description.trim() : null,
      orderNum,
      createdBy,
      createdBy
    ]);
    return result.insertId;
  },

  async update(id, { title, description, orderNum, status, updatedBy }) {
    const sql = `
      UPDATE agenda_items
      SET title = COALESCE(?, title),
          description = COALESCE(?, description),
          order_num = COALESCE(?, order_num),
          status = COALESCE(?, status),
          updated_by = ?
      WHERE id = ?
    `;
    await query(sql, [
      title ? title.trim() : null,
      description !== undefined ? description : null,
      orderNum !== undefined ? orderNum : null,
      status || null,
      updatedBy,
      id
    ]);
  },

  /**
   * Reorders multiple agenda items within a transaction (FR-2.2)
   */
  async reorder(meetingId, items, updatedBy) {
    return await withTransaction(async (conn) => {
      for (const item of items) {
        await conn.query(
          `UPDATE agenda_items SET order_num = ?, updated_by = ? WHERE id = ? AND meeting_id = ?`,
          [item.orderNum, updatedBy, item.id, meetingId]
        );
      }
      return true;
    });
  },

  async delete(id) {
    const sql = `DELETE FROM agenda_items WHERE id = ?`;
    const [result] = await query(sql, [id]);
    return result.affectedRows > 0;
  }
};
