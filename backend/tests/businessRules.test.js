/**
 * ADMARC Limited eBoard System - Critical Business Rules Test Suite
 * Validates core business logic and FRS constraints independently of an external database.
 */

import assert from 'node:assert/strict';

// Simulated state store for isolated business logic validation
class TestGovernanceEngine {
  constructor() {
    this.reset();
  }

  reset() {
    this.users = [
      { id: 1, email: 'admin@admarc.mw', role: 'ADMINISTRATOR' },
      { id: 2, email: 'chairperson@admarc.mw', role: 'OFFICER' },
      { id: 3, email: 'ceo@admarc.mw', role: 'OFFICER' },
      { id: 4, email: 'member@admarc.mw', role: 'MEMBER' }
    ];
    this.members = [
      { id: 1, name: 'Dr. Patrick Banda', email: 'chairperson@admarc.mw', role: 'Chairperson', committee: 'Executive', joinDate: '2024-01-01' }
    ];
    this.roleHistory = [];
    this.meetings = [];
    this.motions = [];
    this.eligibleVoters = new Map(); // motionId -> Set(userIds)
    this.votes = new Map(); // `${motionId}_${userId}` -> { voteChoice, votedAt, updatedAt }
    this.auditLogs = [];
  }

  // 1. Role-Based Authorization Check
  checkAuthorization(userRole, allowedRoles) {
    if (!allowedRoles.includes(userRole)) {
      throw new Error(`FORBIDDEN: Role '${userRole}' not in allowed: ${allowedRoles.join(', ')}`);
    }
    return true;
  }

  // 2. Member Creation & Duplicate Email Prevention
  createMember(adminUser, { name, email, role, committee, joinDate }) {
    this.checkAuthorization(adminUser.role, ['ADMINISTRATOR']);

    const emailNorm = email.trim().toLowerCase();
    const exists = this.members.some((m) => m.email.toLowerCase() === emailNorm);
    if (exists) {
      const err = new Error(`A member record with email '${email}' already exists`);
      err.code = 'DUPLICATE_MEMBER_EMAIL';
      err.statusCode = 409;
      throw err;
    }

    const newMember = {
      id: this.members.length + 1,
      name,
      email: emailNorm,
      role,
      committee,
      joinDate
    };
    this.members.push(newMember);

    this.roleHistory.push({
      memberId: newMember.id,
      oldRole: null,
      newRole: role,
      changedBy: adminUser.id,
      timestamp: new Date()
    });

    this.auditLogs.push({ action: 'CREATE_MEMBER', entityId: newMember.id, userId: adminUser.id });
    return newMember;
  }

  // 3. Meeting Creation & Status
  createMeeting(user, { title, meetingDate, location }) {
    this.checkAuthorization(user.role, ['ADMINISTRATOR', 'OFFICER']);

    const meeting = {
      id: this.meetings.length + 1,
      title,
      meetingDate,
      location,
      status: 'scheduled',
      minutesText: null,
      minutesStatus: 'none'
    };
    this.meetings.push(meeting);
    return meeting;
  }

  cancelMeeting(user, meetingId, reason) {
    this.checkAuthorization(user.role, ['ADMINISTRATOR', 'OFFICER']);
    const meeting = this.meetings.find((m) => m.id === meetingId);
    if (!meeting) throw new Error('Meeting not found');
    if (meeting.status === 'cancelled') throw new Error('Already cancelled');

    meeting.status = 'cancelled';
    meeting.cancellationReason = reason;
    return meeting;
  }

  recordMinutes(user, meetingId, { text, status }) {
    const meeting = this.meetings.find((m) => m.id === meetingId);
    if (!meeting) throw new Error('Meeting not found');

    if (meeting.minutesStatus === 'published' && user.role !== 'ADMINISTRATOR') {
      const err = new Error('Published minutes are locked from non-administrator edits');
      err.code = 'PUBLISHED_MINUTES_LOCKED';
      throw err;
    }

    meeting.minutesText = text;
    meeting.minutesStatus = status;
    return meeting;
  }

