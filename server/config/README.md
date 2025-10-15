# Configuration

This folder contains application configuration files and settings.

## Contents

- **app.ts**: Main application configuration
- **database.ts**: Database connection configuration
- **redis.ts**: Redis cache configuration
- **queue.ts**: Message queue configuration (RabbitMQ/Kafka)
- **monitoring.ts**: Sentry and Prometheus configuration
- **workers.ts**: Worker pool configuration
- **github.ts**: GitHub API configuration
- **security.ts**: Security-related configuration

## Environment Variables

Configuration values should be loaded from environment variables:

```typescript
import dotenv from 'dotenv';
dotenv.config();

export const databaseConfig = {
  url: process.env.DATABASE_URL,
  poolSize: parseInt(process.env.DB_POOL_SIZE || '10'),
  ssl: process.env.DB_SSL === 'true'
};
```

## Configuration Files

Each configuration module exports typed configuration objects:

```typescript
// database.ts
export interface DatabaseConfig {
  url: string;
  poolSize: number;
  ssl: boolean;
}

export const databaseConfig: DatabaseConfig = {
  // configuration values
};
```
