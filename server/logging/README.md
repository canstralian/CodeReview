# Logging

This folder contains logging infrastructure and configuration.

## Contents

- **logger.ts**: Winston logger setup
- **transports.ts**: Log transport configuration (console, file, remote)
- **formatters.ts**: Log formatting utilities
- **logLevels.ts**: Log level configuration

## Logger Setup

Using Winston for structured logging:

```typescript
import { logger } from './logging/logger';

logger.info('Application started', { port: 3000 });
logger.error('Database connection failed', { error: err.message });
logger.debug('Processing request', { requestId, userId });
```

## Log Levels

- **error**: Error events that might still allow the application to continue
- **warn**: Warning messages for potentially harmful situations
- **info**: Informational messages highlighting progress
- **http**: HTTP request/response logging
- **debug**: Detailed debug information
- **verbose**: Very detailed diagnostic information

## Log Format

Logs are structured in JSON format:

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "message": "Request processed",
  "requestId": "abc123",
  "userId": "user456",
  "duration": 150
}
```

## Log Transports

- **Console**: Development logging
- **File**: Production file logging with rotation
- **Remote**: Cloud logging service integration (e.g., CloudWatch, Datadog)

## Configuration

Configure logging in `server/config/logging.ts`:

```typescript
export const loggingConfig = {
  level: process.env.LOG_LEVEL || 'info',
  format: 'json',
  transports: ['console', 'file']
};
```
