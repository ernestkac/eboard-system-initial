import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { userModel } from '../models/userModel.js';
import { auditService } from './auditService.js';
import { AppError } from '../utils/responseHandler.js';
import { query } from '../config/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'admarc_eboard_jwt_secret_change_in_production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

export const authService = {
  /**
   * Authenticates user credentials and issues JWT token
   */
  async login(email, password, ipAddress = null) {
    const user = await userModel.findByEmail(email);
    if (!user) {
      throw new AppError('Invalid email address or password', 401, 'INVALID_CREDENTIALS');
    }

    if (user.status !== 'active') {
      throw new AppError('User account is inactive or suspended. Contact the administrator.', 403, 'ACCOUNT_INACTIVE');
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new AppError('Invalid email address or password', 401, 'INVALID_CREDENTIALS');
    }

    // Update last login timestamp
    await userModel.updateLastLogin(user.id);

    // Sign JWT
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      memberId: user.member_id || null
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    // Record audit event
    await auditService.log(user.id, 'LOGIN', 'users', user.id, { email: user.email }, ipAddress);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        memberId: user.member_id || null,
        memberName: user.member_name || null,
        committee: user.member_committee || null
      }
    };
  },

  /**
   * Admin-only user provisioning (Public registration not allowed per FRS)
   */
  async createUser(adminId, { email, password, role = 'MEMBER', memberId = null }, ipAddress = null) {
    const existing = await userModel.findByEmail(email);
    if (existing) {
      throw new AppError('A user account with this email address already exists', 409, 'DUPLICATE_EMAIL');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const userId = await userModel.create({ email, passwordHash, role });

    // Link with member directory if memberId is supplied
    if (memberId) {
      await query(`UPDATE members SET user_id = ? WHERE id = ?`, [userId, memberId]);
    }

    await auditService.log(adminId, 'CREATE_USER', 'users', userId, { email, role, memberId }, ipAddress);

    return await userModel.findById(userId);
  },

  async getProfile(userId) {
    const user = await userModel.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }
    return user;
  }
};
