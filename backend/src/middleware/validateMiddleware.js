import { errorResponse } from '../utils/responseHandler.js';

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates that required fields exist in req.body
 * @param {string[]} fields
 */
export function validateRequired(fields) {
  return (req, res, next) => {
    const missing = [];
    for (const field of fields) {
      if (req.body[field] === undefined || req.body[field] === null || String(req.body[field]).trim() === '') {
        missing.push(field);
      }
    }
    if (missing.length > 0) {
      return errorResponse(
        res,
        400,
        `Missing required field(s): ${missing.join(', ')}`,
        'VALIDATION_ERROR',
        { missingFields: missing }
      );
    }
    next();
  };
}

/**
 * Validates email format in body
 * @param {string} fieldName (default 'email')
 */
export function validateEmail(fieldName = 'email') {
  return (req, res, next) => {
    const email = req.body[fieldName];
    if (email && !EMAIL_REGEX.test(String(email).trim())) {
      return errorResponse(res, 400, `Invalid email address format for '${fieldName}'`, 'VALIDATION_ERROR');
    }
    next();
  };
}

/**
 * Validates ID parameter in URL
 * @param {string} paramName (default 'id')
 */
export function validateIdParam(paramName = 'id') {
  return (req, res, next) => {
    const val = req.params[paramName];
    const parsed = parseInt(val, 10);
    if (isNaN(parsed) || parsed <= 0 || String(parsed) !== String(val)) {
      return errorResponse(res, 400, `Invalid ${paramName} parameter: must be a positive integer`, 'INVALID_ID');
    }
    req.params[paramName] = parsed;
    next();
  };
}

/**
 * Validates that a field is within an allowed enum set
 */
export function validateEnum(field, allowedValues, isRequired = true) {
  return (req, res, next) => {
    const val = req.body[field];
    if (val === undefined || val === null || val === '') {
      if (isRequired) {
        return errorResponse(res, 400, `Field '${field}' is required`, 'VALIDATION_ERROR');
      }
      return next();
    }
    if (!allowedValues.includes(val)) {
      return errorResponse(
        res,
        400,
        `Invalid value for '${field}'. Allowed values: ${allowedValues.join(', ')}`,
        'VALIDATION_ERROR'
      );
    }
    next();
  };
}

/**
 * Validates date field
 */
export function validateDate(field, isRequired = true) {
  return (req, res, next) => {
    const val = req.body[field];
    if (val === undefined || val === null || val === '') {
      if (isRequired) {
        return errorResponse(res, 400, `Date field '${field}' is required`, 'VALIDATION_ERROR');
      }
      return next();
    }
    const d = new Date(val);
    if (isNaN(d.getTime())) {
      return errorResponse(res, 400, `Invalid date format for field '${field}'`, 'VALIDATION_ERROR');
    }
    next();
  };
}
