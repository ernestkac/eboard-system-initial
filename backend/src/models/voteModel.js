import { query } from '../config/database.js';

export const voteModel = {
  /**
   * Cast or update a vote on a motion (upsert enabled by UNIQUE(motion_id, user_id))
   */
  async castOrUpdate(motionId, userId, voteChoice) {
    const sql = `
      INSERT INTO votes (motion_id, user_id, vote_choice, voted_at)
      VALUES (?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        vote_choice = VALUES(vote_choice),
        updated_at = NOW()
    `;
    const [result] = await query(sql, [motionId, userId, voteChoice]);
    // result.affectedRows: 1 for insert, 2 for update on duplicate key
    return {
      isNewVote: result.affectedRows === 1,
      isUpdated: result.affectedRows === 2
    };
  },

  /**
   * Live tally aggregation directly from votes table (FR-3.4)
   */
  async getLiveTally(motionId) {
    const sql = `
      SELECT 
        SUM(CASE WHEN vote_choice = 'FOR' THEN 1 ELSE 0 END) as for_votes,
        SUM(CASE WHEN vote_choice = 'AGAINST' THEN 1 ELSE 0 END) as against_votes,
        SUM(CASE WHEN vote_choice = 'ABSTAIN' THEN 1 ELSE 0 END) as abstain_votes,
        COUNT(*) as total_votes
      FROM votes
      WHERE motion_id = ?
    `;
    const [rows] = await query(sql, [motionId]);
    const tally = rows[0] || {};
    return {
      forVotes: parseInt(tally.for_votes || 0, 10),
      againstVotes: parseInt(tally.against_votes || 0, 10),
      abstainVotes: parseInt(tally.abstain_votes || 0, 10),
      totalVotes: parseInt(tally.total_votes || 0, 10)
    };
  },

  /**
   * Find vote of a specific user
   */
  async findByUserAndMotion(motionId, userId) {
    const sql = `
      SELECT v.*, u.email, m.name as voter_name
      FROM votes v
      JOIN users u ON v.user_id = u.id
      LEFT JOIN members m ON m.user_id = u.id
      WHERE v.motion_id = ? AND v.user_id = ?
      LIMIT 1
    `;
    const [rows] = await query(sql, [motionId, userId]);
    return rows[0] || null;
  },

  /**
   * Get all individual votes for a motion (FR-3.7 permanent audit record)
   */
  async getVotesByMotion(motionId) {
    const sql = `
      SELECT v.id, v.motion_id, v.user_id, v.vote_choice, v.voted_at, v.updated_at,
             u.email as voter_email, m.name as voter_name, m.role as member_role
      FROM votes v
      JOIN users u ON v.user_id = u.id
      LEFT JOIN members m ON m.user_id = u.id
      WHERE v.motion_id = ?
      ORDER BY v.voted_at ASC
    `;
    const [rows] = await query(sql, [motionId]);
    return rows;
  }
};
