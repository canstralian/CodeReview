/**
 * Redis Client
 * 
 * Redis connection setup and management
 */

import { redisConfig } from '../config/redis';

/**
 * Simple Redis client interface
 * In production, use 'ioredis' or 'redis' npm package
 */
export interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode?: string, duration?: number): Promise<void>;
  del(key: string): Promise<void>;
  keys(pattern: string): Promise<string[]>;
  ttl(key: string): Promise<number>;
  exists(key: string): Promise<boolean>;
}

/**
 * Mock Redis client for development
 * Replace with actual Redis client in production
 */
class MockRedisClient implements RedisClient {
  private store = new Map<string, { value: string; expiry?: number }>();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    
    // Check expiry
    if (entry.expiry && Date.now() > entry.expiry) {
      this.store.delete(key);
      return null;
    }
    
    return entry.value;
  }

  async set(key: string, value: string, mode?: string, duration?: number): Promise<void> {
    const entry: { value: string; expiry?: number } = { value };
    
    if (mode === 'EX' && duration) {
      entry.expiry = Date.now() + duration * 1000;
    }
    
    this.store.set(key, entry);
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(pattern.replace('*', '.*'));
    return Array.from(this.store.keys()).filter(key => regex.test(key));
  }

  async ttl(key: string): Promise<number> {
    const entry = this.store.get(key);
    if (!entry || !entry.expiry) return -1;
    
    const remaining = Math.floor((entry.expiry - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  }

  async exists(key: string): Promise<boolean> {
    return this.store.has(key);
  }
}

// Export singleton instance
export const redisClient: RedisClient = new MockRedisClient();

/**
 * Initialize Redis connection
 * In production, implement actual Redis connection
 */
export async function initializeRedis(): Promise<void> {
  console.log('Redis client initialized (mock mode)');
  console.log('Redis config:', {
    host: redisConfig.host,
    port: redisConfig.port,
    db: redisConfig.db,
  });
  
  // TODO: In production, replace with actual Redis connection:
  // const Redis = require('ioredis');
  // redisClient = new Redis(redisConfig);
}

export default redisClient;
