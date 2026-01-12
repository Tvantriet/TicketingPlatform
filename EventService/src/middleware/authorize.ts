import { Request, Response, NextFunction } from 'express';
import { UserContextRequest, getUserRole } from './userContext.js';

/**
 * Authorization middleware factory
 * Usage: router.post('/', authorize('admin'), createEvent)
 */
export function authorize(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = getUserRole(req);
    
    if (!userRole) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    
    if (!allowedRoles.includes(userRole)) {
      res.status(403).json({ 
        error: 'Forbidden',
        message: `Required role: ${allowedRoles.join(' or ')}`
      });
      return;
    }
    
    next();
  };
}

/**
 * Require authentication (any authenticated user)
 * Usage: router.get('/', requireAuth, getEvent)
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const userReq = req as UserContextRequest;
  
  if (!userReq.userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  
  next();
}

/**
 * Optional authentication - doesn't fail if not authenticated
 * Usage: router.get('/', optionalAuth, getEvent)
 */
export function optionalAuth(_req: Request, _res: Response, next: NextFunction): void {
  // Just pass through - user context middleware already handles extraction
  next();
}
