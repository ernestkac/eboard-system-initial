import jwt from 'jsonwebtoken';
import { errorResponse } from '../utils/responseHandler.js';
import { query } from '../config/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'admarc_eboard_jwt_secret_change_in_production';

/**
 * Middleware to authenticate requests using JWT Bearer Token
 */
export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 401, 'Authentication token required', 'UNAUTHORIZED');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return errorResponse(res, 401, 'Invalid authorization format', 'UNAUTHORIZED');
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return errorResponse(res, 401, 'Token has expired, please log in again', 'TOKEN_EXPIRED');
      }
      return errorResponse(res, 401, 'Invalid or malformed authentication token', 'INVALID_TOKEN');
    }

    // Attach user information to request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      memberId: decoded.memberId || null
    };

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Optional authentication middleware: attaches user if token is present, but allows request through if not
 */
export function optionalAuthenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      memberId: decoded.memberId || null
    };
  } catch (err) {
    // Ignore error for optional auth
  }
  next();
}
