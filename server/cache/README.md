# Cache

This folder contains Redis caching layer implementation.

## Contents

- **redisClient.ts**: Redis client setup and connection
- **cacheService.ts**: High-level caching service abstraction
- **cacheStrategies.ts**: Caching strategies (LRU, TTL, etc.)
- **cacheKeys.ts**: Cache key naming conventions

## Redis Client

Redis is used for caching frequently accessed data:

```typescript
import { redisClient } from './cache/redisClient';

await redisClient.set('user:123', JSON.stringify(userData), 'EX', 3600);
const cached = await redisClient.get('user:123');
```

## Cache Service

High-level caching abstraction:

```typescript
import { CacheService } from './cache/cacheService';

const cache = new CacheService();

// Get or compute
const result = await cache.getOrSet('repo:123:issues', async () => {
  return await fetchIssuesFromDB(123);
}, { ttl: 3600 });

// Invalidate
await cache.invalidate('repo:123:*');
```

## Caching Strategies

- **Time-based expiration**: Automatic expiration after TTL
- **LRU eviction**: Least recently used eviction when memory limit reached
- **Pattern-based invalidation**: Invalidate multiple keys by pattern
- **Cache-aside**: Application manages cache updates
- **Write-through**: Updates written to cache and DB simultaneously

## Cache Key Naming

Follow consistent naming conventions:

```
entity:id:field
repo:123:issues
user:456:profile
analysis:789:results
```

## Configuration

Configure Redis in `server/config/redis.ts`:

```typescript
export const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0')
};
```
