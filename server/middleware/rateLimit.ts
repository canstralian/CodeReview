/**
 * Rate Limiting Middleware
 * 
 * Protects API endpoints from abuse by limiting request rates
 */

import { Request, Response, NextFunction } from 'express';

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  statusCode?: number;
  skipSuccessfulRequests?: boolean;
}

// In-memory store for rate limiting (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Creates a rate limiting middleware with specified options
 */
export function createRateLimiter(options: RateLimitOptions) {
  const {
    windowMs,
    max,
    message = 'Too many requests, please try again later.',
    statusCode = 429,
    skipSuccessfulRequests = false,
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    // Generate key based on IP address (can be customized)
    const key = req.ip || 'unknown';
    const now = Date.now();

    // Get or create rate limit entry
    let entry = rateLimitStore.get(key);

    // Reset if window has passed
    if (!entry || now > entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + windowMs,
      };
      rateLimitStore.set(key, entry);
    }

    // Increment request count
    entry.count++;

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - entry.count));
    res.setHeader('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());

    // Check if limit exceeded
    if (entry.count > max) {
      res.status(statusCode).json({
        error: 'Rate limit exceeded',
        message,
        retryAfter: entry.resetTime - now,
      });
      return;
    }

    // Handle skipSuccessfulRequests option
    if (skipSuccessfulRequests) {
      const originalSend = res.send;
      res.send = function (data: any): Response {
        if (res.statusCode < 400) {
          entry!.count--;
        }
        return originalSend.call(this, data);
      };
    }

    next();
  };
}

// Default rate limiter: 100 requests per 15 minutes
export const rateLimitMiddleware = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
});

// Strict rate limiter for sensitive endpoints: 10 requests per minute
export const strictRateLimitMiddleware = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: 'Too many requests to this endpoint. Please try again later.',
});

export default rateLimitMiddleware;
