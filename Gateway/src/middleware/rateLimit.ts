import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { AuthRequest } from './auth.js';

/**
 * Strict rate limiter for authentication endpoints
 * Prevents brute force attacks on login/register
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: {
    error: 'Too many authentication attempts',
    message: 'Please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many authentication attempts',
      message: 'Please try again after 15 minutes',
      retryAfter: Math.ceil(req.rateLimit?.resetTime ? (req.rateLimit.resetTime - Date.now()) / 1000 : 900)
    });
  }
});

/**
 * General API rate limiter for protected routes
 * Per-user rate limiting when authenticated
 */
export const apiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: {
    error: 'Too many requests',
    message: 'Please slow down'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Use userId for keying if authenticated, otherwise use IP
  keyGenerator: (req: Request) => {
    const authReq = req as AuthRequest;
    return authReq.userId ? `user:${authReq.userId}` : req.ip || 'unknown';
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many requests',
      message: 'Please slow down',
      retryAfter: Math.ceil(req.rateLimit?.resetTime ? (req.rateLimit.resetTime - Date.now()) / 1000 : 60)
    });
  }
});

/**
 * Strict rate limiter for public endpoints
 * Prevents abuse of public routes
 */
export const publicRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per 15 minutes
  message: {
    error: 'Too many requests',
    message: 'Please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many requests',
      message: 'Please try again later',
      retryAfter: Math.ceil(req.rateLimit?.resetTime ? (req.rateLimit.resetTime - Date.now()) / 1000 : 900)
    });
  }
});
