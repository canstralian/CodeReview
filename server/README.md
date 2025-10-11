# Server Backend

Express.js API Gateway and backend services for CodeReview AI.

## Overview

The server is built with Express.js and TypeScript, providing a robust API Gateway with:

- RESTful API endpoints
- Authentication and authorization
- Rate limiting and request validation
- Caching layer with Redis
- Message queue integration (RabbitMQ/Kafka)
- Docker-based worker pool for code analysis
- Monitoring and observability (Sentry, Prometheus)

## Project Structure

```
server/
├── index.ts                # Server entry point
├── routes.ts              # API route definitions
├── db.ts                  # Database connection
├── storage.ts             # Data access layer
├── vite.ts                # Vite development server
├── middleware/            # Express middleware
│   ├── README.md
│   ├── logging.ts         # Request logging
│   ├── rateLimit.ts       # Rate limiting
│   └── errorHandler.ts    # Error handling
├── services/              # Business logic
│   ├── githubClient.ts    # GitHub API integration
│   ├── securityScanner.ts # Security analysis
│   ├── aiSuggestions.ts   # AI-powered suggestions
│   └── qualityTrends.ts   # Code quality trends
├── workers/               # Worker pool
│   ├── README.md
│   └── workerPool.ts      # Worker management
├── queue/                 # Message queue
│   ├── README.md
│   ├── queueClient.ts     # Queue abstraction
│   ├── producers.ts       # Message producers
│   └── consumers.ts       # Message consumers
├── cache/                 # Caching layer
│   ├── README.md
│   ├── redisClient.ts     # Redis client
│   └── cacheService.ts    # Cache abstraction
├── monitoring/            # Observability
│   ├── README.md
│   ├── sentry.ts          # Error tracking
│   ├── prometheus.ts      # Metrics collection
│   └── healthCheck.ts     # Health endpoints
├── config/                # Configuration
│   ├── README.md
│   ├── database.ts        # Database config
│   ├── redis.ts           # Redis config
│   ├── queue.ts           # Queue config
│   ├── workers.ts         # Worker config
│   └── monitoring.ts      # Monitoring config
├── models/                # Data models
│   └── README.md
└── utils/                 # Utilities
    └── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Redis 7+ (optional, uses mock in development)
- RabbitMQ or Kafka (optional, uses mock in development)

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Push database schema
npm run db:push

# Start development server
npm run dev
```

### Environment Variables

See `.env.example` for all available configuration options.

Required:
- `DATABASE_URL`: PostgreSQL connection string
- `ANTHROPIC_API_KEY`: For AI code analysis
- `GITHUB_TOKEN`: For GitHub integration

## API Endpoints

### Repository Management

```
POST   /api/repositories              # Create repository
GET    /api/repositories              # List repositories
GET    /api/repositories/:id          # Get repository
POST   /api/repositories/:id/scan     # Trigger scan
DELETE /api/repositories/:id          # Delete repository
```

### Code Issues

```
GET    /api/repositories/:id/issues   # Get repository issues
GET    /api/issues                    # List all issues
GET    /api/issues/:id                # Get issue details
```

### Analysis

```
POST   /api/analyze-code              # AI code analysis
POST   /api/team-dashboard            # Team metrics
GET    /api/security-scan             # Security scan
```

### Monitoring

```
GET    /health                        # Health check
GET    /health/ready                  # Readiness check
GET    /health/live                   # Liveness check
GET    /metrics                       # Prometheus metrics
```

## Middleware

### Logging Middleware

Logs all incoming requests and responses with timing information.

```typescript
import { loggingMiddleware } from './middleware/logging';
app.use(loggingMiddleware);
```

### Rate Limiting

Protects endpoints from abuse with configurable rate limits.

```typescript
import { rateLimitMiddleware } from './middleware/rateLimit';
app.use('/api', rateLimitMiddleware);
```

### Error Handler

Centralized error handling with proper status codes and messages.

