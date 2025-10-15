/**
 * Database Performance Metrics
 * 
 * Monitors database performance including query times, connection pool stats,
 * and load testing capabilities
 */

import { pool } from '../db';

export interface DatabaseMetrics {
  connectionPool?: {
    total: number;
    idle: number;
    waiting: number;
    active: number;
  };
  queries: {
    count: number;
    avgDuration: number;
    slowQueries: number;
  };
}

// Track query performance
const queryMetrics = {
  count: 0,
  totalDuration: 0,
  slowQueries: 0,
  slowQueryThreshold: 1000, // 1 second
};

/**
 * Track query execution time
 */
export function trackQuery(duration: number): void {
  queryMetrics.count++;
  queryMetrics.totalDuration += duration;
  
  if (duration > queryMetrics.slowQueryThreshold) {
    queryMetrics.slowQueries++;
  }
}

/**
 * Get current database metrics
 */
export async function getDatabaseMetrics(): Promise<DatabaseMetrics> {
  const metrics: DatabaseMetrics = {
    queries: {
      count: queryMetrics.count,
      avgDuration: queryMetrics.count > 0 
        ? queryMetrics.totalDuration / queryMetrics.count 
        : 0,
      slowQueries: queryMetrics.slowQueries,
    },
  };

  // Add connection pool stats if using PostgreSQL
  if (pool) {
    metrics.connectionPool = {
      total: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount,
      active: pool.totalCount - pool.idleCount,
    };
  }

  return metrics;
}

/**
 * Reset query metrics (useful for testing)
 */
export function resetMetrics(): void {
  queryMetrics.count = 0;
  queryMetrics.totalDuration = 0;
  queryMetrics.slowQueries = 0;
}

/**
 * Stress test the database connection pool
 * Simulates multiple concurrent queries to test performance under load
 */
export async function stressTestDatabase(options: {
  concurrentQueries?: number;
  duration?: number; // milliseconds
  queryDelay?: number; // milliseconds between queries
}): Promise<{
  totalQueries: number;
  successfulQueries: number;
  failedQueries: number;
  avgResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  queriesPerSecond: number;
}> {
  const {
    concurrentQueries = 10,
    duration = 10000, // 10 seconds
    queryDelay = 100, // 100ms between queries
  } = options;

  const startTime = Date.now();
  const results: number[] = [];
  let successCount = 0;
  let failCount = 0;

  const executeQuery = async (): Promise<number> => {
    const queryStart = Date.now();
    try {
      if (pool) {
        await pool.query('SELECT 1');
      } else {
        // Simulate query for SQLite
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      successCount++;
    } catch (error) {
      failCount++;
      console.error('Query failed during stress test:', error);
    }
    return Date.now() - queryStart;
  };

  // Run concurrent queries
  const runBatch = async () => {
    const promises = Array(concurrentQueries)
      .fill(0)
      .map(() => executeQuery());
    
    const times = await Promise.all(promises);
    results.push(...times);
  };

  // Keep running batches until duration expires
  while (Date.now() - startTime < duration) {
    await runBatch();
    if (queryDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, queryDelay));
    }
  }

  const totalTime = Date.now() - startTime;
  const totalQueries = successCount + failCount;

  return {
    totalQueries,
    successfulQueries: successCount,
    failedQueries: failCount,
    avgResponseTime: results.length > 0 
      ? results.reduce((a, b) => a + b, 0) / results.length 
      : 0,
    maxResponseTime: results.length > 0 ? Math.max(...results) : 0,
    minResponseTime: results.length > 0 ? Math.min(...results) : 0,
    queriesPerSecond: (totalQueries / totalTime) * 1000,
  };
}

export default {
  trackQuery,
  getDatabaseMetrics,
  resetMetrics,
  stressTestDatabase,
};
