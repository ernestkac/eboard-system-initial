import { motionModel } from '../models/motionModel.js';
import { voteModel } from '../models/voteModel.js';
import { auditService } from './auditService.js';
import { AppError } from '../utils/responseHandler.js';

export const votingService = {
  /**
   * Cast or change a vote on an active motion (FR-3.2 & FR-3.3)
   */
  async castVote(user, motionId, voteChoice, ipAddress = null) {
    // 1. Verify motion exists
    const motion = await motionModel.findById(motionId);
    if (!motion) {
      throw new AppError(`Motion with ID ${motionId} not found`, 404, 'MOTION_NOT_FOUND');
    }

    // 2. Prevent votes after motion is closed or withdrawn (FR-3.5)
    if (motion.status !== 'open') {
      throw new AppError(
        `Cannot cast vote: This motion is currently '${motion.status}'. Votes are only accepted while the motion is open.`,
        400,
        'MOTION_NOT_OPEN'
      );
    }

    // 3. Enforce voter eligibility against the motion's voter pool (FR-3.2)
    const isEligible = await motionModel.isUserEligible(motionId, user.id);
    if (!isEligible) {
      throw new AppError(
        'You are not included in the eligible voter pool for this motion',
        403,
        'NOT_ELIGIBLE_TO_VOTE'
      );
    }

    // 4. Validate vote choice
    const allowedChoices = ['FOR', 'AGAINST', 'ABSTAIN'];
    if (!allowedChoices.includes(voteChoice)) {
      throw new AppError(
        `Invalid vote choice '${voteChoice}'. Must be one of: ${allowedChoices.join(', ')}`,
        400,
        'INVALID_VOTE_CHOICE'
      );
    }

    // 5. Check if voter has already voted (to detect change vs initial vote)
    const existingVote = await voteModel.findByUserAndMotion(motionId, user.id);

    // 6. Record or update the vote in database (enforced by DB unique constraint)
    const result = await voteModel.castOrUpdate(motionId, user.id, voteChoice);

    // 7. Audit log the voting action
    const action = existingVote ? 'CHANGE_VOTE' : 'CAST_VOTE';
    await auditService.log(
      user.id,
      action,
      'votes',
      motionId,
      {
        motionId,
        choice: voteChoice,
        previousChoice: existingVote ? existingVote.vote_choice : null
      },
      ipAddress
    );

    // 8. Return updated live tally (FR-3.4)
    const liveTally = await voteModel.getLiveTally(motionId);

    return {
      message: existingVote
        ? `Vote updated successfully to ${voteChoice}`
        : `Vote cast successfully as ${voteChoice}`,
      voteChoice,
      isUpdated: !!existingVote,
      liveTally
    };
  },

  /**
   * Live tally inspection for a motion (FR-3.4)
   */
  async getLiveTally(motionId) {
    const motion = await motionModel.findById(motionId);
    if (!motion) {
      throw new AppError(`Motion with ID ${motionId} not found`, 404, 'MOTION_NOT_FOUND');
    }
    const tally = await voteModel.getLiveTally(motionId);
    return {
      motionId,
      status: motion.status,
      thresholdType: motion.threshold_type,
      tally
    };
  },

  /**
   * Retrieve voter's own vote
   */
  async getMyVote(motionId, userId) {
    const vote = await voteModel.findByUserAndMotion(motionId, userId);
    return vote ? { voted: true, choice: vote.vote_choice, votedAt: vote.voted_at, updatedAt: vote.updated_at } : { voted: false };
  }
};
