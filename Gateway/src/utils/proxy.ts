import { Request, Response } from 'express';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import { AuthRequest } from '../middleware/auth.js';

/**
 * Create proxy middleware options with user info forwarding
 */
export function createProxyOptions(requireAuth: boolean = true): Partial<Options> {
  return {
    changeOrigin: true,
    onError: (err: Error, req: Request, res: Response) => {
      console.error('Proxy error:', err.message);
      res.status(502).json({ 
        error: 'Bad Gateway', 
        message: 'Service temporarily unavailable' 
      });
    },
    onProxyReq: (proxyReq: any, req: Request) => {
      const authReq = req as AuthRequest;
      
      // Forward user info as headers to backend services
      if (authReq.userId) {
        proxyReq.setHeader('X-User-Id', authReq.userId.toString());
      }
      if (authReq.userName) {
        proxyReq.setHeader('X-User-Name', authReq.userName);
      }
      if (authReq.role) {
        proxyReq.setHeader('X-User-Role', authReq.role);
      }
      
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} -> ${proxyReq.path}${authReq.userId ? ` [User: ${authReq.userId}]` : ''}`);
    }
  } as Partial<Options>;
}