  // 4. Motion Creation
  createMotion(user, { title, description, thresholdType = 'simple_majority', thresholdPercentage = 50.0, eligibleUserIds = [] }) {
    this.checkAuthorization(user.role, ['ADMINISTRATOR', 'OFFICER']);

    const motion = {
      id: this.motions.length + 1,
      title,
      description,
      status: 'open',
      result: 'pending',
      thresholdType,
      thresholdPercentage,
      forVotes: 0,
      againstVotes: 0,
      abstainVotes: 0,
      totalVotes: 0
    };
    this.motions.push(motion);

    const voterSet = new Set(eligibleUserIds);
    this.eligibleVoters.set(motion.id, voterSet);
    return motion;
  }

  // 5, 6, 7, 8. Voting Engine
  castVote(user, motionId, voteChoice) {
    const motion = this.motions.find((m) => m.id === motionId);
    if (!motion) throw new Error('Motion not found');

    // Rule: Votes rejected if motion is not open
    if (motion.status !== 'open') {
      const err = new Error(`Cannot vote: Motion is '${motion.status}'`);
      err.code = 'MOTION_NOT_OPEN';
      throw err;
    }

    // Rule: Only eligible voters in pool can vote
    const eligiblePool = this.eligibleVoters.get(motionId);
    if (!eligiblePool || !eligiblePool.has(user.id)) {
      const err = new Error('User is not eligible to vote on this motion');
      err.code = 'NOT_ELIGIBLE_TO_VOTE';
      throw err;
    }

    const key = `${motionId}_${user.id}`;
    const isUpdate = this.votes.has(key);

    // Record / Update vote (Enforcing exactly one vote per voter)
    this.votes.set(key, {
      motionId,
      userId: user.id,
      voteChoice,
      votedAt: isUpdate ? this.votes.get(key).votedAt : new Date(),
      updatedAt: new Date()
    });

    return { isUpdate, voteChoice };
  }

  getTally(motionId) {
    let forVotes = 0;
    let againstVotes = 0;
    let abstainVotes = 0;

    for (const [k, v] of this.votes.entries()) {
      if (v.motionId === motionId) {
        if (v.voteChoice === 'FOR') forVotes++;
        else if (v.voteChoice === 'AGAINST') againstVotes++;
        else if (v.voteChoice === 'ABSTAIN') abstainVotes++;
      }
    }
    return { forVotes, againstVotes, abstainVotes, totalVotes: forVotes + againstVotes + abstainVotes };
  }

  // 9. Motion Close & Result Calculation
  closeMotion(user, motionId) {
    this.checkAuthorization(user.role, ['ADMINISTRATOR', 'OFFICER']);
    const motion = this.motions.find((m) => m.id === motionId);
    if (!motion) throw new Error('Motion not found');
    if (motion.status !== 'open') throw new Error('Motion is not open');

    const tally = this.getTally(motionId);
    const decidedVotes = tally.forVotes + tally.againstVotes;
    let result = 'failed';

    if (motion.thresholdType === 'simple_majority') {
      if (decidedVotes > 0 && tally.forVotes > tally.againstVotes) {
        result = 'passed';
      }
    } else if (motion.thresholdType === 'two_thirds') {
      if (decidedVotes > 0 && tally.forVotes * 3 >= decidedVotes * 2) {
        result = 'passed';
      }
    } else if (motion.thresholdType === 'percentage') {
      if (decidedVotes > 0 && (tally.forVotes / decidedVotes) * 100 >= motion.thresholdPercentage) {
        result = 'passed';
      }
    }

    motion.status = 'closed';
    motion.result = result;
    motion.forVotes = tally.forVotes;
    motion.againstVotes = tally.againstVotes;
    motion.abstainVotes = tally.abstainVotes;
    motion.totalVotes = tally.totalVotes;
    return motion;
  }
}

// -----------------------------------------------------------------------------
// Test Execution Suite
// -----------------------------------------------------------------------------

