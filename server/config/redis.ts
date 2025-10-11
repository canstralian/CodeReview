/**
 * Redis Cache Configuration
 * 
 * Redis connection settings for caching layer
 */

import { config } from 'dotenv';
config();

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  keyPrefix: string;
  enableReadyCheck: boolean;
  maxRetriesPerRequest: number;
  retryStrategy?: (times: number) => number | null;
}

export const redisConfig: RedisConfig = {
  // Redis host
  host: process.env.REDIS_HOST || 'localhost',
  
  // Redis port
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  
  // Redis password (if required)
  password: process.env.REDIS_PASSWORD,
  
  // Redis database number
  db: parseInt(process.env.REDIS_DB || '0', 10),
  
  // Key prefix for namespacing
  keyPrefix: process.env.REDIS_KEY_PREFIX || 'codereview:',
  
  // Enable ready check
  enableReadyCheck: true,
  
  // Max retries per request
  maxRetriesPerRequest: 3,
  
  // Retry strategy
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
};

// Cache TTL configurations (in seconds)
export const cacheTTL = {
  short: 300,      // 5 minutes
  medium: 3600,    // 1 hour
  long: 86400,     // 24 hours
  veryLong: 604800, // 7 days
};

export default redisConfig;
