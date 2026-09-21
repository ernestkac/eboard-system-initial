import { authService } from '../services/authService.js';
import { userModel } from '../models/userModel.js';
import { successResponse } from '../utils/responseHandler.js';

export const authController = {
  /**
   * POST /api/auth/login
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const result = await authService.login(email, password, ipAddress);
      return successResponse(res, 200, 'Login successful', result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/auth/me
   */
  async getCurrentUser(req, res, next) {
    try {
      const profile = await authService.getProfile(req.user.id);
      return successResponse(res, 200, 'User profile retrieved', profile);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/auth/users
   * Admin-only user provisioning (Public registration not allowed per FRS)
   */
  async createUser(req, res, next) {
    try {
      const { email, password, role, memberId } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const newUser = await authService.createUser(req.user.id, { email, password, role, memberId }, ipAddress);
      return successResponse(res, 201, 'User account provisioned successfully', newUser);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/auth/users
   * Admin-only user listing
   */
  async listUsers(req, res, next) {
    try {
      const users = await userModel.findAll();
      return successResponse(res, 200, 'User list retrieved', users);
    } catch (error) {
      next(error);
    }
  }
};
