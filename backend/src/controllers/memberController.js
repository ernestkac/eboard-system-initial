import { memberService } from '../services/memberService.js';
import { memberModel } from '../models/memberModel.js';
import { successResponse } from '../utils/responseHandler.js';

export const memberController = {
  /**
   * POST /api/members
   * Admin only - FR-1.1
   */
  async createMember(req, res, next) {
    try {
      const { name, email, role, committee, joinDate, userId } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const member = await memberService.createMember(
        req.user.id,
        { name, email, role, committee, joinDate, userId },
        ipAddress
      );
      return successResponse(res, 201, 'Member record created successfully', member);
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/members/:id
   * Admin only - FR-1.2
   */
  async updateMember(req, res, next) {
    try {
      const { id } = req.params;
      const { name, email, role, committee, joinDate, notes } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const member = await memberService.updateMember(
        req.user.id,
        id,
        { name, email, role, committee, joinDate, notes },
        ipAddress
      );
      return successResponse(res, 200, 'Member record updated successfully', member);
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/members/:id
   * Admin only - FR-1.3
   */
  async deleteMember(req, res, next) {
    try {
      const { id } = req.params;
      const ipAddress = req.ip || req.connection.remoteAddress;
      await memberService.deleteMember(req.user.id, id, ipAddress);
      return successResponse(res, 200, 'Member record removed successfully', { id });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/members
   * Any authenticated user - FR-1.4 & FR-1.5
   * Supports filtering by name, role, committee, search
   */
  async listMembers(req, res, next) {
    try {
      const { search, name, role, committee, limit = 50, offset = 0 } = req.query;
      const { members, total } = await memberService.listMembers({
        search,
        name,
        role,
        committee,
        limit,
        offset
      });
      return successResponse(res, 200, 'Member directory retrieved', members, { total, limit: Number(limit), offset: Number(offset) });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/members/:id
   * Any authenticated user - FR-1.5
   */
  async getMemberById(req, res, next) {
    try {
      const { id } = req.params;
      const member = await memberService.getMemberById(id);
      return successResponse(res, 200, 'Member record retrieved', member);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/members/:id/role-history
   * Any authenticated user - FR-1.7
   */
  async getRoleHistory(req, res, next) {
    try {
      const { id } = req.params;
      const history = await memberModel.getRoleHistory(id);
      return successResponse(res, 200, 'Member role history retrieved', history);
    } catch (error) {
      next(error);
    }
  }
};
