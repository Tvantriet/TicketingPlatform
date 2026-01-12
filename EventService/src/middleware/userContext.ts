import { Request, Response, NextFunction } from 'express';

/**
 * Extended Request interface with user context from Gateway
 */
export interface UserContextRequest extends Request {
  userId?: number;
  userName?: string;
  userRole?: string;
}

/**
 * Middleware to extract user context from Gateway headers
 * Gateway forwards: X-User-Id, X-User-Name, X-User-Role
 */
export function extractUserContext(req: Request, _res: Response, next: NextFunction) {
  const userReq = req as UserContextRequest;
  
  // Extract user info from headers (set by Gateway)
  const userIdHeader = req.headers['x-user-id'];
  const userNameHeader = req.headers['x-user-name'];
  const userRoleHeader = req.headers['x-user-role'];
  
  if (userIdHeader) {
    userReq.userId = parseInt(userIdHeader as string, 10);
  }
  
  if (userNameHeader) {
    userReq.userName = userNameHeader as string;
  }
  
  if (userRoleHeader) {
    userReq.userRole = userRoleHeader as string;
  }
  
  next();
}

/**
 * Helper to get user ID from request (throws if not present)
 */
export function getUserId(req: Request): number {
  const userReq = req as UserContextRequest;
  if (!userReq.userId) {
    throw new Error('User ID not found in request context');
  }
  return userReq.userId;
}

/**
 * Helper to get user ID from request (returns undefined if not present)
 */
export function getUserIdOptional(req: Request): number | undefined {
  const userReq = req as UserContextRequest;
  return userReq.userId;
}

/**
 * Helper to get user role from request
 */
export function getUserRole(req: Request): string | undefined {
  const userReq = req as UserContextRequest;
  return userReq.userRole;
}

/**
 * Helper to check if user has a specific role
 */
export function hasRole(req: Request, role: string): boolean {
  const userReq = req as UserContextRequest;
  return userReq.userRole === role;
}
