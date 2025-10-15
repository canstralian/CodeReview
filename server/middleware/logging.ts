/**
 * Logging Middleware
 * 
 * Request/response logging for observability
 */

import { Request, Response, NextFunction } from 'express';

// Simple UUID generator without external dependency
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Extend Express Request type to include requestId
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      startTime?: number;
    }
  }
}

/**
 * Logging middleware that tracks request/response details
 */
export function loggingMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Generate unique request ID
  req.requestId = generateId();
  req.startTime = Date.now();

  // Log request
  console.log({
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  // Capture response
  const originalSend = res.send;
  res.send = function (data: any): Response {
    const duration = Date.now() - (req.startTime || 0);
    
    console.log({
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    });

    return originalSend.call(this, data);
  };

  next();
}

export default loggingMiddleware;
