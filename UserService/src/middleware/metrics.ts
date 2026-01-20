import { Request, Response, NextFunction } from 'express';
import { httpRequestDuration, httpRequestTotal, httpRequestErrors } from '../utils/metrics.js';

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  
  // Store original end function
  const originalEnd = res.end;
  
  // Override end function to capture metrics
  res.end = function(chunk?: any, encoding?: any, callback?: any): any {
    const duration = (Date.now() - start) / 1000; // Convert to seconds
    const route = req.route?.path || req.path || 'unknown';
    const method = req.method;
    const statusCode = res.statusCode.toString();
    
    // Record request duration
    httpRequestDuration.labels(method, route, statusCode).observe(duration);
    
    // Record total requests
    httpRequestTotal.labels(method, route, statusCode).inc();
    
    // Record errors (4xx and 5xx)
    if (res.statusCode >= 400) {
      const errorType = res.statusCode >= 500 ? 'server_error' : 'client_error';
      httpRequestErrors.labels(method, route, statusCode, errorType).inc();
    }
    
    // Call original end function
    return originalEnd.call(res, chunk, encoding, callback);
  };
  
  next();
}
