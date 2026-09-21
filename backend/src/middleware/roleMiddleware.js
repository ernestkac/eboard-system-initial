import { errorResponse } from '../utils/responseHandler.js';

/**
 * Role-Based Access Control (RBAC) Middleware
 * Restricts route access based on user role defined in FRS:
 * - ADMINISTRATOR: Full system access, directory management, deletes
 * - OFFICER: Create/edit meetings, voting, announcements, cast votes
 * - MEMBER: View-only access to directory, minutes, votes, documents, announcements
 *
 * @param  {...string} allowedRoles - List of allowed roles (e.g., 'ADMINISTRATOR', 'OFFICER')
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 401, 'Authentication required to access this resource', 'UNAUTHORIZED');
    }

    const userRole = req.user.role;
    if (!allowedRoles.includes(userRole)) {
      return errorResponse(
        res,
        403,
        `Access denied: Role '${userRole}' is not authorized to perform this action. Required: ${allowedRoles.join(' or ')}`,
        'FORBIDDEN'
      );
    }

    next();
  };
}

/**
 * Shortcut helper for Administrator-only operations
 */
export const requireAdmin = requireRole('ADMINISTRATOR');

/**
 * Shortcut helper for Board Officers and Administrators
 */
export const requireOfficerOrAdmin = requireRole('ADMINISTRATOR', 'OFFICER');

/**
 * Shortcut helper allowing all valid authenticated users (Admin, Officer, Member)
 */
export const requireAnyMember = requireRole('ADMINISTRATOR', 'OFFICER', 'MEMBER');
