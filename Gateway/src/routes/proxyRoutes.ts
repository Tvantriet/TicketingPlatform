import { Router } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { verifyToken } from '../middleware/auth.js';
import { createProxyOptions } from '../utils/proxy.js';
import { SERVICE_URLS } from '../config/services.js';
import { authRateLimiter, apiRateLimiter } from '../middleware/rateLimit.js';

const router = Router();

// Public routes (no auth required) - strict rate limiting for auth endpoints
router.post('/users/register', authRateLimiter, createProxyMiddleware({
  target: SERVICE_URLS.USER_SERVICE,
  ...createProxyOptions(false)
}));

router.post('/users/login', authRateLimiter, createProxyMiddleware({
  target: SERVICE_URLS.USER_SERVICE,
  ...createProxyOptions(false)
}));

// Protected routes (require authentication) - rate limited per user
router.use('/events', apiRateLimiter, verifyToken, createProxyMiddleware({
  target: SERVICE_URLS.EVENT_SERVICE,
  ...createProxyOptions(true)
}));

router.use('/tickets', apiRateLimiter, verifyToken, createProxyMiddleware({
  target: SERVICE_URLS.EVENT_SERVICE,
  ...createProxyOptions(true)
}));

router.use('/payments', apiRateLimiter, verifyToken, createProxyMiddleware({
  target: SERVICE_URLS.PAYMENT_SERVICE,
  ...createProxyOptions(true)
}));

router.use('/bookings', apiRateLimiter, verifyToken, createProxyMiddleware({
  target: SERVICE_URLS.BOOKING_SERVICE,
  ...createProxyOptions(true)
}));

router.use('/users', apiRateLimiter, verifyToken, createProxyMiddleware({
  target: SERVICE_URLS.USER_SERVICE,
  ...createProxyOptions(true)
}));

export default router;