```typescript
import { errorHandler } from './middleware/errorHandler';
app.use(errorHandler);
```

## Services

### GitHub Client

Integrates with GitHub API for repository data.

```typescript
import GitHubClient from './services/githubClient';
const client = new GitHubClient(token);
const repo = await client.getRepository('owner', 'repo');
```

### Security Scanner

Analyzes code for security vulnerabilities.

```typescript
import { SecurityScanner } from './services/securityScanner';
const scanner = new SecurityScanner();
const issues = await scanner.scanFile(code, 'javascript');
```

### AI Suggestions

Provides AI-powered code improvement suggestions.

```typescript
import { AISuggestionsService } from './services/aiSuggestions';
const service = new AISuggestionsService();
const suggestions = await service.analyze(code);
```

## Queue System

### Publishing Tasks

```typescript
import { queueProducer } from './queue/producers';
await queueProducer.enqueueCodeAnalysis({
  repositoryId: 123,
  repositoryUrl: 'https://github.com/user/repo',
  analysisType: 'full'
});
```

### Consuming Tasks

```typescript
import { createAnalysisConsumer } from './queue/consumers';
const consumer = createAnalysisConsumer(async (task) => {
  // Process task
  console.log('Processing:', task);
});
await consumer.start();
```

## Caching

### Using Cache Service

```typescript
import { cacheService } from './cache/cacheService';

// Get or set with TTL
const data = await cacheService.getOrSet(
  'key',
  async () => fetchData(),
  { ttl: 3600 }
);

// Invalidate by pattern
await cacheService.invalidate('repo:*');
```

## Worker Pool

### Managing Workers

```typescript
import { WorkerPool } from './workers/workerPool';
const pool = new WorkerPool();
await pool.start();

// Add task
await pool.addTask({
  type: WorkerTaskType.SECURITY_SCAN,
  priority: TaskPriority.HIGH,
  data: { repositoryId: 123 }
});

// Get status
const status = pool.getStatus();
```

## Monitoring

### Error Tracking

```typescript
import { sentryClient } from './monitoring/sentry';
sentryClient.captureError(error, { userId: 123 });
```

### Metrics

```typescript
import { prometheusClient } from './monitoring/prometheus';
prometheusClient.recordHttpRequest('GET', '/api/repos', 200, 150);
```

## Development

### Running Tests

```bash
npm test
```

### Type Checking

```bash
npm run check
```

### Building

```bash
npm run build
```

## Production Deployment

### Using Docker

```bash
docker build -t codereview-api .
docker run -p 5000:5000 codereview-api
```

### Using Docker Compose

```bash
docker-compose up -d
```

### Environment Variables

Ensure all required environment variables are set in production:

- Set `NODE_ENV=production`
- Configure actual Redis instance
- Configure actual RabbitMQ/Kafka instance
- Set proper database credentials
- Configure Sentry DSN
- Set secure session secret

## Security Considerations

- All inputs are validated
- Rate limiting on all endpoints
- SQL injection prevention via ORM
- Environment variables for secrets
- CORS properly configured
- Session security enabled
- Docker container isolation

## Performance Optimization

- Redis caching for frequently accessed data
- Database query optimization with indexes
- Connection pooling for database
- Horizontal scaling via worker pool
- Message queue for async operations
- Prometheus metrics for monitoring

## Troubleshooting

### Database Connection Issues

```bash
# Check database is running
psql -U postgres -h localhost

# Verify DATABASE_URL in .env
```

### Redis Connection Issues

```bash
# Check Redis is running
redis-cli ping

# Verify REDIS_HOST and REDIS_PORT
```

### Queue Connection Issues

```bash
# Check RabbitMQ is running
rabbitmqctl status

# Check management interface
http://localhost:15672
```

## Contributing

See [CONTRIBUTING.md](../docs/CONTRIBUTING.md) for contribution guidelines.

## License

MIT
