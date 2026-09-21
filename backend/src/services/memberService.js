import { memberModel } from '../models/memberModel.js';
import { auditService } from './auditService.js';
import { AppError } from '../utils/responseHandler.js';
import { withTransaction } from '../config/database.js';

export const memberService = {
  /**
   * Create a new member record with duplicate email check and role history initialization
   */
  async createMember(adminId, { name, email, role, committee, joinDate, userId = null }, ipAddress = null) {
    // FR-1.6: Prevent duplicate member records with the same email address
    const existing = await memberModel.findByEmail(email);
    if (existing) {
      throw new AppError(`A member record with email '${email}' already exists`, 409, 'DUPLICATE_MEMBER_EMAIL');
    }

    const memberId = await memberModel.create({
      name,
      email,
      role,
      committee,
      joinDate,
      userId,
      createdBy: adminId
    });

    // Record initial role in history (FR-1.7)
    await memberModel.addRoleHistory({
      memberId,
      oldRole: null,
      newRole: role,
      oldCommittee: null,
      newCommittee: committee,
      changedBy: adminId,
      notes: 'Initial member directory registration'
    });

    await auditService.log(adminId, 'CREATE_MEMBER', 'members', memberId, { name, email, role, committee }, ipAddress);

    return await memberModel.findById(memberId);
  },

  /**
   * Update existing member record and track role/committee changes
   */
  async updateMember(adminId, id, { name, email, role, committee, joinDate, notes }, ipAddress = null) {
    const existing = await memberModel.findById(id);
    if (!existing) {
      throw new AppError(`Member record with ID ${id} not found`, 404, 'MEMBER_NOT_FOUND');
    }

    // Check duplicate email if changing
    if (email && email.toLowerCase() !== existing.email.toLowerCase()) {
      const emailCollision = await memberModel.findByEmail(email);
      if (emailCollision && emailCollision.id !== id) {
        throw new AppError(`A member with email '${email}' already exists`, 409, 'DUPLICATE_MEMBER_EMAIL');
      }
    }

    // Track role or committee changes in history (FR-1.7)
    const roleChanged = role && role !== existing.role;
    const committeeChanged = committee && committee !== existing.committee;

    if (roleChanged || committeeChanged) {
      await memberModel.addRoleHistory({
        memberId: id,
        oldRole: existing.role,
        newRole: role || existing.role,
        oldCommittee: existing.committee,
        newCommittee: committee || existing.committee,
        changedBy: adminId,
        notes: notes || 'Member role or committee updated'
      });
    }

    await memberModel.update(id, {
      name,
      email,
      role,
      committee,
      joinDate,
      updatedBy: adminId
    });

    await auditService.log(
      adminId,
      'UPDATE_MEMBER',
      'members',
      id,
      { changes: { name, email, role, committee, joinDate } },
      ipAddress
    );

    return await memberModel.findById(id);
  },

  /**
   * Delete member record
   */
  async deleteMember(adminId, id, ipAddress = null) {
    const existing = await memberModel.findById(id);
    if (!existing) {
      throw new AppError(`Member with ID ${id} not found`, 404, 'MEMBER_NOT_FOUND');
    }

    await memberModel.delete(id);
    await auditService.log(adminId, 'DELETE_MEMBER', 'members', id, { deletedEmail: existing.email, deletedName: existing.name }, ipAddress);
    return true;
  },

  /**
   * Search and filter directory
   */
  async listMembers(query) {
    const members = await memberModel.findAll(query);
    const total = await memberModel.countAll(query);
    return { members, total };
  },

  async getMemberById(id) {
    const member = await memberModel.findById(id);
    if (!member) {
      throw new AppError(`Member with ID ${id} not found`, 404, 'MEMBER_NOT_FOUND');
    }
    const roleHistory = await memberModel.getRoleHistory(id);
    return { ...member, roleHistory };
  }
};
