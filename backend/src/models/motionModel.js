import { query, withTransaction } from '../config/database.js';

export const motionModel = {
  async findById(id) {
    const sql = `
      SELECT m.*, 
             mt.title as meeting_title, mt.status as meeting_status,
             ai.title as agenda_item_title,
             u.email as creator_email
      FROM motions m
      LEFT JOIN meetings mt ON m.meeting_id = mt.id
      LEFT JOIN agenda_items ai ON m.agenda_item_id = ai.id
      LEFT JOIN users u ON m.created_by = u.id
      WHERE m.id = ?
      LIMIT 1
    `;
    const [rows] = await query(sql, [id]);
    return rows[0] || null;
  },

  async findAll({ meetingId, agendaItemId, status, result, limit = 50, offset = 0 } = {}) {
    let sql = `
      SELECT m.*, 
             mt.title as meeting_title,
             ai.title as agenda_item_title,
             COUNT(DISTINCT mev.user_id) as eligible_voter_count,
             COUNT(DISTINCT v.id) as cast_vote_count
      FROM motions m
      LEFT JOIN meetings mt ON m.meeting_id = mt.id
      LEFT JOIN agenda_items ai ON m.agenda_item_id = ai.id
      LEFT JOIN motion_eligible_voters mev ON mev.motion_id = m.id
      LEFT JOIN votes v ON v.motion_id = m.id
      WHERE 1=1
    `;
    const params = [];

    if (meetingId) {
      sql += ` AND m.meeting_id = ?`;
      params.push(meetingId);
    }
    if (agendaItemId) {
      sql += ` AND m.agenda_item_id = ?`;
      params.push(agendaItemId);
    }
    if (status) {
      sql += ` AND m.status = ?`;
      params.push(status);
    }
    if (result) {
      sql += ` AND m.result = ?`;
      params.push(result);
    }

    sql += ` GROUP BY m.id ORDER BY m.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const [rows] = await query(sql, params);
    return rows;
  },

  async countAll({ meetingId, agendaItemId, status, result } = {}) {
    let sql = `SELECT COUNT(*) as total FROM motions WHERE 1=1`;
    const params = [];
    if (meetingId) {
      sql += ` AND meeting_id = ?`;
      params.push(meetingId);
    }
    if (agendaItemId) {
      sql += ` AND agenda_item_id = ?`;
      params.push(agendaItemId);
    }
    if (status) {
      sql += ` AND status = ?`;
      params.push(status);
    }
    if (result) {
      sql += ` AND result = ?`;
      params.push(result);
    }
    const [rows] = await query(sql, params);
    return rows[0]?.total || 0;
  },

  async create({
    title,
    description,
    meetingId = null,
    agendaItemId = null,
    thresholdType = 'simple_majority',
    thresholdPercentage = 50.0,
    eligiblePoolType = 'all_officers',
    targetCommittee = null,
    createdBy
  }) {
    const sql = `
      INSERT INTO motions (
        title, description, meeting_id, agenda_item_id,
        status, result, threshold_type, threshold_percentage,
        eligible_pool_type, target_committee,
        created_by, updated_by
      )
      VALUES (?, ?, ?, ?, 'open', 'pending', ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await query(sql, [
      title.trim(),
      description.trim(),
      meetingId,
      agendaItemId,
      thresholdType,
      thresholdPercentage,
      eligiblePoolType,
      targetCommittee,
      createdBy,
      createdBy
    ]);
    return result.insertId;
  },

  async setEligibleVoters(motionId, userIds) {
    if (!userIds || userIds.length === 0) return;
    const values = userIds.map((uid) => [motionId, uid]);
    const sql = `INSERT IGNORE INTO motion_eligible_voters (motion_id, user_id) VALUES ?`;
    await query(sql, [values]);
  },

  async getEligibleVoters(motionId) {
    const sql = `
      SELECT mev.user_id, u.email, u.role as system_role, m.name, m.role as member_role, m.committee
      FROM motion_eligible_voters mev
      JOIN users u ON mev.user_id = u.id
      LEFT JOIN members m ON m.user_id = u.id
      WHERE mev.motion_id = ?
      ORDER BY m.name ASC, u.email ASC
    `;
    const [rows] = await query(sql, [motionId]);
    return rows;
  },

  async isUserEligible(motionId, userId) {
    const sql = `SELECT 1 FROM motion_eligible_voters WHERE motion_id = ? AND user_id = ? LIMIT 1`;
    const [rows] = await query(sql, [motionId, userId]);
    return rows.length > 0;
  },

  async closeMotion(motionId, { result, forVotes, againstVotes, abstainVotes, totalVotes, updatedBy }) {
    const sql = `
      UPDATE motions
      SET status = 'closed',
          result = ?,
          for_votes = ?,
          against_votes = ?,
          abstain_votes = ?,
          total_votes = ?,
          closed_at = NOW(),
          updated_by = ?
      WHERE id = ?
    `;
    await query(sql, [result, forVotes, againstVotes, abstainVotes, totalVotes, updatedBy, motionId]);
  },

  async withdrawMotion(motionId, reason, updatedBy) {
    const sql = `
      UPDATE motions
      SET status = 'withdrawn',
          result = 'withdrawn',
          withdrawn_at = NOW(),
          withdrawal_reason = ?,
          updated_by = ?
      WHERE id = ?
    `;
    await query(sql, [reason || null, updatedBy, motionId]);
  },

  async delete(id) {
    const sql = `DELETE FROM motions WHERE id = ?`;
    const [result] = await query(sql, [id]);
    return result.affectedRows > 0;
  }
};
