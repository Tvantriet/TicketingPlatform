import { Request, Response, NextFunction } from 'express';
import { verifyTokenWithUserService } from '../utils/userServiceClient.js';

export interface AuthRequest extends Request {
  userId?: number;
  userName?: string;
  role?: string;
}

/**
 * Middleware to verify JWT token via UserService and extract user info
 * Adds userId, userName, and role to request object
 */
export async function verifyToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  // Verify token with UserService
  const verification = await verifyTokenWithUserService(token);

  if (!verification.valid) {
    res.status(verification.error === 'Invalid token' ? 401 : 503).json({ 
      error: verification.error || 'Token verification failed' 
    });
    return;
  }

  // Add user info to request
  (req as AuthRequest).userId = verification.userId;
  (req as AuthRequest).userName = verification.userName;
  (req as AuthRequest).role = verification.role || 'user';
  
  next();
}

/**
 * Optional authentication - doesn't fail if no token
 * Useful for routes that work with or without auth
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    const verification = await verifyTokenWithUserService(token);
    if (verification.valid) {
      (req as AuthRequest).userId = verification.userId;
      (req as AuthRequest).userName = verification.userName;
      (req as AuthRequest).role = verification.role || 'user';
    }
    // Ignore invalid tokens for optional auth
  }
  
  next();
}
