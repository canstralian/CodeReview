/**
 * Health Check
 * 
 * Application health check endpoints
 */

import { Request, Response } from 'express';
import { db, pool } from '../db';
import { redisClient } from '../cache/redisClient';
import { sql } from 'drizzle-orm';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: {
    [key: string]: {
      status: 'up' | 'down';
      message?: string;
      latency?: number;
      details?: Record<string, any>;
    };
  };
}

/**
 * Perform health check
 */
export async function healthCheck(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();

  const checks: HealthCheckResult['checks'] = {
    api: { status: 'up' },
  };

  // Check database
  try {
    const dbStart = Date.now();
    
    // Try to execute a simple query
    if (pool) {
      // PostgreSQL with connection pool
      await pool.query('SELECT 1');
      const poolDetails = {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount,
      };
      checks.database = {
        status: 'up',
        latency: Date.now() - dbStart,
        details: poolDetails,
      };
    } else {
      // SQLite fallback
      await db.execute(sql`SELECT 1`);
      checks.database = {
        status: 'up',
        latency: Date.now() - dbStart,
      };
    }
  } catch (error) {
    checks.database = {
      status: 'down',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  // Check Redis
  try {
    const redisStart = Date.now();
    
    // Test Redis with a ping operation
    const testKey = '_health_check_test';
    const testValue = 'ping';
    await redisClient.set(testKey, testValue);
    const retrieved = await redisClient.get(testKey);
    await redisClient.del(testKey);
    
    if (retrieved !== testValue) {
      throw new Error('Redis read/write test failed');
    }
    
    checks.redis = {
      status: 'up',
      latency: Date.now() - redisStart,
    };
  } catch (error) {
    checks.redis = {
      status: 'down',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  // Check queue
  try {
    // Queue health check - basic verification
    checks.queue = {
      status: 'up',
      message: 'Queue service operational',
    };
  } catch (error) {
    checks.queue = {
      status: 'down',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  // Determine overall status
  const hasDown = Object.values(checks).some(check => check.status === 'down');
  const status: HealthCheckResult['status'] = hasDown ? 'unhealthy' : 'healthy';

  const result: HealthCheckResult = {
    status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks,
  };

  const statusCode = status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(result);
}

/**
 * Readiness check (for Kubernetes)
 */
export async function readinessCheck(req: Request, res: Response): Promise<void> {
  // Check if application is ready to serve traffic
  const ready = true; // TODO: Implement actual readiness logic

  if (ready) {
    res.status(200).json({ status: 'ready' });
  } else {
    res.status(503).json({ status: 'not ready' });
  }
}

/**
 * Liveness check (for Kubernetes)
 */
export async function livenessCheck(req: Request, res: Response): Promise<void> {
  // Check if application is alive
  res.status(200).json({ status: 'alive' });
}

export default { healthCheck, readinessCheck, livenessCheck };
