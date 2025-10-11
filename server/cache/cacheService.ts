/**
 * Cache Service
 * 
 * High-level caching abstraction over Redis
 */

import { redisClient } from './redisClient';
import { cacheTTL } from '../config/redis';

export class CacheService {
  private keyPrefix: string;

  constructor(keyPrefix: string = 'cache:') {
    this.keyPrefix = keyPrefix;
  }

  /**
   * Build cache key with prefix
   */
  private buildKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const fullKey = this.buildKey(key);
    const value = await redisClient.get(fullKey);
    
    if (!value) return null;
    
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as any;
    }
  }

  /**
   * Set value in cache with optional TTL
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const fullKey = this.buildKey(key);
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    
    if (ttl) {
      await redisClient.set(fullKey, serialized, 'EX', ttl);
    } else {
      await redisClient.set(fullKey, serialized);
    }
  }

  /**
   * Get value from cache or compute it
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options: { ttl?: number } = {}
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Compute value
    const value = await factory();

    // Store in cache
    await this.set(key, value, options.ttl || cacheTTL.medium);

    return value;
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<void> {
    const fullKey = this.buildKey(key);
    await redisClient.del(fullKey);
  }

  /**
   * Invalidate multiple keys by pattern
   */
  async invalidate(pattern: string): Promise<void> {
    const fullPattern = this.buildKey(pattern);
    const keys = await redisClient.keys(fullPattern);
    
    for (const key of keys) {
      await redisClient.del(key);
    }
  }

  /**
   * Check if key exists in cache
   */
  async exists(key: string): Promise<boolean> {
    const fullKey = this.buildKey(key);
    return await redisClient.exists(fullKey);
  }

  /**
   * Get remaining TTL for a key
   */
  async ttl(key: string): Promise<number> {
    const fullKey = this.buildKey(key);
    return await redisClient.ttl(fullKey);
  }
}

// Export singleton instance
export const cacheService = new CacheService();

export default cacheService;
