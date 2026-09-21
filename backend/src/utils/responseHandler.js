/**
 * Standardized API Response Handlers
 * Ensures consistent JSON response structure across all controllers
 */

export const successResponse = (res, statusCode = 200, message = 'Success', data = null, meta = undefined) => {
  const response = {
    success: true,
    message,
    ...(data !== null && { data }),
    ...(meta !== undefined && { meta })
  };
  return res.status(statusCode).json(response);
};

export const errorResponse = (res, statusCode = 500, message = 'An error occurred', errorCode = 'SERVER_ERROR', details = null) => {
  const response = {
    success: false,
    message,
    error: errorCode,
    ...(details !== null && { details })
  };
  return res.status(statusCode).json(response);
};

export class AppError extends Error {
  constructor(message, statusCode = 500, errorCode = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}
