import { logger } from '../utils/logger.js';
import { errorResponse } from '../utils/responseHandler.js';

/**
 * Centralized Express Error Handler Middleware
 */
export function errorHandler(err, req, res, next) {
  // If response has already sent headers, delegate to default Express handler
  if (res.headersSent) {
    return next(err);
  }

  logger.error(`Error handling ${req.method} ${req.originalUrl}: ${err.message}`, err);

  // 1. Handled Application Custom Errors
  if (err.name === 'AppError') {
    return errorResponse(res, err.statusCode, err.message, err.errorCode, err.details);
  }

  // 2. Body Parser JSON Syntax Error
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return errorResponse(res, 400, 'Malformed JSON payload provided in request body', 'INVALID_JSON');
  }

  // 3. MySQL Duplicate Entry (Code: ER_DUP_ENTRY or errno 1062)
  if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
    let message = 'A record with this unique value already exists';
    if (err.sqlMessage && err.sqlMessage.includes('members.email')) {
      message = 'A member with this email address already exists';
    } else if (err.sqlMessage && err.sqlMessage.includes('users.email')) {
      message = 'A user account with this email address already exists';
    } else if (err.sqlMessage && err.sqlMessage.includes('uq_vote_motion_user')) {
      message = 'Voter has already cast a vote for this motion';
    }
    return errorResponse(res, 409, message, 'DUPLICATE_RECORD', {
      sqlState: err.sqlState
    });
  }

  // 4. MySQL Foreign Key Constraint Violations
  if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.errno === 1452) {
    return errorResponse(res, 400, 'Referenced parent record does not exist', 'FOREIGN_KEY_VIOLATION');
  }
  if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.errno === 1451) {
    return errorResponse(res, 409, 'Cannot delete or update record because it is referenced by other active entities', 'REFERENTIAL_INTEGRITY_ERROR');
  }

  // 5. Database Connection Issues
  if (err.code === 'ECONNREFUSED' || err.code === 'PROTOCOL_CONNECTION_LOST') {
    return errorResponse(res, 503, 'Database service is temporarily unavailable. Please verify connection parameters.', 'DATABASE_UNAVAILABLE');
  }

  // 6. Generic Fallback Server Error
  const statusCode = err.status || err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'An unexpected server error occurred'
    : err.message || 'Internal Server Error';

  return errorResponse(res, statusCode, message, 'INTERNAL_SERVER_ERROR');
}

/**
 * 404 Route Not Found Handler
 */
export function notFoundHandler(req, res) {
  return errorResponse(res, 404, `API Route '${req.method} ${req.originalUrl}' not found`, 'ROUTE_NOT_FOUND');
}
