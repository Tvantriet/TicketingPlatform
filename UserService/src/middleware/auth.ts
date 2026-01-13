import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../service/authService.js';

export interface AuthRequest extends Request {
  userId?: number;
  userName?: string;
}

/**
 * Middleware to verify JWT token
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }

  (req as AuthRequest).userId = decoded.userId;
  (req as AuthRequest).userName = decoded.userName;
  return next();
}
