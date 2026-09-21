import { motionModel } from '../models/motionModel.js';
import { voteModel } from '../models/voteModel.js';
import { meetingModel } from '../models/meetingModel.js';
import { agendaItemModel } from '../models/agendaItemModel.js';
import { auditService } from './auditService.js';
import { AppError } from '../utils/responseHandler.js';
import { query, withTransaction } from '../config/database.js';

export const motionService = {
  /**
   * Create motion and populate eligible voter pool
   */
  async createMotion(
    user,
    {
      title,
      description,
      meetingId = null,
      agendaItemId = null,
      thresholdType = 'simple_majority',
      thresholdPercentage = 50.0,
      eligiblePoolType = 'all_officers',
      targetCommittee = null,
      customVoterIds = []
    },
    ipAddress = null
  ) {
    // Validate linked meeting if provided
    if (meetingId) {
      const meeting = await meetingModel.findById(meetingId);
      if (!meeting) {
        throw new AppError(`Meeting with ID ${meetingId} not found`, 404, 'MEETING_NOT_FOUND');
      }
    }

    // Validate linked agenda item if provided (FR-2.5)
    if (agendaItemId) {
      const item = await agendaItemModel.findById(agendaItemId);
      if (!item) {
        throw new AppError(`Agenda item with ID ${agendaItemId} not found`, 404, 'AGENDA_ITEM_NOT_FOUND');
      }
    }

    return await withTransaction(async (conn) => {
      // 1. Create motion
      const [motionResult] = await conn.query(
        `INSERT INTO motions (
          title, description, meeting_id, agenda_item_id,
          status, result, threshold_type, threshold_percentage,
          eligible_pool_type, target_committee, created_by, updated_by
        ) VALUES (?, ?, ?, ?, 'open', 'pending', ?, ?, ?, ?, ?, ?)`,
        [
          title.trim(),
          description.trim(),
          meetingId,
          agendaItemId,
          thresholdType,
          thresholdPercentage,
          eligiblePoolType,
          targetCommittee,
          user.id,
          user.id
        ]
      );
      const motionId = motionResult.insertId;

      // 2. Determine eligible voters
      let eligibleUserIds = [];

      if (eligiblePoolType === 'all_officers') {
        const [officers] = await conn.query(
          `SELECT id FROM users WHERE role IN ('OFFICER', 'ADMINISTRATOR') AND status = 'active'`
        );
        eligibleUserIds = officers.map((o) => o.id);
      } else if (eligiblePoolType === 'committee') {
        const [members] = await conn.query(
          `SELECT u.id FROM users u 
           JOIN members m ON m.user_id = u.id 
           WHERE m.committee = ? AND u.status = 'active'`,
          [targetCommittee]
        );
        eligibleUserIds = members.map((m) => m.id);
      } else if (eligiblePoolType === 'custom' && Array.isArray(customVoterIds)) {
        eligibleUserIds = customVoterIds;
      }

      // Populate eligible voters table
      if (eligibleUserIds.length > 0) {
        const voterValues = eligibleUserIds.map((uid) => [motionId, uid]);
        await conn.query(
          `INSERT IGNORE INTO motion_eligible_voters (motion_id, user_id) VALUES ?`,
          [voterValues]
        );
      }

      await auditService.log(
        user.id,
        'CREATE_MOTION',
        'motions',
        motionId,
        { title, eligiblePoolType, eligibleCount: eligibleUserIds.length },
        ipAddress
      );

      return await motionModel.findById(motionId);
    });
  },

  /**
   * Close motion and calculate final outcome based on configured threshold (FR-3.5 & FR-3.6)
   */
  async closeMotion(user, motionId, ipAddress = null) {
    const motion = await motionModel.findById(motionId);
    if (!motion) {
      throw new AppError(`Motion with ID ${motionId} not found`, 404, 'MOTION_NOT_FOUND');
    }

    if (motion.status === 'closed') {
      throw new AppError('Motion is already closed', 400, 'MOTION_ALREADY_CLOSED');
    }
    if (motion.status === 'withdrawn') {
      throw new AppError('Cannot close a withdrawn motion', 400, 'MOTION_WITHDRAWN');
    }

    return await withTransaction(async (conn) => {
      // 1. Fetch exact live tally
      const [tallyRows] = await conn.query(
        `SELECT 
          SUM(CASE WHEN vote_choice = 'FOR' THEN 1 ELSE 0 END) as for_votes,
          SUM(CASE WHEN vote_choice = 'AGAINST' THEN 1 ELSE 0 END) as against_votes,
          SUM(CASE WHEN vote_choice = 'ABSTAIN' THEN 1 ELSE 0 END) as abstain_votes,
          COUNT(*) as total_votes
        FROM votes WHERE motion_id = ?`,
        [motionId]
      );

      const tally = tallyRows[0] || {};
      const forVotes = parseInt(tally.for_votes || 0, 10);
      const againstVotes = parseInt(tally.against_votes || 0, 10);
      const abstainVotes = parseInt(tally.abstain_votes || 0, 10);
      const totalVotes = parseInt(tally.total_votes || 0, 10);

      // 2. Evaluate result based on voting threshold (FR-3.6)
      const decidedVotes = forVotes + againstVotes;
      let result = 'failed';

      if (motion.threshold_type === 'simple_majority') {
        // Simple majority: FOR votes exceed AGAINST votes
        if (decidedVotes > 0 && forVotes > againstVotes) {
          result = 'passed';
        }
      } else if (motion.threshold_type === 'two_thirds') {
        // Two-thirds supermajority: at least 66.67% of decisive votes
        if (decidedVotes > 0 && forVotes * 3 >= decidedVotes * 2) {
          result = 'passed';
        }
      } else if (motion.threshold_type === 'percentage') {
        const requiredPercent = Number(motion.threshold_percentage) || 50.0;
        if (decidedVotes > 0 && (forVotes / decidedVotes) * 100 >= requiredPercent) {
          result = 'passed';
        }
      }

      // 3. Update motion record permanently (FR-3.7)
      await conn.query(
        `UPDATE motions 
         SET status = 'closed',
             result = ?,
             for_votes = ?,
             against_votes = ?,
             abstain_votes = ?,
             total_votes = ?,
             closed_at = NOW(),
             updated_by = ?
         WHERE id = ?`,
        [result, forVotes, againstVotes, abstainVotes, totalVotes, user.id, motionId]
      );

      await auditService.log(
        user.id,
        'CLOSE_MOTION',
        'motions',
        motionId,
        { result, forVotes, againstVotes, abstainVotes, totalVotes, thresholdType: motion.threshold_type },
        ipAddress
      );

      return await motionModel.findById(motionId);
    });
  },

  /**
   * Withdraw a motion before it closes (FR-3.8)
   */
  async withdrawMotion(user, motionId, reason, ipAddress = null) {
    const motion = await motionModel.findById(motionId);
    if (!motion) {
      throw new AppError(`Motion with ID ${motionId} not found`, 404, 'MOTION_NOT_FOUND');
    }

    if (motion.status === 'closed') {
      throw new AppError('Cannot withdraw a motion that is already closed', 400, 'MOTION_ALREADY_CLOSED');
    }
    if (motion.status === 'withdrawn') {
      throw new AppError('Motion is already withdrawn', 400, 'MOTION_ALREADY_WITHDRAWN');
    }

    await motionModel.withdrawMotion(motionId, reason, user.id);
    await auditService.log(user.id, 'WITHDRAW_MOTION', 'motions', motionId, { reason }, ipAddress);

    return await motionModel.findById(motionId);
  },

  /**
   * Retrieve full details including live tally and voter eligibility
   */
  async getMotionDetails(motionId, currentUserId = null) {
    const motion = await motionModel.findById(motionId);
    if (!motion) {
      throw new AppError(`Motion with ID ${motionId} not found`, 404, 'MOTION_NOT_FOUND');
    }

    const liveTally = await voteModel.getLiveTally(motionId);
    const eligibleVoters = await motionModel.getEligibleVoters(motionId);

    let userVote = null;
    let isEligible = false;

    if (currentUserId) {
      userVote = await voteModel.findByUserAndMotion(motionId, currentUserId);
      isEligible = await motionModel.isUserEligible(motionId, currentUserId);
    }

    // If motion is closed, retrieve individual vote records (FR-3.7)
    let individualVotes = [];
    if (motion.status === 'closed') {
      individualVotes = await voteModel.getVotesByMotion(motionId);
    }

    return {
      ...motion,
      liveTally,
      eligibleVoters,
      isCurrentUserEligible: isEligible,
      currentUserVote: userVote ? userVote.vote_choice : null,
      individualVotes
    };
  },

  async listMotions(filters) {
    const motions = await motionModel.findAll(filters);
    const total = await motionModel.countAll(filters);
    return { motions, total };
  },

  async deleteMotion(user, motionId, ipAddress = null) {
    const motion = await motionModel.findById(motionId);
    if (!motion) {
      throw new AppError(`Motion with ID ${motionId} not found`, 404, 'MOTION_NOT_FOUND');
    }

    // FRS Data Integrity Rule: Closed motion records shall be preserved
    if (motion.status === 'closed' && user.role !== 'ADMINISTRATOR') {
      throw new AppError('Closed motion records cannot be deleted by non-administrators', 403, 'CLOSED_MOTION_LOCKED');
    }

    await motionModel.delete(motionId);
    await auditService.log(user.id, 'DELETE_MOTION', 'motions', motionId, { title: motion.title }, ipAddress);
    return true;
  }
};