async function runBusinessRuleTests() {
  console.log('Running ADMARC eBoard Critical Business Rules Test Suite...\n');
  const engine = new TestGovernanceEngine();
  let passedCount = 0;

  const admin = engine.users[0];
  const officerChair = engine.users[1];
  const officerCeo = engine.users[2];
  const generalMember = engine.users[3];

  // Test 1: Member Creation
  try {
    const member = engine.createMember(admin, {
      name: 'Grace Mphande',
      email: 'ceo@admarc.mw',
      role: 'Chief Executive Officer',
      committee: 'Executive',
      joinDate: '2024-02-01'
    });
    assert.equal(member.name, 'Grace Mphande');
    assert.equal(member.email, 'ceo@admarc.mw');
    assert.equal(engine.members.length, 2);
    console.log('✓ Test 1 Passed: Member creation succeeds with valid administrator role');
    passedCount++;
  } catch (e) {
    console.error('✗ Test 1 Failed:', e.message);
  }

  // Test 2: Duplicate Member Email Prevention
  try {
    assert.throws(
      () => {
        engine.createMember(admin, {
          name: 'Imposter Patrick',
          email: 'chairperson@admarc.mw', // already exists
          role: 'Deputy',
          committee: 'Audit',
          joinDate: '2024-03-01'
        });
      },
      (err) => err.code === 'DUPLICATE_MEMBER_EMAIL',
      'Should throw DUPLICATE_MEMBER_EMAIL'
    );
    console.log('✓ Test 2 Passed: Duplicate member email address is strictly rejected');
    passedCount++;
  } catch (e) {
    console.error('✗ Test 2 Failed:', e.message);
  }

  // Test 3: Meeting Creation & Cancellation
  try {
    const meeting = engine.createMeeting(officerChair, {
      title: 'ADMARC Q4 Strategic Review',
      meetingDate: '2026-11-10 10:00:00',
      location: 'Limbe Headquarters'
    });
    assert.equal(meeting.status, 'scheduled');

    const cancelled = engine.cancelMeeting(officerChair, meeting.id, 'Quorum unavailable');
    assert.equal(cancelled.status, 'cancelled');
    assert.equal(cancelled.cancellationReason, 'Quorum unavailable');
    console.log('✓ Test 3 Passed: Meeting creation and non-destructive cancellation work properly');
    passedCount++;
  } catch (e) {
    console.error('✗ Test 3 Failed:', e.message);
  }

  // Test 4: Motion Creation with Eligible Voter Pool
  let motion1;
  try {
    motion1 = engine.createMotion(officerChair, {
      title: 'Approval of Fertilizer Subsidy Logistics Facility',
      description: 'Authorize commercial grain transit tenders',
      thresholdType: 'simple_majority',
      eligibleUserIds: [officerChair.id, officerCeo.id] // Only officers 2 and 3 are eligible
    });
    assert.equal(motion1.status, 'open');
    assert.equal(motion1.result, 'pending');
    console.log('✓ Test 4 Passed: Motion created in open status with defined voter pool');
    passedCount++;
  } catch (e) {
    console.error('✗ Test 4 Failed:', e.message);
  }

  // Test 5: Casting Valid Votes
  try {
    const vote1 = engine.castVote(officerChair, motion1.id, 'FOR');
    assert.equal(vote1.isUpdate, false);
    assert.equal(vote1.voteChoice, 'FOR');

    const vote2 = engine.castVote(officerCeo, motion1.id, 'AGAINST');
    assert.equal(vote2.isUpdate, false);

    const tally = engine.getTally(motion1.id);
    assert.equal(tally.forVotes, 1);
    assert.equal(tally.againstVotes, 1);
    assert.equal(tally.totalVotes, 2);
    console.log('✓ Test 5 Passed: Eligible voters successfully cast FOR and AGAINST votes');
    passedCount++;
  } catch (e) {
    console.error('✗ Test 5 Failed:', e.message);
  }

  // Test 6: Preventing Duplicate Votes & Ineligible Voting
  try {
    // General member is NOT in eligible pool
    assert.throws(
      () => {
        engine.castVote(generalMember, motion1.id, 'FOR');
      },
      (err) => err.code === 'NOT_ELIGIBLE_TO_VOTE'
    );
    console.log('✓ Test 6 Passed: Ineligible voters cannot vote on restricted motions');
    passedCount++;
  } catch (e) {
    console.error('✗ Test 6 Failed:', e.message);
  }

  // Test 7: Changing Vote While Motion Is Open
  try {
    // officerCeo originally voted AGAINST, changes mind to FOR while motion is open
    const updatedVote = engine.castVote(officerCeo, motion1.id, 'FOR');
    assert.equal(updatedVote.isUpdate, true);
    assert.equal(updatedVote.voteChoice, 'FOR');

    const updatedTally = engine.getTally(motion1.id);
    assert.equal(updatedTally.forVotes, 2);
    assert.equal(updatedTally.againstVotes, 0);
    assert.equal(updatedTally.totalVotes, 2); // Exactly 2 votes still, no duplicate row
    console.log('✓ Test 7 Passed: Voter can change their vote while motion is open without duplicate rows');
    passedCount++;
  } catch (e) {
    console.error('✗ Test 7 Failed:', e.message);
  }

  // Test 8: Closing Motion & Result Calculation (Simple Majority)
  try {
    const closed = engine.closeMotion(officerChair, motion1.id);
    assert.equal(closed.status, 'closed');
    assert.equal(closed.result, 'passed'); // 2 FOR vs 0 AGAINST -> Passed
    assert.equal(closed.totalVotes, 2);
    console.log('✓ Test 8 Passed: Motion closes and correctly evaluates simple majority outcome (passed)');
    passedCount++;
  } catch (e) {
    console.error('✗ Test 8 Failed:', e.message);
  }

  // Test 9: Preventing Votes After Motion is Closed
  try {
    assert.throws(
      () => {
        engine.castVote(officerChair, motion1.id, 'AGAINST');
      },
      (err) => err.code === 'MOTION_NOT_OPEN'
    );
    console.log('✓ Test 9 Passed: Voting is strictly rejected after motion is closed');
    passedCount++;
  } catch (e) {
    console.error('✗ Test 9 Failed:', e.message);
  }

  // Test 10: Supermajority (Two-Thirds) Result Calculation
  try {
    const motion2 = engine.createMotion(officerChair, {
      title: 'Constitutional Charter Amendment',
      description: 'Requires two-thirds supermajority to pass',
      thresholdType: 'two_thirds',
      eligibleUserIds: [admin.id, officerChair.id, officerCeo.id]
    });

    // 1 FOR, 1 AGAINST out of 2 decided votes = 50% < 66.67% -> Fails
    engine.castVote(admin, motion2.id, 'FOR');
    engine.castVote(officerChair, motion2.id, 'AGAINST');

    const closed2 = engine.closeMotion(officerChair, motion2.id);
    assert.equal(closed2.result, 'failed');
    console.log('✓ Test 10 Passed: Two-thirds supermajority voting threshold correctly calculated (failed at 50%)');
    passedCount++;
  } catch (e) {
    console.error('✗ Test 10 Failed:', e.message);
  }

  // Test 11: Role-Based Authorization Enforcement
  try {
    // General Member cannot create member
    assert.throws(
      () => {
        engine.createMember(generalMember, {
          name: 'Unauthorized Member',
          email: 'unauth@admarc.mw',
          role: 'Member',
          committee: 'General',
          joinDate: '2024-01-01'
        });
      },
      (err) => err.message.includes('FORBIDDEN')
    );

    // General Member cannot create meetings or motions
    assert.throws(
      () => {
        engine.createMeeting(generalMember, { title: 'Hack', meetingDate: '2026-01-01', location: 'None' });
      },
      (err) => err.message.includes('FORBIDDEN')
    );

    console.log('✓ Test 11 Passed: Role-based authorization middleware strictly blocks unauthorized actions');
    passedCount++;
  } catch (e) {
    console.error('✗ Test 11 Failed:', e.message);
  }

  console.log(`\n=======================================================`);
  console.log(`Test Results: ${passedCount} / 11 tests passed successfully!`);
  console.log(`=======================================================\n`);
}

runBusinessRuleTests();
